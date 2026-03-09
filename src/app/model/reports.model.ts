/**
 * Reports module interfaces.
 * Mirrors the Pydantic schemas defined in:
 *   enterprise_worklog_backend/schemas/report_schema.py
 */

// ── GET /api/reports/summary ────────────────────────────────────────────────

export interface SummaryResponse {
    team_members: number;
    tasks_done: number;
    in_progress: number;
    blocked: number;
    hours_logged: number;
    productivity_score: number;
}

// ── GET /api/reports/charts ─────────────────────────────────────────────────

export interface HoursPerMember {
    emp_id: number;
    hours: number;
}

export interface DailyTrendPoint {
    date: string;   // ISO date string e.g. "2026-02-19"
    hours: number;
    tasks_done: number;
}

export interface StatusDistribution {
    done: number;
    in_progress: number;
    blocked: number;
    planned: number;
}

export interface ChartsResponse {
    hours_per_member: HoursPerMember[];
    daily_trend: DailyTrendPoint[];
    status_distribution: StatusDistribution;
}

// ── GET /api/reports/team-performance ───────────────────────────────────────

export interface MemberPerformance {
    emp_id: number;
    done: number;
    in_progress: number;
    blocked: number;
    hours: number;
    score: number;
    status: string;   // "Excellent" | "Good" | "Average" | "Needs Attention"
}

// ── GET /api/reports/ai-insights ────────────────────────────────────────────

export interface AiInsightsResponse {
    team_health: string;
    risk_level: string;
    observations: string[];
    recommendations: string[];
}
