import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManagerAiService } from '../../services/ai-chat-service';
import { Observable, Subscription } from 'rxjs';
import { ChatMessage, Task } from '../../model/chat.model';
import { EntryType, EditableTask } from '../../model/task-entry.model';
import { TimeFormatPipe } from '../../shared/pipes/time-format.pipe';

@Component({
  standalone: true,
  selector: 'app-chat-window',
  imports: [CommonModule, TimeFormatPipe],
  templateUrl: './chat-window-component.html',
  styleUrls: ['./chat-window-component.scss']
})
export class ChatWindowComponent implements AfterViewInit, OnDestroy {

  messages$: Observable<ChatMessage[]>;
  private sub!: Subscription;

  @ViewChild('scroll') scroll!: ElementRef<HTMLDivElement>;

  /**
   * Emitted when the user clicks "+ Add New Task".
   * The parent (ChatComponent) listens and switches to the Log Entry view.
   */
  @Output() addNewTaskRequested = new EventEmitter<void>();

  /**
   * Emitted when the user clicks "Meeting".
   * Parent switches to Log Entry view with entryType pre-set to 'Meeting'.
   */
  @Output() meetingRequested = new EventEmitter<EntryType>();

  /**
   * Emitted when the user clicks "Client Call".
   * Parent switches to Log Entry view with entryType pre-set to 'Client Call'.
   */
  @Output() clientCallRequested = new EventEmitter<EntryType>();

  /**
   * Emitted when the user clicks ✏️ Edit on a logged task card.
   * Carries the task data + position indices for pre-filling the form and updating in place.
   */
  @Output() editTaskRequested = new EventEmitter<EditableTask>();

  constructor(private ai: ManagerAiService) {
    this.messages$ = this.ai.messages$;
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

  /** Emits meetingRequested so ChatComponent opens Log Entry pre-set to Meeting. */
  onMeetingClick() {
    this.meetingRequested.emit('Meeting');
  }

  /** Emits clientCallRequested so ChatComponent opens Log Entry pre-set to Client Call. */
  onClientCallClick() {
    this.clientCallRequested.emit('Client Call');
  }

  /** Navigates to the Log Entry tab so the user fills in the structured form. */
  onAddNewTaskClick() {
    this.addNewTaskRequested.emit();
  }

  /**
   * Resolves the current message index from the live stream and emits an EditableTask
   * so that ChatComponent can open the form pre-filled with this task's data.
   *
   * @param msg      The ChatMessage that owns the task.
   * @param task     The Task object being edited.
   * @param taskIdx  The task's index within msg.tasks[].
   */
  onEditTask(msg: ChatMessage, task: Task, taskIdx: number): void {
    const messages = this.ai.getMessagesSync();
    const msgIndex = messages.indexOf(msg);
    if (msgIndex === -1) return;

    // Safely map Task.type → EntryType (fall back to 'Task' if unrecognised)
    const validTypes: EntryType[] = ['Task', 'Meeting', 'Client Call'];
    const entryType: EntryType = validTypes.includes(task.type as EntryType)
      ? (task.type as EntryType)
      : 'Task';

    const payload: EditableTask = {
      msgIndex,
      taskIndex: taskIdx,
      taskId: task.taskId,           // DB primary key — required to PATCH the correct row
      entryType,
      projectName: task.project || '',
      description: task.description || '',
      logTime: task.hours || 0,
      status: task.status || 'Done',
      blocker: task.blocker || ''
    };

    this.editTaskRequested.emit(payload);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
