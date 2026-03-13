package com.ertriage.service;

import java.util.Map;

/**
 * Common interface for AI-based patient data extraction.
 * Implementations: GeminiService (Google Gemini), HuggingFaceService (HuggingFace Inference API).
 */
public interface AiExtractionService {
    Map<String, Object> extractPatientData(String rawInput);
}
