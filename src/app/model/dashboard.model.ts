export interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    done: number;
    inProgress: number;
    blocked: number;
    hours: number;
    score: number;
    status: 'Active' | 'Low' | 'Blocked';
    tasks?: TaskLog[];
}

export interface TaskLog {
    project: string;
    jira: string;
    description: string;
    status: 'Done' | 'In Progress' | 'Blocked' | 'Planned';
    hours: number;
    blocker: string;
}

export interface KpiStats {
    teamMembers: number;
    tasksDone: number;
    inProgressTasks: number;
    blockedTasks: number;
    totalHours: number;
    productivityScore: number;
}
