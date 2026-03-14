package com.ertriage.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class HuggingFaceService implements AiExtractionService {

    private static final Logger logger = LoggerFactory.getLogger(HuggingFaceService.class);

    private final LocalExtractorService localExtractorService;
    private final String apiKey;
    private final String apiUrl;
    private final String modelId;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build();

    public HuggingFaceService(LocalExtractorService localExtractorService, String apiKey, String apiUrl, String modelId) {
        this.localExtractorService = localExtractorService;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.modelId = modelId;
    }

    @Override
    public String refineSpeech(String rawInput) {
        if (apiKey == null || apiKey.isBlank()) {
            return rawInput;
        }

        try {
            String systemPrompt =
                """
                You are a medical speech refinement AI. Your task is to correct typos and misinterpretations in a speech-to-text transcript from an emergency room.
                Focus on correcting medical terms, symptoms, and vital signs that sound similar to common words but are clinically incorrect (e.g., "bloat attack" -> "heart attack", "hi blood pressure" -> "high blood pressure", "low auto" -> "low SpO2").
                
                RULES:
                1. Fix phonetic typos and medical inaccuracies.
                2. Keep the original meaning and structure of the sentence as much as possible.
                3. Do NOT add new information that was not in the input.
                4. Return ONLY the refined transcript text—no explanation, no markdown.
                """;

            String userMessage = "Speech transcript: " + rawInput;

            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelId);
            requestBody.put("messages", List.of(systemMsg, userMsg));
            requestBody.put("max_tokens", 512);
            requestBody.put("temperature", 0.1);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest
                .newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                logger.error("HuggingFace refinement error: {} - {}", response.statusCode(), response.body());
                return rawInput;
            }

            JsonNode root = objectMapper.readTree(response.body());
            String refinedText;

            if (root.has("choices") && root.path("choices").isArray() && root.path("choices").size() > 0) {
                refinedText = root.path("choices").get(0).path("message").path("content").asText();
            } else {
                logger.warn("Unexpected response during refinement: {}", response.body());
                return rawInput;
            }

            return refinedText.trim();
        } catch (Exception e) {
            logger.error("Error during speech refinement: {}", e.getMessage(), e);
            return rawInput;
        }
    }

    @Override
    public Map<String, Object> extractPatientData(String rawInput) {
        if (apiKey == null || apiKey.isBlank()) {
            logger.warn("HuggingFace API key is missing, falling back to local extractor");
            return localExtractorService.extract(rawInput);
        }

        try {
            String systemPrompt =
                """
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

                NEGATION RULE (VERY IMPORTANT):

                If a symptom is explicitly denied or negated, DO NOT treat it as present.

                Examples:
                - "no chest pain" → chest pain is NOT present
                - "denies chest pain" → chest pain is NOT present
                - "without chest pain" → chest pain is NOT present
                - "no difficulty breathing" → breathing difficulty is NOT present

                Only classify a symptom if it is clearly present.

                If the input states "no chest pain", DO NOT classify as RED due to chest pain.

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
                - SpO2 < 94%
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
                """;

            String userMessage = "Clinical input: " + rawInput;

            // Build OpenAI-compatible chat completions request body
            Map<String, Object> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);

            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelId);
            requestBody.put("messages", List.of(systemMsg, userMsg));
            requestBody.put("max_tokens", 512);
            requestBody.put("temperature", 0.1);

            String jsonBody = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest
                .newBuilder()
                .uri(URI.create(apiUrl))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            logger.info(">>> Sending request to HuggingFace API: {} (model: {})", apiUrl, modelId);

            HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );

            // Log the raw response from HuggingFace
            logger.info("<<< HuggingFace API response status: {}", response.statusCode());
            logger.info("<<< HuggingFace API raw response body:\n{}", response.body());

            if (response.statusCode() != 200) {
                logger.error("HuggingFace API error: {} - {}", response.statusCode(), response.body());
                return localExtractorService.extract(rawInput);
            }

            // OpenAI-compatible response: { "choices": [{ "message": { "content": "..." } }] }
            JsonNode root = objectMapper.readTree(response.body());
            String generatedText;

            if (root.has("choices") && root.path("choices").isArray() && root.path("choices").size() > 0) {
                generatedText = root.path("choices").get(0).path("message").path("content").asText();
            } else if (root.isArray() && root.size() > 0) {
                // Legacy format fallback
                generatedText = root.get(0).path("generated_text").asText();
            } else {
                logger.warn("Unexpected HuggingFace response structure: {}", response.body());
                return localExtractorService.extract(rawInput);
            }

            logger.info("<<< HuggingFace generated text:\n{}", generatedText);

            // Clean up markdown code fences if present
            generatedText = generatedText.trim();
            if (generatedText.startsWith("```json")) generatedText =
                generatedText.substring(7);
            else if (generatedText.startsWith("```")) generatedText =
                generatedText.substring(3);
            if (generatedText.endsWith("```")) generatedText =
                generatedText.substring(0, generatedText.length() - 3);
            generatedText = generatedText.trim();

            // Extract JSON from the generated text (model may add text around it)
            int jsonStart = generatedText.indexOf('{');
            int jsonEnd = generatedText.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                generatedText = generatedText.substring(jsonStart, jsonEnd + 1);
            }

            logger.info("<<< Cleaned JSON to parse:\n{}", generatedText);

            JsonNode patientData = objectMapper.readTree(generatedText);

            Map<String, Object> result = new HashMap<>();
            result.put("name", patientData.path("name").asText("Unknown"));
            JsonNode ageNode = patientData.path("age");
            result.put(
                "age",
                (ageNode.isMissingNode() || ageNode.isNull())
                    ? null
                    : ageNode.asInt()
            );
            result.put(
                "symptoms",
                patientData.path("symptoms").asText("Not specified")
            );
            result.put("vitals", patientData.path("vitals").asText("Not recorded"));
            result.put("priority", patientData.path("priority").asText("GREEN"));
            result.put(
                "recommended_specialization",
                patientData
                    .path("recommended_specialization")
                    .asText("Emergency Medicine")
            );

            logger.info("<<< HuggingFace extraction result: {}", result);
            return result;
        } catch (Exception e) {
            logger.error("Error calling HuggingFace API: {}", e.getMessage(), e);
            return localExtractorService.extract(rawInput);
        }
    }
}
