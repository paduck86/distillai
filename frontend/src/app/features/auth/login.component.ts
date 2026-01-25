import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule],
  template: `
    <div class="min-h-screen bg-surface flex">
      <!-- Left Panel - Form -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- Logo -->
          <div class="flex items-center gap-3 mb-8">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent
                        flex items-center justify-center">
              <i class="pi pi-bolt text-white text-xl"></i>
            </div>
            <span class="font-display text-2xl font-bold text-white">Distillai</span>
          </div>

          <!-- Title -->
          <h1 class="font-display text-3xl font-bold text-white mb-2">
            다시 만나서 반갑습니다
          </h1>
          <p class="text-zinc-400 mb-8">
            계정에 로그인하여 지식 증류를 계속하세요
          </p>

          <!-- Google Login -->
          <button
            (click)="signInWithGoogle()"
            [disabled]="isLoading()"
            class="w-full flex items-center justify-center gap-3 bg-white text-zinc-900
                   px-4 py-3 rounded-xl font-medium hover:bg-zinc-100 transition-colors mb-6">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google로 계속하기</span>
          </button>

          <!-- Divider -->
          <div class="flex items-center gap-4 mb-6">
            <div class="flex-1 h-px bg-zinc-700"></div>
            <span class="text-sm text-zinc-500">또는</span>
            <div class="flex-1 h-px bg-zinc-700"></div>
          </div>

          <!-- Email Form -->
          <form (ngSubmit)="signIn()" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1.5">이메일</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="your@email.com"
                class="input w-full"
                required />
            </div>

            <div>
              <label class="block text-sm font-medium text-zinc-300 mb-1.5">비밀번호</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                class="input w-full"
                required />
            </div>

            @if (error()) {
              <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              [disabled]="isLoading()"
              class="btn-primary w-full py-3 flex items-center justify-center gap-2">
              @if (isLoading()) {
                <i class="pi pi-spin pi-spinner"></i>
              }
              <span>로그인</span>
            </button>
          </form>

          <!-- Signup Link -->
          <p class="text-center text-zinc-400 mt-6">
            계정이 없으신가요?
            <a routerLink="/auth/signup" class="text-primary hover:underline ml-1">
              회원가입
            </a>
          </p>
        </div>
      </div>

      <!-- Right Panel - Branding -->
      <div class="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 to-accent/10
                  items-center justify-center p-8 relative overflow-hidden">
        <!-- Background Pattern -->
        <div class="absolute inset-0 opacity-5 bg-dot-pattern"></div>

        <div class="relative text-center">
          <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent
                      flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <i class="pi pi-bolt text-white text-4xl"></i>
          </div>
          <h2 class="font-display text-3xl font-bold text-white mb-4">
            Pure Knowledge from Noise
          </h2>
          <p class="text-zinc-400 max-w-md">
            3시간의 긴 소음에서 순수한 지식만을 증류해내는
            AI 지식 베이스
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class LoginComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  email = '';
  password = '';
  isLoading = signal(false);
  error = signal<string | null>(null);

  async signIn() {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.supabase.signIn(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.supabase.signInWithGoogle();
      // Redirect is handled by Supabase
    } catch (err: any) {
      this.error.set(this.getErrorMessage(err));
      this.isLoading.set(false);
    }
  }

  private getErrorMessage(err: any): string {
    if (err.message?.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (err.message?.includes('Email not confirmed')) {
      return '이메일 인증이 필요합니다. 메일함을 확인해주세요.';
    }
    return '로그인에 실패했습니다. 다시 시도해주세요.';
  }
}
