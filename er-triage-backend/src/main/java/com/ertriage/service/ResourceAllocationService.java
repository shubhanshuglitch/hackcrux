package com.ertriage.service;

import com.ertriage.model.Patient;
import com.ertriage.model.ResourceRoom;
import com.ertriage.model.ResourceZone;
import com.ertriage.model.User;
import com.ertriage.repository.PatientRepository;
import com.ertriage.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ResourceAllocationService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final ResourceAllocationCatalogService resourceAllocationCatalogService;

    public ResourceAllocationService(PatientRepository patientRepository, UserRepository userRepository,
            ResourceAllocationCatalogService resourceAllocationCatalogService) {
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.resourceAllocationCatalogService = resourceAllocationCatalogService;
    }

    public void assignResources(Patient patient, String preferredSpecialization) {
        List<Patient> activePatients = patientRepository.findAll().stream()
                .filter(existing -> patient.getId() == null || !patient.getId().equals(existing.getId()))
                .collect(Collectors.toList());

        RoomAssignment roomAssignment = selectRoomAssignment(patient, activePatients);
        patient.setAssignedCareZone(roomAssignment.getZoneName());
        patient.setAssignedRoom(roomAssignment.getRoomCode());
        assignDoctor(patient, activePatients, preferredSpecialization);
        assignNurse(patient, activePatients);
        patient.setAssignedSupportStaff(determineSupportStaff(patient, activePatients));
        patient.setAssignedEquipment(determineEquipment(patient));
    }

    public String describeAllocation(Patient patient) {
        String equipmentSummary = patient.getAssignedEquipment() == null || patient.getAssignedEquipment().isEmpty()
                ? "basic triage kit"
                : String.join(", ", patient.getAssignedEquipment());

        return String.format(
                "Zone %s, room %s, doctor %s, nurse %s, support %s, equipment %s.",
                valueOrFallback(patient.getAssignedCareZone(), "Unassigned"),
                valueOrFallback(patient.getAssignedRoom(), "Pending"),
                valueOrFallback(patient.getAssignedDoctorName(), "Unassigned"),
                valueOrFallback(patient.getAssignedNurseName(), "Pending"),
                valueOrFallback(patient.getAssignedSupportStaff(), "General support"),
                equipmentSummary);
    }

        private RoomAssignment selectRoomAssignment(Patient patient, List<Patient> activePatients) {
        List<ResourceZone> matchingZones = getZonesForPriority(patient.getPriority());
        Map<String, ResourceZone> zonesById = matchingZones.stream()
            .collect(Collectors.toMap(ResourceZone::getId, Function.identity()));

        List<ResourceRoom> roomPool = resourceAllocationCatalogService.getActiveRooms().stream()
            .filter(room -> zonesById.containsKey(room.getZoneId()))
            .toList();

        if (roomPool.isEmpty()) {
            String fallbackZone = matchingZones.isEmpty() ? patient.getPriority().name() + " Zone" : matchingZones.get(0).getName();
            return new RoomAssignment(fallbackZone, patient.getPriority().name() + "-OVERFLOW");
        }

        Map<String, Long> occupancy = activePatients.stream()
            .map(Patient::getAssignedRoom)
            .filter(roomName -> roomPool.stream().anyMatch(room -> room.getRoomCode().equals(roomName)))
            .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        Comparator<ResourceRoom> roomComparator = Comparator
            .comparingLong((ResourceRoom room) -> occupancy.getOrDefault(room.getRoomCode(), 0L))
            .thenComparing(ResourceRoom::getRoomCode);

        ResourceRoom selectedRoom = roomPool.stream()
            .min(roomComparator)
            .orElse(roomPool.get(0));

        ResourceZone selectedZone = zonesById.get(selectedRoom.getZoneId());
        String zoneName = selectedZone == null ? patient.getPriority().name() + " Zone" : selectedZone.getName();
        return new RoomAssignment(zoneName, selectedRoom.getRoomCode());
    }

    private void assignDoctor(Patient patient, List<Patient> activePatients, String preferredSpecialization) {
        List<User> activeDoctors = userRepository.findByRoleAndActiveTrue(User.Role.DOCTOR);
        String specialization = preferredSpecialization == null || preferredSpecialization.isBlank()
                ? "Emergency Medicine"
                : preferredSpecialization.trim();

        List<User> matchingDoctors = activeDoctors.stream()
                .filter(doc -> doc.getSpecialization() != null
                        && doc.getSpecialization().toLowerCase(Locale.ROOT)
                                .contains(specialization.toLowerCase(Locale.ROOT)))
                .collect(Collectors.toList());

        User assignedDoctor = chooseLeastLoadedUser(matchingDoctors.isEmpty() ? activeDoctors : matchingDoctors,
                activePatients, Patient::getAssignedDoctorName);

        if (assignedDoctor != null) {
            patient.setAssignedDoctorName(assignedDoctor.getFullName());
            patient.setAssignedDoctorSpecialization(
                    assignedDoctor.getSpecialization() != null ? assignedDoctor.getSpecialization() : specialization);
        } else {
            patient.setAssignedDoctorName("Unassigned");
            patient.setAssignedDoctorSpecialization(specialization);
        }
    }

    private void assignNurse(Patient patient, List<Patient> activePatients) {
        List<User> activeNurses = userRepository.findByRoleAndActiveTrue(User.Role.NURSE);
        User assignedNurse = chooseLeastLoadedUser(activeNurses, activePatients, Patient::getAssignedNurseName);
        patient.setAssignedNurseName(assignedNurse != null ? assignedNurse.getFullName() : "Nurse pool");
    }

    private String determineSupportStaff(Patient patient, List<Patient> activePatients) {
        List<User> supervisors = userRepository.findByRoleAndActiveTrue(User.Role.SUPERVISOR);
        User assignedSupervisor = chooseLeastLoadedUser(supervisors, activePatients, Patient::getAssignedSupportStaff);

        String combined = ((patient.getSymptoms() == null ? "" : patient.getSymptoms()) + " "
                + (patient.getVitals() == null ? "" : patient.getVitals())).toLowerCase(Locale.ROOT);

        if (patient.getPriority() == Patient.Priority.RED) {
            return assignedSupervisor != null
                    ? assignedSupervisor.getFullName() + " (Supervisor)"
                    : "Critical Care Response Team";
        }
        if (combined.contains("shortness of breath") || combined.contains("spo2") || combined.contains("oxygen")) {
            return "Respiratory Support Team";
        }
        if (combined.contains("fracture") || combined.contains("bleeding") || combined.contains("trauma")) {
            return "Trauma Support Team";
        }
        if (combined.contains("stroke") || combined.contains("seizure") || combined.contains("unconscious")) {
            return "Neurology Rapid Response";
        }
        return patient.getPriority() == Patient.Priority.YELLOW ? "Observation Support Crew" : "Fast Track Support";
    }

    private List<String> determineEquipment(Patient patient) {
        String combined = ((patient.getSymptoms() == null ? "" : patient.getSymptoms()) + " "
                + (patient.getVitals() == null ? "" : patient.getVitals()) + " "
                + (patient.getRawInput() == null ? "" : patient.getRawInput())).toLowerCase(Locale.ROOT);

        LinkedHashSet<String> equipment = new LinkedHashSet<>();
        equipment.add("Vitals Monitor");

        switch (patient.getPriority()) {
            case RED -> {
                equipment.add("Cardiac Monitor");
                equipment.add("IV Pump");
                equipment.add("Crash Cart");
                equipment.add("Oxygen Supply");
            }
            case YELLOW -> {
                equipment.add("Observation Monitor");
                equipment.add("Portable ECG");
            }
            case GREEN -> equipment.add("Triage Workstation");
        }

        if (combined.contains("chest pain") || combined.contains("palpitation")) {
            equipment.add("12-Lead ECG");
            equipment.add("Defibrillator Standby");
        }
        if (combined.contains("shortness of breath") || combined.contains("spo2") || combined.contains("oxygen")) {
            equipment.add("Pulse Oximeter");
            equipment.add("Nebulizer");
        }
        if (combined.contains("bleeding") || combined.contains("trauma") || combined.contains("fracture")) {
            equipment.add("Trauma Kit");
            equipment.add("Portable Ultrasound");
        }
        if (combined.contains("stroke") || combined.contains("seizure") || combined.contains("unconscious")) {
            equipment.add("Neuro Assessment Kit");
        }

        return new ArrayList<>(equipment);
    }

    private User chooseLeastLoadedUser(List<User> candidates, List<Patient> activePatients,
            Function<Patient, String> assignedNameExtractor) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }

        Map<String, Long> loadByName = activePatients.stream()
                .map(assignedNameExtractor)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        return candidates.stream()
                .min(Comparator
                        .comparingLong((User user) -> loadByName.getOrDefault(user.getFullName(), 0L))
                        .thenComparing(User::getFullName))
                .orElse(null);
    }

    private String valueOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private List<ResourceZone> getZonesForPriority(Patient.Priority priority) {
        List<ResourceZone> matchingZones = resourceAllocationCatalogService.getActiveZones().stream()
                .filter(zone -> priority.name().equalsIgnoreCase(zone.getPriorityLevel()))
                .toList();

        if (!matchingZones.isEmpty()) {
            return matchingZones;
        }

        return List.of(new ResourceZone(null, priority.name() + " Zone", priority.name(), "Autogenerated zone", true));
    }

    private static class RoomAssignment {
        private final String zoneName;
        private final String roomCode;

        private RoomAssignment(String zoneName, String roomCode) {
            this.zoneName = zoneName;
            this.roomCode = roomCode;
        }

        private String getZoneName() {
            return zoneName;
        }

        private String getRoomCode() {
            return roomCode;
        }
    }
}