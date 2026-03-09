import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../app.constants';
import { WorkEntryRequest, WorkEntryResponse, WorkSummaryResponse, TaskUpdateRequest, LogValidationRequest, LogValidationResponse } from '../model/task-entry.model';

@Injectable({ providedIn: 'root' })
export class TaskEntryService {

    constructor(private http: HttpClient) { }

    /**
     * POST /api/work-entry
     * Submit a single Task / Meeting / Client Call entry for today.
     */
    submitEntry(req: WorkEntryRequest): Observable<WorkEntryResponse> {
        return this.http.post<WorkEntryResponse>(`${API_BASE_URL}/work-entry`, req);
    }

    /**
     * GET /api/work-summary/{userId}
     * Returns today's aggregated summary (total hours, per-type hours, entry list).
     */
    getSummary(userId: number): Observable<WorkSummaryResponse> {
        return this.http.get<WorkSummaryResponse>(`${API_BASE_URL}/work-summary/${userId}`);
    }

    /**
     * PATCH /api/task/{taskId}
     * Partially updates an existing task in the database.
     * Only the fields provided in `patch` are written; omitted fields are left unchanged.
     */
    updateEntry(taskId: number, patch: TaskUpdateRequest): Observable<WorkEntryResponse> {
        return this.http.patch<WorkEntryResponse>(`${API_BASE_URL}/task/${taskId}`, patch);
    }

    /**
     * POST /api/ai/validate-log-entry
     * Stateless — sends a single log entry to Ollama for quality analysis.
     * Does NOT modify the database.
     */
    validateLogEntry(payload: LogValidationRequest): Observable<LogValidationResponse> {
        return this.http.post<LogValidationResponse>(`${API_BASE_URL}/ai/validate-log-entry`, payload);
    }
}
