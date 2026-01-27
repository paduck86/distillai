import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageTreeNode } from '../../../core/services/api.service';
import { PageStateService } from '../../../core/services/page-state.service';
import { ThemeService } from '../../../core/services/theme.service';
import { PageTreeItemComponent } from './page-tree-item.component';

interface MenuState {
  isOpen: boolean;
  pageId: string | null;
  x: number;
  y: number;
}

@Component({
  selector: 'app-page-tree',
  standalone: true,
  imports: [CommonModule, PageTreeItemComponent],
  template: `
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2">
      <span class="text-xs font-medium uppercase tracking-wider opacity-50">
        페이지
      </span>
      <button
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700/50 transition-colors"
        (click)="onCreateRootPage()"
        title="새 페이지">
        <i class="pi pi-plus text-xs opacity-50"></i>
      </button>
    </div>

    <!-- Tree content -->
    <div class="page-tree-content flex-1 overflow-y-auto px-1">
      @if (pages().length === 0) {
        <!-- Empty state -->
        <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
          <i class="pi pi-file-edit text-3xl opacity-20 mb-2"></i>
          <p class="text-sm opacity-50">페이지가 없습니다</p>
          <button
            class="mt-3 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            (click)="onCreateRootPage()">
            + 첫 번째 페이지 만들기
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
            (openMenu)="onOpenMenu($event)" />
        }
      }
    </div>

    <!-- Context Menu -->
    @if (menuState().isOpen) {
      <div
        class="fixed inset-0 z-50"
        (click)="closeMenu()">
        <div
          class="absolute rounded-lg shadow-xl border py-1 min-w-[180px]"
          [class.bg-zinc-800]="theme.isDark()"
          [class.border-zinc-700]="theme.isDark()"
          [class.bg-white]="!theme.isDark()"
          [class.border-zinc-200]="!theme.isDark()"
          [style.left.px]="menuState().x"
          [style.top.px]="menuState().y"
          (click)="$event.stopPropagation()">

          <!-- Menu items -->
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700/50 transition-colors"
            (click)="onMenuAction('rename')">
            <i class="pi pi-pencil text-xs"></i>
            이름 바꾸기
          </button>

          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700/50 transition-colors"
            (click)="onMenuAction('addSubPage')">
            <i class="pi pi-file-plus text-xs"></i>
            하위 페이지 추가
          </button>

          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700/50 transition-colors"
            (click)="onMenuAction('favorite')">
            <i class="pi text-xs"
               [class.pi-star-fill]="isMenuPageFavorite()"
               [class.text-yellow-400]="isMenuPageFavorite()"
               [class.pi-star]="!isMenuPageFavorite()"></i>
            {{ isMenuPageFavorite() ? '즐겨찾기 해제' : '즐겨찾기에 추가' }}
          </button>

          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700/50 transition-colors"
            (click)="onMenuAction('duplicate')">
            <i class="pi pi-copy text-xs"></i>
            복제
          </button>

          <div class="my-1 border-t"
               [class.border-zinc-700]="theme.isDark()"
               [class.border-zinc-200]="!theme.isDark()"></div>

          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            (click)="onMenuAction('delete')">
            <i class="pi pi-trash text-xs"></i>
            삭제
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-tree-content {
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;

      &::-webkit-scrollbar {
        width: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
      }
    }
  `]
})
export class PageTreeComponent {
  pageState = inject(PageStateService);
  theme = inject(ThemeService);
  private router = inject(Router);

  // Inputs
  pages = input.required<PageTreeNode[]>();
  selectedId = input<string | null>(null);

  // Outputs
  pageSelected = output<string>();
  createPage = output<string | undefined>();
  deletePage = output<string>();
  renamePage = output<string>();

  // Menu state
  menuState = signal<MenuState>({
    isOpen: false,
    pageId: null,
    x: 0,
    y: 0
  });

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
    const rect = (event.event.target as HTMLElement).getBoundingClientRect();
    this.menuState.set({
      isOpen: true,
      pageId: event.pageId,
      x: event.event.clientX,
      y: event.event.clientY
    });
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
        this.deletePage.emit(pageId);
        break;
    }
  }
}
