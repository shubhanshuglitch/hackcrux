package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    private String assignedCareZone;
    private String assignedRoom;
    private String assignedDoctorName;
    private String assignedDoctorSpecialization;
    private String assignedNurseName;
    private String assignedSupportStaff;
    private List<String> assignedEquipment;

    private LocalDateTime timestamp;

    public enum Priority {
        RED, YELLOW, GREEN
    }

    public Patient() {
        this.assignedEquipment = new ArrayList<>();
    }

    public Patient(String id, String name, Integer age, String symptoms, String vitals,
            Priority priority, String rawInput, String assignedCareZone, String assignedRoom,
            String assignedDoctorName, String assignedDoctorSpecialization, String assignedNurseName,
            String assignedSupportStaff, List<String> assignedEquipment, LocalDateTime timestamp) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.symptoms = symptoms;
        this.vitals = vitals;
        this.priority = priority;
        this.rawInput = rawInput;
        this.assignedCareZone = assignedCareZone;
        this.assignedRoom = assignedRoom;
        this.assignedDoctorName = assignedDoctorName;
        this.assignedDoctorSpecialization = assignedDoctorSpecialization;
        this.assignedNurseName = assignedNurseName;
        this.assignedSupportStaff = assignedSupportStaff;
        this.assignedEquipment = assignedEquipment != null ? assignedEquipment : new ArrayList<>();
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

    public String getAssignedCareZone() {
        return assignedCareZone;
    }

    public String getAssignedRoom() {
        return assignedRoom;
    }

    public String getAssignedDoctorName() {
        return assignedDoctorName;
    }

    public String getAssignedDoctorSpecialization() {
        return assignedDoctorSpecialization;
    }

    public String getAssignedNurseName() {
        return assignedNurseName;
    }

    public String getAssignedSupportStaff() {
        return assignedSupportStaff;
    }

    public List<String> getAssignedEquipment() {
        return assignedEquipment;
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

    public void setAssignedCareZone(String assignedCareZone) {
        this.assignedCareZone = assignedCareZone;
    }

    public void setAssignedRoom(String assignedRoom) {
        this.assignedRoom = assignedRoom;
    }

    public void setAssignedDoctorName(String assignedDoctorName) {
        this.assignedDoctorName = assignedDoctorName;
    }

    public void setAssignedDoctorSpecialization(String assignedDoctorSpecialization) {
        this.assignedDoctorSpecialization = assignedDoctorSpecialization;
    }

    public void setAssignedNurseName(String assignedNurseName) {
        this.assignedNurseName = assignedNurseName;
    }

    public void setAssignedSupportStaff(String assignedSupportStaff) {
        this.assignedSupportStaff = assignedSupportStaff;
    }

    public void setAssignedEquipment(List<String> assignedEquipment) {
        this.assignedEquipment = assignedEquipment;
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
        private String assignedCareZone;
        private String assignedRoom;
        private String assignedDoctorName;
        private String assignedDoctorSpecialization;
        private String assignedNurseName;
        private String assignedSupportStaff;
        private List<String> assignedEquipment;
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

        public PatientBuilder assignedCareZone(String assignedCareZone) {
            this.assignedCareZone = assignedCareZone;
            return this;
        }

        public PatientBuilder assignedRoom(String assignedRoom) {
            this.assignedRoom = assignedRoom;
            return this;
        }

        public PatientBuilder assignedDoctorName(String assignedDoctorName) {
            this.assignedDoctorName = assignedDoctorName;
            return this;
        }

        public PatientBuilder assignedDoctorSpecialization(String assignedDoctorSpecialization) {
            this.assignedDoctorSpecialization = assignedDoctorSpecialization;
            return this;
        }

        public PatientBuilder assignedNurseName(String assignedNurseName) {
            this.assignedNurseName = assignedNurseName;
            return this;
        }

        public PatientBuilder assignedSupportStaff(String assignedSupportStaff) {
            this.assignedSupportStaff = assignedSupportStaff;
            return this;
        }

        public PatientBuilder assignedEquipment(List<String> assignedEquipment) {
            this.assignedEquipment = assignedEquipment;
            return this;
        }

        public PatientBuilder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public Patient build() {
            return new Patient(id, name, age, symptoms, vitals, priority, rawInput, assignedCareZone, assignedRoom,
                    assignedDoctorName, assignedDoctorSpecialization, assignedNurseName, assignedSupportStaff,
                    assignedEquipment, timestamp);
        }
    }
}
