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
        <p class="text-zinc-400">{{ message }}</p>
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

  message = '인증 중...';

  async ngOnInit() {
    try {
      // Check for error in URL params (e.g., OAuth error)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');

      if (error) {
        console.error('[Callback] OAuth error:', error, errorDescription);
        this.message = errorDescription || '인증 오류가 발생했습니다.';
        setTimeout(() => {
          this.router.navigate(['/auth']);
        }, 2000);
        return;
      }

      // Wait for Supabase to process the OAuth callback
      // The hash fragment is automatically handled by Supabase client
      await this.waitForSession();

      if (this.supabase.isAuthenticated()) {
        this.message = '로그인 성공! 리다이렉트 중...';
        // Clear the hash from URL for cleaner look
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      } else {
        this.message = '인증에 실패했습니다.';
        setTimeout(() => {
          this.router.navigate(['/auth']);
        }, 1500);
      }
    } catch (error) {
      console.error('[Callback] Auth callback error:', error);
      this.message = '인증 처리 중 오류가 발생했습니다.';
      setTimeout(() => {
        this.router.navigate(['/auth']);
      }, 1500);
    }
  }

  private waitForSession(): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 40; // 4 seconds max (OAuth can be slow)

      const checkSession = setInterval(() => {
        attempts++;

        // Check if loading is complete
        if (!this.supabase.loading()) {
          // Give a small extra delay for state to settle
          setTimeout(() => {
            clearInterval(checkSession);
            resolve();
          }, 100);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkSession);
          resolve();
        }
      }, 100);
    });
  }
}
