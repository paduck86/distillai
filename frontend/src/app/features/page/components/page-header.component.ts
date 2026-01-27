/**
 * Page Header Component
 *
 * 노션 스타일 페이지 헤더 (아이콘 + 제목 + 메타 정보)
 */

import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { Distillation, SourceType } from '../../../core/services/api.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header px-16 pt-16 pb-4">
      <!-- Icon Row -->
      <div class="icon-row mb-4 flex items-start gap-4">
        <!-- Page Icon -->
        <div
          class="page-icon relative group"
          (click)="showIconPicker.set(!showIconPicker())">
          <div class="w-20 h-20 rounded-lg flex items-center justify-center text-5xl
                      cursor-pointer transition-all
                      hover:bg-zinc-100 dark:hover:bg-zinc-800"
               [class]="!icon ? 'opacity-30 hover:opacity-70' : ''">
            {{ icon || '📄' }}
          </div>

          <!-- Add Icon Hint -->
          @if (!icon) {
            <span class="absolute -bottom-1 left-0 text-xs opacity-0 group-hover:opacity-50
                         whitespace-nowrap transition-opacity">
              아이콘 추가
            </span>
          }

          <!-- Icon Picker -->
          @if (showIconPicker()) {
            <div class="icon-picker absolute top-full left-0 mt-2 p-4 rounded-xl shadow-xl z-50
                        grid grid-cols-8 gap-2"
                 [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'">
              @for (emoji of commonEmojis; track emoji) {
                <button
                  (click)="selectIcon(emoji); $event.stopPropagation()"
                  class="w-10 h-10 text-2xl rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700
                         flex items-center justify-center transition-colors">
                  {{ emoji }}
                </button>
              }
            </div>
          }
        </div>

        <!-- Cover Button (if no cover) -->
        @if (!distillation.pageCover) {
          <button
            (click)="addCover.emit()"
            class="mt-4 px-3 py-1.5 text-sm rounded-lg opacity-0 hover:opacity-100
                   hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
            [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
            <i class="pi pi-image mr-1"></i>
            커버 추가
          </button>
        }
      </div>

      <!-- Title -->
      <div class="title-row mb-4">
        @if (isEditingTitle()) {
          <input
            #titleInput
            type="text"
            [value]="distillation.title"
            (blur)="saveTitle(titleInput.value)"
            (keydown.enter)="saveTitle(titleInput.value)"
            (keydown.escape)="isEditingTitle.set(false)"
            class="w-full text-4xl font-bold bg-transparent border-none outline-none
                   placeholder:opacity-30"
            [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'"
            placeholder="제목 없음"
            autofocus />
        } @else {
          <h1
            (click)="isEditingTitle.set(true)"
            class="text-4xl font-bold cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800
                   rounded-lg px-2 -mx-2 py-1 transition-colors"
            [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'">
            {{ distillation.title || '제목 없음' }}
          </h1>
        }
      </div>

      <!-- Meta Info -->
      <div class="meta-row flex items-center gap-4 text-sm opacity-60">
        <!-- Source Type -->
        <div class="flex items-center gap-1.5">
          <i [class]="getSourceIcon(distillation.sourceType)"></i>
          <span>{{ getSourceLabel(distillation.sourceType) }}</span>
        </div>

        <!-- Duration (if audio/video) -->
        @if (distillation.durationSeconds) {
          <div class="flex items-center gap-1.5">
            <i class="pi pi-clock"></i>
            <span>{{ formatDuration(distillation.durationSeconds) }}</span>
          </div>
        }

        <!-- Created Date -->
        <div class="flex items-center gap-1.5">
          <i class="pi pi-calendar"></i>
          <span>{{ formatDate(distillation.createdAt) }}</span>
        </div>

        <!-- Status -->
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full"
                [class]="getStatusColor(distillation.status)"></span>
          <span>{{ getStatusLabel(distillation.status) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .icon-picker {
      max-height: 300px;
      overflow-y: auto;
    }
  `]
})
export class PageHeaderComponent {
  theme = inject(ThemeService);

  @Input() distillation!: Distillation & { pageIcon?: string; pageCover?: string };
  @Input() icon?: string;

  @Output() iconChange = new EventEmitter<string>();
  @Output() titleChange = new EventEmitter<string>();
  @Output() addCover = new EventEmitter<void>();

  isEditingTitle = signal(false);
  showIconPicker = signal(false);

  commonEmojis = [
    '📄', '📝', '📚', '📖', '🎓', '💡', '🎯', '🚀',
    '💻', '🔧', '⚙️', '🎨', '🎵', '🎬', '📊', '📈',
    '🗂️', '📁', '🗃️', '📌', '⭐', '❤️', '🔥', '✨',
    '🎉', '💪', '🤔', '💭', '📣', '🔔', '🏆', '🎖️',
  ];

  selectIcon(emoji: string) {
    this.iconChange.emit(emoji);
    this.showIconPicker.set(false);
  }

  saveTitle(title: string) {
    if (title !== this.distillation.title) {
      this.titleChange.emit(title);
    }
    this.isEditingTitle.set(false);
  }

  getSourceIcon(sourceType: SourceType): string {
    const icons: Record<SourceType, string> = {
      youtube: 'pi pi-youtube',
      audio: 'pi pi-volume-up',
      video: 'pi pi-video',
      url: 'pi pi-link',
      recording: 'pi pi-microphone',
      pdf: 'pi pi-file-pdf',
      website: 'pi pi-globe',
      text: 'pi pi-align-left',
      note: 'pi pi-pencil',
      x_thread: 'pi pi-twitter',
      clipboard: 'pi pi-clipboard',
    };
    return icons[sourceType] || 'pi pi-file';
  }

  getSourceLabel(sourceType: SourceType): string {
    const labels: Record<SourceType, string> = {
      youtube: 'YouTube',
      audio: '오디오',
      video: '비디오',
      url: 'URL',
      recording: '녹음',
      pdf: 'PDF',
      website: '웹사이트',
      text: '텍스트',
      note: '노트',
      x_thread: 'X 스레드',
      clipboard: '클립보드',
    };
    return labels[sourceType] || sourceType;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      uploading: 'bg-blue-500',
      processing: 'bg-cyan-500 animate-pulse',
      crystallized: 'bg-green-500',
      failed: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '대기 중',
      uploading: '업로드 중',
      processing: '증류 중...',
      crystallized: '결정화 완료',
      failed: '실패',
    };
    return labels[status] || status;
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
