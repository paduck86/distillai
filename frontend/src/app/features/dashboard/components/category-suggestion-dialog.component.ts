import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { ApiService, Distillation, CategoryWithCount } from '../../../core/services/api.service';
import { FolderStateService } from '../../../core/services/folder-state.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-category-suggestion-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, DropdownModule, ButtonModule],
  template: `
    <p-dialog
      header="AI 카테고리 추천"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '450px' }"
      [closable]="true"
      styleClass="category-dialog">

      @if (distillation()) {
        <div class="space-y-5">
          <!-- AI 분석 결과 -->
          <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div class="flex items-center gap-2 text-amber-400 mb-2">
              <i class="pi pi-sparkles"></i>
              <span class="font-medium">AI 분석 결과</span>
              @if (distillation()!.aiConfidence) {
                <span class="ml-auto text-xs opacity-70">
                  신뢰도 {{ (distillation()!.aiConfidence! * 100).toFixed(0) }}%
                </span>
              }
            </div>
            <p class="text-sm text-zinc-300">{{ distillation()!.aiReasoning || 'AI가 콘텐츠를 분석했습니다.' }}</p>
          </div>

          <!-- 카테고리 선택 -->
          <div>
            <label class="block text-sm text-zinc-400 mb-2">카테고리</label>
            <p-dropdown
              [options]="folderState.categories()"
              [(ngModel)]="selectedCategory"
              optionLabel="name"
              placeholder="카테고리 선택"
              styleClass="w-full">
              <ng-template pTemplate="item" let-category>
                <div class="flex items-center gap-2">
                  <span
                    class="w-3 h-3 rounded-full"
                    [style.backgroundColor]="category.color"></span>
                  <span>{{ category.name }}</span>
                </div>
              </ng-template>
              <ng-template pTemplate="selectedItem" let-category>
                <div class="flex items-center gap-2" *ngIf="category">
                  <span
                    class="w-3 h-3 rounded-full"
                    [style.backgroundColor]="category.color"></span>
                  <span>{{ category.name }}</span>
                </div>
              </ng-template>
            </p-dropdown>
          </div>

          <!-- 태그 선택 -->
          <div>
            <label class="block text-sm text-zinc-400 mb-2">추천 태그</label>
            <div class="flex flex-wrap gap-2">
              @for (tag of suggestedTags(); track tag) {
                <button
                  (click)="toggleTag(tag)"
                  [class.bg-primary]="selectedTags().includes(tag)"
                  [class.text-white]="selectedTags().includes(tag)"
                  [class.bg-zinc-700]="!selectedTags().includes(tag)"
                  [class.text-zinc-300]="!selectedTags().includes(tag)"
                  class="px-3 py-1.5 rounded-full text-sm transition-colors hover:opacity-80">
                  {{ tag }}
                </button>
              }
            </div>
          </div>

          <!-- 제목 표시 -->
          <div class="pt-2 border-t border-zinc-700">
            <p class="text-xs text-zinc-500 mb-1">노트 제목</p>
            <p class="text-sm text-white">{{ distillation()!.title }}</p>
          </div>
        </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex items-center justify-between w-full">
          <button
            pButton
            label="나중에"
            (click)="onSkip()"
            class="p-button-text p-button-secondary"></button>
          <div class="flex gap-2">
            <button
              pButton
              label="취소"
              (click)="visible = false"
              class="p-button-text p-button-secondary"></button>
            <button
              pButton
              label="확인"
              (click)="onConfirm()"
              [loading]="saving()"></button>
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .category-dialog {
      .p-dialog {
        background: #1a1a1a !important;
        border: 1px solid #3f3f46 !important;
      }

      .p-dialog-header {
        background: #1a1a1a !important;
        color: white !important;
        border-bottom: 1px solid #3f3f46 !important;
      }

      .p-dialog-content {
        background: #1a1a1a !important;
        color: white !important;
      }

      .p-dialog-footer {
        background: #1a1a1a !important;
        border-top: 1px solid #3f3f46 !important;
      }

      .p-dropdown {
        background: #27272a !important;
        border-color: #3f3f46 !important;
      }
    }
  `]
})
export class CategorySuggestionDialogComponent {
  private api = inject(ApiService);
  folderState = inject(FolderStateService);

  // Input/Output
  distillation = input<Distillation | null>(null);
  confirmed = output<Distillation>();
  skipped = output<void>();

  // State
  visible = false;
  selectedCategory = signal<CategoryWithCount | null>(null);
  selectedTags = signal<string[]>([]);
  suggestedTags = signal<string[]>([]);
  saving = signal(false);

  /**
   * 다이얼로그 열기
   */
  open(distillation: Distillation) {
    // AI 추천 카테고리 찾기
    if (distillation.aiSuggestedCategoryId) {
      const category = this.folderState.getCategoryById(distillation.aiSuggestedCategoryId);
      this.selectedCategory.set(category ?? null);
    } else {
      this.selectedCategory.set(null);
    }

    // AI 추천 태그 설정
    this.suggestedTags.set(distillation.aiSuggestedTags || []);
    this.selectedTags.set([...this.suggestedTags()]);

    this.visible = true;
  }

  toggleTag(tag: string) {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
  }

  async onConfirm() {
    const dist = this.distillation();
    if (!dist) return;

    this.saving.set(true);

    try {
      const response = await firstValueFrom(
        this.api.confirmCategory(dist.id, {
          categoryId: this.selectedCategory()?.id,
          tags: this.selectedTags(),
        })
      );

      this.visible = false;
      this.confirmed.emit(response.data);
    } catch (error) {
      console.error('Failed to confirm category:', error);
    } finally {
      this.saving.set(false);
    }
  }

  onSkip() {
    this.visible = false;
    this.skipped.emit();
  }
}
