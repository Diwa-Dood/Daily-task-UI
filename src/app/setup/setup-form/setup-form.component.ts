import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user-service';

interface Project {
    id: string;
    name: string;
    selected: boolean;
}

@Component({
    standalone: true,
    selector: 'app-setup-form',
    imports: [CommonModule, FormsModule],
    templateUrl: './setup-form.component.html',
    styleUrls: ['./setup-form.component.scss']
})
export class SetupFormComponent {
    @Output() setupComplete = new EventEmitter<string[]>();
    @Output() close = new EventEmitter<void>();

    isSubmitting = false;

    constructor(
        private authService: AuthService,
        private userService: UserService
    ) { }

    lead1 = 'Lead 1 – Ravi Kumar';
    lead2 = 'Lead 2 – Priya Sharma';

    projects: Project[] = [
        { id: 'claims', name: 'Claims Portal', selected: false },
        { id: 'policy', name: 'Policy Management', selected: false },
        { id: 'billing', name: 'Billing System', selected: false },
        { id: 'tools', name: 'Internal Tools', selected: false },
        { id: 'support', name: 'Client Support', selected: false }
    ];

    isDropdownOpen = false;
    searchQuery = '';

    get hasSelectedProjects(): boolean {
        return this.projects.some(p => p.selected);
    }

    get selectedProjectNames(): string[] {
        return this.projects.filter(p => p.selected).map(p => p.name);
    }

    get selectedCount(): number {
        return this.projects.filter(p => p.selected).length;
    }

    get filteredProjects(): Project[] {
        if (!this.searchQuery.trim()) {
            return this.projects;
        }
        const query = this.searchQuery.toLowerCase();
        return this.projects.filter(p => p.name.toLowerCase().includes(query));
    }

    toggleDropdown(): void {
        this.isDropdownOpen = !this.isDropdownOpen;
        if (this.isDropdownOpen) {
            this.searchQuery = '';
        }
    }

    toggleProject(project: Project): void {
        project.selected = !project.selected;
    }

    onSearchChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.searchQuery = input.value;
    }

    onSubmit(): void {
        const user = this.userService.getUser();
        if (this.hasSelectedProjects && user) {
            this.isSubmitting = true;
            this.authService.assignProjects(user.userId, this.selectedProjectNames).subscribe({
                next: () => {
                    this.isSubmitting = false;
                    this.setupComplete.emit(this.selectedProjectNames);
                },
                error: (err) => {
                    this.isSubmitting = false;
                    console.error('Project assignment failed', err);
                    // For demo, even if it fails (e.g. user not in storage yet), we proceed
                    this.setupComplete.emit(this.selectedProjectNames);
                }
            });
        }
    }

    onClose(): void {
        this.close.emit();
    }
}
