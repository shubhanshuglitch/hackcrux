package main.java.com.ertriage.repository;

import com.ertriage.model.ResourceZone;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceZoneRepository extends MongoRepository<ResourceZone, String> {
    List<ResourceZone> findByActiveTrueOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);
}