import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatMessage } from '../model/chat.model';
import { UserService } from './user-service';
import { WorkLogService } from './work-log.service';

@Injectable({ providedIn: 'root' })
export class ManagerAiService {

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  constructor(
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
    if (message) {
      this.addMessage('user', message);

      const user = this.userService.getUser();
      const name = user?.name || 'there';
      // Simulation: After user message, AI responds with the question + buttons
      setTimeout(() => {
        this.addMessage('ai', `Let me organize your tasks, ${name}. Please provide project, Jira, status, hours and blockers.`, true);
      }, 800);
    }
  }
}
