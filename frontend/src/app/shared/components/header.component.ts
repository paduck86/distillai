import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="border-b shrink-0 backdrop-blur-md transition-colors z-50"
            [class]="theme.isDark()
              ? 'border-zinc-800 bg-zinc-950/90'
              : 'border-zinc-200/70 bg-white/80 shadow-sm'">
      <div class="px-4 md:px-6 py-3 flex items-center justify-between">
        <!-- Left: Back Button / Menu + Logo -->
        <div class="flex items-center gap-3">
          <!-- Mobile Menu Button (optional) -->
          @if (showMobileMenu()) {
            <button
              (click)="mobileMenuClick.emit()"
              class="p-2 rounded-lg transition-colors md:hidden"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'">
              <i class="pi pi-bars text-lg"></i>
            </button>
          }

          <!-- Back Button (optional) -->
          @if (showBackButton()) {
            <button
              (click)="goBack()"
              class="p-2 rounded-lg transition-colors"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-400'
                : 'hover:bg-zinc-100 text-zinc-500'">
              <i class="pi pi-arrow-left"></i>
            </button>
          }

          <!-- Logo -->
          <div class="flex items-center gap-2 cursor-pointer" (click)="goToDashboard()">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600
                        flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <i class="pi pi-bolt text-white"></i>
            </div>
            <span class="font-bold text-lg hidden sm:inline">Distillai</span>
          </div>

          <!-- Page Title (optional) -->
          @if (pageTitle()) {
            <span class="text-sm font-medium opacity-60 hidden sm:inline ml-2">/ {{ pageTitle() }}</span>
          }
        </div>

        <!-- Right Actions -->
        <div class="flex items-center gap-2">
          <!-- Theme Toggle -->
          <button
            (click)="theme.toggle()"
            class="p-2.5 rounded-xl transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'">
            <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>

          <!-- User Menu -->
          <div class="relative">
            <button
              (click)="toggleUserMenu()"
              class="flex items-center gap-2 p-1.5 rounded-xl transition-colors"
              [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600
                          flex items-center justify-center text-white text-sm font-medium">
                {{ userInitial() }}
              </div>
            </button>

            @if (showUserMenu()) {
              <div class="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl overflow-hidden z-50 border"
                   [class]="theme.isDark()
                     ? 'bg-zinc-900 border-zinc-700'
                     : 'bg-white border-zinc-200'">
                <div class="px-4 py-3 border-b"
                     [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-100'">
                  <p class="text-sm font-medium truncate">{{ userEmail() }}</p>
                  <p class="text-xs opacity-50">Free Plan</p>
                </div>
                <button
                  (click)="signOut()"
                  class="w-full px-4 py-3 text-left text-sm flex items-center gap-2 transition-colors"
                  [class]="theme.isDark()
                    ? 'hover:bg-zinc-800 text-zinc-300'
                    : 'hover:bg-zinc-50 text-zinc-600'">
                  <i class="pi pi-sign-out"></i>
                  <span>로그아웃</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </header>

    <!-- User Menu Overlay -->
    @if (showUserMenu()) {
      <div (click)="showUserMenu.set(false)" class="fixed inset-0 z-40"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class HeaderComponent {
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  theme = inject(ThemeService);

  // Inputs
  showBackButton = input(false);
  showMobileMenu = input(false);
  pageTitle = input<string>('');

  // Outputs
  mobileMenuClick = output<void>();

  // State
  showUserMenu = signal(false);

  userEmail() {
    return this.supabase.user()?.email || 'User';
  }

  userInitial() {
    return this.userEmail().charAt(0).toUpperCase();
  }

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }
}
