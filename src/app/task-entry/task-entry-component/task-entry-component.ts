import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { UserService } from '../../services/user-service';
import { DailyWorkSetupService, ProjectItem } from '../../services/daily-work-setup.service';
import { TaskEntryService } from '../../services/task-entry.service';
import { WorkEntryRequest, EntryType, SummaryEntry, EditableTask, TaskUpdateRequest, LogValidationRequest } from '../../model/task-entry.model';
import { ManagerAiService } from '../../services/ai-chat-service';
import { ENTRY_TYPES, STATUS_OPTIONS, STATUS_MAP } from '../../constants/app.constants';

/**
 * TaskEntryComponent — reusable child component for logging OR editing a work entry.
 * Renders inside ChatComponent. Uses @Output events instead of router navigation.
 *
 * Edit mode: parent passes [taskToEdit] with pre-filled data.
 *   – Form is pre-filled; on submit the task is updated in the chat stream in place.
 * Create mode: parent passes null (default); on submit a new entry is POSTed to the backend.
 */
@Component({
    standalone: true,
    selector: 'app-task-entry',
    imports: [CommonModule, FormsModule],
    templateUrl: './task-entry-component.html',
    styleUrls: ['./task-entry-component.scss']
})
export class TaskEntryComponent implements OnInit, OnChanges {

    /** Emitted after a successful submission (create or update). Carries the real entry data. */
    @Output() submitted = new EventEmitter<SummaryEntry>();

    /**
     * Optional pre-set entry type passed from ChatComponent when the user
     * clicks "Meeting" or "Client Call" in the chat action buttons.
     */
    @Input() presetEntryType: EntryType | null = null;

    /**
     * When set, the component operates in EDIT mode:
     * the form is pre-filled and submission updates the existing task in the chat stream.
     */
    @Input() taskToEdit: EditableTask | null = null;

    // ── Entry type options ──────────────────────────────────────────
    readonly entryTypes: EntryType[] = [...ENTRY_TYPES] as EntryType[];
    readonly statusOptions = [...STATUS_OPTIONS];

    // ── Form state ──────────────────────────────────────────────────
    selectedType: EntryType = 'Task';
    selectedProjectId: number | null = null;
    description = '';
    logHours: number = 0;
    logMinutes: number = 0;

    // ── Edit-only fields ─────────────────────────────────────────────
    status = 'Done';
    blocker = '';

    // ── Projects (from daily-work-setup API) ─────────────────────────
    projects: ProjectItem[] = [];
    isLoadingProjects = true;
    projectsError = '';

    // ── Searchable dropdown state ────────────────────────────────────
    projectSearch = '';
    showDropdown = false;

    // ── Submission state ────────────────────────────────────────────
    isSubmitting = false;
    submitError = '';

    constructor(
        private userService: UserService,
        private setupService: DailyWorkSetupService,
        private taskEntryService: TaskEntryService,
        private ai: ManagerAiService,
        private cdr: ChangeDetectorRef
    ) { }

    // ── Computed ────────────────────────────────────────────────────

    /** True when the form is being used to edit an existing task. */
    get isEditMode(): boolean {
        return this.taskToEdit !== null;
    }

    /** Project field is shown for Task and Client Call, hidden for Meeting. */
    get showProject(): boolean {
        return this.selectedType !== 'Meeting';
    }

    /** Returns filtered projects based on search input. */
    get filteredProjects(): ProjectItem[] {
        const query = this.projectSearch.trim().toLowerCase();
        if (!query) return this.projects;
        return this.projects.filter(p =>
            p.projectName.toLowerCase().includes(query)
        );
    }

    /** Display label for the selected project (or empty string for placeholder state). */
    get selectedProjectName(): string {
        if (!this.selectedProjectId) return '';
        return this.projects.find(p => p.projectId === this.selectedProjectId)?.projectName ?? '';
    }

    /** Computed decimal hours from the H+M inputs, with correct operator precedence. */
    get decimalHours(): number {
        return (this.logHours ?? 0) + ((this.logMinutes ?? 0) / 60);
    }

    /** Controls whether the Submit button is active. */
    get isFormValid(): boolean {
        if (!this.description.trim()) return false;
        if ((this.logHours ?? 0) < 0) return false;
        if ((this.logMinutes ?? 0) < 0 || (this.logMinutes ?? 0) > 59) return false;
        if (this.decimalHours <= 0) return false;
        if (this.showProject && !this.selectedProjectId) return false;
        return true;
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    ngOnInit(): void {
        this.applyInputs();

        const user = this.userService.getUser();
        if (!user) return;

        this.setupService.getSetupData(user.userId).subscribe({
            next: (resp) => {
                this.projects = resp.projects ?? [];
                this.isLoadingProjects = false;

                // If editing, try to match the project name to an ID
                if (this.taskToEdit?.projectName) {
                    this.preselectProjectByName(this.taskToEdit.projectName);
                }

                this.cdr.markForCheck();
            },
            error: () => {
                this.projectsError = 'Failed to load projects. Please refresh.';
                this.isLoadingProjects = false;
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * React to changes in [taskToEdit] if the parent swaps the task while the component
     * is already mounted (e.g. user edits a second task without leaving the view).
     */
    ngOnChanges(changes: SimpleChanges): void {
        const taskToEditChanged = changes['taskToEdit'] && !changes['taskToEdit'].firstChange;
        const presetTypeChanged = changes['presetEntryType'] && !changes['presetEntryType'].firstChange;

        if (taskToEditChanged || presetTypeChanged) {
            this.applyInputs();
            if (this.taskToEdit?.projectName && this.projects.length) {
                this.preselectProjectByName(this.taskToEdit.projectName);
            }
            this.cdr.markForCheck();
        }
    }

    /**
     * Applies the current @Input values to the form fields.
     * Called from ngOnInit and ngOnChanges so both paths stay in sync.
     */
    private applyInputs(): void {
        if (this.taskToEdit) {
            // EDIT mode — pre-fill all fields from the EditableTask payload
            this.selectedType = this.taskToEdit.entryType;
            this.description = this.taskToEdit.description;
            // Decode stored decimal back to Hours and Minutes
            const stored = this.taskToEdit.logTime ?? 0;
            this.logHours = Math.floor(stored);
            this.logMinutes = Math.round((stored - this.logHours) * 60);
            this.status = this.taskToEdit.status;
            this.blocker = this.taskToEdit.blocker;
            this.projectSearch = '';        // will be set after projects load
            this.selectedProjectId = null;  // resolved by preselectProjectByName
        } else {
            // CREATE mode — apply preset type if provided, otherwise reset
            this.selectedType = this.presetEntryType ?? 'Task';
            this.description = '';
            this.logHours = 0;
            this.logMinutes = 0;
            this.status = 'Done';
            this.blocker = '';
            this.selectedProjectId = null;
            this.projectSearch = '';
        }
        this.submitError = '';
    }

    /**
     * Finds a project by name in the loaded list and selects it.
     * Falls back gracefully if no match is found (project may have been removed).
     */
    private preselectProjectByName(name: string): void {
        const match = this.projects.find(
            p => p.projectName.toLowerCase() === name.toLowerCase()
        );
        if (match) {
            this.selectedProjectId = match.projectId;
            this.projectSearch = match.projectName;
        }
    }

    // ── Searchable dropdown handlers ──────────────────────────────────

    openDropdown(): void {
        if (this.selectedProjectId) {
            this.projectSearch = '';
        }
        this.showDropdown = true;
    }

    closeDropdown(): void {
        setTimeout(() => {
            this.showDropdown = false;
            if (this.selectedProjectId) {
                this.projectSearch = this.selectedProjectName;
            } else {
                this.projectSearch = '';
            }
            this.cdr.markForCheck();
        }, 150);
    }

    selectProject(p: ProjectItem): void {
        this.selectedProjectId = p.projectId;
        this.projectSearch = p.projectName;
        this.showDropdown = false;
        this.submitError = '';
        this.cdr.markForCheck();
    }

    clearProject(): void {
        this.selectedProjectId = null;
        this.projectSearch = '';
        this.showDropdown = false;
        this.cdr.markForCheck();
    }

    // ── Event handlers ──────────────────────────────────────────────

    onTypeChange(): void {
        this.selectedProjectId = null;
        this.projectSearch = '';
        this.showDropdown = false;
        this.submitError = '';
    }

    onSubmit(): void {
        if (!this.isFormValid || this.isSubmitting) return;

        if (this.isEditMode) {
            this.submitUpdate();
        } else {
            this.submitCreate();
        }
    }

    // ── Private submit helpers ───────────────────────────────────────

    /** CREATE path — POST a new work entry to the backend. */
    private submitCreate(): void {
        const user = this.userService.getUser();
        if (!user) return;

        this.isSubmitting = true;
        this.submitError = '';

        const request: WorkEntryRequest = {
            userId: user.userId,
            type: this.selectedType,
            description: this.description.trim(),
            logTime: this.decimalHours,
            blocker: this.blocker.trim() || undefined,
            ...(this.showProject && this.selectedProjectId
                ? { projectId: this.selectedProjectId }
                : {})
        };

        this.taskEntryService.submitEntry(request).subscribe({
            next: (res) => {
                this.isSubmitting = false;

                const submittedEntry: SummaryEntry = {
                    type: this.selectedType,
                    description: this.description.trim(),
                    logTime: this.decimalHours,
                    projectName: this.selectedProjectName || undefined,
                    blocker: this.blocker.trim() || undefined,
                    taskId: res.entryId   // ← thread the DB PK into the chat bubble
                };

                // ── Reset form and notify parent immediately (non-blocking) ─────────
                this.resetForm();
                this.submitted.emit(submittedEntry);
                this.cdr.markForCheck();

                // ── Fire AI validation in the background ──────────────────────
                const validationPayload: LogValidationRequest = {
                    work_desc: submittedEntry.description,
                    log_hours: submittedEntry.logTime,
                    status: STATUS_MAP[this.status] ?? 1,
                    blocker: submittedEntry.blocker ?? null,
                    project: submittedEntry.projectName ?? null,
                };

                console.log('TaskEntryComponent: Triggering AI validation with payload:', validationPayload);

                this.taskEntryService
                    .validateLogEntry(validationPayload)
                    .pipe(catchError((err) => {
                        console.error('TaskEntryComponent: AI validation error:', err);
                        return of(null);
                    }))
                    .subscribe((result) => {
                        console.log('TaskEntryComponent: AI validation result received:', result);
                        if (result) {
                            // Mutate the same object reference already held by the
                            // parent and chat stream — Angular CD picks it up automatically.
                            submittedEntry.aiValidation = result;
                            submittedEntry.aiSummary = result.summary;
                            submittedEntry.aiIssues = result.issues;
                            submittedEntry.aiSuggestions = result.suggestions;
                            submittedEntry.aiQuality = result.quality;
                            this.cdr.detectChanges();
                        }
                    });
            },
            error: (err) => {
                this.isSubmitting = false;
                const detail = err?.error?.detail;
                this.submitError = detail
                    ? `Error: ${detail}`
                    : 'Submission failed. Please try again.';
                this.cdr.markForCheck();
            }
        });
    }

    /**
     * EDIT path — PATCH the task in the database, then update the in-memory chat stream.
     *
     * Safeguards:
     *  1. Validates that taskId is present before making any network call.
     *  2. Sends only the changed fields via TaskUpdateRequest (all fields are optional).
     *  3. Updates the UI BehaviorSubject (ManagerAiService.updateTask) ONLY after the
     *     PATCH request succeeds, keeping the database and UI in sync.
     *  4. Displays an inline error without resetting the form on failure so the user
     *     can retry without losing their edits.
     */
    private submitUpdate(): void {
        if (!this.taskToEdit) return;

        // Safeguard 1: Validate that a DB task ID exists before making any API call.
        if (!this.taskToEdit.taskId) {
            this.submitError =
                'Cannot update: this task was not saved to the database ' +
                '(no task ID). Please delete and re-enter it via the Log Entry form.';
            this.cdr.markForCheck();
            return;
        }

        this.isSubmitting = true;
        this.submitError = '';

        // Safeguard 2: Build a minimal patch — only the fields the user can edit.
        const patch: TaskUpdateRequest = {
            work_desc: this.description.trim(),
            log_hours: this.decimalHours,
            status: this.status,
            blocker: this.blocker || undefined,
            project_id: this.selectedProjectId ?? undefined
        };

        this.taskEntryService.updateEntry(this.taskToEdit.taskId, patch).subscribe({
            next: () => {
                // Safeguard 3: Update the UI BehaviorSubject only AFTER backend confirms success.
                this.ai.updateTask(
                    this.taskToEdit!.msgIndex,
                    this.taskToEdit!.taskIndex,
                    {
                        description: this.description.trim(),
                        hours: this.decimalHours,
                        h: this.logHours,
                        m: this.logMinutes,
                        status: this.status as any,
                        blocker: this.blocker,
                        project: this.selectedProjectName || this.taskToEdit!.projectName,
                        type: this.selectedType
                    }
                );

                const updatedEntry: SummaryEntry = {
                    type: this.selectedType,
                    description: this.description.trim(),
                    logTime: this.decimalHours,
                    projectName: this.selectedProjectName || this.taskToEdit!.projectName || undefined,
                    taskId: this.taskToEdit!.taskId
                };

                this.isSubmitting = false;
                this.resetForm();
                this.submitted.emit(updatedEntry);
                this.cdr.markForCheck();
            },
            error: (err) => {
                // Safeguard 4: Show inline error without clearing the form so the user can retry.
                this.isSubmitting = false;
                const detail = err?.error?.detail;
                this.submitError = detail
                    ? `Update failed: ${detail}`
                    : 'Update failed. Please check your connection and try again.';
                this.cdr.markForCheck();
            }
        });
    }

    private resetForm(): void {
        this.description = '';
        this.logHours = 0;
        this.logMinutes = 0;
        this.selectedProjectId = null;
        this.projectSearch = '';
        this.selectedType = 'Task';
        this.presetEntryType = null;
        this.status = 'Done';
        this.blocker = '';
        this.submitError = '';
    }
}
