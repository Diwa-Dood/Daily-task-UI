import { environment } from '../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const ENTRY_TYPES = ['Task', 'Meeting', 'Client Call'] as const;

export const STATUS_OPTIONS = ['Done', 'In Progress', 'Planned', 'Blocked'] as const;

export const STATUS_MAP: Record<string, number> = {
    'Done': 2,
    'In Progress': 1,
    'Planned': 1,
    'Blocked': 3,
};

export const DATE_FILTERS = [
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
    'Custom Range'
] as const;
