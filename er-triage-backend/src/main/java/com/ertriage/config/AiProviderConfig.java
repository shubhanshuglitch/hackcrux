package com.ertriage.config;

import com.ertriage.service.AiExtractionService;
import com.ertriage.service.GeminiService;
import com.ertriage.service.HuggingFaceService;
import com.ertriage.service.LocalExtractorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiProviderConfig {

    private static final Logger logger = LoggerFactory.getLogger(AiProviderConfig.class);

    @Value("${ai.provider:huggingface}")
    private String aiProvider;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url:}")
    private String geminiApiUrl;

    @Value("${hf.api.key:}")
    private String hfApiKey;

    @Value("${hf.api.url:}")
    private String hfApiUrl;

    @Value("${hf.model.id:Qwen/Qwen2.5-7B-Instruct}")
    private String hfModelId;

    @Bean
    public AiExtractionService aiExtractionService(LocalExtractorService localExtractorService) {
        logger.info("=== AI Provider configured: '{}' ===", aiProvider);

        if ("gemini".equalsIgnoreCase(aiProvider)) {
            logger.info("Using Gemini AI extraction service");
            return new GeminiService(localExtractorService, geminiApiKey, geminiApiUrl);
        } else {
            logger.info("Using HuggingFace AI extraction service (model: {})", hfModelId);
            return new HuggingFaceService(localExtractorService, hfApiKey, hfApiUrl, hfModelId);
        }
    }
}
