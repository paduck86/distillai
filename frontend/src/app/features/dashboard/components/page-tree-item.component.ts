/**
 * Page Tree Item Component
 *
 * 개별 페이지 항목을 렌더링하는 재귀 컴포넌트
 */

import { Component, input, output, inject, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PageTreeNode } from '../../../core/services/api.service';
import { PageStateService } from '../../../core/services/page-state.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-page-tree-item',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-tree-item">
      <!-- Drop indicator above -->
      @if (dropPosition() === 'before') {
        <div class="h-0.5 mx-2 rounded-full bg-cyan-500 -mt-0.5"></div>
      }

      <div
        class="flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150 group"
        [ngClass]="{
          'bg-cyan-500/15 text-cyan-400': isSelected() && theme.isDark(),
          'bg-indigo-500/10 text-indigo-600': isSelected() && !theme.isDark(),
          'hover:bg-zinc-800/70': !isSelected() && !isDragOver() && theme.isDark(),
          'hover:bg-zinc-200/70': !isSelected() && !isDragOver() && !theme.isDark(),
          'ring-2 ring-cyan-500/50 bg-cyan-500/10': isDragOver() && dropPosition() === 'inside'
        }"
        [style.paddingLeft.px]="depth() * 12 + 8"
        draggable="true"
        (dragstart)="onDragStart($event)"
        (dragend)="onDragEnd($event)"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="onPageClick($event)"
        (contextmenu)="onContextMenu($event)">

        <!-- Expand/Collapse Toggle -->
        @if (hasChildren()) {
          <button
            class="w-5 h-5 flex items-center justify-center rounded transition-all duration-150 shrink-0"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-700/70'
              : 'hover:bg-zinc-300/70'"
            (click)="onToggleExpand($event)">
            <i
              class="pi text-[10px] transition-transform duration-200"
              [ngClass]="isExpanded() ? 'pi-chevron-down' : 'pi-chevron-right'"
              [class.text-zinc-500]="!isSelected()"></i>
          </button>
        } @else {
          <div class="w-5 shrink-0"></div>
        }

        <!-- Page Icon -->
        <div class="w-5 h-5 flex items-center justify-center shrink-0">
          <i
            class="pi text-sm"
            [ngClass]="[pageState.getPageIcon(page()), pageState.getPageIconColor(page())]"></i>
        </div>

        <!-- Page Title -->
        <span
          class="flex-1 truncate text-sm"
          [ngClass]="{
            'font-medium': isSelected(),
            'text-zinc-300': !isSelected() && theme.isDark(),
            'text-zinc-700': !isSelected() && !theme.isDark()
          }">
          {{ page().title || 'Untitled' }}
        </span>

        <!-- Status Indicator -->
        @if (page().status === 'processing') {
          <i class="pi pi-spin pi-spinner text-amber-400 text-xs shrink-0"></i>
        }

        <!-- Hover Actions -->
        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150 shrink-0">
          <button
            class="w-5 h-5 flex items-center justify-center rounded transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-600/70 text-zinc-500 hover:text-zinc-300'
              : 'hover:bg-zinc-300/70 text-zinc-400 hover:text-zinc-600'"
            (click)="onAddSubPage($event)"
            title="하위 페이지 추가">
            <i class="pi pi-plus text-[10px]"></i>
          </button>
          <button
            class="w-5 h-5 flex items-center justify-center rounded transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-600/70 text-zinc-500 hover:text-zinc-300'
              : 'hover:bg-zinc-300/70 text-zinc-400 hover:text-zinc-600'"
            (click)="onMenuClick($event)"
            title="더 보기">
            <i class="pi pi-ellipsis-h text-[10px]"></i>
          </button>
        </div>
      </div>

      <!-- Drop indicator after -->
      @if (dropPosition() === 'after') {
        <div class="h-0.5 mx-2 rounded-full bg-cyan-500 mt-0.5"></div>
      }

      <!-- Children (Recursive) -->
      @if (isExpanded() && hasChildren()) {
        <div class="children">
          @for (child of page().children; track child.id) {
            <app-page-tree-item
              [page]="child"
              [depth]="depth() + 1"
              [selectedId]="selectedId()"
              (pageSelected)="pageSelected.emit($event)"
              (toggleExpand)="toggleExpand.emit($event)"
              (addSubPage)="addSubPage.emit($event)"
              (openMenu)="openMenu.emit($event)"
              (movePage)="movePage.emit($event)" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-tree-item {
      user-select: none;
    }

    .page-tree-item[dragging="true"] {
      opacity: 0.5;
    }
  `]
})
export class PageTreeItemComponent {
  pageState = inject(PageStateService);
  theme = inject(ThemeService);
  private router = inject(Router);

  page = input.required<PageTreeNode>();
  depth = input<number>(0);
  selectedId = input<string | null>(null);

  pageSelected = output<string>();
  toggleExpand = output<string>();
  addSubPage = output<string>();
  openMenu = output<{ pageId: string; event: MouseEvent }>();
  movePage = output<{ pageId: string; targetId: string; position: 'before' | 'after' | 'inside' }>();

  // Drag and drop state
  isDragOver = signal(false);
  dropPosition = signal<'before' | 'after' | 'inside' | null>(null);

  hasChildren = computed(() => (this.page().children?.length ?? 0) > 0);
  isSelected = computed(() => this.page().id === this.selectedId());
  isExpanded = computed(() => this.pageState.isExpanded(this.page().id));

  // Drag and Drop handlers
  onDragStart(event: DragEvent): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', this.page().id);
    // Add a slight delay to prevent the dragged item from being the drop target
    setTimeout(() => {
      (event.target as HTMLElement).setAttribute('dragging', 'true');
    }, 0);
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).removeAttribute('dragging');
    this.isDragOver.set(false);
    this.dropPosition.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;
    event.dataTransfer.dropEffect = 'move';

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    // Determine drop position based on mouse position
    if (y < height * 0.25) {
      this.dropPosition.set('before');
    } else if (y > height * 0.75) {
      this.dropPosition.set('after');
    } else {
      this.dropPosition.set('inside');
    }

    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.stopPropagation();
    this.isDragOver.set(false);
    this.dropPosition.set(null);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const draggedId = event.dataTransfer?.getData('text/plain');
    const position = this.dropPosition();

    this.isDragOver.set(false);
    this.dropPosition.set(null);

    if (!draggedId || draggedId === this.page().id || !position) return;

    // Prevent dropping a parent into its own child
    if (this.isDescendantOf(draggedId)) return;

    this.movePage.emit({
      pageId: draggedId,
      targetId: this.page().id,
      position
    });
  }

  // Check if current page is a descendant of the given page ID
  private isDescendantOf(pageId: string): boolean {
    const findInTree = (nodes: PageTreeNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return this.isInSubtree(node, this.page().id);
        }
        if (node.children?.length && findInTree(node.children, targetId)) {
          return true;
        }
      }
      return false;
    };

    return findInTree(this.pageState.pageTree(), pageId);
  }

  private isInSubtree(node: PageTreeNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    if (!node.children?.length) return false;
    return node.children.some(child => this.isInSubtree(child, targetId));
  }

  onPageClick(event: MouseEvent): void {
    event.stopPropagation();
    this.pageSelected.emit(this.page().id);
    this.router.navigate(['/page', this.page().id]);
  }

  onToggleExpand(event: MouseEvent): void {
    event.stopPropagation();
    this.toggleExpand.emit(this.page().id);
  }

  onAddSubPage(event: MouseEvent): void {
    event.stopPropagation();
    this.addSubPage.emit(this.page().id);
  }

  onMenuClick(event: MouseEvent): void {
    event.stopPropagation();
    this.openMenu.emit({ pageId: this.page().id, event });
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.openMenu.emit({ pageId: this.page().id, event });
  }
}
