/**
 * Models for the Task Entry and Work Summary features.
 */

// ── AI Log Validation ────────────────────────────────────────────────────────

/** Request payload sent to POST /api/ai/validate-log-entry. */
export interface LogValidationRequest {
    work_desc: string;
    log_hours: number;
    status: number;          // 1 = In Progress / Planned, 2 = Done, 3 = Blocked
    blocker: string | null;
    project: string | null;
}

/** Response from POST /api/ai/validate-log-entry. */
export interface LogValidationResponse {
    summary: string;
    issues: string[];
    suggestions: string[];
    quality: 'Good' | 'Needs Improvement' | 'Poor';
}

export type EntryType = 'Task' | 'Meeting' | 'Client Call';

export interface WorkEntryRequest {
    userId: number;
    type: EntryType;
    projectId?: number;
    description: string;
    logTime: number; // decimal hours, e.g. 1.5
    blocker?: string;
}

export interface WorkEntryResponse {
    message: string;
    entryId: number;
}

export interface SummaryEntry {
    type: string;
    description: string;
    projectName?: string;
    logTime: number;
    blocker?: string;
    taskId?: number; // DB primary key returned by POST /work-entry and GET /work-summary

    // ── AI Insight fields (populated asynchronously after a successful create) ──
    /** Structured response from POST /api/ai/validate-log-entry. */
    aiValidation?: LogValidationResponse;
    /** One-sentence overview of the task. */
    aiSummary?: string;
    /** Detected problems with the entry. */
    aiIssues?: string[];
    /** Actionable improvement suggestions. */
    aiSuggestions?: string[];
    /** Overall quality rating: 'Good' | 'Needs Improvement' | 'Poor'. */
    aiQuality?: string;
}

export interface WorkSummaryResponse {
    totalHours: number;
    taskHours: number;
    meetingHours: number;
    clientCallHours: number;
    entries: SummaryEntry[];
}

/**
 * Payload emitted by ChatWindowComponent when the user clicks ✏️ Edit on a logged task.
 * Carries enough data to pre-fill TaskEntryComponent and locate the task in the chat stream
 * for an in-place update after the form is submitted.
 */
export interface EditableTask {
    /** Index of the ChatMessage in the messages BehaviorSubject array. */
    msgIndex: number;
    /** Index of the Task inside msg.tasks[]. */
    taskIndex: number;
    /** Database primary key (DetailTask_ID) — required for PATCH /task/{task_id}. */
    taskId?: number;
    /** Mapped from Task.type → EntryType. */
    entryType: EntryType;
    /** Task.project — used to pre-select the project dropdown. */
    projectName: string;
    description: string;
    /** Decimal hours (e.g. 1.5). */
    logTime: number;
    status: string;
    blocker: string;
}

/** Payload sent to PATCH /api/task/{taskId}. */
export interface TaskUpdateRequest {
    work_desc?: string;
    log_hours?: number;
    status?: string;
    blocker?: string;
    project_id?: number;
}
