import {
  ChangeDetectorRef,
  Component,
  signal,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar-component/sidebar-component';
import { ChatWindowComponent } from '../chat-window-component/chat-window-component';
import { InputBoxComponent } from '../input-box-component/input-box-component';
import { TaskEntryComponent } from '../../task-entry/task-entry-component/task-entry-component';
import { TaskSummaryComponent } from '../../task-summary/task-summary-component/task-summary-component';
import { DraftListComponent } from '../draft-list-component/draft-list-component';
import { TaskEntryService } from '../../services/task-entry.service';
import { UserService } from '../../services/user-service';
import { ManagerAiService } from '../../services/ai-chat-service';
import { EntryType, SummaryEntry, EditableTask } from '../../model/task-entry.model';

/**
 * View modes rendered inside the /chat route.
 *  'chat'    → Default AI chat (ChatWindow + InputBox)
 *  'entry'   → Task entry form (TaskEntryComponent)
 *  'summary' → Work summary screen (TaskSummaryComponent)
 */
export type ChatView = 'chat' | 'entry' | 'summary';

@Component({
  standalone: true,
  selector: 'app-chat',
  imports: [
    CommonModule,
    SidebarComponent,
    ChatWindowComponent,
    InputBoxComponent,
    TaskEntryComponent,
    TaskSummaryComponent,
    DraftListComponent,
  ],
  templateUrl: './chat-component.html',
  styleUrls: ['./chat-component.scss']
})
export class ChatComponent {

  // ── Sidebar (unchanged) ──────────────────────────────────────────
  isSidebarOpen = signal(false);

  // ── Active view inside /chat ─────────────────────────────────────
  currentView: ChatView = 'chat';

  /**
   * Holds the EntryType to pre-select in TaskEntryComponent when the user
   * clicks Meeting or Client Call from the chat action buttons.
   * Cleared back to null after navigating away from the entry view.
   */
  presetEntryType: EntryType | null = null;

  /**
   * Holds an EditableTask payload when the user clicks ✏️ Edit on a chat task.
   * Passed down to TaskEntryComponent to pre-fill the form.
   * Cleared after the form is submitted.
   */
  taskToEdit: EditableTask | null = null;

  // ── Draft entries for DraftListComponent ──────────────────────────
  sessionEntries: SummaryEntry[] = [];

  /** Reference to TaskSummaryComponent so we can trigger a reload. */
  @ViewChild(TaskSummaryComponent)
  summaryRef?: TaskSummaryComponent;

  constructor(
    private taskEntryService: TaskEntryService,
    private userService: UserService,
    private ai: ManagerAiService,
    private cdr: ChangeDetectorRef
  ) { }

  // ── Sidebar ──────────────────────────────────────────────────────
  openSidebar() { this.isSidebarOpen.set(true); }
  closeSidebar() { this.isSidebarOpen.set(false); }

  // ── Tab navigation ───────────────────────────────────────────────
  showChat(): void {
    this.presetEntryType = null;
    this.currentView = 'chat';
  }
  showEntry(): void {
    this.presetEntryType = null;
    this.currentView = 'entry';
  }
  showSummary(): void {
    this.currentView = 'summary';
    // Reload summary data when switching to summary tab
    this.summaryRef?.loadSummary();
  }

  // ── Child component event handlers ───────────────────────────────

  /**
   * Called when TaskEntryComponent emits (submitted).
   * In CREATE mode:
   *  1. Push the new SummaryEntry into sessionEntries immediately — the AI validation
   *     subscription inside TaskEntryComponent mutates the same object reference, so
   *     when it resolves the entry already carries AI fields.
   *  2. Switch view to summary and reload the hours-totals banner from the backend.
   *  3. After the AI result mutates the entry, detectChanges() ensures the Summary
   *     screen re-renders with the AI insight panel.
   * In EDIT mode: switch back to the Chat view so the user sees the updated task card.
   */
  onEntrySubmitted(entry: SummaryEntry): void {
    this.presetEntryType = null;
    const wasEditing = this.taskToEdit !== null;
    this.taskToEdit = null;

    if (wasEditing) {
      // EDIT path: the task was updated in place in the chat stream.
      // Switch back to the Chat view so the user sees the updated task card.
      // Do NOT call notifyEntrySubmitted — that would add a duplicate bubble.
      this.currentView = 'chat';
      return;
    }

    // CREATE path:
    // 1. Immediately add the entry to sessionEntries so it appears in the Summary
    //    entry list right away (with AI fields once the async validation resolves).
    this.sessionEntries = [...this.sessionEntries, entry];
    console.log('ChatComponent: onEntrySubmitted triggered. sessionEntries updated.', this.sessionEntries);

    // 2. Notify the chat stream so the task card appears in the Chat view.
    this.ai.notifyEntrySubmitted(entry);

    // 3. Switch to summary.
    this.currentView = 'summary';

    // 4. After the AI validation resolves inside TaskEntryComponent it mutates the
    //    same `entry` object reference. Schedule a detectChanges() call to force the
    //    Summary screen to re-render with the AI insight panel.
    //    Use a short polling window (500 ms granularity, up to 12 s) so we don't
    //    block the main thread.
    let attempts = 0;
    const maxAttempts = 24;  // 24 × 500 ms = 12 s ceiling
    const pollId = setInterval(() => {
      attempts++;
      console.log(`ChatComponent: Polling for AI result (${attempts}/${maxAttempts}), aiQuality:`, entry.aiQuality);
      if (entry.aiQuality || attempts >= maxAttempts) {
        clearInterval(pollId);
        console.log('ChatComponent: Polling finished. Final entry state:', entry);
      }
      this.cdr.detectChanges();
    }, 500);

    // 5. Reload the hours-totals banner from the backend.
    const user = this.userService.getUser();
    if (user) {
      this.taskEntryService.getSummary(user.userId).subscribe({
        next: () => {
          // Hours-totals are fetched; no need to replace sessionEntries
          // because we manage them in memory for AI enrichment.
          this.summaryRef?.loadSummary();
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Called when TaskSummaryComponent emits (addAnother).
   * Switch view back to the entry form.
   */
  onAddAnother(): void {
    this.presetEntryType = null;
    this.currentView = 'entry';
  }

  /**
   * Called when ChatWindowComponent emits (addNewTaskRequested).
   * Opens Log Entry with no pre-set type (defaults to Task).
   */
  onAddNewTaskFromChat(): void {
    this.presetEntryType = null;
    this.currentView = 'entry';
  }

  /**
   * Called when ChatWindowComponent emits (meetingRequested).
   * Opens Log Entry with Entry Type pre-set to 'Meeting'.
   */
  onMeetingFromChat(type: EntryType): void {
    this.presetEntryType = type;
    this.currentView = 'entry';
  }

  /**
   * Called when ChatWindowComponent emits (clientCallRequested).
   * Opens Log Entry with Entry Type pre-set to 'Client Call'.
   */
  onClientCallFromChat(type: EntryType): void {
    this.presetEntryType = type;
    this.currentView = 'entry';
  }

  /**
   * Called when ChatWindowComponent emits (editTaskRequested).
   * Stores the task data and switches to the entry form for editing.
   */
  onEditTaskFromChat(task: EditableTask): void {
    this.presetEntryType = null;  // edit mode uses taskToEdit, not presetEntryType
    this.taskToEdit = task;
    this.currentView = 'entry';
  }
}
