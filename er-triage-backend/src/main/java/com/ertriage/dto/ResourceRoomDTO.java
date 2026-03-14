package com.ertriage.dto;

public class ResourceRoomDTO {
    private String id;
    private String roomCode;
    private Integer capacity;
    private Boolean active;
    private Boolean occupied;
    private String currentPatientName;

    public ResourceRoomDTO() {
    }

    public ResourceRoomDTO(String id, String roomCode, Integer capacity, Boolean active, Boolean occupied,
            String currentPatientName) {
        this.id = id;
        this.roomCode = roomCode;
        this.capacity = capacity;
        this.active = active;
        this.occupied = occupied;
        this.currentPatientName = currentPatientName;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public Boolean getOccupied() {
        return occupied;
    }

    public void setOccupied(Boolean occupied) {
        this.occupied = occupied;
    }

    public String getCurrentPatientName() {
        return currentPatientName;
    }

    public void setCurrentPatientName(String currentPatientName) {
        this.currentPatientName = currentPatientName;
    }
}