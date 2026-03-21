package com.ertriage.repository;

import com.ertriage.model.ResourceRoom;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRoomRepository extends MongoRepository<ResourceRoom, String> {
    List<ResourceRoom> findByZoneIdInAndActiveTrueOrderByRoomCodeAsc(List<String> zoneIds);

    List<ResourceRoom> findByActiveTrueOrderByRoomCodeAsc();

    boolean existsByRoomCodeIgnoreCase(String roomCode);
}