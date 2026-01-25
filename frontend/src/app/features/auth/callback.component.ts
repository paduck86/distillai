import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary
                    animate-spin mx-auto mb-6"></div>
        <p class="text-zinc-400">인증 중...</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class CallbackComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  async ngOnInit() {
    // Wait for auth state to be updated
    setTimeout(() => {
      if (this.supabase.isAuthenticated()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/auth/login']);
      }
    }, 1000);
  }
}
