import { Routes } from '@angular/router';
import { LoginComponent } from './login/login-component/login-component';
import { ChatComponent } from './chat/chat-component/chat-component';
import { DashboardComponent } from './dashboard/dashboard-component/dashboard-component';
import { authGuard, loginGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
  { path: 'reports', component: DashboardComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

