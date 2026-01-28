/**
 * Page Header Component
 *
 * 노션 스타일 페이지 헤더 (아이콘 + 제목 + 메타 정보)
 */

import { Component, Input, Output, EventEmitter, signal, inject, HostListener, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { Distillation, SourceType } from '../../../core/services/api.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header px-4 md:px-8 lg:px-16 pt-12 pb-4">
    <div class="header-content group relative" (mouseenter)="isHovering.set(true)" (mouseleave)="isHovering.set(false)">
      <!-- Hover Actions (Icon + Cover) -->
      <div class="hover-actions flex items-center gap-2 mb-3 h-8 transition-opacity duration-200"
           [class.opacity-0]="!isHovering()"
           [class.opacity-100]="isHovering()">
        <!-- Add Icon Button -->
        <button
          (click)="toggleIconPicker($event)"
          class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
          [class]="theme.isDark()
            ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
            : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'">
          <i class="pi pi-face-smile"></i>
          <span>{{ icon ? '아이콘 변경' : '아이콘 추가' }}</span>
        </button>

        <!-- Add Cover Button -->
        @if (!distillation.pageCover) {
          <button
            (click)="addCover.emit()"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'">
            <i class="pi pi-image"></i>
            <span>커버 추가</span>
          </button>
        }
      </div>

      <!-- Icon (if exists) -->
      @if (icon) {
        <div class="icon-display mb-3 relative">
          <button
            (click)="toggleIconPicker($event)"
            class="text-6xl md:text-7xl cursor-pointer hover:opacity-80 transition-opacity
                   rounded-xl p-1 -ml-1">
            {{ icon }}
          </button>
        </div>
      }

      <!-- Icon Picker Popup -->
      @if (showIconPicker()) {
        <div class="icon-picker-overlay fixed inset-0 z-40" (click)="showIconPicker.set(false)"></div>
        <div #iconPickerRef class="icon-picker absolute mt-2 p-3 rounded-xl shadow-2xl z-50 w-80"
             [style.left.px]="iconPickerPosition.x"
             [style.top.px]="iconPickerPosition.y"
             [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'">
          <!-- Quick Actions -->
          <div class="flex items-center gap-2 mb-3 pb-3 border-b"
               [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
            <button
              (click)="removeIcon()"
              class="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
              [class]="theme.isDark()
                ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'">
              <i class="pi pi-times mr-1"></i>
              제거
            </button>
          </div>
          <!-- Emoji Grid -->
          <div class="grid grid-cols-8 gap-1">
            @for (emoji of commonEmojis; track emoji) {
              <button
                (click)="selectIcon(emoji); $event.stopPropagation()"
                class="w-8 h-8 text-xl rounded-lg flex items-center justify-center transition-colors"
                [class]="theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'">
                {{ emoji }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Title -->
      <div class="title-row mb-2 relative">
        @if (isEditingTitle()) {
          <textarea
            #titleInput
            [value]="distillation.title"
            (blur)="saveTitle(titleInput.value)"
            (keydown.enter)="$event.preventDefault(); saveTitle(titleInput.value)"
            (keydown.escape)="isEditingTitle.set(false)"
            (input)="autoResizeTextarea($event)"
            class="w-full text-4xl font-bold bg-transparent border-none outline-none resize-none
                   placeholder:opacity-30 leading-tight overflow-hidden"
            [class]="theme.isDark() ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-300'"
            placeholder="제목 없음"
            rows="1"></textarea>
        } @else {
          <h1
            (click)="startEditing()"
            class="text-4xl font-bold cursor-text rounded-lg transition-colors leading-tight
                   min-h-[3rem]"
            [class]="distillation.title
              ? (theme.isDark() ? 'text-white' : 'text-zinc-900')
              : (theme.isDark() ? 'text-zinc-600' : 'text-zinc-300')">
            {{ distillation.title || '제목 없음' }}
          </h1>
        }
      </div>
    </div>

      <!-- Meta Info (Compact) -->
      <div class="meta-row flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
           [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
        <!-- Source Type -->
        <div class="flex items-center gap-1">
          <i [class]="getSourceIcon(distillation.sourceType)" class="text-[10px]"></i>
          <span>{{ getSourceLabel(distillation.sourceType) }}</span>
        </div>

        <!-- Duration (if audio/video) -->
        @if (distillation.durationSeconds) {
          <div class="flex items-center gap-1">
            <i class="pi pi-clock text-[10px]"></i>
            <span>{{ formatDuration(distillation.durationSeconds) }}</span>
          </div>
        }

        <!-- Status (only if not crystallized) -->
        @if (distillation.status !== 'crystallized') {
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full"
                  [class]="getStatusColor(distillation.status)"></span>
            <span>{{ getStatusLabel(distillation.status) }}</span>
          </div>
        }

        <!-- Created Date -->
        <div class="flex items-center gap-1 ml-auto">
          <span>{{ formatDate(distillation.createdAt) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .icon-picker {
      max-height: 320px;
      overflow-y: auto;
    }

    .icon-picker-overlay {
      background: transparent;
    }

    .hover-actions {
      transition: opacity 0.15s ease;
    }

    textarea {
      field-sizing: content;
    }
  `]
})
export class PageHeaderComponent implements AfterViewChecked {
  theme = inject(ThemeService);
  private elementRef = inject(ElementRef);

  @Input() distillation!: Distillation & { pageIcon?: string; pageCover?: string };
  @Input() icon?: string;

  @Output() iconChange = new EventEmitter<string>();
  @Output() titleChange = new EventEmitter<string>();
  @Output() addCover = new EventEmitter<void>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLTextAreaElement>;

  isEditingTitle = signal(false);
  showIconPicker = signal(false);
  isHovering = signal(false);
  iconPickerPosition = { x: 0, y: 0 };
  private shouldFocusTitle = false;

  commonEmojis = [
    '📄', '📝', '📚', '📖', '🎓', '💡', '🎯', '🚀',
    '💻', '🔧', '⚙️', '🎨', '🎵', '🎬', '📊', '📈',
    '🗂️', '📁', '🗃️', '📌', '⭐', '❤️', '🔥', '✨',
    '🎉', '💪', '🤔', '💭', '📣', '🔔', '🏆', '🎖️',
  ];

  ngAfterViewChecked() {
    // Focus the title input after it renders
    if (this.shouldFocusTitle && this.titleInputRef?.nativeElement) {
      const textarea = this.titleInputRef.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      this.autoResizeTextarea({ target: textarea } as unknown as Event);
      this.shouldFocusTitle = false;
    }
  }

  startEditing() {
    this.isEditingTitle.set(true);
    this.shouldFocusTitle = true;
  }

  toggleIconPicker(event: MouseEvent) {
    event.stopPropagation();
    if (this.showIconPicker()) {
      this.showIconPicker.set(false);
    } else {
      // Position the picker near the click
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      this.iconPickerPosition = {
        x: rect.left,
        y: rect.bottom + 8
      };
      this.showIconPicker.set(true);
    }
  }

  selectIcon(emoji: string) {
    this.iconChange.emit(emoji);
    this.showIconPicker.set(false);
  }

  removeIcon() {
    this.iconChange.emit('');
    this.showIconPicker.set(false);
  }

  saveTitle(title: string) {
    if (title !== this.distillation.title) {
      this.titleChange.emit(title);
    }
    this.isEditingTitle.set(false);
  }

  autoResizeTextarea(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
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
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
}
