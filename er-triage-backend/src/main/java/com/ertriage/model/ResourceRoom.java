package com.ertriage.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "resource_rooms")
public class ResourceRoom {

    @Id
    private String id;

    private String zoneId;
    private String roomCode;
    private Integer capacity;
    private Boolean active;

    public ResourceRoom() {
    }

    public ResourceRoom(String id, String zoneId, String roomCode, Integer capacity, Boolean active) {
        this.id = id;
        this.zoneId = zoneId;
        this.roomCode = roomCode;
        this.capacity = capacity;
        this.active = active;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}