package com.ertriage.service;

import com.ertriage.dto.PatientDTO;
import com.ertriage.dto.PatientEventDTO;
import com.ertriage.dto.RecycleBinPatientDTO;
import com.ertriage.model.DeletedPatient;
import com.ertriage.model.Patient;
import com.ertriage.model.PatientEvent;
import com.ertriage.model.User;
import com.ertriage.repository.DeletedPatientRepository;
import com.ertriage.repository.PatientEventRepository;
import com.ertriage.repository.PatientRepository;
import com.ertriage.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Date;
import java.util.stream.Collectors;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final AiExtractionService aiExtractionService;
    private final TriageRulesEngine triageRulesEngine;
    private final LocalExtractorService localExtractorService;
    private final ResourceAllocationService resourceAllocationService;
    private final PatientEventRepository eventRepository;
    private final UserRepository userRepository;
    private final DeletedPatientRepository deletedPatientRepository;

    public PatientService(PatientRepository patientRepository, AiExtractionService aiExtractionService,
            TriageRulesEngine triageRulesEngine, LocalExtractorService localExtractorService,
            ResourceAllocationService resourceAllocationService,
            PatientEventRepository eventRepository, UserRepository userRepository,
            DeletedPatientRepository deletedPatientRepository) {
        this.patientRepository = patientRepository;
        this.aiExtractionService = aiExtractionService;
        this.triageRulesEngine = triageRulesEngine;
        this.localExtractorService = localExtractorService;
        this.resourceAllocationService = resourceAllocationService;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.deletedPatientRepository = deletedPatientRepository;
    }

    public PatientDTO processAndSavePatient(String rawInput) {
        Map<String, Object> extractedData = aiExtractionService.extractPatientData(rawInput);

        String symptoms = (String) extractedData.getOrDefault("symptoms", "");
        String vitals = (String) extractedData.getOrDefault("vitals", "");
        String aiPriority = (String) extractedData.getOrDefault("priority", "GREEN");

        String extractedName = (String) extractedData.getOrDefault("name", "Unknown");
        if (!isValidPatientName(extractedName)) {
            Object localName = localExtractorService.extract(rawInput).get("name");
            if (localName instanceof String && isValidPatientName((String) localName)) {
                extractedName = (String) localName;
            }
        }
        if (!isValidPatientName(extractedName))
            extractedName = "Unknown";

        Patient.Priority priority = triageRulesEngine.calculatePriority(symptoms, vitals, rawInput, aiPriority);

        Integer age = null;
        Object ageObj = extractedData.get("age");
        if (ageObj instanceof Integer)
            age = (Integer) ageObj;
        else if (ageObj instanceof Number)
            age = ((Number) ageObj).intValue();

        String recommendedSpec = (String) extractedData.getOrDefault("recommended_specialization", "Emergency Medicine");

        Patient patient = Patient.builder()
                .name(extractedName).age(age).symptoms(symptoms)
                .vitals(vitals).priority(priority).rawInput(rawInput)
                .timestamp(LocalDateTime.now()).build();

        resourceAllocationService.assignResources(patient, recommendedSpec);

        Patient saved = patientRepository.save(patient);

        logEvent(saved.getId(), PatientEvent.EventType.INTAKE,
                "Patient admitted via voice triage. Priority: " + priority.name()
                        + ". Assigned to: " + patient.getAssignedDoctorName()
                        + " (" + patient.getAssignedDoctorSpecialization() + ")"
                        + ". Room: " + patient.getAssignedRoom(),
                null, priority.name(), "System (AI Triage)");

        logEvent(saved.getId(), PatientEvent.EventType.RESOURCE_ALLOCATION,
                resourceAllocationService.describeAllocation(saved),
                null, priority.name(), "System (Allocator)");

        return toDTO(saved);
    }

    public List<PatientDTO> getAllPatients() {
        List<Patient> patients = patientRepository.findAllByOrderByPriorityAscTimestampAsc();
        List<String> patientIds = patients.stream().map(Patient::getId).collect(Collectors.toList());

        List<PatientEvent> allEvents = eventRepository.findByPatientIdInOrderByTimestampAsc(patientIds);
        Map<String, List<PatientEventDTO>> eventsByPatient = allEvents.stream()
                .collect(Collectors.groupingBy(
                        PatientEvent::getPatientId,
                        Collectors.mapping(this::toEventDTO, Collectors.toList())));

        return patients.stream().map(p -> {
            PatientDTO dto = PatientDTO.fromEntity(p);
            dto.setTimeline(eventsByPatient.getOrDefault(p.getId(), List.of()));
            return dto;
        }).collect(Collectors.toList());
    }

    public List<PatientDTO> searchPatients(String query) {
        if (query == null || query.trim().isEmpty()) return getAllPatients();
        List<Patient> patients = patientRepository
                .findByNameContainingIgnoreCaseOrSymptomsContainingIgnoreCase(query.trim(), query.trim());
        return patients.stream().map(this::toDTO).collect(Collectors.toList());
    }

        public void deletePatient(String id, String deleteReason, String deletedBy) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + id));

        List<PatientEvent> events = eventRepository.findByPatientIdOrderByTimestampAsc(id);
        String normalizedReason = deleteReason.trim();
        String normalizedDeletedBy = (deletedBy == null || deletedBy.trim().isEmpty())
            ? "Staff"
            : deletedBy.trim();

        LocalDateTime deletedAt = LocalDateTime.now();
        Date purgeAt = Date.from(deletedAt.plusDays(10)
                .atZone(ZoneId.systemDefault())
                .toInstant());

        deletedPatientRepository.save(DeletedPatient.from(
            patient,
            events,
            deletedAt,
            normalizedReason,
            normalizedDeletedBy,
            purgeAt));

        eventRepository.deleteByPatientId(id);
        patientRepository.deleteById(id);
    }

    public List<RecycleBinPatientDTO> getRecycleBinPatients() {
        return deletedPatientRepository.findAllByOrderByDeletedAtDesc()
                .stream()
                .map(this::toRecycleBinDTO)
                .collect(Collectors.toList());
    }

    public PatientDTO restorePatientFromRecycleBin(String id) {
        DeletedPatient deletedPatient = deletedPatientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Archived patient not found with id: " + id));

        Patient archivedPatient = deletedPatient.getPatient();
        if (archivedPatient == null) {
            throw new IllegalArgumentException("Archived patient payload is missing for id: " + id);
        }

        Patient restored = patientRepository.save(archivedPatient);

        List<PatientEvent> archivedEvents = deletedPatient.getEvents();
        if (archivedEvents != null && !archivedEvents.isEmpty()) {
            archivedEvents.forEach(event -> {
                event.setId(null);
                event.setPatientId(restored.getId());
            });
            eventRepository.saveAll(archivedEvents);
        }

        deletedPatientRepository.deleteById(id);
        return toDTO(restored);
    }

    public PatientDTO dischargePatient(String id, String notes, String performedBy) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + id));

        logEvent(patient.getId(), PatientEvent.EventType.DISCHARGE,
                notes, patient.getPriority().name(), null, performedBy);

        return toDTO(patient);
    }

    public PatientDTO handoffPatient(String id, String toDepartment, String notes, String performedBy) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + id));

        String description = "Handed off to " + toDepartment;
        if (notes != null && !notes.isBlank()) {
            description += ". Notes: " + notes;
        }

        logEvent(patient.getId(), PatientEvent.EventType.HANDOFF,
                description, patient.getPriority().name(), null, performedBy);

        return toDTO(patient);
    }

    public PatientDTO retriagePatient(String id, String updatedSymptoms, String updatedVitals) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + id));

        String oldPriority = patient.getPriority() != null ? patient.getPriority().name() : "GREEN";
        String oldAllocation = resourceAllocationService.describeAllocation(patient);

        String newSymptoms = (updatedSymptoms != null && !updatedSymptoms.trim().isEmpty())
                ? updatedSymptoms.trim()
                : patient.getSymptoms();
        String newVitals = (updatedVitals != null && !updatedVitals.trim().isEmpty())
                ? updatedVitals.trim()
                : patient.getVitals();

        patient.setSymptoms(newSymptoms);
        patient.setVitals(newVitals);

        String combinedInput = String.format(
        "Patient re-assessment. Current symptoms: %s. Current vitals: %s. " +
        "Previous history is no longer relevant. Evaluate based only on current presentation.",
        newSymptoms, newVitals);

        String aiPriority = "YELLOW";
        String recommendedSpec = patient.getAssignedDoctorSpecialization();
        try {
            Map<String, Object> aiData = aiExtractionService.extractPatientData(combinedInput);
            aiPriority = (String) aiData.getOrDefault("priority", "YELLOW");
            recommendedSpec = (String) aiData.getOrDefault("recommended_specialization", recommendedSpec);
        } catch (Exception e) {
            /* fallback */ }

        Patient.Priority newPriority = triageRulesEngine.calculatePriority(
        newSymptoms, newVitals, null, aiPriority);

        patient.setPriority(newPriority);
        patient.setRawInput(patient.getRawInput() + " [RE-TRIAGED: " +
                java.time.LocalDateTime.now().toString() + "]");

        resourceAllocationService.assignResources(patient, recommendedSpec);

        Patient saved = patientRepository.save(patient);

        logEvent(saved.getId(), PatientEvent.EventType.REASSESSMENT,
                "Patient reassessed with updated symptoms/vitals.",
                oldPriority, newPriority.name(), "Triage Nurse");

        if (!oldPriority.equals(newPriority.name())) {
            logEvent(saved.getId(), PatientEvent.EventType.PRIORITY_CHANGE,
                    "Priority changed from " + oldPriority + " to " + newPriority.name() + ".",
                    oldPriority, newPriority.name(), "Triage Nurse");
        }

        String newAllocation = resourceAllocationService.describeAllocation(saved);
        if (!oldAllocation.equals(newAllocation)) {
            logEvent(saved.getId(), PatientEvent.EventType.RESOURCE_ALLOCATION,
                    newAllocation,
                    oldPriority, newPriority.name(), "System (Allocator)");
        }

        return toDTO(saved);
    }


    public PatientDTO updatePriority(String id, String newPriorityStr) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Patient not found with id: " + id));

        String oldPriority = patient.getPriority() != null ? patient.getPriority().name() : "GREEN";
        String oldAllocation = resourceAllocationService.describeAllocation(patient);
        Patient.Priority newPriority = Patient.Priority.valueOf(newPriorityStr);

        patient.setPriority(newPriority);
        resourceAllocationService.assignResources(patient, patient.getAssignedDoctorSpecialization());
        Patient saved = patientRepository.save(patient);

        if (!oldPriority.equals(newPriority.name())) {
            logEvent(saved.getId(), PatientEvent.EventType.PRIORITY_CHANGE,
                    "Priority changed via drag-and-drop from " + oldPriority + " to " + newPriority.name(),
                    oldPriority, newPriority.name(), "Staff (Manual)");
        }

        String newAllocation = resourceAllocationService.describeAllocation(saved);
        if (!oldAllocation.equals(newAllocation)) {
            logEvent(saved.getId(), PatientEvent.EventType.RESOURCE_ALLOCATION,
                    newAllocation,
                    oldPriority, newPriority.name(), "System (Allocator)");
        }

        return toDTO(saved);
    }

    private void logEvent(String patientId, PatientEvent.EventType type,
            String description, String oldPriority, String newPriority, String performedBy) {
        eventRepository.save(new PatientEvent(patientId, type, description, oldPriority, newPriority, performedBy));
    }

    private PatientDTO toDTO(Patient patient) {
        PatientDTO dto = PatientDTO.fromEntity(patient);
        dto.setTimeline(eventRepository.findByPatientIdOrderByTimestampAsc(patient.getId())
                .stream().map(this::toEventDTO).collect(Collectors.toList()));
        return dto;
    }

    private PatientEventDTO toEventDTO(PatientEvent event) {
        return new PatientEventDTO(event.getId(), event.getEventType().name(), event.getDescription(),
                event.getOldPriority(), event.getNewPriority(), event.getPerformedBy(), event.getTimestamp());
    }

        private RecycleBinPatientDTO toRecycleBinDTO(DeletedPatient deletedPatient) {
        List<PatientEventDTO> timeline = deletedPatient.getEvents() == null
            ? List.of()
            : deletedPatient.getEvents().stream().map(this::toEventDTO).collect(Collectors.toList());

        LocalDateTime purgeAt = deletedPatient.getPurgeAt() == null
            ? null
            : deletedPatient.getPurgeAt().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();

        return new RecycleBinPatientDTO(
            deletedPatient.getId(),
            deletedPatient.getPatient() == null ? null : PatientDTO.fromEntity(deletedPatient.getPatient()),
            timeline,
            deletedPatient.getDeletedAt(),
            deletedPatient.getDeleteReason(),
            deletedPatient.getDeletedBy(),
            purgeAt);
        }

    private boolean isValidPatientName(String value) {
        if (value == null || value.isBlank())
            return false;
        String lower = value.trim().toLowerCase();
        if ("unknown".equals(lower))
            return false;
        if (lower.contains("name is") || lower.contains("patient"))
            return false;
        String[] parts = lower.split("\\s+");
        if (parts.length == 0 || parts.length > 4)
            return false;
        Set<String> stopWords = Set.of("name", "is", "male", "female", "year", "years", "old", "with", "has");
        int alphaTokens = 0;
        for (String part : parts) {
            String token = part.replaceAll("[^a-z'-]", "");
            if (token.isBlank())
                continue;
            if (stopWords.contains(token))
                return false;
            if (token.length() < 2)
                return false;
            alphaTokens++;
        }
        return alphaTokens >= 1;
    }


}