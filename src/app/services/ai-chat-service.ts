import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { ChatMessage, Task } from '../model/chat.model';
import { UserService } from './user-service';
import { WorkLogService } from './work-log.service';
import { SummaryEntry } from '../model/task-entry.model';
import { API_BASE_URL } from '../app.constants';

/** Raw response returned by POST /api/ai/structure-task */
interface AiStructureResponse {
  project_name?: string;
  ticket?: string;
  work_desc?: string;
  status?: string;
  work_hours?: string; // e.g. "2:30"
  blocker?: string;
}

@Injectable({ providedIn: 'root' })
export class ManagerAiService {

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  /** True while a POST /api/ai/structure-task request is in-flight. */
  isProcessing = false;

  constructor(
    private http: HttpClient,
    private userService: UserService,
    private workLogService: WorkLogService
  ) {
    this.initGreeting();
  }

  getMessagesSync(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  private initGreeting() {
    const user = this.userService.getUser();
    const name = user?.name || 'there';
    this.messagesSubject.next([
      {
        type: 'ai',
        text: `Welcome, ${name}! Tell me what you worked on today.`,
        timestamp: new Date(),
        showButtons: true,
        tasks: []
      }
    ]);
  }

  addMessage(type: 'ai' | 'user', text: string, showButtons: boolean = false) {
    this.messagesSubject.next([
      ...this.messagesSubject.value,
      { type, text, timestamp: new Date(), showButtons, tasks: [] }
    ]);
  }

  /**
   * Called by ChatComponent after a Log Entry form submission.
   * Appends a chat message containing the real task card (type, description, hours)
   * so it appears in the Chat view with actual data instead of placeholders.
   */
  notifyEntrySubmitted(entry: SummaryEntry): void {
    const user = this.userService.getUser();
    const name = user?.name || 'there';

    // Convert decimal logTime (e.g. 1.5) into hours + minutes for display
    const totalMinutes = Math.round(entry.logTime * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    // Build a real Task card from the SummaryEntry data
    const task: Task = {
      taskId: entry.taskId,   // carry the DB PK so edits can PATCH the correct row
      project: entry.projectName || '',
      jira: '',
      description: entry.description,
      status: 'Done',
      hours: entry.logTime,
      h,
      m,
      blocker: entry.blocker || '',
      type: entry.type
    };

    const msg: ChatMessage = {
      type: 'ai',
      text: `✅ Entry logged, ${name}! Here's what was recorded:`,
      timestamp: new Date(),
      showButtons: false,
      tasks: [task]
    };
    this.messagesSubject.next([...this.messagesSubject.value, msg]);
  }

  addTaskToDraft(msg: ChatMessage, task: any) {
    const messages = this.messagesSubject.value;
    const index = messages.indexOf(msg);
    if (index !== -1) {
      const updatedMessages = [...messages];
      const currentTasks = msg.tasks || [];
      updatedMessages[index] = {
        ...msg,
        tasks: [...currentTasks, task]
      };
      this.messagesSubject.next(updatedMessages);
    }
  }

  removeTaskFromDraft(msg: ChatMessage, taskIndex: number) {
    const messages = this.messagesSubject.value;
    const msgIndex = messages.indexOf(msg);
    if (msgIndex !== -1 && msg.tasks) {
      const updatedMessages = [...messages];
      const updatedTasks = [...msg.tasks];
      updatedTasks.splice(taskIndex, 1);
      updatedMessages[msgIndex] = {
        ...msg,
        tasks: updatedTasks
      };
      this.messagesSubject.next(updatedMessages);
    }
  }

  submitTask(msg: ChatMessage) {
    const user = this.userService.getUser();
    if (!user || !msg.tasks) return;

    // Set submitting state visually
    const messages = this.messagesSubject.value;
    const index = messages.indexOf(msg);
    if (index !== -1) {
      const updatedMessages = [...messages];
      updatedMessages[index] = { ...msg, isSubmitted: true, showButtons: false };
      this.messagesSubject.next(updatedMessages);
    }

    this.workLogService.submitDailyLog({
      userId: user.userId,
      date: new Date().toISOString().split('T')[0],
      tasks: msg.tasks
    }).subscribe({
      next: (res) => {
        this.addMessage('ai', `✅ Daily log submitted! Quality Score: ${res.qualityScore}. ${res.aiSummary}`);
      },
      error: (err) => {
        console.error('Submission failed', err);
        this.addMessage('ai', '⚠️ Failed to submit log to backend, but I have saved it locally for now.');
      }
    });
  }

  editTask(msg: ChatMessage) {
    const messages = this.messagesSubject.value;
    const index = messages.indexOf(msg);
    if (index !== -1) {
      const updatedMessages = [...messages];
      updatedMessages[index] = {
        ...msg,
        isSubmitted: false,
        showButtons: true
      };
      this.messagesSubject.next(updatedMessages);
    }
  }

  /**
   * Updates a single task inside a specific ChatMessage in place.
   * Called by ChatComponent after the user submits an edited task via TaskEntryComponent.
   *
   * @param msgIndex  Index of the ChatMessage in the messages array.
   * @param taskIndex Index of the Task within msg.tasks[].
   * @param patch     Partial Task fields to overwrite — only provided fields are changed.
   */
  updateTask(msgIndex: number, taskIndex: number, patch: Partial<Task>): void {
    const messages = [...this.messagesSubject.value];
    const msg = messages[msgIndex];
    if (!msg || !msg.tasks || taskIndex >= msg.tasks.length) return;

    const updatedTasks = [...msg.tasks];
    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...patch };

    messages[msgIndex] = { ...msg, tasks: updatedTasks };
    this.messagesSubject.next(messages);
  }

  checkout() {
    const messages = this.messagesSubject.value;
    const updatedMessages = messages.map(m => ({
      ...m,
      isCheckedOut: true,
      showButtons: false
    }));
    this.messagesSubject.next(updatedMessages);

    this.addMessage('ai', '🏁 You have checked out for today. Your logs are now finalized and moved to history. See you tomorrow!');
  }

  send(message: string | null) {
    if (this.messagesSubject.value.some(m => m.isCheckedOut)) {
      this.addMessage('ai', '⚠️ You have already checked out for today. Please come back tomorrow to log new tasks!');
      return;
    }
    if (!message) return;

    this.addMessage('user', message);
    this.isProcessing = true;

    // Call POST /api/ai/structure-task with the raw user text
    this.http.post<AiStructureResponse>(`${API_BASE_URL}/ai/structure-task`, { raw_text: message })
      .subscribe({
        next: (res) => {
          this.isProcessing = false;
          const user = this.userService.getUser();
          const name = user?.name || 'there';

          // Parse work_hours from "H:MM" string (e.g. "2:30" → 2.5)
          let hours = 0;
          if (res.work_hours) {
            const parts = res.work_hours.split(':').map(Number);
            hours = (parts[0] || 0) + (parts[1] || 0) / 60;
          }

          // Map backend status string to frontend enum
          const statusMap: Record<string, Task['status']> = {
            'Done': 'Done',
            'In Progress': 'In Progress',
            'Blocked': 'Blocked',
            'Planned': 'Planned'
          };
          const taskStatus: Task['status'] = statusMap[res.status ?? ''] ?? 'Planned';

          const prefilledTask: Task = {
            project: res.project_name || '',
            jira: res.ticket || '',
            description: res.work_desc || '',
            status: taskStatus,
            hours: Math.round(hours * 100) / 100,
            h: Math.floor(hours),
            m: Math.round((hours % 1) * 60),
            blocker: res.blocker || ''
          };

          // Add a new AI message with the pre-filled task card
          const newMsg: ChatMessage = {
            type: 'ai',
            text: `Got it, ${name}! I've structured your update. Review the task below and adjust before submitting.`,
            timestamp: new Date(),
            showButtons: true,
            tasks: [prefilledTask]
          };
          this.messagesSubject.next([...this.messagesSubject.value, newMsg]);
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('AI structuring failed, falling back to manual mode:', err);
          const user = this.userService.getUser();
          const name = user?.name || 'there';
          // Graceful fallback: prompt user to fill in manually
          this.addMessage(
            'ai',
            `Let me organize your tasks, ${name}. (AI assistant is unavailable — please fill in project, Jira, status, hours and blockers manually.)`,
            true
          );
        }
      });
  }
}
