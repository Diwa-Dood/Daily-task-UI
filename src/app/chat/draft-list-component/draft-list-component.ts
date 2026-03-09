import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SummaryEntry } from '../../model/task-entry.model';
import { TimeFormatPipe } from '../../shared/pipes/time-format.pipe';

/**
 * DraftListComponent — displays the running list of submitted entries
 * for the current session as a compact inline list inside ChatComponent.
 */
@Component({
    standalone: true,
    selector: 'app-draft-list',
    imports: [CommonModule, TimeFormatPipe],
    template: `
        <div class="draft-list" *ngIf="entries && entries.length > 0">
            <h3 class="draft-title">Session Entries</h3>
            <div class="draft-row" *ngFor="let e of entries">
                <span class="draft-badge" [ngClass]="badgeClass(e.type)">{{ e.type }}</span>
                <span class="draft-desc">{{ e.description }}</span>
                <span class="draft-hours">{{ e.logTime | timeFormat }}</span>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; font-family: 'Inter', sans-serif; }

        .draft-list {
            margin: 1rem 0;
            padding: 1rem 1.25rem;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 0.75rem;
        }

        .draft-title {
            font-size: 0.8125rem;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0 0 0.75rem;
        }

        .draft-row {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            padding: 0.4rem 0;
            border-bottom: 1px solid rgba(255,255,255,0.04);
            &:last-child { border-bottom: none; }
        }

        .draft-badge {
            font-size: 0.65rem;
            font-weight: 600;
            padding: 0.15rem 0.5rem;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            white-space: nowrap;
        }

        .badge-task        { background: rgba(59,130,246,0.2);  color: #93c5fd; border: 1px solid rgba(59,130,246,0.35); }
        .badge-meeting     { background: rgba(16,185,129,0.2);  color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); }
        .badge-client-call { background: rgba(245,158,11,0.2);  color: #fcd34d; border: 1px solid rgba(245,158,11,0.35); }

        .draft-desc  { flex: 1; font-size: 0.85rem; color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .draft-hours { font-size: 0.85rem; font-weight: 700; color: #a5b4fc; white-space: nowrap; }
    `]
})
export class DraftListComponent {
    /** Entries passed down from ChatComponent (summary.entries from the latest API call). */
    @Input() entries: SummaryEntry[] = [];

    badgeClass(type: string): string {
        switch (type) {
            case 'Task': return 'badge-task';
            case 'Meeting': return 'badge-meeting';
            case 'Client Call': return 'badge-client-call';
            default: return 'badge-task';
        }
    }
}
