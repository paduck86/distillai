/**
 * Dashboard Component - Notion-style Page-centric UX
 *
 * 노션처럼 페이지 중심의 깔끔한 대시보드
 * - 사이드바: 페이지 트리 + 스마트 폴더
 * - 메인: 선택된 페이지 또는 환영 화면
 */

import { Component, inject, signal, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ApiService, SmartFolder } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { PageStateService } from '../../core/services/page-state.service';
import { SidebarComponent } from './components/sidebar.component';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="h-screen flex flex-col transition-colors duration-200"
         [class]="theme.isDark() ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'">

      <!-- Header (Minimal) -->
      <header class="border-b shrink-0 backdrop-blur-md transition-colors z-50"
              [class]="theme.isDark()
                ? 'border-zinc-800 bg-zinc-950/90'
                : 'border-zinc-100 bg-white/90'">
        <div class="px-4 py-2.5 flex items-center justify-between">
          <!-- Left: Mobile Menu + Logo -->
          <div class="flex items-center gap-3">
            <!-- Mobile Menu Button -->
            <button
              (click)="sidebarOpen.set(!sidebarOpen())"
              class="p-2 rounded-lg transition-colors md:hidden"
              [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'">
              <i class="pi pi-bars"></i>
            </button>

            <!-- Logo -->
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600
                          flex items-center justify-center">
                <i class="pi pi-bolt text-white text-sm"></i>
              </div>
              <span class="font-semibold hidden sm:inline">Distillai</span>
            </div>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-1">
            <!-- Theme Toggle -->
            <button
              (click)="theme.toggle()"
              class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer
                     focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              [class]="theme.isDark() ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'"
              [title]="theme.isDark() ? '라이트 모드로 전환' : '다크 모드로 전환'">
              <i [class]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                (click)="toggleUserMenu()"
                class="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
                [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'">
                <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600
                            flex items-center justify-center text-white text-xs font-medium">
                  {{ userInitial() }}
                </div>
              </button>

              @if (showUserMenu()) {
                <div class="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-50 border"
                     [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'">
                  <div class="px-4 py-3 border-b"
                       [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-100'">
                    <p class="text-sm font-medium truncate">{{ userEmail() }}</p>
                    <!-- <p class="text-xs opacity-50">Free Plan</p> -->
                  </div>
                  <button
                    (click)="signOut()"
                    class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors"
                    [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'">
                    <i class="pi pi-sign-out"></i>
                    <span>로그아웃</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- Main Layout -->
      <div class="flex flex-1 overflow-hidden relative">
        <!-- Mobile Sidebar Overlay -->
        @if (sidebarOpen()) {
          <div
            (click)="sidebarOpen.set(false)"
            class="fixed inset-0 bg-black/50 z-40 md:hidden">
          </div>
        }

        <!-- Sidebar -->
        <app-sidebar
          class="shrink-0 fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 md:translate-x-0"
          [class]="sidebarOpen() ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
          (smartFolderSelected)="onSmartFolderSelected($event); sidebarOpen.set(false)"
          (pageSelected)="onPageSelected($event); sidebarOpen.set(false)"
          (createPageRequested)="onCreatePageRequested($event)">
        </app-sidebar>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto">
          <!-- Welcome / Landing View -->
          <div class="h-full flex flex-col">
            <!-- Hero Section -->
            <div class="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto">
              <!-- Empty State when no pages -->
              @if (pageState.totalPageCount() === 0) {
                <div class="text-center">
                  <!-- Illustration -->
                  <div class="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center"
                       [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
                    <i class="pi pi-file-edit text-4xl"
                       [class]="theme.isDark() ? 'text-zinc-600' : 'text-zinc-400'"></i>
                  </div>

                  <h1 class="text-2xl font-bold mb-3">Distillai에 오신 것을 환영합니다</h1>
                  <p class="mb-8 max-w-md mx-auto"
                     [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">
                    첫 번째 페이지를 만들어 지식을 정리하세요.
                    유튜브, PDF, 오디오 등 다양한 소스를 AI가 요약해드립니다.
                  </p>

                  <!-- Create First Page Button -->
                  <button
                    (click)="createNewPage()"
                    class="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                           hover:scale-105"
                    [class]="theme.isDark()
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white'">
                    <i class="pi pi-plus"></i>
                    새 페이지 만들기
                  </button>
                </div>
              } @else {
                <!-- Has Pages - Show Quick Actions -->
                <div class="w-full text-center">
                  <!-- Greeting -->
                  <h1 class="text-2xl font-bold mb-2">{{ greeting() }}</h1>
                  <p class="mb-8"
                     [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">
                    무엇을 하시겠어요?
                  </p>

                  <!-- Quick Actions Grid -->
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
                    @for (action of quickActions; track action.id) {
                      <button
                        (click)="onQuickAction(action.id)"
                        class="group flex flex-col items-center gap-3 p-5 rounded-xl border transition-colors cursor-pointer
                               focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        [class]="theme.isDark()
                          ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 bg-white'">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center transition-transform
                                    group-hover:scale-105"
                             [style.backgroundColor]="action.bgColor">
                          <i [class]="'pi ' + action.icon" [style.color]="action.color"></i>
                        </div>
                        <div>
                          <p class="font-medium text-sm">{{ action.label }}</p>
                          <p class="text-xs mt-0.5"
                             [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                            {{ action.description }}
                          </p>
                        </div>
                      </button>
                    }
                  </div>

                  <!-- Recent Pages Section -->
                  @if (recentPages().length > 0) {
                    <div class="text-left">
                      <h2 class="text-sm font-medium mb-3 flex items-center gap-2"
                          [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">
                        <i class="pi pi-clock"></i>
                        최근 페이지
                      </h2>
                      <div class="space-y-1">
                        @for (page of recentPages(); track page.id) {
                          <button
                            (click)="openPage(page.id)"
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                            [class]="theme.isDark()
                              ? 'hover:bg-zinc-800'
                              : 'hover:bg-zinc-50'">
                            <i [class]="'pi ' + pageState.getPageIcon(page)"
                               [class]="pageState.getPageIconColor(page)"></i>
                            <span class="flex-1 truncate">{{ page.title || 'Untitled' }}</span>
                            <span class="text-xs"
                                  [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                              {{ getRelativeTime(page.viewedAt) }}
                            </span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Footer Tip -->
            <div class="py-4 text-center text-xs border-t"
                 [class]="theme.isDark() ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'">
              <div class="flex items-center justify-center gap-6 flex-wrap">
                <span class="inline-flex items-center gap-1.5">
                  <kbd class="px-1.5 py-0.5 rounded text-xs font-mono"
                       [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">⌘N</kbd>
                  새 페이지
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <kbd class="px-1.5 py-0.5 rounded text-xs font-mono"
                       [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">⌘K</kbd>
                  검색
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <kbd class="px-1.5 py-0.5 rounded text-xs font-mono"
                       [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">/</kbd>
                  슬래시 명령어
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- User Menu Overlay -->
      @if (showUserMenu()) {
        <div (click)="showUserMenu.set(false)" class="fixed inset-0 z-40"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);
  private api = inject(ApiService);
  theme = inject(ThemeService);
  pageState = inject(PageStateService);

  // State
  showUserMenu = signal(false);
  sidebarOpen = signal(false);

  // Quick Actions
  quickActions: QuickAction[] = [
    {
      id: 'new-page',
      label: '새 페이지',
      description: '빈 페이지 생성',
      icon: 'pi-file-edit',
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.15)'
    },
    {
      id: 'youtube',
      label: '유튜브',
      description: 'URL로 요약',
      icon: 'pi-youtube',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)'
    },
    {
      id: 'pdf',
      label: 'PDF',
      description: '문서 요약',
      icon: 'pi-file-pdf',
      color: '#f97316',
      bgColor: 'rgba(249, 115, 22, 0.15)'
    },
    {
      id: 'record',
      label: '녹음',
      description: '오디오 캡처',
      icon: 'pi-microphone',
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.15)'
    },
  ];

  // Computed
  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후에요';
    return '좋은 저녁이에요';
  });

  recentPages = computed(() => {
    const recentViews = this.pageState.recentViews();
    const pages = this.pageState.flattenedPages();

    return recentViews
      .slice(0, 5)
      .map(recent => {
        const page = pages.find(p => p.id === recent.id);
        return page ? { ...page, viewedAt: recent.viewedAt } : null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  });

  ngOnInit() {
    // Check authentication - wait for loading to complete
    if (this.supabase.loading()) {
      // Wait for auth to initialize
      const checkAuth = setInterval(() => {
        if (!this.supabase.loading()) {
          clearInterval(checkAuth);
          this.initDashboard();
        }
      }, 100);
    } else {
      this.initDashboard();
    }
  }

  private initDashboard() {
    if (!this.supabase.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Load page tree on init
    this.pageState.loadPageTree();
  }

  userEmail() {
    return this.supabase.user()?.email || 'User';
  }

  userInitial() {
    return this.userEmail().charAt(0).toUpperCase();
  }

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/auth/login']);
  }

  // Page Actions
  async createNewPage() {
    const page = await this.pageState.createPage({ title: '', sourceType: 'note' });
    if (page) {
      this.router.navigate(['/page', page.id]);
    }
  }

  openPage(pageId: string) {
    this.router.navigate(['/page', pageId]);
  }

  // Quick Action Handler
  async onQuickAction(actionId: string) {
    switch (actionId) {
      case 'new-page':
        await this.createNewPage();
        break;
      case 'youtube':
        // Create a page then navigate (YouTube will be imported via slash command)
        const ytPage = await this.pageState.createPage({ title: '', sourceType: 'note' });
        if (ytPage) {
          this.router.navigate(['/page', ytPage.id], { queryParams: { action: 'youtube' } });
        }
        break;
      case 'pdf':
        const pdfPage = await this.pageState.createPage({ title: '', sourceType: 'note' });
        if (pdfPage) {
          this.router.navigate(['/page', pdfPage.id], { queryParams: { action: 'pdf' } });
        }
        break;
      case 'record':
        const recPage = await this.pageState.createPage({ title: '', sourceType: 'note' });
        if (recPage) {
          this.router.navigate(['/page', recPage.id], { queryParams: { action: 'record' } });
        }
        break;
    }
  }

  // Sidebar Events
  onSmartFolderSelected(_smart: SmartFolder) {
    // Just stay on dashboard
  }

  onPageSelected(pageId: string) {
    this.router.navigate(['/page', pageId]);
  }

  async onCreatePageRequested(parentId: string | undefined) {
    const page = await this.pageState.createPage({
      title: '',
      parentId,
      sourceType: 'note'
    });
    if (page) {
      this.router.navigate(['/page', page.id]);
    }
  }

  // Keyboard Shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent) {
    // Ignore if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Cmd/Ctrl + N: New page
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      this.createNewPage();
      return;
    }

    // Cmd/Ctrl + K: Search (placeholder)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      // TODO: Open search modal
      console.log('Search shortcut triggered');
      return;
    }
  }

  // Utilities
  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
  }
}
