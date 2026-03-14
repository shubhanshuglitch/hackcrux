package com.ertriage.service;

import com.ertriage.model.Patient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic triage engine — applies hard clinical rules to assign priority.
 * Uses rawInput directly for keyword matching (preserves negations like "no
 * chest pain").
 */
@Component
public class TriageRulesEngine {

    // Negation words — if these immediately precede a keyword, the match is ignored
    private static final List<String> NEGATION_WORDS = List.of(
            "no", "not", "without", "denies", "denying", "absence of",
            "resolved", "stopped", "controlled", "negative for", "rules out",
            "rule out", "ruling out", "to rule out", "to exclude",
            "no evidence of", "no signs of", "unlikely");

    // RED trigger keywords
    private static final List<String> RED_SYMPTOM_KEYWORDS = List.of(
            "chest pain", "chest pressure", "chest tightness",
            "shortness of breath", "difficulty breathing", "breathing difficulty", "respiratory distress",
            "can't breathe",
            "cannot breathe", "dyspnea", "trouble breathing",
            "cardiac arrest", "heart attack", "heart failure", "congestive heart failure",
            "unconscious", "unresponsive",
            "stroke", "facial droop", "arm weakness",
            "severe bleeding", "hemorrhage", "major trauma", "head injury",
            "anaphylaxis", "allergic reaction", "seizure", "convulsion",
            "altered consciousness", "not responding",
            "radiating to arm", "radiating to left arm", "radiating to jaw",
            "diaphoretic", "sweating profusely", "cold sweat");

    // YELLOW trigger keywords (only checked if no RED match)
    private static final List<String> YELLOW_SYMPTOM_KEYWORDS = List.of(
            "moderate pain", "abdominal pain", "fracture", "broken bone",
            "vomiting", "persistent nausea", "dehydration",
            "laceration", "sutures needed", "high fever", "fever",
            "confusion", "disoriented", "abdominal cramps",
            "chest discomfort");

    /**
     * Use rawInput ONLY for keyword matching — it preserves the full clinical
     * context including negations ("no chest pain", "bleeding stopped", etc.).
     * The extracted symptoms/vitals fields are display-only and may lose negation
     * context.
     */
    public Patient.Priority calculatePriority(String symptoms, String vitals, String rawInput, String aiSuggested) {
        // Use rawInput as the primary text for classification (preserves negations)
        String classifyText = (symptoms != null ? symptoms : "").toLowerCase()
        + " " + (rawInput != null ? rawInput : "").toLowerCase();

// --- Check vital sign thresholds (vitals field ONLY — not rawInput) ---
String vitalsText = (vitals != null ? vitals : "").toLowerCase();
if (isRedByVitals(vitalsText)) {
    return Patient.Priority.RED;
}
        // --- Check RED symptom keywords (negation-aware, on rawInput) ---
        for (String keyword : RED_SYMPTOM_KEYWORDS) {
            if (containsKeyword(classifyText, keyword)) {
                return Patient.Priority.RED;
            }
        }

        // --- Check YELLOW symptom keywords (negation-aware, on rawInput) ---
        for (String keyword : YELLOW_SYMPTOM_KEYWORDS) {
            if (containsKeyword(classifyText, keyword)) {
                return Patient.Priority.YELLOW;
            }
        }

        // --- Fall back to AI suggestion ---
        if (aiSuggested != null) {
            try {
                return Patient.Priority.valueOf(aiSuggested.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        return Patient.Priority.GREEN;
    }

    /**
     * Negation-aware keyword search.
     * Skips matches where the keyword is preceded by a negation word.
     */
    private boolean containsKeyword(String text, String keyword) {
        String kw = keyword.toLowerCase();
        int idx = text.indexOf(kw);
        while (idx >= 0) {
            String before = text.substring(0, idx).trim();
            boolean negated = false;
            for (String neg : NEGATION_WORDS) {
                if (before.endsWith(neg)) {
                    negated = true;
                    break;
                }
            }
            if (!negated)
                return true;
            idx = text.indexOf(kw, idx + 1);
        }
        return false;
    }

    private boolean isRedByVitals(String text) {
        // Systolic BP > 160 or < 90
        Pattern bpPattern = Pattern
                .compile("(?:bp|blood pressure)[:\\s]*(\\d{2,3})(?:[/\\s](\\d{2,3}))?|(\\d{2,3})\\s*/\\s*(\\d{2,3})");
        Matcher bpMatcher = bpPattern.matcher(text);
        while (bpMatcher.find()) {
            try {
                String s = bpMatcher.group(1) != null ? bpMatcher.group(1) : bpMatcher.group(3);
                if (s != null) {
                    int systolic = Integer.parseInt(s);
                    if (systolic > 160 || systolic < 90)
                        return true;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        // Heart rate > 110 or < 50
        Pattern pulsePattern = Pattern.compile("(?:pulse|hr|heart rate)[:\\s]*(\\d{2,3})|(\\d{2,3})\\s*bpm");
        Matcher pulseMatcher = pulsePattern.matcher(text);
        while (pulseMatcher.find()) {
            try {
                String s = pulseMatcher.group(1) != null ? pulseMatcher.group(1) : pulseMatcher.group(2);
                if (s != null) {
                    int rate = Integer.parseInt(s);
                    if (rate > 110 || rate < 50)
                        return true;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        // SpO2 < 94%
        Pattern spo2Pattern = Pattern.compile("(?:spo2|o2 sat|oxygen saturation)[:\\s]*(\\d{2,3})");
        Matcher spo2Matcher = spo2Pattern.matcher(text);
        while (spo2Matcher.find()) {
            try {
                int spo2 = Integer.parseInt(spo2Matcher.group(1));
                if (spo2 < 94)
                    return true;
            } catch (NumberFormatException ignored) {
            }
        }

        return false;
    }
}
