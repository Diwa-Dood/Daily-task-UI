import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user-service';
import { TaskEntryService } from '../../services/task-entry.service';
import { WorkSummaryResponse, SummaryEntry } from '../../model/task-entry.model';
import { TimeFormatPipe } from '../../shared/pipes/time-format.pipe';

/**
 * TaskSummaryComponent — reusable child component that displays today's work summary.
 * Renders inside ChatComponent. Emits an @Output event instead of navigating.
 */
@Component({
    standalone: true,
    selector: 'app-task-summary',
    imports: [CommonModule, TimeFormatPipe],
    templateUrl: './task-summary-component.html',
    styleUrls: ['./task-summary-component.scss']
})
export class TaskSummaryComponent implements OnInit {

    /** Emitted when the user clicks "Add Another Entry" so the parent can switch views. */
    @Output() addAnother = new EventEmitter<void>();

    /**
     * AI-enriched entries pushed from ChatComponent after each submission.
     * When present, the entry list displays these (which carry AI insight fields)
     * instead of the plain DB rows returned by GET /work-summary.
     */
    @Input() enrichedEntries: SummaryEntry[] = [];

    // ── State ────────────────────────────────────────────────────────
    isLoading = true;
    errorMessage = '';
    summary: WorkSummaryResponse | null = null;

    constructor(
        private userService: UserService,
        private taskEntryService: TaskEntryService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadSummary();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['enrichedEntries']) {
            console.log('TaskSummaryComponent: enrichedEntries changed', changes['enrichedEntries'].currentValue);
        }
    }

    /** Reload summary — also called by parent when a new entry is submitted. */
    loadSummary(): void {
        const user = this.userService.getUser();
        if (!user) return;

        this.isLoading = true;
        this.errorMessage = '';

        this.taskEntryService.getSummary(user.userId).subscribe({
            next: (resp) => {
                this.summary = resp;
                this.isLoading = false;
                this.cdr.markForCheck();
            },
            error: () => {
                this.errorMessage = 'Failed to load summary. Please try again.';
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    /** Notify parent to switch back to the task-entry view. */
    onAddAnother(): void {
        this.addAnother.emit();
    }

    /**
     * Returns the entry list to display.
     * Prefers enrichedEntries (AI-decorated, in-memory) when the parent supplies them;
     * falls back to the DB-fetched list from the work-summary API.
     */
    get displayEntries(): SummaryEntry[] {
        if (this.enrichedEntries && this.enrichedEntries.length > 0) {
            return this.enrichedEntries;
        }
        return this.summary?.entries ?? [];
    }

    /** Badge CSS class derived from entry type. */
    badgeClass(type: string): string {
        switch (type) {
            case 'Task': return 'badge-task';
            case 'Meeting': return 'badge-meeting';
            case 'Client Call': return 'badge-client-call';
            default: return 'badge-task';
        }
    }

    /**
     * CSS modifier token derived from the AI quality rating.
     * Drives border colour and badge colour on the AI insight panel.
     *   'Good'               → 'good'   (green)
     *   'Needs Improvement'  → 'warn'   (yellow)
     *   'Poor'               → 'poor'   (red)
     */
    qualityClass(quality: string | undefined): string {
        switch (quality) {
            case 'Good': return 'good';
            case 'Poor': return 'poor';
            default: return 'warn';
        }
    }
}
