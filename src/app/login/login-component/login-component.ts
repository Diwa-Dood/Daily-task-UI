import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SetupFormComponent } from '../../setup/setup-form/setup-form.component';

import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user-service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, SetupFormComponent],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.scss']
})
export class LoginComponent implements OnInit {
  email = '';
  showSetupForm = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    if (this.userService.isLoggedIn()) {
      console.log('User already logged in, redirecting to chat');
      this.router.navigate(['/chat']);
    }
  }

  login() {
    if (!this.email) return;

    this.errorMessage = '';
    this.isLoading = true;

    this.authService.login(this.email).subscribe({
      next: (user) => {
        this.isLoading = false;
        console.log('Login successful', user);
        this.showSetupForm = true;
        this.cd.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login failed', err);

        if (err.error && err.error.detail) {
          this.errorMessage = err.error.detail;
        } else {
          this.errorMessage = 'Invalid email or password. Please try again.';
        }

        console.log('ErrorMessage set to:', this.errorMessage);
        this.cd.detectChanges();
      }
    });
  }

  onSetupComplete(selectedProjects: number[]) {
    console.log('Setup complete, closing form');
    this.showSetupForm = false;
    this.router.navigate(['/chat']);
  }

  onSetupClose() {
    this.showSetupForm = false;
  }
}
