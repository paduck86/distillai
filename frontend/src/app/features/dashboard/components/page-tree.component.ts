/**
 * Page Tree Component - Notion-style hierarchical page navigation
 *
 * 페이지 트리를 표시하고 컨텍스트 메뉴를 제공
 */

import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, PageTreeNode } from '../../../core/services/api.service';
import { PageStateService } from '../../../core/services/page-state.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageTreeItemComponent } from './page-tree-item.component';

interface MenuState {
  isOpen: boolean;
  pageId: string | null;
  x: number;
  y: number;
}

interface DeleteConfirmState {
  isOpen: boolean;
  pageId: string | null;
  pageTitle: string;
}

@Component({
  selector: 'app-page-tree',
  standalone: true,
  imports: [CommonModule, PageTreeItemComponent],
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2">
      <button
        class="flex items-center gap-2 px-1 py-0.5 rounded-md transition-colors group"
        [class]="theme.isDark() ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-200/50'"
        (click)="togglePagesSection()">
        <i class="pi text-[10px] transition-transform duration-200"
           [class]="pagesSectionExpanded() ? 'pi-chevron-down' : 'pi-chevron-right'"
           [class.text-zinc-500]="theme.isDark()"
           [class.text-zinc-400]="!theme.isDark()"></i>
        <span class="text-[11px] font-semibold uppercase tracking-wider"
              [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
          페이지
        </span>
      </button>
      <button
        class="w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150 opacity-60 hover:opacity-100"
        [class]="theme.isDark() ? 'hover:bg-zinc-700/70' : 'hover:bg-zinc-300/70'"
        (click)="onCreateRootPage()"
        title="새 페이지">
        <i class="pi pi-plus text-xs"></i>
      </button>
    </div>

    <!-- Tree content -->
    @if (pagesSectionExpanded()) {
      <div class="page-tree-content flex-1 overflow-y-auto px-1.5 pb-4">
        @if (pages().length === 0) {
          <!-- Empty state -->
          <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                 [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-200'">
              <i class="pi pi-file-edit text-xl"
                 [class]="theme.isDark() ? 'text-zinc-600' : 'text-zinc-400'"></i>
            </div>
            <p class="text-sm mb-1"
               [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-500'">
              페이지가 없습니다
            </p>
            <button
              class="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              [class]="theme.isDark()
                ? 'text-cyan-400 hover:bg-cyan-500/10'
                : 'text-indigo-500 hover:bg-indigo-500/10'"
              (click)="onCreateRootPage()">
              <i class="pi pi-plus text-[10px] mr-1"></i>
              첫 번째 페이지 만들기
            </button>
          </div>
        } @else {
          @for (page of pages(); track page.id) {
            <app-page-tree-item
              [page]="page"
              [depth]="0"
              [selectedId]="selectedId()"
              (pageSelected)="onPageSelected($event)"
              (toggleExpand)="onToggleExpand($event)"
              (addSubPage)="onAddSubPage($event)"
              (openMenu)="onOpenMenu($event)"
              (movePage)="onMovePage($event)" />
          }
        }
      </div>
    }

    <!-- Context Menu -->
    @if (menuState().isOpen) {
      <div
        class="fixed inset-0 z-50"
        (click)="closeMenu()">
        <div
          class="absolute rounded-xl shadow-xl border py-1.5 min-w-[180px] overflow-hidden"
          [class]="theme.isDark()
            ? 'bg-zinc-900 border-zinc-700/80'
            : 'bg-white border-zinc-200 shadow-lg'"
          [style.left.px]="menuState().x"
          [style.top.px]="menuState().y"
          (click)="$event.stopPropagation()">

          <!-- Menu items -->
          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-700'"
            (click)="onMenuAction('rename')">
            <i class="pi pi-pencil text-xs opacity-60"></i>
            이름 바꾸기
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-700'"
            (click)="onMenuAction('addSubPage')">
            <i class="pi pi-file-plus text-xs opacity-60"></i>
            하위 페이지 추가
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-700'"
            (click)="onMenuAction('favorite')">
            <i class="pi text-xs"
               [class.pi-star-fill]="isMenuPageFavorite()"
               [class.text-amber-400]="isMenuPageFavorite()"
               [class.pi-star]="!isMenuPageFavorite()"
               [class.opacity-60]="!isMenuPageFavorite()"></i>
            {{ isMenuPageFavorite() ? '즐겨찾기 해제' : '즐겨찾기에 추가' }}
          </button>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-700'"
            (click)="onMenuAction('duplicate')">
            <i class="pi pi-copy text-xs opacity-60"></i>
            복제
          </button>

          <div class="my-1.5 mx-2 border-t"
               [class]="theme.isDark() ? 'border-zinc-700/60' : 'border-zinc-200'"></div>

          <button
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 transition-colors"
            [class]="theme.isDark() ? 'hover:bg-red-500/10' : 'hover:bg-red-50'"
            (click)="onMenuAction('delete')">
            <i class="pi pi-trash text-xs"></i>
            삭제
          </button>
        </div>
      </div>
    }

    <!-- Delete Confirmation Dialog -->
    @if (deleteConfirmState().isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          (click)="cancelDelete()"></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
             [class]="theme.isDark() ? 'bg-zinc-900' : 'bg-white'">
          <!-- Header -->
          <div class="px-5 pt-5 pb-4">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                   [class]="theme.isDark() ? 'bg-red-500/15' : 'bg-red-100'">
                <i class="pi pi-trash text-red-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold mb-1"
                    [class]="theme.isDark() ? 'text-zinc-100' : 'text-zinc-900'">
                  페이지 삭제
                </h3>
                <p class="text-sm"
                   [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
                  <span class="font-medium">{{ deleteConfirmState().pageTitle || 'Untitled' }}</span>
                  페이지를 삭제하시겠습니까?
                </p>
                <p class="text-xs mt-2"
                   [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-500'">
                  하위 페이지도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 px-5 py-4 border-t"
               [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-100'">
            <button
              (click)="cancelDelete()"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-300'
                : 'hover:bg-zinc-100 text-zinc-700'">
              취소
            </button>
            <button
              (click)="confirmDelete()"
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                     bg-red-500 hover:bg-red-600 text-white">
              삭제
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-tree-content {
      scrollbar-width: thin;
      scrollbar-color: rgba(128, 128, 128, 0.2) transparent;
    }

    .page-tree-content::-webkit-scrollbar {
      width: 4px;
    }

    .page-tree-content::-webkit-scrollbar-track {
      background: transparent;
    }

    .page-tree-content::-webkit-scrollbar-thumb {
      background: rgba(128, 128, 128, 0.2);
      border-radius: 2px;
    }

    .page-tree-content::-webkit-scrollbar-thumb:hover {
      background: rgba(128, 128, 128, 0.4);
    }
  `]
})
export class PageTreeComponent {
  pageState = inject(PageStateService);
  theme = inject(ThemeService);
  private router = inject(Router);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  // Inputs
  pages = input.required<PageTreeNode[]>();
  selectedId = input<string | null>(null);

  // Outputs
  pageSelected = output<string>();
  createPage = output<string | undefined>();
  deletePage = output<string>();
  renamePage = output<string>();

  // UI State
  pagesSectionExpanded = signal(true);

  // Menu state
  menuState = signal<MenuState>({
    isOpen: false,
    pageId: null,
    x: 0,
    y: 0
  });

  // Delete confirmation state
  deleteConfirmState = signal<DeleteConfirmState>({
    isOpen: false,
    pageId: null,
    pageTitle: ''
  });

  togglePagesSection(): void {
    this.pagesSectionExpanded.update(v => !v);
  }

  onPageSelected(pageId: string): void {
    this.pageSelected.emit(pageId);
  }

  onToggleExpand(pageId: string): void {
    this.pageState.toggleExpand(pageId);
  }

  async onAddSubPage(parentId: string): Promise<void> {
    this.pageState.expandPage(parentId);
    this.createPage.emit(parentId);
  }

  onCreateRootPage(): void {
    this.createPage.emit(undefined);
  }

  onOpenMenu(event: { pageId: string; event: MouseEvent }): void {
    this.menuState.set({
      isOpen: true,
      pageId: event.pageId,
      x: event.event.clientX,
      y: event.event.clientY
    });
  }

  async onMovePage(event: { pageId: string; targetId: string; position: 'before' | 'after' | 'inside' }): Promise<void> {
    const { pageId, targetId, position } = event;

    // Find target page info
    const targetPage = this.findPageById(this.pages(), targetId);
    if (!targetPage) return;

    let newParentId: string | null;
    let newPosition: number;

    if (position === 'inside') {
      // Move as child of target
      newParentId = targetId;
      newPosition = 0;
      // Expand the target so the moved page is visible
      this.pageState.expandPage(targetId);
    } else {
      // Move as sibling
      newParentId = targetPage.parentId;

      // Find position among siblings
      const siblings = newParentId
        ? this.findPageById(this.pages(), newParentId)?.children || []
        : this.pages();

      const targetIndex = siblings.findIndex(p => p.id === targetId);
      newPosition = position === 'before' ? targetIndex : targetIndex + 1;
    }

    // Call API to move page
    await this.pageState.movePage(pageId, newParentId, newPosition);
  }

  private findPageById(pages: PageTreeNode[], id: string): PageTreeNode | null {
    for (const page of pages) {
      if (page.id === id) return page;
      if (page.children?.length) {
        const found = this.findPageById(page.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  closeMenu(): void {
    this.menuState.set({
      isOpen: false,
      pageId: null,
      x: 0,
      y: 0
    });
  }

  isMenuPageFavorite(): boolean {
    const pageId = this.menuState().pageId;
    return pageId ? this.pageState.isFavorite(pageId) : false;
  }

  onMenuAction(action: string): void {
    const pageId = this.menuState().pageId;
    this.closeMenu();

    if (!pageId) return;

    switch (action) {
      case 'rename':
        this.renamePage.emit(pageId);
        break;
      case 'addSubPage':
        this.pageState.expandPage(pageId);
        this.createPage.emit(pageId);
        break;
      case 'favorite':
        this.pageState.toggleFavorite(pageId);
        break;
      case 'duplicate':
        // TODO: Implement duplicate
        break;
      case 'delete':
        this.showDeleteConfirmation(pageId);
        break;
    }
  }

  // Delete confirmation handlers
  private showDeleteConfirmation(pageId: string): void {
    const page = this.findPageById(this.pages(), pageId);
    this.deleteConfirmState.set({
      isOpen: true,
      pageId,
      pageTitle: page?.title || 'Untitled'
    });
  }

  cancelDelete(): void {
    this.deleteConfirmState.set({
      isOpen: false,
      pageId: null,
      pageTitle: ''
    });
  }

  async confirmDelete(): Promise<void> {
    const pageId = this.deleteConfirmState().pageId;
    this.cancelDelete();

    if (!pageId) return;

    try {
      // Call API to delete
      await this.api.deleteLecture(pageId).toPromise();

      // Reload page tree
      await this.pageState.loadPageTree();

      // If the deleted page was selected, navigate to dashboard
      if (this.selectedId() === pageId) {
        this.router.navigate(['/dashboard']);
      }

      this.toast.success('삭제 완료', '페이지가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete page:', error);
      this.toast.error('삭제 실패', '페이지를 삭제하는데 실패했습니다.');
    }
  }
}
