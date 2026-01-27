/**
 * Formatting Toolbar Component
 *
 * 인라인 포맷팅 툴바 (플로팅)
 * 텍스트 선택 시 나타나며 bold, italic, link, highlight 등 적용 가능
 */

import { Component, Input, Output, EventEmitter, inject, signal, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { SelectionService } from '../../../core/services/selection.service';

export interface ToolbarPosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-formatting-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (visible() && position()) {
      <div
        class="formatting-toolbar fixed z-50 flex items-center gap-0.5 p-1 rounded-lg shadow-xl border animate-fade-in"
        [class]="theme.isDark()
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-white border-zinc-200'"
        [style.left.px]="position()!.x"
        [style.top.px]="position()!.y - 48"
        [style.transform]="'translateX(-50%)'"
        (mousedown)="$event.preventDefault()">

        <!-- Bold -->
        <button
          type="button"
          (click)="onBold()"
          class="toolbar-btn"
          [class.active]="selection.isBold()"
          [class]="getButtonClasses(selection.isBold())"
          title="굵게 (Ctrl+B)">
          <i class="pi pi-bold text-sm"></i>
        </button>

        <!-- Italic -->
        <button
          type="button"
          (click)="onItalic()"
          class="toolbar-btn"
          [class.active]="selection.isItalic()"
          [class]="getButtonClasses(selection.isItalic())"
          title="기울임 (Ctrl+I)">
          <i class="pi pi-italic text-sm"></i>
        </button>

        <!-- Underline -->
        <button
          type="button"
          (click)="onUnderline()"
          class="toolbar-btn"
          [class.active]="selection.isUnderline()"
          [class]="getButtonClasses(selection.isUnderline())"
          title="밑줄 (Ctrl+U)">
          <i class="pi pi-underline text-sm"></i>
        </button>

        <!-- Strikethrough -->
        <button
          type="button"
          (click)="onStrikethrough()"
          class="toolbar-btn"
          [class.active]="selection.isStrikethrough()"
          [class]="getButtonClasses(selection.isStrikethrough())"
          title="취소선">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
          </svg>
        </button>

        <!-- Divider -->
        <div class="w-px h-6 mx-1" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>

        <!-- Code -->
        <button
          type="button"
          (click)="onCode()"
          class="toolbar-btn"
          [class.active]="selection.isCode()"
          [class]="getButtonClasses(selection.isCode())"
          title="인라인 코드">
          <i class="pi pi-code text-sm"></i>
        </button>

        <!-- Link -->
        <button
          type="button"
          (click)="toggleLinkInput()"
          class="toolbar-btn"
          [class.active]="selection.linkUrl() || showLinkInput()"
          [class]="getButtonClasses(!!selection.linkUrl() || showLinkInput())"
          title="링크 (Ctrl+K)">
          <i class="pi pi-link text-sm"></i>
        </button>

        <!-- Highlight -->
        <div class="relative">
          <button
            type="button"
            (click)="toggleHighlightPicker()"
            class="toolbar-btn"
            [class.active]="selection.highlightColor()"
            [class]="getButtonClasses(!!selection.highlightColor())"
            title="하이라이트">
            <i class="pi pi-palette text-sm"></i>
          </button>

          <!-- Highlight Color Picker -->
          @if (showHighlightPicker()) {
            <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 rounded-lg shadow-xl border z-10"
                 [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'">
              <div class="grid grid-cols-5 gap-1">
                @for (color of highlightColors; track color.value) {
                  <button
                    type="button"
                    (click)="onHighlight(color.value)"
                    class="w-6 h-6 rounded transition-transform hover:scale-110"
                    [style.background]="color.value"
                    [title]="color.label">
                    @if (selection.highlightColor() === color.value) {
                      <i class="pi pi-check text-xs text-white drop-shadow"></i>
                    }
                  </button>
                }
                <!-- Remove highlight -->
                <button
                  type="button"
                  (click)="onHighlight(null)"
                  class="w-6 h-6 rounded border-2 border-dashed flex items-center justify-center transition-transform hover:scale-110"
                  [class]="theme.isDark() ? 'border-zinc-600 text-zinc-500' : 'border-zinc-300 text-zinc-400'"
                  title="하이라이트 제거">
                  <i class="pi pi-times text-xs"></i>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Divider -->
        <div class="w-px h-6 mx-1" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>

        <!-- Clear Formatting -->
        <button
          type="button"
          (click)="onClearFormatting()"
          class="toolbar-btn"
          [class]="getButtonClasses(false)"
          title="서식 지우기">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/>
          </svg>
        </button>
      </div>

      <!-- Link Input -->
      @if (showLinkInput()) {
        <div
          class="fixed z-50 p-2 rounded-lg shadow-xl border animate-fade-in"
          [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'"
          [style.left.px]="position()!.x"
          [style.top.px]="position()!.y - 96"
          [style.transform]="'translateX(-50%)'">
          <div class="flex items-center gap-2">
            <input
              #linkInput
              type="text"
              [(ngModel)]="linkUrl"
              placeholder="https://example.com"
              class="w-64 px-3 py-1.5 text-sm rounded border outline-none focus:ring-2 focus:ring-cyan-500/30"
              [class]="theme.isDark()
                ? 'bg-zinc-900 border-zinc-700 text-white'
                : 'bg-white border-zinc-300 text-zinc-900'"
              (keydown.enter)="onLinkSubmit()"
              (keydown.escape)="showLinkInput.set(false)" />
            <button
              type="button"
              (click)="onLinkSubmit()"
              class="px-3 py-1.5 text-sm rounded bg-cyan-500 hover:bg-cyan-600 text-white cursor-pointer">
              확인
            </button>
            @if (selection.linkUrl()) {
              <button
                type="button"
                (click)="onRemoveLink()"
                class="px-3 py-1.5 text-sm rounded cursor-pointer"
                [class]="theme.isDark()
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'">
                삭제
              </button>
            }
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .toolbar-btn {
      @apply w-8 h-8 rounded flex items-center justify-center cursor-pointer transition-colors;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    .animate-fade-in {
      animation: fade-in 0.15s ease-out;
    }
  `]
})
export class FormattingToolbarComponent implements OnInit, OnDestroy {
  theme = inject(ThemeService);
  selection = inject(SelectionService);
  private elementRef = inject(ElementRef);

  @Input() set show(value: boolean) {
    this.visible.set(value);
  }

  @Output() formatApplied = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  visible = signal(false);
  position = signal<ToolbarPosition | null>(null);
  showLinkInput = signal(false);
  showHighlightPicker = signal(false);
  linkUrl = '';

  highlightColors = [
    { label: '노랑', value: 'rgba(255, 220, 73, 0.5)' },
    { label: '주황', value: 'rgba(255, 163, 68, 0.5)' },
    { label: '분홍', value: 'rgba(226, 85, 161, 0.5)' },
    { label: '보라', value: 'rgba(154, 109, 215, 0.5)' },
    { label: '파랑', value: 'rgba(82, 156, 202, 0.5)' },
    { label: '녹색', value: 'rgba(77, 171, 154, 0.5)' },
    { label: '빨강', value: 'rgba(255, 115, 105, 0.5)' },
    { label: '회색', value: 'rgba(128, 128, 128, 0.3)' },
    { label: '청록', value: 'rgba(6, 182, 212, 0.5)' },
  ];

  private selectionCheckInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Check selection state periodically
    this.selectionCheckInterval = setInterval(() => {
      this.checkSelection();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.selectionCheckInterval) {
      clearInterval(this.selectionCheckInterval);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    setTimeout(() => this.checkSelection(), 10);
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'b') {
        this.onBold();
      } else if (event.key === 'i') {
        this.onItalic();
      } else if (event.key === 'u') {
        this.onUnderline();
      } else if (event.key === 'k') {
        event.preventDefault();
        this.toggleLinkInput();
      }
    }

    // Update selection state
    setTimeout(() => this.checkSelection(), 10);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Close highlight picker if clicking outside
    if (this.showHighlightPicker() && !this.elementRef.nativeElement.contains(target)) {
      this.showHighlightPicker.set(false);
    }

    // Close link input if clicking outside
    if (this.showLinkInput() && !this.elementRef.nativeElement.contains(target)) {
      this.showLinkInput.set(false);
    }
  }

  private checkSelection(): void {
    this.selection.updateSelectionState();

    if (this.selection.hasSelection()) {
      const rect = this.selection.selectionRect();
      if (rect) {
        this.position.set({
          x: rect.x,
          y: rect.y + window.scrollY,
        });
        this.visible.set(true);
      }
    } else {
      this.visible.set(false);
      this.showLinkInput.set(false);
      this.showHighlightPicker.set(false);
    }
  }

  getButtonClasses(isActive: boolean): string {
    if (isActive) {
      return 'bg-cyan-500/20 text-cyan-500';
    }
    return this.theme.isDark()
      ? 'hover:bg-zinc-700 text-zinc-300'
      : 'hover:bg-zinc-100 text-zinc-600';
  }

  onBold(): void {
    this.selection.toggleBold();
    this.formatApplied.emit();
  }

  onItalic(): void {
    this.selection.toggleItalic();
    this.formatApplied.emit();
  }

  onUnderline(): void {
    this.selection.toggleUnderline();
    this.formatApplied.emit();
  }

  onStrikethrough(): void {
    this.selection.toggleStrikethrough();
    this.formatApplied.emit();
  }

  onCode(): void {
    this.selection.toggleCode();
    this.formatApplied.emit();
  }

  toggleLinkInput(): void {
    this.showHighlightPicker.set(false);
    this.showLinkInput.set(!this.showLinkInput());
    if (this.showLinkInput()) {
      this.linkUrl = this.selection.linkUrl() || '';
    }
  }

  onLinkSubmit(): void {
    this.selection.insertLink(this.linkUrl);
    this.showLinkInput.set(false);
    this.linkUrl = '';
    this.formatApplied.emit();
  }

  onRemoveLink(): void {
    this.selection.insertLink('');
    this.showLinkInput.set(false);
    this.linkUrl = '';
    this.formatApplied.emit();
  }

  toggleHighlightPicker(): void {
    this.showLinkInput.set(false);
    this.showHighlightPicker.set(!this.showHighlightPicker());
  }

  onHighlight(color: string | null): void {
    this.selection.setHighlight(color);
    this.showHighlightPicker.set(false);
    this.formatApplied.emit();
  }

  onClearFormatting(): void {
    this.selection.clearFormatting();
    this.formatApplied.emit();
  }
}
