package com.ertriage.controller;

import com.ertriage.dto.PatientDTO;
import com.ertriage.service.PatientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    /**
     * POST /api/patients
     * Body: { "rawInput": "35 year old male, chest pain, BP 160/100..." }
     * Returns: structured PatientDTO with priority assignment
     */
    @PostMapping
    public ResponseEntity<PatientDTO> createPatient(@RequestBody Map<String, String> body) {
        String rawInput = body.get("rawInput");
        if (rawInput == null || rawInput.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        PatientDTO result = patientService.processAndSavePatient(rawInput.trim());
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/patients
     * Returns all patients sorted by priority (RED first) then timestamp
     */
    @GetMapping
    public ResponseEntity<List<PatientDTO>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients());
    }

    /**
     * DELETE /api/patients/{id}
     * Removes a patient card from the dashboard
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }
}
