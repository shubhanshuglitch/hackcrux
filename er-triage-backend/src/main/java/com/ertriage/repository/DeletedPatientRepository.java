package com.ertriage.repository;

import com.ertriage.model.DeletedPatient;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeletedPatientRepository extends MongoRepository<DeletedPatient, String> {
    List<DeletedPatient> findAllByOrderByDeletedAtDesc();
}