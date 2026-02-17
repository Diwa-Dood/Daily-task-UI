import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface User {
    userId: number;
    name: string;
    lead1: string;
    lead2: string;
    projects: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly USER_KEY = 'current_user';
    private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
    currentUser$ = this.currentUserSubject.asObservable();

    private getStoredUser(): User | null {
        const stored = localStorage.getItem(this.USER_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                localStorage.removeItem(this.USER_KEY);
                return null;
            }
        }
        return null;
    }

    setUser(user: User) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
    }

    getUser(): User | null {
        return this.currentUserSubject.value;
    }

    isLoggedIn(): boolean {
        return !!this.getUser();
    }

    clearUser() {
        localStorage.removeItem(this.USER_KEY);
        this.currentUserSubject.next(null);
    }
}
