import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerAiService } from '../../services/ai-chat-service';
import { UserService } from '../../services/user-service';
import { Observable, Subscription } from 'rxjs';
import { ChatMessage, Task } from '../../model/chat.model';

@Component({
  standalone: true,
  selector: 'app-chat-window',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-window-component.html',
  styleUrls: ['./chat-window-component.scss']
})
export class ChatWindowComponent implements AfterViewInit, OnDestroy {

  messages$: Observable<ChatMessage[]>;
  private sub!: Subscription;

  @ViewChild('scroll') scroll!: ElementRef<HTMLDivElement>;

  jiraButtons = ['CLM-101', 'CLM-102', 'CLM-103', 'CLM-104', 'CLM-105', 'CLM-106', 'CLM-107'];

  constructor(
    private ai: ManagerAiService,
    private userService: UserService
  ) {
    this.messages$ = this.ai.messages$;
  }

  get userProjects(): string[] {
    const user = this.userService.getUser();
    return (user?.projects && user.projects.length > 0) ? user.projects : ['Internal', 'Claims Portal', 'Common'];
  }

  ngAfterViewInit() {
    this.sub = this.messages$.subscribe(() => {
      setTimeout(() => {
        if (this.scroll) {
          const el = this.scroll.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  getAvailableJiraButtons(msg: ChatMessage) {
    let allUsedJiras: string[] = [];

    // Get all messages current value
    const messages: ChatMessage[] = this.ai.getMessagesSync();

    messages.forEach((m: ChatMessage) => {
      if (m.tasks) {
        m.tasks.forEach((t: Task) => {
          if (t.jira) allUsedJiras.push(t.jira);
        });
      }
    });

    return this.jiraButtons.filter(jira => !allUsedJiras.includes(jira));
  }

  syncHours(task: Task) {
    const h = task.h || 0;
    const m = task.m || 0;
    task.hours = h + (m / 60);
  }

  onJiraClick(msg: ChatMessage, jira: string) {
    this.ai.addTaskToDraft(msg, {
      project: 'Claims Portal',
      jira: jira,
      description: 'API development',
      status: 'In Progress',
      h: 2,
      m: 0,
      hours: 2,
      blocker: 'None'
    });
  }

  onMeetingClick(msg: ChatMessage) {
    this.ai.addTaskToDraft(msg, {
      project: 'Internal',
      jira: '',
      description: 'Meeting',
      status: 'Done',
      h: 1,
      m: 0,
      hours: 1,
      blocker: 'None',
      type: 'Meeting'
    });
  }

  onClientCallClick(msg: ChatMessage) {
    this.ai.addTaskToDraft(msg, {
      project: 'Internal',
      jira: '',
      description: 'Client Call',
      status: 'Done',
      h: 1,
      m: 0,
      hours: 1,
      blocker: 'None',
      type: 'Client Call'
    });
  }

  onAddNewTaskClick(msg: ChatMessage) {
    this.ai.addTaskToDraft(msg, {
      project: '',
      jira: '',
      description: '',
      status: 'Planned',
      h: 0,
      m: 0,
      hours: 0,
      blocker: '',
      type: 'Add New Task'
    });
  }

  onDeleteTask(msg: ChatMessage, index: number) {
    this.ai.removeTaskFromDraft(msg, index);
  }

  onSubmit(msg: ChatMessage) {
    this.ai.submitTask(msg);
  }

  onEdit(msg: ChatMessage) {
    this.ai.editTask(msg);
  }

  onCheckout() {
    this.ai.checkout();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
