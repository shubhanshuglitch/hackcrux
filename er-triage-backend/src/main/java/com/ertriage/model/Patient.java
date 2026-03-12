package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "patients")
public class Patient {

    @Id
    private String id;

    private String name;
    private Integer age;

    private String symptoms;

    private String vitals;

    private Priority priority;

    private String rawInput;

    private LocalDateTime timestamp;

    public enum Priority {
        RED, YELLOW, GREEN
    }

    public Patient() {
    }

    public Patient(String id, String name, Integer age, String symptoms, String vitals,
            Priority priority, String rawInput, LocalDateTime timestamp) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.symptoms = symptoms;
        this.vitals = vitals;
        this.priority = priority;
        this.rawInput = rawInput;
        this.timestamp = timestamp;
    }

    public String getId() {
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

    public Priority getPriority() {
        return priority;
    }

    public String getRawInput() {
        return rawInput;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setId(String id) {
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

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public void setRawInput(String rawInput) {
        this.rawInput = rawInput;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public static PatientBuilder builder() {
        return new PatientBuilder();
    }

    public static class PatientBuilder {
        private String id;
        private String name;
        private Integer age;
        private String symptoms;
        private String vitals;
        private Priority priority;
        private String rawInput;
        private LocalDateTime timestamp;

        public PatientBuilder id(String id) {
            this.id = id;
            return this;
        }

        public PatientBuilder name(String name) {
            this.name = name;
            return this;
        }

        public PatientBuilder age(Integer age) {
            this.age = age;
            return this;
        }

        public PatientBuilder symptoms(String symptoms) {
            this.symptoms = symptoms;
            return this;
        }

        public PatientBuilder vitals(String vitals) {
            this.vitals = vitals;
            return this;
        }

        public PatientBuilder priority(Priority priority) {
            this.priority = priority;
            return this;
        }

        public PatientBuilder rawInput(String rawInput) {
            this.rawInput = rawInput;
            return this;
        }

        public PatientBuilder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public Patient build() {
            return new Patient(id, name, age, symptoms, vitals, priority, rawInput, timestamp);
        }
    }
}
