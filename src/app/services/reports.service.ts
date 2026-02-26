import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../app.constants';
import {
    AiInsightsResponse,
    ChartsResponse,
    MemberPerformance,
    SummaryResponse
} from '../model/reports.model';

@Injectable({ providedIn: 'root' })
export class ReportsService {

    constructor(private http: HttpClient) { }

    /**
     * GET /api/reports/summary
     * Aggregated team productivity metrics for the given date range.
     */
    getSummary(startDate: string, endDate: string, teamId?: number): Observable<SummaryResponse> {
        const params = this._buildParams(startDate, endDate, teamId);
        return this.http.get<SummaryResponse>(`${API_BASE_URL}/reports/summary`, { params });
    }

    /**
     * GET /api/reports/charts
     * Chart-ready data: hours per member, daily trend, status distribution.
     */
    getCharts(startDate: string, endDate: string, teamId?: number): Observable<ChartsResponse> {
        const params = this._buildParams(startDate, endDate, teamId);
        return this.http.get<ChartsResponse>(`${API_BASE_URL}/reports/charts`, { params });
    }

    /**
     * GET /api/reports/team-performance
     * Per-employee performance breakdown with productivity scores.
     */
    getTeamPerformance(startDate: string, endDate: string, teamId?: number): Observable<MemberPerformance[]> {
        const params = this._buildParams(startDate, endDate, teamId);
        return this.http.get<MemberPerformance[]>(`${API_BASE_URL}/reports/team-performance`, { params });
    }

    /**
     * GET /api/reports/ai-insights
     * Ollama-powered team health insights (team_health, risk_level, observations, recommendations).
     */
    getAiInsights(startDate: string, endDate: string, teamId?: number): Observable<AiInsightsResponse> {
        const params = this._buildParams(startDate, endDate, teamId);
        return this.http.get<AiInsightsResponse>(`${API_BASE_URL}/reports/ai-insights`, { params });
    }

    /**
     * GET /api/reports/export-excel
     * Downloads a .xlsx workbook (Summary + Team Performance sheets).
     * Triggers a browser file download automatically.
     */
    exportExcel(startDate: string, endDate: string, teamId?: number): void {
        const params = this._buildParams(startDate, endDate, teamId);
        this.http
            .get(`${API_BASE_URL}/reports/export-excel`, {
                params,
                responseType: 'blob'
            })
            .subscribe({
                next: (blob) => {
                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = `team_report_${startDate}_${endDate}.xlsx`;
                    anchor.click();
                    window.URL.revokeObjectURL(url);
                },
                error: (err) => {
                    console.error('Excel export failed:', err);
                }
            });
    }

    /** Build shared HttpParams for date range + optional team filter. */
    private _buildParams(startDate: string, endDate: string, teamId?: number): HttpParams {
        let params = new HttpParams()
            .set('start_date', startDate)
            .set('end_date', endDate);
        if (teamId !== undefined && teamId !== null) {
            params = params.set('team_id', String(teamId));
        }
        return params;
    }
}
