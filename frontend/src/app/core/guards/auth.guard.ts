import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Wait for initial auth check
  while (supabase.loading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (supabase.isAuthenticated()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const guestGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Wait for initial auth check
  while (supabase.loading()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (!supabase.isAuthenticated()) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
