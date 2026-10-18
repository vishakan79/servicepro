package com.fieldservicely.ai;

/** What the assistant is asked to do. Each task has its own fixed instructions on the server. */
public enum AiTask {
    TRIAGE(true),
    ASSIST(false),
    NOTE_SUMMARY(false),
    ASSIGN(true),
    REPORT_SUMMARY(false),
    CHAT(false),
    ROLE_ASSIST(false);

    private final boolean json;

    AiTask(boolean json) {
        this.json = json;
    }

    public boolean json() {
        return json;
    }
}
