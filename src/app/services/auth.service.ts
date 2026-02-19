import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../app.constants';
import { User, UserService } from './user-service';

export interface LoginResponse extends User { }

@Injectable({ providedIn: 'root' })
export class AuthService {
    constructor(
        private http: HttpClient,
        private userService: UserService
    ) { }

    login(email: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${API_BASE_URL}/login`, { email }).pipe(
            tap(user => this.userService.setUser(user))
        );
    }

    assignProjects(userId: number, projects: string[]): Observable<any> {
        return this.http.post(`${API_BASE_URL}/assign-projects`, { userId, projects }).pipe(
            tap(() => {
                const user = this.userService.getUser();
                if (user) {
                    this.userService.setUser({ ...user, projects });
                }
            })
        );
    }
}
