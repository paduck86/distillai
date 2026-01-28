/**
 * Sidebar Component - Notion-style Navigation
 *
 * 깔끔하고 미니멀한 사이드바
 * - 검색
 * - 새 페이지 버튼
 * - 빠른 접근 (Smart Folders)
 * - 페이지 트리
 */

import { Component, inject, OnInit, output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PageStateService, RecentView } from '../../../core/services/page-state.service';
import { SmartFolder, PageTreeNode } from '../../../core/services/api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { PageTreeComponent } from './page-tree.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, PageTreeComponent],
  template: `
    <aside
      class="w-64 border-r h-full overflow-hidden flex flex-col transition-colors duration-200"
      [class]="theme.isDark() ? 'bg-zinc-900/95 border-zinc-800/80' : 'bg-zinc-50/95 border-zinc-200/80'">

      <!-- Search Box -->
      <div class="px-3 pt-3 pb-2 shrink-0">
        <div class="relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
             [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'"></i>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="페이지 검색..."
            class="w-full pl-9 pr-8 py-2 rounded-lg text-sm transition-all duration-200 outline-none"
            [class]="theme.isDark()
              ? 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-200 placeholder-zinc-500 focus:border-cyan-500/50 focus:bg-zinc-800'
              : 'bg-zinc-100 border border-transparent text-zinc-900 placeholder-zinc-400 focus:border-indigo-500/50 focus:bg-white'" />
          @if (searchQuery()) {
            <button
              (click)="clearSearch()"
              class="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-700/50">
              <i class="pi pi-times text-xs"
                 [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'"></i>
            </button>
          }
        </div>

        <!-- Search Results -->
        @if (searchQuery() && filteredPages().length > 0) {
          <div class="mt-2 max-h-60 overflow-y-auto rounded-lg border"
               [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'">
            @for (page of filteredPages().slice(0, 10); track page.id) {
              <button
                (click)="onSearchResultClick(page)"
                class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                [class]="theme.isDark()
                  ? 'hover:bg-zinc-700 text-zinc-300'
                  : 'hover:bg-zinc-100 text-zinc-700'">
                <i [class]="'pi ' + pageState.getPageIcon(page) + ' text-xs'"
                   [class]="pageState.getPageIconColor(page)"></i>
                <span class="truncate">{{ page.title || 'Untitled' }}</span>
              </button>
            }
            @if (filteredPages().length > 10) {
              <div class="px-3 py-2 text-xs text-center"
                   [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                +{{ filteredPages().length - 10 }}개 더...
              </div>
            }
          </div>
        }

        @if (searchQuery() && filteredPages().length === 0) {
          <div class="mt-2 py-4 text-center text-sm"
               [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
            검색 결과가 없습니다
          </div>
        }
      </div>

      <!-- New Page Button -->
      <div class="px-3 pb-3 shrink-0">
        <button
          (click)="createNewPage()"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
                 hover:-translate-y-0.5 hover:shadow-md"
          [class]="theme.isDark()
            ? 'bg-gradient-to-r from-cyan-500/15 to-cyan-600/10 hover:from-cyan-500/25 hover:to-cyan-600/15 border border-cyan-500/20'
            : 'bg-gradient-to-r from-indigo-500/10 to-indigo-600/5 hover:from-indigo-500/20 hover:to-indigo-600/10 border border-indigo-500/20'">
          <div class="w-6 h-6 rounded-md flex items-center justify-center"
               [class]="theme.isDark() ? 'bg-cyan-500/20' : 'bg-indigo-500/15'">
            <i class="pi pi-plus text-xs"
               [class]="theme.isDark() ? 'text-cyan-400' : 'text-indigo-500'"></i>
          </div>
          <span class="text-sm font-medium"
                [class]="theme.isDark() ? 'text-zinc-200' : 'text-zinc-700'">새 페이지</span>
          <kbd class="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono"
               [class]="theme.isDark() ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-500'">
            ⌘N
          </kbd>
        </button>
      </div>

      <!-- Quick Access Section -->
      <section class="shrink-0 px-2 pb-2">
        <!-- Section Header -->
        <button
          (click)="smartFoldersExpanded.set(!smartFoldersExpanded())"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group"
          [class]="theme.isDark() ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-200/50'">
          <i class="pi text-[10px] transition-transform duration-200"
             [class]="smartFoldersExpanded() ? 'pi-chevron-down' : 'pi-chevron-right'"
             [class.text-zinc-500]="theme.isDark()"
             [class.text-zinc-400]="!theme.isDark()"></i>
          <span class="text-[11px] font-semibold uppercase tracking-wider"
                [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
            빠른 접근
          </span>
        </button>

        @if (smartFoldersExpanded()) {
          <nav class="mt-1 space-y-0.5">
            @for (smart of pageState.smartFolders(); track smart.id) {
              <button
                (click)="selectSmartFolder(smart)"
                class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150"
                [class]="pageState.selectedSmartFolderId() === smart.id && !pageState.selectedPageId()
                  ? (theme.isDark()
                      ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                      : 'bg-indigo-500/10 text-indigo-600 shadow-sm')
                  : (theme.isDark()
                      ? 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                      : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-800')">
                <i [class]="'pi ' + smart.icon + ' text-sm'"
                   [class.text-amber-400]="smart.id === 'favorites'"
                   [class.text-cyan-400]="smart.id === 'recent' && theme.isDark()"
                   [class.text-indigo-400]="smart.id === 'recent' && !theme.isDark()"></i>
                <span class="flex-1 text-left">{{ smart.name }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-md"
                      [class]="theme.isDark() ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-500'">
                  @if (smart.id === 'all') { {{ pageState.totalPageCount() }} }
                  @if (smart.id === 'favorites') { {{ pageState.favoriteCount() }} }
                  @if (smart.id === 'recent') { {{ pageState.recentCount() }} }
                </span>
              </button>
            }
          </nav>
        }
      </section>

      <!-- Divider -->
      <div class="mx-3 border-t"
           [class]="theme.isDark() ? 'border-zinc-800/60' : 'border-zinc-200/80'"></div>

      <!-- Page Tree Section (Scrollable) -->
      <section class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <app-page-tree
          [pages]="pageState.pageTree()"
          [selectedId]="pageState.selectedPageId()"
          (pageSelected)="onPageSelected($event)"
          (createPage)="onCreatePage($event)"
          (deletePage)="onDeletePage($event)"
          (renamePage)="onRenamePage($event)" />
      </section>

      <!-- Recent Views Footer (Collapsible) -->
      @if (pageState.recentViews().length > 0) {
        <section class="shrink-0 border-t"
                 [class]="theme.isDark() ? 'border-zinc-800/60' : 'border-zinc-200/80'">
          <!-- Toggle Header -->
          <button
            (click)="recentExpanded.set(!recentExpanded())"
            class="w-full flex items-center gap-2 px-4 py-2 transition-colors"
            [class]="theme.isDark() ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-100'">
            <i class="pi pi-history text-xs"
               [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'"></i>
            <span class="text-[11px] font-semibold uppercase tracking-wider flex-1 text-left"
                  [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
              최근
            </span>
            <i class="pi text-[10px] transition-transform duration-200"
               [class]="recentExpanded() ? 'pi-chevron-up' : 'pi-chevron-down'"
               [class.text-zinc-500]="theme.isDark()"
               [class.text-zinc-400]="!theme.isDark()"></i>
          </button>

          @if (recentExpanded()) {
            <nav class="px-2 pb-2 space-y-0.5 max-h-28 overflow-y-auto custom-scrollbar">
              @for (recent of pageState.recentViews().slice(0, 4); track recent.id) {
                <button
                  (click)="openRecent(recent)"
                  class="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150"
                  [class]="theme.isDark()
                    ? 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                    : 'text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-800'">
                  <i class="pi pi-file text-xs opacity-40"></i>
                  <span class="flex-1 text-left truncate text-xs">{{ recent.title || 'Untitled' }}</span>
                  <button
                    (click)="removeFromRecent(recent.id, $event)"
                    class="p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0"
                    [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-300'">
                    <i class="pi pi-times text-[10px]"></i>
                  </button>
                </button>
              }
            </nav>
          }
        </section>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    /* Custom scrollbar for recent section */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(128, 128, 128, 0.3);
      border-radius: 2px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 128, 128, 0.5);
    }
  `]
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  pageState = inject(PageStateService);
  theme = inject(ThemeService);

  // UI State
  smartFoldersExpanded = signal(true);
  recentExpanded = signal(false);
  searchQuery = signal('');

  // Output events
  pageSelected = output<string>();
  smartFolderSelected = output<SmartFolder>();
  createPageRequested = output<string | undefined>();

  // Computed: filtered pages based on search
  filteredPages = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    return this.pageState.flattenedPages().filter(page =>
      (page.title || 'Untitled').toLowerCase().includes(query)
    );
  });

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    // ⌘+N or Ctrl+N: New page
    if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
      event.preventDefault();
      this.createNewPage();
    }
    // ⌘+K or Ctrl+K: Focus search
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('input[placeholder="페이지 검색..."]') as HTMLInputElement;
      searchInput?.focus();
    }
  }

  ngOnInit() {
    this.pageState.loadPageTree();
  }

  // ============ Search ============

  clearSearch() {
    this.searchQuery.set('');
  }

  onSearchResultClick(page: PageTreeNode) {
    this.searchQuery.set('');
    this.onPageSelected(page.id);
  }

  // ============ New Page ============

  createNewPage() {
    this.createPageRequested.emit(undefined);
  }

  // ============ Smart Folders ============

  selectSmartFolder(smart: SmartFolder) {
    this.pageState.selectSmartFolder(smart.id);
    this.smartFolderSelected.emit(smart);
  }

  // ============ Page Tree Events ============

  onPageSelected(pageId: string) {
    this.pageState.selectPage(pageId);
    this.pageSelected.emit(pageId);

    // Add to recent views
    const page = this.pageState.flattenedPages().find(p => p.id === pageId);
    if (page) {
      this.pageState.addRecentView(pageId, page.title);
    }

    // Navigate to page
    this.router.navigate(['/page', pageId]);
  }

  async onCreatePage(parentId: string | undefined) {
    await this.pageState.createPage({
      parentId,
      title: '',
    });
  }

  async onDeletePage(pageId: string) {
    // TODO: Show confirmation dialog and call API
    console.log('Delete page:', pageId);
  }

  async onRenamePage(pageId: string) {
    // TODO: Trigger inline rename
    console.log('Rename page:', pageId);
  }

  // ============ Recent Views ============

  openRecent(recent: RecentView) {
    this.pageState.selectPage(recent.id);
    this.pageSelected.emit(recent.id);
    this.router.navigate(['/page', recent.id]);
  }

  removeFromRecent(id: string, event: Event) {
    event.stopPropagation();
    this.pageState.removeRecentView(id);
  }
}
