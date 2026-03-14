package com.ertriage.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ertriage.service.PatientService;

@RestController
@RequestMapping("/api/refine-speech")
public class SpeechRefinementController {

    private final PatientService patientService;

    public SpeechRefinementController(PatientService patientService) {
        this.patientService = patientService;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> refineSpeech(@RequestBody Map<String, String> body) {
        String rawInput = body.get("rawInput");
        if (rawInput == null || rawInput.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String refinedText = patientService.refineSpeech(rawInput);
        return ResponseEntity.ok(Map.of("refinedText", refinedText));
    }
}
