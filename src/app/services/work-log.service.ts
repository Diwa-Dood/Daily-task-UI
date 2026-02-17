import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../app.constants';
import { Task } from '../model/chat.model';

export interface DailyLogRequest {
    userId: number;
    date: string;
    tasks: Task[];
}

export interface DailyLogResponse {
    message: string;
    qualityScore: number;
    totalHours: number;
    aiSummary: string;
}

@Injectable({ providedIn: 'root' })
export class WorkLogService {
    constructor(private http: HttpClient) { }

    submitDailyLog(request: DailyLogRequest): Observable<DailyLogResponse> {
        return this.http.post<DailyLogResponse>(`${API_BASE_URL}/daily-log`, request);
    }

    getMemberDetails(userId: number, date: string): Observable<any> {
        return this.http.get(`${API_BASE_URL}/member/${userId}?date=${date}`);
    }
}
