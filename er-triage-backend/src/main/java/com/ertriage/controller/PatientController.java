package com.ertriage.controller;

import com.ertriage.dto.PatientDTO;
import com.ertriage.service.PatientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ResponseEntity<PatientDTO> createPatient(@RequestBody Map<String, String> body) {
        String rawInput = body.get("rawInput");
        if (rawInput == null || rawInput.trim().isEmpty())
            return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(patientService.processAndSavePatient(rawInput.trim()));
    }

    @GetMapping
    public ResponseEntity<List<PatientDTO>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients());
    }

    @PutMapping("/{id}/retriage")
    public ResponseEntity<PatientDTO> retriagePatient(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(patientService.retriagePatient(id, body.get("symptoms"), body.get("vitals")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }
}
