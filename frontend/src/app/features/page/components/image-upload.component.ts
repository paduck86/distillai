/**
 * Image Upload Component
 *
 * 이미지 업로드 UI 컴포넌트
 * - 드래그 앤 드롭
 * - 클립보드 붙여넣기
 * - URL 입력
 * - 파일 선택
 */

import { Component, Input, Output, EventEmitter, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { UploadService, ImageUploadResult } from '../../../core/services/upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="image-upload-container relative rounded-lg border-2 border-dashed transition-all"
      [class]="getContainerClasses()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (paste)="onPaste($event)"
      tabindex="0">

      <!-- Loading State -->
      @if (upload.uploading()) {
        <div class="p-8 text-center">
          <div class="mb-4">
            <i class="pi pi-spin pi-spinner text-3xl text-cyan-500"></i>
          </div>
          <div class="mb-2 text-sm">업로드 중...</div>
          <div class="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden"
               [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'">
            <div class="h-full bg-cyan-500 transition-all"
                 [style.width.%]="upload.uploadProgress()"></div>
          </div>
          <div class="mt-2 text-xs opacity-60">{{ upload.uploadProgress() }}%</div>
        </div>
      }

      <!-- Default State -->
      @if (!upload.uploading()) {
        <div class="p-6">
          <!-- Icon -->
          <div class="text-center mb-4">
            <div class="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-3"
                 [class]="isDragging()
                   ? 'bg-cyan-500/20 text-cyan-500'
                   : (theme.isDark() ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500')">
              <i class="pi pi-image text-2xl"></i>
            </div>
            <p class="text-sm font-medium mb-1">
              {{ isDragging() ? '여기에 놓으세요' : '이미지 추가' }}
            </p>
            <p class="text-xs opacity-60">
              드래그 앤 드롭, 붙여넣기, 또는 파일 선택
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <!-- File Upload Button -->
            <label class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-colors
                          bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium">
              <i class="pi pi-upload text-sm"></i>
              <span>파일 선택</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                class="hidden"
                (change)="onFileSelect($event)" />
            </label>

            <!-- URL Toggle -->
            <button
              type="button"
              (click)="showUrlInput.set(!showUrlInput())"
              class="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-colors text-sm"
              [class]="theme.isDark()
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'">
              <i class="pi pi-link text-sm"></i>
              <span>URL 입력</span>
            </button>
          </div>

          <!-- URL Input -->
          @if (showUrlInput()) {
            <div class="mt-4">
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  class="flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors
                         focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                  [class]="theme.isDark()
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-white border-zinc-300 text-zinc-900'"
                  (keydown.enter)="onUrlSubmit()" />
                <button
                  type="button"
                  (click)="onUrlSubmit()"
                  [disabled]="!imageUrl.trim()"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
                         bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  확인
                </button>
              </div>
            </div>
          }

          <!-- Error Message -->
          @if (upload.uploadError()) {
            <div class="mt-4 p-3 rounded-lg text-sm text-red-500"
                 [class]="theme.isDark() ? 'bg-red-500/10' : 'bg-red-50'">
              <i class="pi pi-exclamation-triangle mr-2"></i>
              {{ upload.uploadError() }}
            </div>
          }

          <!-- Hints -->
          <div class="mt-4 text-xs text-center opacity-50">
            <p>지원 형식: JPG, PNG, GIF, WebP, SVG</p>
            <p>최대 크기: 5MB</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-upload-container:focus {
      outline: none;
    }

    .image-upload-container:focus-visible {
      @apply ring-2 ring-cyan-500/50;
    }
  `]
})
export class ImageUploadComponent {
  theme = inject(ThemeService);
  upload = inject(UploadService);

  @Input() distillationId!: string;

  @Output() uploaded = new EventEmitter<ImageUploadResult>();
  @Output() cancel = new EventEmitter<void>();

  isDragging = signal(false);
  showUrlInput = signal(false);
  imageUrl = '';

  getContainerClasses(): string {
    if (this.isDragging()) {
      return this.theme.isDark()
        ? 'border-cyan-500 bg-cyan-500/10'
        : 'border-cyan-500 bg-cyan-50';
    }
    return this.theme.isDark()
      ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
      : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    try {
      const result = await this.upload.uploadFromDrop(event, this.distillationId);
      if (result) {
        this.uploaded.emit(result);
      }
    } catch (error) {
      console.error('Drop upload failed:', error);
    }
  }

  @HostListener('paste', ['$event'])
  async onPaste(event: ClipboardEvent): Promise<void> {
    try {
      const result = await this.upload.uploadFromPaste(event, this.distillationId);
      if (result) {
        this.uploaded.emit(result);
      }
    } catch (error) {
      console.error('Paste upload failed:', error);
    }
  }

  async onFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const result = await this.upload.uploadImage(file, this.distillationId);
      this.uploaded.emit(result);
    } catch (error) {
      console.error('File upload failed:', error);
    }

    // Reset input
    input.value = '';
  }

  async onUrlSubmit(): Promise<void> {
    const url = this.imageUrl.trim();
    if (!url) return;

    try {
      const result = await this.upload.uploadFromUrl(url, this.distillationId);
      this.uploaded.emit(result);
      this.imageUrl = '';
      this.showUrlInput.set(false);
    } catch (error) {
      console.error('URL upload failed:', error);
    }
  }
}
