package com.ertriage.service;

import com.ertriage.dto.PatientDTO;
import com.ertriage.model.Patient;
import com.ertriage.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final GeminiService geminiService;
    private final TriageRulesEngine triageRulesEngine;

    public PatientDTO processAndSavePatient(String rawInput) {
        // Step 1: Gemini extracts structured data (name, age, symptoms, vitals)
        Map<String, Object> extractedData = geminiService.extractPatientData(rawInput);

        String symptoms = (String) extractedData.getOrDefault("symptoms", "");
        String vitals = (String) extractedData.getOrDefault("vitals", "");
        String aiPriority = (String) extractedData.getOrDefault("priority", "GREEN");

        // Step 2: Deterministic rules engine makes the FINAL priority decision
        Patient.Priority priority = triageRulesEngine.calculatePriority(
                symptoms, vitals, rawInput, aiPriority);

        // Step 3: Handle age
        Integer age = null;
        Object ageObj = extractedData.get("age");
        if (ageObj instanceof Integer) {
            age = (Integer) ageObj;
        } else if (ageObj instanceof Number) {
            age = ((Number) ageObj).intValue();
        }

        // Step 4: Build and save entity
        Patient patient = Patient.builder()
                .name((String) extractedData.getOrDefault("name", "Unknown"))
                .age(age)
                .symptoms(symptoms)
                .vitals(vitals)
                .priority(priority)
                .rawInput(rawInput)
                .build();

        Patient saved = patientRepository.save(patient);
        return PatientDTO.fromEntity(saved);
    }

    public List<PatientDTO> getAllPatients() {
        return patientRepository.findAllByOrderByPriorityAscTimestampAsc()
                .stream()
                .map(PatientDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public void deletePatient(Long id) {
        patientRepository.deleteById(id);
    }
}
