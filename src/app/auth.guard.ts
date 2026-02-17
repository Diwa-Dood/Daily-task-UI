import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserService } from './services/user-service';

export const authGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (userService.isLoggedIn()) {
        return true;
    }

    // Not logged in, redirect to login page
    router.navigate(['/login']);
    return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (userService.isLoggedIn()) {
        // Already logged in, redirect to chat
        router.navigate(['/chat']);
        return false;
    }

    return true;
};
