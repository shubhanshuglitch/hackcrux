package com.ertriage.dto;

import com.ertriage.model.Patient;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PatientDTO {
    private Long id;
    private String name;
    private Integer age;
    private String symptoms;
    private String vitals;
    private String priority;
    private String rawInput;
    private LocalDateTime timestamp;
    private List<PatientEventDTO> timeline;

    public PatientDTO() {
        this.timeline = new ArrayList<>();
    }

    public PatientDTO(Long id, String name, Integer age, String symptoms, String vitals,
            String priority, String rawInput, LocalDateTime timestamp, List<PatientEventDTO> timeline) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.symptoms = symptoms;
        this.vitals = vitals;
        this.priority = priority;
        this.rawInput = rawInput;
        this.timestamp = timestamp;
        this.timeline = timeline != null ? timeline : new ArrayList<>();
    }

    public static PatientDTO fromEntity(Patient patient) {
        return new PatientDTO(
                patient.getId(), patient.getName(), patient.getAge(),
                patient.getSymptoms(), patient.getVitals(),
                patient.getPriority() != null ? patient.getPriority().name() : "GREEN",
                patient.getRawInput(), patient.getTimestamp(), new ArrayList<>());
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Integer getAge() {
        return age;
    }

    public String getSymptoms() {
        return symptoms;
    }

    public String getVitals() {
        return vitals;
    }

    public String getPriority() {
        return priority;
    }

    public String getRawInput() {
        return rawInput;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public List<PatientEventDTO> getTimeline() {
        return timeline;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public void setSymptoms(String symptoms) {
        this.symptoms = symptoms;
    }

    public void setVitals(String vitals) {
        this.vitals = vitals;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public void setRawInput(String rawInput) {
        this.rawInput = rawInput;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public void setTimeline(List<PatientEventDTO> timeline) {
        this.timeline = timeline;
    }
}
