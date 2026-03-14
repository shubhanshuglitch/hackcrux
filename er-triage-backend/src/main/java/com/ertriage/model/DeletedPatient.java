package main.java.com.ertriage.model;

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

    private String deleteReason;

    private String deletedBy;

    @Indexed(name = "deleted_patient_ttl_idx", expireAfterSeconds = 0)
    private Date purgeAt;

    public DeletedPatient() {
    }

    public DeletedPatient(String id, Patient patient, List<PatientEvent> events, LocalDateTime deletedAt,
            String deleteReason, String deletedBy, Date purgeAt) {
        this.id = id;
        this.patient = patient;
        this.events = events;
        this.deletedAt = deletedAt;
        this.deleteReason = deleteReason;
        this.deletedBy = deletedBy;
        this.purgeAt = purgeAt;
    }

    public static DeletedPatient from(Patient patient, List<PatientEvent> events, LocalDateTime deletedAt,
            String deleteReason, String deletedBy, Date purgeAt) {
        return new DeletedPatient(patient.getId(), patient, events, deletedAt, deleteReason, deletedBy, purgeAt);
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

    public String getDeleteReason() {
        return deleteReason;
    }

    public String getDeletedBy() {
        return deletedBy;
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

    public void setDeleteReason(String deleteReason) {
        this.deleteReason = deleteReason;
    }

    public void setDeletedBy(String deletedBy) {
        this.deletedBy = deletedBy;
    }

    public void setPurgeAt(Date purgeAt) {
        this.purgeAt = purgeAt;
    }
}