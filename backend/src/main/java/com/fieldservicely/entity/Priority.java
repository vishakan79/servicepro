package com.fieldservicely.entity;


public enum Priority {
    HIGH(4), MEDIUM(24), LOW(72);

    private final int slaHours;

    Priority(int slaHours) {
        this.slaHours = slaHours;
    }

    public int slaHours() {
        return slaHours;
    }
}
