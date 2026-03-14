package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.List;

@Document(collection = "deleted_patients")
public class DeletedPatient {

    @Id
    private String id;

    private Patient patient;

    private List<PatientEvent> events;

    private LocalDateTime deletedAt;

    @Indexed(name = "deleted_patient_ttl_idx", expireAfterSeconds = 0)
    private Date purgeAt;

    public DeletedPatient() {
    }

    public DeletedPatient(String id, Patient patient, List<PatientEvent> events, LocalDateTime deletedAt, Date purgeAt) {
        this.id = id;
        this.patient = patient;
        this.events = events;
        this.deletedAt = deletedAt;
        this.purgeAt = purgeAt;
    }

    public static DeletedPatient from(Patient patient, List<PatientEvent> events, LocalDateTime deletedAt, Date purgeAt) {
        return new DeletedPatient(patient.getId(), patient, events, deletedAt, purgeAt);
    }

    public String getId() {
        return id;
    }

    public Patient getPatient() {
        return patient;
    }

    public List<PatientEvent> getEvents() {
        return events;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public Date getPurgeAt() {
        return purgeAt;
    }

    public void setId(String id) {
        this.id = id;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public void setEvents(List<PatientEvent> events) {
        this.events = events;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public void setPurgeAt(Date purgeAt) {
        this.purgeAt = purgeAt;
    }
}