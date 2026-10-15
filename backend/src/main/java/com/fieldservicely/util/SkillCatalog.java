package com.fieldservicely.util;

import java.util.List;
import java.util.Map;

/** Issue types, the technician skills each needs, and the default job checklist. Move to tables when admins need to edit them. */
public final class SkillCatalog {
    private SkillCatalog() {}

    public static final Map<String, List<String>> SKILLS = Map.of(
            "AC Not Cooling", List.of("AC"),
            "AC Maintenance", List.of("AC"),
            "Water Leakage", List.of("Plumbing"),
            "Plumbing", List.of("Plumbing"),
            "Electrical Issue", List.of("Electrical"),
            "Appliance Repair", List.of("Appliance", "Electrical"),
            "Installation", List.of("AC", "Appliance"));

    public static final Map<String, List<String>> CHECKLISTS = Map.of(
            "AC Not Cooling", List.of("Inspect gas pressure", "Check compressor and capacitor", "Clean filters and coils", "Test cooling output"),
            "AC Maintenance", List.of("Clean filters", "Clean indoor and outdoor coils", "Check gas level", "Test thermostat"),
            "Water Leakage", List.of("Locate leak source", "Isolate water supply", "Replace faulty fittings", "Pressure test"),
            "Plumbing", List.of("Inspect pipework", "Fix or replace fittings", "Check water pressure", "Clean up site"),
            "Electrical Issue", List.of("Isolate power", "Test wiring and MCB", "Replace faulty components", "Safety test"),
            "Appliance Repair", List.of("Diagnose fault", "Replace faulty part", "Test full cycle", "Customer walkthrough"),
            "Installation", List.of("Verify site readiness", "Mount and connect unit", "Test operation", "Customer walkthrough"));

    public static boolean isKnown(String issueType) {
        return SKILLS.containsKey(issueType);
    }

    public static List<String> issueTypes() {
        return SKILLS.keySet().stream().sorted().toList();
    }
}
