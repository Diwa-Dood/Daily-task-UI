import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { TeamMember, KpiStats } from '../../model/dashboard.model';
import { SidebarComponent } from '../../chat/sidebar-component/sidebar-component';
import { Observable } from 'rxjs';

@Component({
    standalone: true,
    selector: 'app-dashboard',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './dashboard-component.html',
    styleUrls: ['./dashboard-component.scss']
})
export class DashboardComponent implements OnInit {
    members$: Observable<TeamMember[]>;
    kpis: KpiStats = { teamMembers: 0, tasksDone: 0, inProgressTasks: 0, blockedTasks: 0, totalHours: 0, productivityScore: 0 };

    missingLogsMembers: TeamMember[] = [];
    worstPerformer: TeamMember | null = null;

    selectedLead = 'All Teams';
    selectedDate = 'This Week';

    selectedMember: TeamMember | null = null;
    showDrawer = false;

    constructor(private dashboardService: DashboardService) {
        this.members$ = this.dashboardService.members$;
    }

    ngOnInit() {
        this.dashboardService.stats$.subscribe(stats => {
            if (stats) this.kpis = stats;
        });
        this.refreshDashboard();
    }

    onLeadChange() {
        this.dashboardService.filterByLead(this.selectedLead);
    }

    refreshDashboard() {
        this.dashboardService.fetchDashboardData(this.selectedLead).subscribe();
        this.missingLogsMembers = this.dashboardService.getMissingLogsMembers();
        this.worstPerformer = this.dashboardService.getWorstPerformer();
    }

    openMemberDetails(member: TeamMember) {
        this.selectedMember = member;
        this.showDrawer = true;
    }

    closeDrawer() {
        this.showDrawer = false;
        this.selectedMember = null;
    }

    exportToExcel() {
        // Basic CSV export demo
        let csv = 'Name,Done,In Progress,Blocked,Hours,Score\n';
        this.dashboardService.members$.subscribe(members => {
            members.forEach(m => {
                csv += `${m.name},${m.done},${m.inProgress},${m.blocked},${m.hours},${m.score}\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'team_productivity_report.csv';
            a.click();
        });
    }

    // Simplified chart data getters
    getJiraDistribution() {
        const kpis = this.kpis;
        const total = kpis.tasksDone + kpis.inProgressTasks + kpis.blockedTasks;
        if (total === 0) return [];
        return [
            { label: 'Done', value: kpis.tasksDone, color: '#10a37f', percent: (kpis.tasksDone / total) * 100 },
            { label: 'In Progress', value: kpis.inProgressTasks, color: '#2563eb', percent: (kpis.inProgressTasks / total) * 100 },
            { label: 'Blocked', value: kpis.blockedTasks, color: '#ef4444', percent: (kpis.blockedTasks / total) * 100 }
        ];
    }
}
