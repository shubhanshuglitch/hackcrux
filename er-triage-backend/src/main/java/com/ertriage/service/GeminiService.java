package com.ertriage.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final LocalExtractorService localExtractorService;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public GeminiService(LocalExtractorService localExtractorService) {
        this.localExtractorService = localExtractorService;
    }

    public Map<String, Object> extractPatientData(String rawInput) {
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
