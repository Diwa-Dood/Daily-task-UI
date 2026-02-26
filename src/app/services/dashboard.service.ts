import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { TeamMember, KpiStats } from '../model/dashboard.model';
import { API_BASE_URL } from '../app.constants';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private membersSubject = new BehaviorSubject<TeamMember[]>([]);
    members$ = this.membersSubject.asObservable();

    private statsSubject = new BehaviorSubject<KpiStats | null>(null);
    stats$ = this.statsSubject.asObservable();

    constructor(private http: HttpClient) { }

    fetchDashboardData(lead: string = 'All Teams', date: string = new Date().toISOString().split('T')[0]): Observable<any> {
        let leadParam = lead === 'All Teams' ? '' : lead;
        // In the real app, we might want to map 'Lead 1 Team' to 'Ravi Kumar'
        if (lead === 'Lead 1 Team') leadParam = 'Ravi Kumar';
        if (lead === 'Lead 2 Team') leadParam = 'Priya Sharma';

        return this.http.get<any>(`${API_BASE_URL}/dashboard?lead=${leadParam}&date=${date}`).pipe(
            tap(response => {
                // Transform backend members to frontend TeamMember model
                const transformedMembers: TeamMember[] = response.members.map((m: any, index: number) => ({
                    id: String(index + 1),
                    name: m.name,
                    avatar: m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
                    done: m.done,
                    inProgress: 0,
                    blocked: 0,
                    hours: m.hours,
                    score: m.qualityScore,
                    status: m.status === 'Submitted' ? 'Active' : 'Low'
                }));

                this.membersSubject.next(transformedMembers);

                // Transform backend metrics to frontend KpiStats model
                const kpiStats: KpiStats = {
                    teamMembers: response.teamMembers,
                    tasksDone: response.tasksDone,
                    inProgressTasks: response.inProgress,
                    blockedTasks: response.blocked,
                    totalHours: response.totalHours,
                    productivityScore: response.compliance
                };
                this.statsSubject.next(kpiStats);
            })
        );
    }

    getKpiStats(): KpiStats | null {
        return this.statsSubject.value;
    }

    getMissingLogsMembers(): TeamMember[] {
        return this.membersSubject.value.filter(m => m.hours === 0);
    }

    getWorstPerformer(): TeamMember | null {
        const activeMembers = this.membersSubject.value.filter(m => m.hours > 0);
        if (activeMembers.length === 0) return null;
        return activeMembers.reduce((prev, curr) => (prev.score < curr.score) ? prev : curr);
    }

    filterByLead(lead: string) {
        this.fetchDashboardData(lead).subscribe();
    }
}
