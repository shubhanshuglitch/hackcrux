package com.ertriage.service;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.*;

/**
 * Regex-based local extractor — parses age, vitals, and symptoms
 * directly from raw clinical text. Used as fallback when Gemini is unavailable.
 */
@Component
public class LocalExtractorService {

    private static final List<String> NEGATION_WORDS = List.of(
            "no ", "not ", "without ", "denies ", "denying ",
            "resolved ", "stopped ", "controlled ", "negative for ");

    public Map<String, Object> extract(String rawInput) {
        Map<String, Object> result = new HashMap<>();
        String text = rawInput.trim();

        result.put("name", extractName(text));
        result.put("age", extractAge(text));
        result.put("vitals", extractVitals(text));
        result.put("symptoms", extractSymptoms(text));
        result.put("priority", "GREEN"); // Rules engine overrides this anyway

        return result;
    }

    private String extractName(String text) {
        Pattern prefixedNamePattern = Pattern.compile(
                "(?:patient|name is|name:|mr\\.?|mrs\\.?|ms\\.?|dr\\.?)\\s+([A-Z][a-z]+(?:\\s[A-Z][a-z]+)?)",
                Pattern.CASE_INSENSITIVE);
        Matcher prefixed = prefixedNamePattern.matcher(text);
        if (prefixed.find()) {
            return prefixed.group(1).trim();
        }

        // Common intake format: "First Last, 58 years old, ..."
        Pattern leadingNamePattern = Pattern.compile(
                "^\\s*([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2})\\s*(?:,|\\s+-\\s+|\\s+age\\b|\\s+\\d{1,3}\\b)");
        Matcher leading = leadingNamePattern.matcher(text);
        if (leading.find()) {
            return leading.group(1).trim();
        }

        return "Unknown";
    }

    private Integer extractAge(String text) {
        Pattern agePattern = Pattern.compile(
                "(?:age[d]?\\s+)?(\\d{1,3})\\s*[-]?\\s*(?:year[s]?[-\\s]?old|yo\\b)|\\bage\\s+(\\d{1,3})",
                Pattern.CASE_INSENSITIVE);
        Matcher m = agePattern.matcher(text);
        while (m.find()) {
            String val = m.group(1) != null ? m.group(1) : m.group(2);
            try {
                int age = Integer.parseInt(val);
                if (age > 0 && age < 130)
                    return age;
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private String extractVitals(String text) {
        List<String> vitals = new ArrayList<>();

        // Blood Pressure
        Pattern bpPat = Pattern.compile(
                "(?:bp|blood pressure)[:\\s]*([\\d]{2,3}\\s*/\\s*[\\d]{2,3})|\\b([\\d]{2,3}/[\\d]{2,3})\\s*(?:mmhg)?",
                Pattern.CASE_INSENSITIVE);
        Matcher bpM = bpPat.matcher(text);
        if (bpM.find()) {
            String bp = bpM.group(1) != null ? bpM.group(1) : bpM.group(2);
            vitals.add("BP " + bp.replaceAll("\\s+", ""));
        }

        // Pulse/HR
        Pattern pulsePat = Pattern.compile(
                "(?:pulse|hr|heart rate)[:\\s]*(\\d{2,3})|\\b(\\d{2,3})\\s*bpm",
                Pattern.CASE_INSENSITIVE);
        Matcher pulseM = pulsePat.matcher(text);
        if (pulseM.find()) {
            String rate = pulseM.group(1) != null ? pulseM.group(1) : pulseM.group(2);
            vitals.add("Pulse " + rate + " bpm");
        }

        // Temperature
        Pattern tempPat = Pattern.compile(
                "(?:temp(?:erature)?)[:\\s]*([\\d]{2}(?:\\.[\\d])?)|\\b([3-4][\\d](?:\\.[\\d])?)\\s*(?:°?[cC]|degrees)",
                Pattern.CASE_INSENSITIVE);
        Matcher tempM = tempPat.matcher(text);
        if (tempM.find()) {
            String temp = tempM.group(1) != null ? tempM.group(1) : tempM.group(2);
            vitals.add("Temp " + temp + "°C");
        }

        // SpO2
        Pattern spo2Pat = Pattern.compile(
                "(?:spo2|o2 sat|oxygen saturation)[:\\s]*(\\d{2,3})",
                Pattern.CASE_INSENSITIVE);
        Matcher spo2M = spo2Pat.matcher(text);
        if (spo2M.find())
            vitals.add("SpO2 " + spo2M.group(1) + "%");

        return vitals.isEmpty() ? "Not recorded" : String.join(", ", vitals);
    }

    private String extractSymptoms(String text) {
        List<String> knownSymptoms = List.of(
                "chest pain", "chest pressure", "chest tightness",
            "shortness of breath", "difficulty breathing", "breathing difficulty", "dyspnea",
                "nausea", "vomiting", "fever", "headache", "dizziness",
                "abdominal pain", "back pain", "leg pain", "arm pain",
                "confusion", "weakness", "fatigue", "sweating", "diaphoretic",
            "palpitations", "heart failure", "swelling", "edema", "rash", "laceration",
                "fracture", "bleeding", "seizure", "unconscious", "syncope",
                "sore throat", "runny nose", "cough", "diarrhea", "constipation",
                "trauma", "injury", "fall", "accident", "bruising");

        List<String> found = new ArrayList<>();
        String lower = text.toLowerCase();
        for (String symptom : knownSymptoms) {
            int idx = lower.indexOf(symptom);
            if (idx >= 0) {
                // Check negation: skip if preceded by "no ", "not ", etc.
                String before = lower.substring(0, idx);
                boolean negated = NEGATION_WORDS.stream().anyMatch(before::endsWith);
                if (!negated) {
                    found.add(symptom);
                }
            }
        }

        if (found.isEmpty()) {
            return text.length() > 150 ? text.substring(0, 150) + "..." : text;
        }
        return String.join(", ", found);
    }

    public String refineSpeech(String rawInput) {
        return rawInput;
    }
}
