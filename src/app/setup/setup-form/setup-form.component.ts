import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user-service';
import { DailyWorkSetupService, DailyWorkSetupResponse, ProjectItem } from '../../services/daily-work-setup.service';

interface SelectableProject extends ProjectItem {
    selected: boolean;
}

@Component({
    standalone: true,
    selector: 'app-setup-form',
    imports: [CommonModule, FormsModule],
    templateUrl: './setup-form.component.html',
    styleUrls: ['./setup-form.component.scss']
})
export class SetupFormComponent implements OnInit {
    @Output() setupComplete = new EventEmitter<number[]>();
    @Output() close = new EventEmitter<void>();

    // ── State ────────────────────────────────────────────────────
    isLoading = true;
    isSubmitting = false;
    errorMessage = '';

    // ── Lead info (populated from API) ──────────────────────────
    lead1Name = '';
    lead2Name = '';

    // ── Projects (populated from API, no mock data) ──────────────
    projects: SelectableProject[] = [];

    // ── Dropdown ─────────────────────────────────────────────────
    isDropdownOpen = false;
    searchQuery = '';

    constructor(
        private authService: AuthService,
        private userService: UserService,
        private dailyWorkSetupService: DailyWorkSetupService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        const user = this.userService.getUser();
        if (!user) {
            this.isLoading = false;
            this.errorMessage = 'Session expired. Please log in again.';
            return;
        }

        console.log('[SetupForm] Before API call — isLoading:', this.isLoading);

        this.dailyWorkSetupService.getSetupData(user.userId).subscribe({
            next: (response: DailyWorkSetupResponse) => {
                console.log('[SetupForm] API response:', response);

                // Bind lead names with null-safe fallback to empty string (no hardcoded names)
                this.lead1Name = response.lead1Name || '';
                this.lead2Name = response.lead2Name || '';

                // Bind projects from API — no mock data
                this.projects = (response.projects ?? []).map(p => ({
                    ...p,
                    selected: false
                }));

                this.isLoading = false;
                console.log('[SetupForm] After API success — isLoading:', this.isLoading);
                // Required for zoneless change detection (provideZonelessChangeDetection)
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('[SetupForm] Failed to load setup data:', err);
                this.errorMessage = 'Failed to load setup data. Please try again.';
                this.isLoading = false;
                console.log('[SetupForm] After API error — isLoading:', this.isLoading);
                // Required for zoneless change detection (provideZonelessChangeDetection)
                this.cdr.markForCheck();
            }
        });
    }

    // ── Computed ─────────────────────────────────────────────────

    get hasSelectedProjects(): boolean {
        return this.projects.some(p => p.selected);
    }

    get selectedProjectIds(): number[] {
        return this.projects.filter(p => p.selected).map(p => p.projectId);
    }

    get selectedCount(): number {
        return this.projects.filter(p => p.selected).length;
    }

    get filteredProjects(): SelectableProject[] {
        if (!this.searchQuery.trim()) {
            return this.projects;
        }
        const query = this.searchQuery.toLowerCase();
        return this.projects.filter(p => p.projectName.toLowerCase().includes(query));
    }

    // ── Dropdown handlers ────────────────────────────────────────

    toggleDropdown(): void {
        this.isDropdownOpen = !this.isDropdownOpen;
        if (this.isDropdownOpen) {
            this.searchQuery = '';
        }
    }

    toggleProject(project: SelectableProject): void {
        project.selected = !project.selected;
    }

    onSearchChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.searchQuery = input.value;
    }

    // ── Submit ───────────────────────────────────────────────────

    onSubmit(): void {
        const user = this.userService.getUser();
        if (!this.hasSelectedProjects || !user) {
            return;
        }

        this.isSubmitting = true;

        // Send projectId (number[]) — backend POST /api/assign-projects expects int[]
        this.authService.assignProjects(user.userId, this.selectedProjectIds).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.setupComplete.emit(this.selectedProjectIds);
            },
            error: (err) => {
                this.isSubmitting = false;
                console.error('[SetupForm] Project assignment failed:', err);
                // Still emit so the user can proceed; backend may have partially succeeded
                this.setupComplete.emit(this.selectedProjectIds);
            }
        });
    }

    onClose(): void {
        this.close.emit();
    }
}
