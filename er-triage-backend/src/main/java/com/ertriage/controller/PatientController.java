package com.ertriage.controller;

import com.ertriage.dto.PatientDTO;
import com.ertriage.service.PatientService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

    @GetMapping("/search")
    public ResponseEntity<List<PatientDTO>> searchPatients(@RequestParam String q) {
        return ResponseEntity.ok(patientService.searchPatients(q));
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

    @PutMapping("/{id}/discharge")
    public ResponseEntity<PatientDTO> dischargePatient(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String notes = body.getOrDefault("notes", "Patient discharged");
            String performedBy = body.getOrDefault("performedBy", "Staff");
            return ResponseEntity.ok(patientService.dischargePatient(id, notes, performedBy));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/handoff")
    public ResponseEntity<PatientDTO> handoffPatient(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String toDepartment = body.getOrDefault("toDepartment", "Unknown");
            String notes = body.getOrDefault("notes", "");
            String performedBy = body.getOrDefault("performedBy", "Staff");
            return ResponseEntity.ok(patientService.handoffPatient(id, toDepartment, notes, performedBy));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ── NEW: update a patient's triage priority via drag-and-drop ────────────
    @PutMapping("/{id}/priority")
    public ResponseEntity<PatientDTO> updatePriority(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            String priority = body.get("priority");
            if (priority == null || priority.trim().isEmpty())
                return ResponseEntity.badRequest().build();
            return ResponseEntity.ok(patientService.updatePriority(id, priority.trim().toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    // ────────────────────────────────────────────────────────────────────────

    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv() {
        List<PatientDTO> patients = patientService.getAllPatients();
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Name,Age,Priority,Symptoms,Vitals,Timestamp\n");
        for (PatientDTO p : patients) {
            csv.append(escapeCsv(p.getId())).append(',');
            csv.append(escapeCsv(p.getName())).append(',');
            csv.append(escapeCsv(p.getAge())).append(',');
            csv.append(escapeCsv(p.getPriority())).append(',');
            csv.append(escapeCsv(p.getSymptoms())).append(',');
            csv.append(escapeCsv(p.getVitals())).append(',');
            csv.append(escapeCsv(p.getTimestamp())).append('\n');
        }
        byte[] bytes = csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=patients_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private String escapeCsv(Object value) {
        if (value == null) return "";
        String str = value.toString();
        if (str.contains(",") || str.contains("\"") || str.contains("\n")) {
            return "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }
}