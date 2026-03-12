package com.ertriage.repository;

import com.ertriage.model.PatientEvent;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PatientEventRepository extends MongoRepository<PatientEvent, String> {
    List<PatientEvent> findByPatientIdOrderByTimestampAsc(String patientId);

    List<PatientEvent> findByPatientIdInOrderByTimestampAsc(List<String> patientIds);

    void deleteByPatientId(String patientId);
}
