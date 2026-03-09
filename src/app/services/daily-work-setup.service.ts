import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../app.constants';

export interface ProjectItem {
    projectId: number;
    projectName: string;
}

export interface DailyWorkSetupResponse {
    lead1Id: number | null;
    lead1Name: string;
    lead2Id: number | null;
    lead2Name: string;
    projects: ProjectItem[];
}

@Injectable({ providedIn: 'root' })
export class DailyWorkSetupService {
    constructor(private http: HttpClient) { }

    /**
     * Fetches lead names and active projects for the Daily Work Setup popup.
     * Calls GET /api/daily-work-setup/{empId}
     */
    getSetupData(empId: number): Observable<DailyWorkSetupResponse> {
        return this.http.get<DailyWorkSetupResponse>(`${API_BASE_URL}/daily-work-setup/${empId}`);
    }
}
