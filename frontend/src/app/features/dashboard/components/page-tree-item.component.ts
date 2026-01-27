import { Component, input, output, inject, computed, signal } from '@angular/core';
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
      <div
        class="flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group"
        [class.bg-cyan-500/10]="isSelected()"
        [class.text-cyan-400]="isSelected()"
        [class.hover:bg-zinc-800]="!isSelected() && theme.isDark()"
        [class.hover:bg-zinc-100]="!isSelected() && !theme.isDark()"
        [style.paddingLeft.px]="depth() * 16 + 8"
        (click)="onPageClick($event)"
        (contextmenu)="onContextMenu($event)">

        @if (hasChildren()) {
          <button
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700/50 transition-colors"
            (click)="onToggleExpand($event)">
            <i class="pi text-xs transition-transform duration-200"
               [class.pi-chevron-right]="!isExpanded()"
               [class.pi-chevron-down]="isExpanded()"></i>
          </button>
        } @else {
          <div class="w-5"></div>
        }

        <i class="pi text-sm"
           [class]="pageState.getPageIcon(page())"
           [ngClass]="pageState.getPageIconColor(page())"></i>

        <span class="flex-1 truncate text-sm"
              [class.font-medium]="isSelected()">
          {{ page().title || 'Untitled' }}
        </span>

        @if (page().status === 'processing') {
          <i class="pi pi-spin pi-spinner text-amber-400 text-xs"></i>
        }

        <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          <button
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-600/50"
            (click)="onAddSubPage($event)"
            title="하위 페이지 추가">
            <i class="pi pi-plus text-xs opacity-50"></i>
          </button>

          <button
            class="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-600/50"
            (click)="onMenuClick($event)"
            title="더 보기">
            <i class="pi pi-ellipsis-h text-xs opacity-50"></i>
          </button>
        </div>
      </div>

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
              (openMenu)="openMenu.emit($event)" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-tree-item {
      user-select: none;
    }
  `]
})
export class PageTreeItemComponent {
  pageState = inject(PageStateService);
  theme = inject(ThemeService);
  private router = inject(Router);

  // Inputs
  page = input.required<PageTreeNode>();
  depth = input<number>(0);
  selectedId = input<string | null>(null);

  // Outputs
  pageSelected = output<string>();
  toggleExpand = output<string>();
  addSubPage = output<string>();
  openMenu = output<{ pageId: string; event: MouseEvent }>();

  // Computed
  hasChildren = computed(() => (this.page().children?.length ?? 0) > 0);
  isSelected = computed(() => this.page().id === this.selectedId());
  isExpanded = computed(() => this.pageState.isExpanded(this.page().id));

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
