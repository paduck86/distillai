import { Component, inject, OnInit, output, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FolderStateService } from '../../../core/services/folder-state.service';
import { ApiService, SmartFolder, CategoryWithCount, Category } from '../../../core/services/api.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <aside
      class="w-64 border-r h-full overflow-y-auto flex flex-col transition-colors"
      [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'">

      <!-- New Project Button -->
      <div class="p-3 border-b"
           [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
        <button
          (click)="goToDashboard()"
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
          [class]="theme.isDark()
            ? 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100'">
          <i class="pi pi-plus text-sm"
             [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'"></i>
          <span class="text-sm"
                [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">새 프로젝트</span>
        </button>
      </div>

      <!-- Smart Folders -->
      <section class="p-4 border-b"
               [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-200'">
        <h3 class="text-xs font-semibold uppercase tracking-wider mb-3"
            [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
          메뉴
        </h3>
        <nav class="space-y-1">
          @for (smart of folderState.smartFolders(); track smart.id) {
            <div
              (click)="selectSmartFolder(smart)"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
              [class]="folderState.selectedSmartFolderId() === smart.id
                ? (theme.isDark() ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
                : (theme.isDark() ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100')">
              <i [class]="'pi ' + smart.icon"></i>
              <span class="flex-1">{{ smart.name }}</span>
              @if (smart.count !== undefined) {
                <span class="text-xs"
                      [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">{{ smart.count }}</span>
              }
            </div>
          }
        </nav>
      </section>

      <!-- Categories (AI 자동 분류) -->
      <section class="flex-1 p-4 overflow-y-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider"
              [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
            카테고리
          </h3>
          <div class="flex items-center gap-1">
            @if (folderState.categories().length > 1) {
              <button
                (click)="toggleReorderMode()"
                class="p-1 rounded transition-colors"
                [class]="isReorderMode()
                  ? (theme.isDark() ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600')
                  : (theme.isDark() ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600')"
                [title]="isReorderMode() ? '순서 편집 완료' : '순서 편집'">
                <i [class]="isReorderMode() ? 'pi pi-check text-xs' : 'pi pi-sort-alt text-xs'"></i>
              </button>
            }
            <button
              (click)="startNewCategory()"
              class="p-1 rounded transition-colors"
              [class]="theme.isDark()
                ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'"
              title="새 카테고리">
              <i class="pi pi-plus text-xs"></i>
            </button>
          </div>
        </div>

        <!-- New Category Input -->
        @if (isCreatingCategory()) {
          <div class="mb-1">
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg"
                 [class]="theme.isDark() ? 'bg-zinc-800/80' : 'bg-zinc-100'">
              <button
                (click)="showColorPicker.set(!showColorPicker())"
                class="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-125"
                [style.backgroundColor]="newCategoryColor()">
              </button>
              <input
                #newCategoryInput
                [(ngModel)]="newCategoryName"
                (keyup.enter)="saveNewCategory()"
                (keyup.escape)="cancelNewCategory()"
                (blur)="onNewCategoryBlur()"
                type="text"
                placeholder="카테고리 이름"
                class="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
                [class]="theme.isDark()
                  ? 'text-white placeholder-zinc-500'
                  : 'text-zinc-900 placeholder-zinc-400'" />
              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  (click)="cancelNewCategory()"
                  class="w-6 h-6 flex items-center justify-center rounded transition-colors"
                  [class]="theme.isDark()
                    ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'">
                  <i class="pi pi-times text-xs"></i>
                </button>
                <button
                  (click)="saveNewCategory()"
                  class="w-6 h-6 flex items-center justify-center rounded transition-colors"
                  [class]="theme.isDark()
                    ? 'text-cyan-400 hover:bg-cyan-500/20'
                    : 'text-cyan-600 hover:bg-cyan-100'">
                  <i class="pi pi-check text-xs"></i>
                </button>
              </div>
            </div>
            <!-- Color Picker for New Category -->
            @if (showColorPicker()) {
              <div class="mt-1 mx-3 p-2 rounded-lg grid grid-cols-9 gap-1"
                   [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
                @for (color of colorOptions; track color) {
                  <button
                    (click)="selectNewCategoryColor(color)"
                    class="w-5 h-5 rounded-full transition-all hover:scale-110"
                    [style.backgroundColor]="color"
                    [class.ring-2]="newCategoryColor() === color"
                    [class.ring-white]="newCategoryColor() === color"
                    [class.ring-offset-1]="newCategoryColor() === color">
                  </button>
                }
              </div>
            }
          </div>
        }

        @if (folderState.categories().length === 0 && !isCreatingCategory()) {
          <div class="text-center py-3 text-sm"
               [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
            AI가 자동으로 분류합니다
          </div>
        } @else {
          <div class="space-y-0.5 pb-16" cdkDropList (cdkDropListDropped)="onCategoryDrop($event)">
            @for (category of folderState.categories(); track category.id) {
              <div
                cdkDrag
                [cdkDragDisabled]="editingCategoryId() === category.id"
                class="group relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                [class]="folderState.selectedCategoryId() === category.id
                  ? (theme.isDark() ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600')
                  : (theme.isDark() ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-600 hover:bg-zinc-100')"
                (click)="selectCategory(category)"
                (dblclick)="startEditCategory(category, $event)">
                <!-- Drag Handle -->
                <i class="pi pi-grip-vertical text-xs cursor-grab shrink-0 transition-opacity"
                   [class]="isReorderMode() ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'"
                   cdkDragHandle></i>

                <!-- Editing Mode -->
                @if (editingCategoryId() === category.id) {
                  <button
                    (click)="toggleEditColorPicker($event)"
                    class="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer ring-2"
                    [style.backgroundColor]="editCategoryColor()"
                    [style.--tw-ring-color]="editCategoryColor() + '60'">
                  </button>
                  <input
                    #editCategoryInput
                    [(ngModel)]="editCategoryName"
                    (keyup.enter)="saveEditCategory()"
                    (keyup.escape)="cancelEditCategory()"
                    (blur)="onEditCategoryBlur()"
                    type="text"
                    class="flex-1 bg-transparent border-none outline-none text-sm"
                    [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'"
                    (click)="$event.stopPropagation()" />
                } @else {
                  <!-- View Mode -->
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    [style.backgroundColor]="category.color"></span>
                  <span class="flex-1 truncate">{{ category.name }}</span>
                  <span class="text-xs"
                        [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                    {{ category.distillationCount }}
                  </span>

                  <!-- Menu Button -->
                  <div class="relative">
                    <button
                      (click)="toggleCategoryMenu(category.id, $event)"
                      class="p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      [class]="theme.isDark()
                        ? 'hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300'
                        : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600'">
                      <i class="pi pi-ellipsis-v text-xs"></i>
                    </button>

                    <!-- Dropdown Menu -->
                    @if (showCategoryMenu() === category.id) {
                      <div class="absolute right-0 top-full mt-1 w-32 rounded-lg shadow-lg border z-50 py-1"
                           [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'">
                        <button
                          (click)="startEditCategory(category, $event)"
                          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                          [class]="theme.isDark() ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'">
                          <i class="pi pi-pencil text-xs"></i>
                          이름 바꾸기
                        </button>
                        <button
                          (click)="deleteCategory(category, $event)"
                          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                          [class]="theme.isDark() ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'">
                          <i class="pi pi-trash text-xs"></i>
                          삭제
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Edit Color Picker -->
              @if (editingCategoryId() === category.id && showEditColorPicker()) {
                <div class="ml-3 mt-1 mb-2 p-2 rounded-lg grid grid-cols-6 gap-1.5"
                     [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
                  @for (color of colorOptions; track color) {
                    <button
                      (click)="selectEditColor(color, $event)"
                      class="w-6 h-6 rounded-full transition-transform hover:scale-110"
                      [style.backgroundColor]="color"
                      [class.ring-2]="editCategoryColor() === color"
                      [class.ring-white]="editCategoryColor() === color">
                    </button>
                  }
                </div>
              }
            }
          </div>
        }
      </section>

      <!-- Menu Overlay (closes menu when clicking outside) -->
      @if (showCategoryMenu()) {
        <div (click)="closeCategoryMenu()" class="fixed inset-0 z-40"></div>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    /* Drag & Drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      opacity: 0.9;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .cdk-drop-list-dragging .cdk-drag:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class SidebarComponent implements OnInit {
  private api = inject(ApiService);
  folderState = inject(FolderStateService);
  theme = inject(ThemeService);

  @ViewChild('newCategoryInput') newCategoryInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('editCategoryInput') editCategoryInputRef!: ElementRef<HTMLInputElement>;

  // Category editing state
  isCreatingCategory = signal(false);
  isReorderMode = signal(false);
  newCategoryName = '';
  newCategoryColor = signal('#6366F1');
  showColorPicker = signal(false);

  editingCategoryId = signal<string | null>(null);
  editCategoryName = '';
  editCategoryColor = signal('#6366F1');
  showEditColorPicker = signal(false);
  showCategoryMenu = signal<string | null>(null);

  // Color palette
  colorOptions = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E', '#10B981',
    '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C', '#71717A',
  ];

  // Output events
  categorySelected = output<CategoryWithCount>();
  smartFolderSelected = output<SmartFolder>();
  dashboardRequested = output<void>();

  ngOnInit() {
    this.folderState.loadAll();
  }

  goToDashboard() {
    // Select dashboard smart folder
    const dashboard = this.folderState.smartFolders().find(s => s.id === 'dashboard');
    if (dashboard) {
      this.folderState.selectSmartFolder('dashboard');
      this.smartFolderSelected.emit(dashboard);
    }
    this.dashboardRequested.emit();
  }

  selectSmartFolder(smart: SmartFolder) {
    this.folderState.selectSmartFolder(smart.id);
    this.smartFolderSelected.emit(smart);
  }

  selectCategory(category: CategoryWithCount) {
    if (this.editingCategoryId()) return; // Don't select while editing
    this.folderState.selectCategory(category.id);
    this.categorySelected.emit(category);
  }

  // ============ Reorder Mode ============

  toggleReorderMode() {
    this.isReorderMode.update(v => !v);
  }

  // ============ New Category ============

  startNewCategory() {
    this.isCreatingCategory.set(true);
    this.newCategoryName = '';
    this.newCategoryColor.set('#6366F1');
    this.showColorPicker.set(false);
    setTimeout(() => this.newCategoryInputRef?.nativeElement?.focus(), 50);
  }

  selectNewCategoryColor(color: string) {
    this.newCategoryColor.set(color);
    this.showColorPicker.set(false);
  }

  async saveNewCategory() {
    const name = this.newCategoryName.trim();
    if (!name) {
      this.cancelNewCategory();
      return;
    }

    try {
      // slug는 영문 소문자, 숫자, 하이픈만 허용 (백엔드 검증)
      const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const slug = baseSlug || `category-${Date.now()}`;

      await this.api.createCategory({
        name,
        slug,
        color: this.newCategoryColor(),
      }).toPromise();
      await this.folderState.loadAll();
      this.cancelNewCategory();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  }

  cancelNewCategory() {
    this.isCreatingCategory.set(false);
    this.newCategoryName = '';
    this.showColorPicker.set(false);
  }

  onNewCategoryBlur() {
    // Delay to allow button click to register
    setTimeout(() => {
      if (!this.newCategoryName.trim()) {
        this.cancelNewCategory();
      }
    }, 200);
  }

  // ============ Category Menu ============

  toggleCategoryMenu(categoryId: string, event: Event) {
    event.stopPropagation();
    if (this.showCategoryMenu() === categoryId) {
      this.showCategoryMenu.set(null);
    } else {
      this.showCategoryMenu.set(categoryId);
    }
  }

  closeCategoryMenu() {
    this.showCategoryMenu.set(null);
  }

  // ============ Edit Category ============

  startEditCategory(category: CategoryWithCount, event: Event) {
    event.stopPropagation();
    this.closeCategoryMenu();
    this.editingCategoryId.set(category.id);
    this.editCategoryName = category.name;
    this.editCategoryColor.set(category.color);
    this.showEditColorPicker.set(false);
    setTimeout(() => {
      this.editCategoryInputRef?.nativeElement?.focus();
      this.editCategoryInputRef?.nativeElement?.select();
      // Scroll the editing item into view
      this.editCategoryInputRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  toggleEditColorPicker(event: Event) {
    event.stopPropagation();
    const willShow = !this.showEditColorPicker();
    this.showEditColorPicker.set(willShow);
    // Scroll to show color picker when opening
    if (willShow) {
      setTimeout(() => {
        this.editCategoryInputRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  }

  selectEditColor(color: string, event: Event) {
    event.stopPropagation();
    this.editCategoryColor.set(color);
    this.showEditColorPicker.set(false);
  }

  async saveEditCategory() {
    const id = this.editingCategoryId();
    if (!id) return;

    const name = this.editCategoryName.trim();
    if (!name) {
      this.cancelEditCategory();
      return;
    }

    try {
      await this.api.updateCategory(id, {
        name,
        color: this.editCategoryColor(),
      }).toPromise();
      await this.folderState.loadAll();
      this.cancelEditCategory();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  }

  cancelEditCategory() {
    this.editingCategoryId.set(null);
    this.editCategoryName = '';
    this.showEditColorPicker.set(false);
  }

  onEditCategoryBlur() {
    // Delay to allow button click to register
    setTimeout(() => {
      if (this.editingCategoryId() && !this.showEditColorPicker()) {
        this.saveEditCategory();
      }
    }, 200);
  }

  // ============ Delete Category ============

  async deleteCategory(category: CategoryWithCount, event: Event) {
    event.stopPropagation();
    this.closeCategoryMenu();

    if (!confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await this.api.deleteCategory(category.id).toPromise();
      await this.folderState.loadAll();

      // If deleted category was selected, switch to dashboard
      if (this.folderState.selectedCategoryId() === category.id) {
        this.folderState.selectSmartFolder('dashboard');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  }

  // ============ Reorder Categories ============

  async onCategoryDrop(event: CdkDragDrop<CategoryWithCount[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const categories = [...this.folderState.categories()];
    moveItemInArray(categories, event.previousIndex, event.currentIndex);

    // Update local state immediately for responsiveness
    this.folderState.setCategories(categories);

    // Update positions on server
    try {
      const updates = categories.map((cat, idx) => ({
        id: cat.id,
        position: idx,
      }));
      await this.api.reorderCategories(updates).toPromise();
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      // Reload to restore original order on error
      await this.folderState.loadAll();
    }
  }
}
