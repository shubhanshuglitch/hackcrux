package com.ertriage.repository;

import com.ertriage.model.Patient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientRepository extends MongoRepository<Patient, String> {
    List<Patient> findAllByOrderByPriorityAscTimestampAsc();
    List<Patient> findByNameContainingIgnoreCaseOrSymptomsContainingIgnoreCase(String name, String symptoms);
}
