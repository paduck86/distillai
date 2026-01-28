/**
 * Landing Page Component
 *
 * 로그인 전 랜딩 페이지
 * Cyber Laboratory 테마 적용
 * 로그인/회원가입 탭 통합
 */

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';

type AuthMode = 'login' | 'signup';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#0a0a0a] flex flex-col relative overflow-hidden">
      <!-- Animated Background -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <!-- Gradient Orbs -->
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl"></div>

        <!-- Grid Pattern -->
        <div class="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>

        <!-- Floating Particles -->
        <div class="absolute top-20 left-[20%] w-2 h-2 bg-cyan-400/40 rounded-full animate-float"></div>
        <div class="absolute top-40 right-[30%] w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-float delay-500"></div>
        <div class="absolute bottom-32 left-[40%] w-2 h-2 bg-cyan-400/30 rounded-full animate-float delay-1000"></div>
        <div class="absolute top-1/3 right-[15%] w-1 h-1 bg-white/30 rounded-full animate-float delay-700"></div>
      </div>

      <!-- Header -->
      <header class="relative z-10 px-6 py-4">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500
                        flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v7.36l-7-3.5V8.82zm9 10.86v-7.36l7-3.5v7.36l-7 3.5z"/>
              </svg>
            </div>
            <span class="text-xl font-bold text-white tracking-tight">Distillai</span>
          </div>

          <!-- Language Toggle -->
          <div class="flex items-center gap-4">
            <button class="text-sm text-zinc-500 hover:text-white transition-colors">
              한국어
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div class="w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <!-- Left: Hero Content -->
          <div class="text-center lg:text-left">
            <!-- Tagline -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                        bg-gradient-to-r from-cyan-500/10 to-purple-500/10
                        border border-cyan-500/20 mb-6">
              <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span class="text-sm text-cyan-400">AI-Powered Knowledge Distillation</span>
            </div>

            <!-- Headline -->
            <h1 class="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
              <span class="block">Distill the</span>
              <span class="bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400
                          bg-clip-text text-transparent">
                Essence
              </span>
            </h1>

            <p class="text-lg text-zinc-400 max-w-lg mx-auto lg:mx-0 mb-8">
              긴 강의에서 핵심만을 추출하세요.
              AI가 3시간 강의를 5분 요약으로 증류합니다.
            </p>

            <!-- Features -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
              <div class="glass-card p-4 rounded-xl text-center">
                <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-microphone text-cyan-400"></i>
                </div>
                <h4 class="text-sm font-medium text-white">실시간 캡처</h4>
                <p class="text-xs text-zinc-500 mt-1">탭 오디오 녹음</p>
              </div>
              <div class="glass-card p-4 rounded-xl text-center">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-bolt text-purple-400"></i>
                </div>
                <h4 class="text-sm font-medium text-white">AI 요약</h4>
                <p class="text-xs text-zinc-500 mt-1">Gemini 기반</p>
              </div>
              <div class="glass-card p-4 rounded-xl text-center">
                <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                  <i class="pi pi-comments text-blue-400"></i>
                </div>
                <h4 class="text-sm font-medium text-white">Agent D</h4>
                <p class="text-xs text-zinc-500 mt-1">AI 대화 학습</p>
              </div>
            </div>
          </div>

          <!-- Right: Auth Card -->
          <div class="w-full max-w-md mx-auto lg:mx-0">
            <div class="glass-card rounded-2xl p-8 shadow-2xl shadow-black/20">
              <!-- Tab Switcher -->
              <div class="flex bg-zinc-800/50 rounded-xl p-1 mb-8">
                <button
                  (click)="setMode('login')"
                  class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                  [class]="mode() === 'login'
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'text-zinc-400 hover:text-white'">
                  로그인
                </button>
                <button
                  (click)="setMode('signup')"
                  class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
                  [class]="mode() === 'signup'
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'text-zinc-400 hover:text-white'">
                  회원가입
                </button>
              </div>

              <!-- Google Auth -->
              <button
                (click)="signInWithGoogle()"
                [disabled]="isLoading()"
                class="w-full flex items-center justify-center gap-3 bg-white text-zinc-900
                       px-4 py-3 rounded-xl font-medium hover:bg-zinc-100 transition-all
                       shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google로 {{ mode() === 'login' ? '계속하기' : '시작하기' }}</span>
              </button>

              <!-- Divider -->
              <div class="flex items-center gap-4 my-6">
                <div class="flex-1 h-px bg-zinc-700/50"></div>
                <span class="text-xs text-zinc-500 uppercase tracking-wider">또는</span>
                <div class="flex-1 h-px bg-zinc-700/50"></div>
              </div>

              <!-- Login Form -->
              @if (mode() === 'login') {
                <form (ngSubmit)="signIn()" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">이메일</label>
                    <div class="relative">
                      <i class="pi pi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="email"
                        [(ngModel)]="email"
                        name="email"
                        placeholder="your&#64;email.com"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        required />
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">비밀번호</label>
                    <div class="relative">
                      <i class="pi pi-lock absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="password"
                        [(ngModel)]="password"
                        name="password"
                        placeholder="••••••••"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        required />
                    </div>
                  </div>

                  @if (error()) {
                    <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 text-sm px-4 py-3 rounded-xl animate-shake">
                      <i class="pi pi-exclamation-circle"></i>
                      <span>{{ error() }}</span>
                    </div>
                  }

                  <button
                    type="submit"
                    [disabled]="isLoading()"
                    class="w-full py-3 rounded-xl font-medium text-white
                           bg-gradient-to-r from-cyan-500 to-cyan-600
                           hover:from-cyan-400 hover:to-cyan-500
                           shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40
                           transition-all hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2">
                    @if (isLoading()) {
                      <i class="pi pi-spin pi-spinner"></i>
                    }
                    <span>로그인</span>
                  </button>
                </form>
              }

              <!-- Signup Form -->
              @if (mode() === 'signup') {
                <form (ngSubmit)="signUp()" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">이름 (선택)</label>
                    <div class="relative">
                      <i class="pi pi-user absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="text"
                        [(ngModel)]="name"
                        name="name"
                        placeholder="홍길동"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">이메일</label>
                    <div class="relative">
                      <i class="pi pi-envelope absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="email"
                        [(ngModel)]="email"
                        name="email"
                        placeholder="your&#64;email.com"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        required />
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">비밀번호</label>
                    <div class="relative">
                      <i class="pi pi-lock absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="password"
                        [(ngModel)]="password"
                        name="password"
                        placeholder="최소 6자 이상"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        required />
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-300 mb-1.5">비밀번호 확인</label>
                    <div class="relative">
                      <i class="pi pi-lock absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm"></i>
                      <input
                        type="password"
                        [(ngModel)]="confirmPassword"
                        name="confirmPassword"
                        placeholder="비밀번호를 다시 입력하세요"
                        class="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                               text-white placeholder:text-zinc-500 outline-none
                               focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        required />
                    </div>
                  </div>

                  @if (error()) {
                    <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/20
                                text-red-400 text-sm px-4 py-3 rounded-xl animate-shake">
                      <i class="pi pi-exclamation-circle"></i>
                      <span>{{ error() }}</span>
                    </div>
                  }

                  @if (success()) {
                    <div class="flex items-center gap-2 bg-green-500/10 border border-green-500/20
                                text-green-400 text-sm px-4 py-3 rounded-xl">
                      <i class="pi pi-check-circle"></i>
                      <span>{{ success() }}</span>
                    </div>
                  }

                  <button
                    type="submit"
                    [disabled]="isLoading()"
                    class="w-full py-3 rounded-xl font-medium text-white
                           bg-gradient-to-r from-cyan-500 to-cyan-600
                           hover:from-cyan-400 hover:to-cyan-500
                           shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40
                           transition-all hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2">
                    @if (isLoading()) {
                      <i class="pi pi-spin pi-spinner"></i>
                    }
                    <span>무료로 시작하기</span>
                  </button>

                  <p class="text-xs text-zinc-500 text-center">
                    회원가입 시
                    <a href="#" class="text-cyan-400 hover:underline">이용약관</a> 및
                    <a href="#" class="text-cyan-400 hover:underline">개인정보처리방침</a>에 동의합니다.
                  </p>
                </form>
              }
            </div>

            <!-- Social Proof -->
            <div class="mt-6 text-center">
              <p class="text-sm text-zinc-500">
                <span class="text-cyan-400 font-medium">1,000+</span> 명이 이미 사용 중
              </p>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="relative z-10 px-6 py-6 border-t border-zinc-800/50">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-zinc-500">
            &copy; 2025 Distillai. Distill the Essence.
          </p>
          <div class="flex items-center gap-6">
            <a href="#" class="text-sm text-zinc-500 hover:text-white transition-colors">이용약관</a>
            <a href="#" class="text-sm text-zinc-500 hover:text-white transition-colors">개인정보처리방침</a>
            <a href="#" class="text-sm text-zinc-500 hover:text-white transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .glass-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .bg-grid-pattern {
      background-image:
        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 50px 50px;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    @keyframes pulse-slow {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.05); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    .animate-pulse-slow {
      animation: pulse-slow 8s ease-in-out infinite;
    }

    .animate-shake {
      animation: shake 0.3s ease-in-out;
    }

    .delay-500 {
      animation-delay: 0.5s;
    }

    .delay-700 {
      animation-delay: 0.7s;
    }

    .delay-1000 {
      animation-delay: 1s;
    }
  `]
})
export class LandingComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  mode = signal<AuthMode>('login');
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  ngOnInit() {
    // Set mode based on current route
    const path = this.router.url;
    if (path.includes('signup')) {
      this.mode.set('signup');
    }
  }
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  setMode(newMode: AuthMode) {
    this.mode.set(newMode);
    this.error.set(null);
    this.success.set(null);
    this.password = '';
    this.confirmPassword = '';
  }

  async signIn() {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.supabase.signIn(this.email, this.password);
      await this.waitForAuth();
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(this.getLoginErrorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async signUp() {
    if (!this.email || !this.password) return;

    // Validate password length
    if (this.password.length < 6) {
      this.error.set('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    // Validate passwords match
    if (this.password !== this.confirmPassword) {
      this.error.set('비밀번호가 일치하지 않습니다.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.supabase.signUp(this.email, this.password, this.name);
      this.success.set('인증 메일이 발송되었습니다. 이메일을 확인해주세요.');
      // Clear form
      this.password = '';
      this.confirmPassword = '';
    } catch (err: any) {
      this.error.set(this.getSignupErrorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle() {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.supabase.signInWithGoogle();
    } catch (err: any) {
      this.error.set('Google 로그인에 실패했습니다. 다시 시도해주세요.');
      this.isLoading.set(false);
    }
  }

  private waitForAuth(): Promise<void> {
    return new Promise((resolve) => {
      const checkAuth = setInterval(() => {
        if (this.supabase.isAuthenticated()) {
          clearInterval(checkAuth);
          resolve();
        }
      }, 50);

      setTimeout(() => {
        clearInterval(checkAuth);
        resolve();
      }, 2000);
    });
  }

  private getLoginErrorMessage(err: any): string {
    if (err.message?.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.';
    }
    if (err.message?.includes('Email not confirmed')) {
      return '이메일 인증이 필요합니다. 메일함을 확인해주세요.';
    }
    return '로그인에 실패했습니다. 다시 시도해주세요.';
  }

  private getSignupErrorMessage(err: any): string {
    if (err.message?.includes('already registered')) {
      return '이미 등록된 이메일입니다.';
    }
    if (err.message?.includes('Password should be at least')) {
      return '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    if (err.message?.includes('Invalid email')) {
      return '올바른 이메일 주소를 입력해주세요.';
    }
    if (err.code === 'over_email_send_rate_limit' || err.message?.includes('rate limit')) {
      return '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }
    return '회원가입에 실패했습니다. 다시 시도해주세요.';
  }
}
