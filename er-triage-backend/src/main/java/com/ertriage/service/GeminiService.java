package com.ertriage.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class GeminiService implements AiExtractionService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    private final LocalExtractorService localExtractorService;
    private final String apiKey;
    private final String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public GeminiService(LocalExtractorService localExtractorService, String apiKey, String apiUrl) {
        this.localExtractorService = localExtractorService;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
    }

    @Override
    public Map<String, Object> extractPatientData(String rawInput) {
        if (apiKey == null || apiKey.isBlank()) {
            return localExtractorService.extract(rawInput);
        }

        try {
            String systemPrompt = """
                    You are a strict emergency room triage AI. Analyze the clinical input and return ONLY a raw JSON object — no markdown, no code fences, no explanation.

                    JSON format:
                    {
                      "name": "Patient name, or 'Unknown' if not stated",
                      "age": <integer or null>,
                      "symptoms": "concise comma-separated symptom list",
                      "vitals": "all vitals mentioned: BP, pulse, temp, SpO2, RR",
                      "priority": "RED or YELLOW or GREEN",
                      "recommended_specialization": "the medical specialization best suited to treat these symptoms"
                    }

                    RECOMMENDED SPECIALIZATION — pick the BEST match:
                    - Cardiologist: chest pain, palpitations, arrhythmia, heart failure, hypertension
                    - Pulmonologist: breathing difficulty, asthma, COPD, pneumonia, SpO2 issues
                    - Neurologist: stroke symptoms, seizures, headache, altered consciousness, numbness
                    - Orthopedic Surgeon: fractures, dislocations, bone/joint injuries, trauma to limbs
                    - Gastroenterologist: abdominal pain, vomiting, diarrhea, GI bleeding
                    - General Surgeon: lacerations, wounds, trauma requiring surgery
                    - Endocrinologist: diabetic emergency, thyroid crisis
                    - Allergist: anaphylaxis, severe allergic reactions
                    - General Physician: mild symptoms, routine check-up, minor ailments

                    PRIORITY CLASSIFICATION — apply the FIRST matching rule:

                    RED (Immediate — life-threatening, assign RED if ANY ONE applies):
                    - Chest pain (any type: crushing, sharp, radiating, pressure)
                    - Difficulty breathing / shortness of breath / dyspnea
                    - Cardiac arrest, unresponsive, unconscious, altered consciousness
                    - Suspected stroke (facial droop, arm weakness, speech difficulty)
                    - Severe trauma (GSW, stabbing, major accident, head injury)
                    - Severe bleeding or hemorrhage
                    - Systolic BP > 160 mmHg or < 90 mmHg
                    - Heart rate (pulse) > 110 bpm or < 50 bpm
                    - SpO2 < 94%%
                    - Anaphylaxis / severe allergic reaction
                    - Seizures (active or post-ictal)
                    - Severe pain (8/10 or higher)
                    - Diabetic emergency (BG < 60 or > 400)

                    YELLOW (Urgent — serious but stable):
                    - Moderate chest discomfort without other RED signs
                    - Fever > 38.5 with systemic symptoms
                    - Moderate pain (4-7/10)
                    - Persistent vomiting or diarrhea with dehydration
                    - Fractures (closed, non-displaced)
                    - Moderate lacerations requiring sutures
                    - BP 140-160 systolic with no other RED signs
                    - Pulse 100-110 bpm with no other RED signs
                    - Acute abdominal pain (moderate)
                    - Confusion in elderly patients

                    GREEN (Standard — non-urgent):
                    - Mild pain (1-3/10)
                    - Minor cuts, bruises, sprains
                    - Mild fever < 38.5, cold symptoms
                    - Routine check-up or prescription refill
                    - Stable chronic condition follow-up

                    IMPORTANT: When in doubt between RED and YELLOW, choose RED.

                    ADDITIONAL CLINICAL EXTRACTION RULES (STRICT):

The following rules improve reliability when extracting vitals and determining priority.

VITAL SIGN EXTRACTION — IMPORTANT

The AI must detect and include ALL vital signs mentioned in the input, including:

Blood Pressure (BP)
Heart Rate / Pulse (HR)
Temperature (Celsius OR Fahrenheit)
SpO2 (oxygen saturation)
Respiratory Rate (RR)

Recognize the following formats:

Blood Pressure examples:
- BP 170/110
- BP: 170/110
- Blood pressure 170 over 110
- blood pressure is 170/110

Heart Rate examples:
- HR 120
- Pulse 120
- heart rate 120 bpm
- pulse 120

Temperature examples (IMPORTANT):
Temperature may be in Celsius OR Fahrenheit.

Examples:
- Temp 39C
- Temperature 39°C
- Temp 102F
- Temperature 102°F
- fever 102F

If temperature is in Fahrenheit above 100.4°F → treat as fever.

SpO2 examples:
- SpO2 92%
- oxygen saturation 92%
- O2 sat 92%

Respiratory rate examples:
- RR 24
- respiratory rate 24

Always include these values in the "vitals" field exactly as found.

--------------------------------------------------

NEGATION HANDLING — VERY IMPORTANT

If the clinical input explicitly denies a symptom, DO NOT treat it as present.

Examples of negation:
- no chest pain
- denies chest pain
- without chest pain
- no shortness of breath
- denies breathing difficulty

These symptoms must NOT be used for priority classification.

Example:
Input: "no chest pain but BP 170/110"

Correct interpretation:
Symptoms → none related to chest pain
Vitals → BP 170/110
Priority → RED (due to BP)

--------------------------------------------------

RETRIAGE RULE

If updated symptoms or vitals are provided, ALWAYS re-evaluate the triage priority from scratch.

Ignore previous triage decisions.

Example:
Previous: chest pain
Updated: no chest pain, BP 104/85

Correct result:
Priority should NOT remain RED unless another RED rule applies.

--------------------------------------------------

SEVERE VITAL SIGN OVERRIDE

Even if symptoms appear mild, the following vitals MUST trigger RED priority:

- BP > 160 systolic
- BP < 90 systolic
- Heart rate > 110 bpm
- Heart rate < 50 bpm
- SpO2 < 94%
- Temperature > 104°F or > 40°C

Vitals override symptom severity.

--------------------------------------------------

SPECIALIST SELECTION IMPROVEMENTS

If multiple symptoms exist, choose the MOST life-threatening system.

Examples:
Chest pain + high BP → Cardiologist
Breathing difficulty + low SpO2 → Pulmonologist
Stroke symptoms → Neurologist
Fracture + trauma → Orthopedic Surgeon

If symptoms are unclear → General Physician.

--------------------------------------------------

DATA QUALITY RULE

Never invent symptoms or vitals.

If information is missing:
- name → "Unknown"
- age → null
- vitals → "Not recorded"

--------------------------------------------------

OUTPUT REQUIREMENT

Return ONLY the JSON object.

Do NOT include:
- explanations
- markdown
- code blocks
- extra text

                    Clinical input: %s
                    """
                    .formatted(rawInput);

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", systemPrompt);

            Map<String, Object> part = new HashMap<>();
            part.put("parts", List.of(textPart));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("contents", List.of(part));

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("Gemini API error: " + response.statusCode() + " - " + response.body());
                return localExtractorService.extract(rawInput);
            }

            JsonNode root = objectMapper.readTree(response.body());
            String generatedText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text")
                    .asText();

            generatedText = generatedText.trim();
            if (generatedText.startsWith("```json"))
                generatedText = generatedText.substring(7);
            else if (generatedText.startsWith("```"))
                generatedText = generatedText.substring(3);
            if (generatedText.endsWith("```"))
                generatedText = generatedText.substring(0, generatedText.length() - 3);
            generatedText = generatedText.trim();

            JsonNode patientData = objectMapper.readTree(generatedText);

            Map<String, Object> result = new HashMap<>();
            result.put("name", patientData.path("name").asText("Unknown"));
            result.put("age", patientData.path("age").isNull() ? null : patientData.path("age").asInt());
            result.put("symptoms", patientData.path("symptoms").asText("Not specified"));
            result.put("vitals", patientData.path("vitals").asText("Not recorded"));
            result.put("priority", patientData.path("priority").asText("GREEN"));
            result.put("recommended_specialization", patientData.path("recommended_specialization").asText("Emergency Medicine"));
            return result;

        } catch (Exception e) {
            System.err.println("Error calling Gemini API: " + e.getMessage());
            return localExtractorService.extract(rawInput);
        }
    }
}
