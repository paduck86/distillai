import { Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageStateService, RecentView } from '../../../core/services/page-state.service';
import { SmartFolder } from '../../../core/services/api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { PageTreeComponent } from './page-tree.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, PageTreeComponent],
  template: `
    <aside
      class="w-64 border-r h-full overflow-hidden flex flex-col transition-colors"
      [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'">

      <!-- New Page Button -->
      <div class="p-3 border-b shrink-0"
           [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
        <button
          (click)="createNewPage()"
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
          [class]="theme.isDark()
            ? 'border-zinc-700 bg-zinc-800/50 hover:border-cyan-500/50 hover:bg-cyan-500/10'
            : 'border-zinc-200 bg-zinc-50 hover:border-cyan-400 hover:bg-cyan-50'">
          <i class="pi pi-plus text-sm"
             [class]="theme.isDark() ? 'text-cyan-400' : 'text-cyan-500'"></i>
          <span class="text-sm"
                [class]="theme.isDark() ? 'text-zinc-300' : 'text-zinc-600'">새 페이지</span>
        </button>
      </div>

      <!-- Smart Folders Section -->
      <section class="shrink-0 border-b"
               [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
        <!-- Header (clickable to collapse) -->
        <button
          (click)="smartFoldersExpanded.set(!smartFoldersExpanded())"
          class="w-full flex items-center justify-between px-4 py-2 transition-colors"
          [class]="theme.isDark() ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'">
          <span class="text-xs font-medium uppercase tracking-wider opacity-50">
            빠른 접근
          </span>
          <i class="pi text-xs opacity-50"
             [class]="smartFoldersExpanded() ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
        </button>

        @if (smartFoldersExpanded()) {
          <nav class="px-2 pb-2 space-y-0.5">
            @for (smart of pageState.smartFolders(); track smart.id) {
              <button
                (click)="selectSmartFolder(smart)"
                class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                [class]="pageState.selectedSmartFolderId() === smart.id && !pageState.selectedPageId()
                  ? (theme.isDark() ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
                  : (theme.isDark() ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100')">
                <i [class]="'pi ' + smart.icon"
                   [class.text-yellow-400]="smart.id === 'favorites'"></i>
                <span class="flex-1 text-left">{{ smart.name }}</span>
                @if (smart.id === 'all') {
                  <span class="text-xs opacity-50">{{ pageState.totalPageCount() }}</span>
                }
                @if (smart.id === 'favorites') {
                  <span class="text-xs opacity-50">{{ pageState.favoriteCount() }}</span>
                }
                @if (smart.id === 'recent') {
                  <span class="text-xs opacity-50">{{ pageState.recentCount() }}</span>
                }
              </button>
            }
          </nav>
        }
      </section>

      <!-- Page Tree Section (takes remaining space) -->
      <section class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <app-page-tree
          [pages]="pageState.pageTree()"
          [selectedId]="pageState.selectedPageId()"
          (pageSelected)="onPageSelected($event)"
          (createPage)="onCreatePage($event)"
          (deletePage)="onDeletePage($event)"
          (renamePage)="onRenamePage($event)" />
      </section>

      <!-- Footer: Recent Views (collapsible) -->
      @if (pageState.recentViews().length > 0) {
        <section class="shrink-0 border-t"
                 [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
          <!-- Header -->
          <button
            (click)="recentExpanded.set(!recentExpanded())"
            class="w-full flex items-center justify-between px-4 py-2 transition-colors"
            [class]="theme.isDark() ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'">
            <span class="text-xs font-medium uppercase tracking-wider opacity-50">
              최근 본 항목
            </span>
            <i class="pi text-xs opacity-50"
               [class]="recentExpanded() ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          </button>

          @if (recentExpanded()) {
            <nav class="px-2 pb-2 space-y-0.5 max-h-32 overflow-y-auto">
              @for (recent of pageState.recentViews().slice(0, 5); track recent.id) {
                <button
                  (click)="openRecent(recent)"
                  class="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
                  [class]="theme.isDark() ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100'">
                  <i class="pi pi-file-edit text-xs opacity-50"></i>
                  <span class="flex-1 text-left truncate">{{ recent.title }}</span>
                  <button
                    (click)="removeFromRecent(recent.id, $event)"
                    class="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-200'">
                    <i class="pi pi-times text-xs"></i>
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
  `]
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  pageState = inject(PageStateService);
  theme = inject(ThemeService);

  // UI State
  smartFoldersExpanded = signal(true);
  recentExpanded = signal(false);

  // Output events
  pageSelected = output<string>();
  smartFolderSelected = output<SmartFolder>();
  createPageRequested = output<string | undefined>();

  ngOnInit() {
    this.pageState.loadPageTree();
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
      title: '새 페이지',
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
