export interface ChatMessage {
  type: 'ai' | 'user';
  text: string;
  timestamp?: Date;
  showButtons?: boolean;
  tasks?: Task[];
  isSubmitted?: boolean;
  isCheckedOut?: boolean;
}

export interface Task {
  project: string;
  jira: string;
  description: string;
  status: 'Planned' | 'In Progress' | 'Done' | 'Blocked';
  hours: number;
  h?: number;
  m?: number;
  blocker: string;
  type?: string;
}

export interface Status {
  yesterday: string | null;
  today: string | null;
  jira: string | null;
  hours: string | null;
  blockers: string | null;
}

export interface ChatResponse {
  next_step: number;
  question?: string;
  summary?: string;
  status: Status;
}
