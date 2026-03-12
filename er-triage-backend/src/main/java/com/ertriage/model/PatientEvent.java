package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "patient_events")
public class PatientEvent {

    @Id
    private String id;

    private String patientId;

    private EventType eventType;

    private String description;

    private String oldPriority;
    private String newPriority;
    private String performedBy;

    private LocalDateTime timestamp;

    public enum EventType {
        INTAKE, REASSESSMENT, PRIORITY_CHANGE, HANDOFF, DISCHARGE
    }

    public PatientEvent() {
    }

    public PatientEvent(String patientId, EventType eventType, String description,
            String oldPriority, String newPriority, String performedBy) {
        this.patientId = patientId;
        this.eventType = eventType;
        this.description = description;
        this.oldPriority = oldPriority;
        this.newPriority = newPriority;
        this.performedBy = performedBy;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public String getPatientId() {
        return patientId;
    }

    public EventType getEventType() {
        return eventType;
    }

    public String getDescription() {
        return description;
    }

    public String getOldPriority() {
        return oldPriority;
    }

    public String getNewPriority() {
        return newPriority;
    }

    public String getPerformedBy() {
        return performedBy;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setOldPriority(String oldPriority) {
        this.oldPriority = oldPriority;
    }

    public void setNewPriority(String newPriority) {
        this.newPriority = newPriority;
    }

    public void setPerformedBy(String performedBy) {
        this.performedBy = performedBy;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
