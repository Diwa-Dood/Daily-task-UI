import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user-service';
import { Observable } from 'rxjs';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-component.html',
  styleUrls: ['./sidebar-component.scss']
})
export class SidebarComponent {
  userName$: Observable<string>;
  isCollapsed = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) {
    this.userName$ = this.userService.currentUser$.pipe(
      map(user => user?.name || 'User')
    );
  }

  logout() {
    this.userService.clearUser();
    this.router.navigate(['/login']);
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }
}
