/**
 * Formatting Toolbar Component
 *
 * 텍스트 선택 시 나타나는 플로팅 툴바
 * Bold, Italic, Link, Color 등의 인라인 포맷팅 기능 제공
 */

import { Component, EventEmitter, Output, inject, effect, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { SelectionService } from '../../../core/services/selection.service';

@Component({
  selector: 'app-formatting-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (selection.state().hasSelection && selection.state().rect) {
      <div
        class="formatting-toolbar fixed z-50 rounded-lg shadow-xl flex items-center p-1 gap-0.5 transition-all duration-200"
        [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'"
        [style.top.px]="top()"
        [style.left.px]="left()"
        (mousedown)="$event.preventDefault()" 
        (click)="$event.stopPropagation()">
        
        <!-- AI Action -->
        <button
          (click)="onAiAction()"
          class="flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors mr-1"
          [class]="theme.isDark() 
            ? 'hover:bg-zinc-700 text-purple-400 hover:text-purple-300' 
            : 'hover:bg-purple-50 text-purple-600 hover:text-purple-700'">
          <i class="pi pi-sparkles"></i>
          <span>Ask AI</span>
        </button>

        <div class="w-px h-4 mx-1" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>

        <!-- Text Styles -->
        <button
          (click)="selection.toggleBold()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="selection.isBold()"
          [class.text-white]="selection.isBold()"
          [class]="!selection.isBold() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Bold (Cmd+B)">
          <i class="pi pi-bold text-xs"></i>
        </button>

        <button
          (click)="selection.toggleItalic()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="selection.isItalic()"
          [class.text-white]="selection.isItalic()"
          [class]="!selection.isItalic() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Italic (Cmd+I)">
          <i class="pi pi-italic text-xs"></i>
        </button>

        <button
          (click)="selection.toggleUnderline()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="selection.isUnderline()"
          [class.text-white]="selection.isUnderline()"
          [class]="!selection.isUnderline() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Underline (Cmd+U)">
          <i class="pi pi-underline text-xs"></i>
        </button>
        
        <button
          (click)="selection.toggleStrikethrough()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="selection.isStrikethrough()"
          [class.text-white]="selection.isStrikethrough()"
          [class]="!selection.isStrikethrough() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Strikethrough (Cmd+Shift+S)">
          <span class="line-through text-xs font-serif">S</span>
        </button>

        <button
          (click)="selection.toggleCode()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="selection.isCode()"
          [class.text-white]="selection.isCode()"
          [class]="!selection.isCode() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Code (Cmd+E)">
          <i class="pi pi-code text-xs"></i>
        </button>

        <div class="w-px h-4 mx-1" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>

        <!-- Link -->
        <button
          (click)="toggleLinkInput()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors"
          [class.bg-cyan-500]="!!selection.linkUrl()"
          [class.text-white]="!!selection.linkUrl()"
          [class]="!selection.linkUrl() ? (theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600') : ''"
          title="Link (Cmd+K)">
          <i class="pi pi-link text-xs"></i>
        </button>

        <!-- Color -->
        <button
          (click)="toggleColorPicker()"
          class="w-7 h-7 rounded flex items-center justify-center transition-colors relative"
          [class]="theme.isDark() ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-600'"
          title="Text Color">
          <span class="font-serif text-sm">A</span>
          <div class="absolute bottom-1.5 right-1.5 w-1 h-1 rounded-full bg-red-500"></div>
        </button>
      </div>

      <!-- Link Input Popup -->
      @if (showLinkInput) {
        <div 
          class="fixed z-50 p-2 rounded-lg shadow-xl flex items-center gap-2"
          [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border-zinc-200'"
          [style.top.px]="top() + 45"
          [style.left.px]="left()"
          (click)="$event.stopPropagation()">
          <input 
            #linkInputRef
            type="text" 
            [(ngModel)]="linkUrl" 
            placeholder="https://..." 
            class="px-2 py-1 text-sm rounded border outline-none min-w-[200px]"
            [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600' : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'"
            (keydown.enter)="applyLink()">
          <button 
            (click)="applyLink()"
            class="px-2 py-1 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600">
            Apply
          </button>
        </div>
      }

      <!-- Color Picker Popup -->
      @if (showColorPicker) {
        <div 
          class="fixed z-50 p-3 rounded-lg shadow-xl grid grid-cols-5 gap-1 w-48"
          [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border-zinc-200'"
          [style.top.px]="top() + 45"
          [style.left.px]="left()"
          (click)="$event.stopPropagation()">
          
          <div class="col-span-5 text-xs font-medium mb-1 px-1" [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">Color</div>
          @for (color of colors; track color.value) {
             <button 
               (click)="applyColor(color.value)"
               class="w-8 h-8 rounded hover:bg-black/5 flex items-center justify-center text-sm font-medium"
               [style.color]="color.value === 'default' ? 'inherit' : color.hex"
               [title]="color.label">
               A
             </button>
          }
          
          <div class="col-span-5 text-xs font-medium mb-1 mt-2 px-1" [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">Background</div>
          @for (color of colors; track color.value) {
             <button 
               (click)="applyHighlight(color.hex)"
               class="w-8 h-8 rounded flex items-center justify-center text-sm font-medium"
               [style.backgroundColor]="color.value === 'default' ? 'transparent' : color.bgHex"
               [title]="color.label">
               A
             </button>
          }
        </div>
      }
    }
  `,
  styles: [`
    .formatting-toolbar {
      animation: fadeIn 0.1s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class FormattingToolbarComponent {
  theme = inject(ThemeService);
  selection = inject(SelectionService);

  @Output() formatApplied = new EventEmitter<void>();
  @ViewChild('linkInputRef') linkInputRef?: ElementRef<HTMLInputElement>;

  // View state
  showLinkInput = false;
  showColorPicker = false;
  linkUrl = '';

  // Colors for Notion-like palette
  colors = [
    { label: 'Default', value: 'default', hex: 'inherit', bgHex: 'transparent' },
    { label: 'Gray', value: 'gray', hex: '#9B9A97', bgHex: '#EBECED' },
    { label: 'Brown', value: 'brown', hex: '#64473A', bgHex: '#E9E5E3' },
    { label: 'Orange', value: 'orange', hex: '#D9730D', bgHex: '#FAEBDD' },
    { label: 'Yellow', value: 'yellow', hex: '#DFAB01', bgHex: '#FBF3DB' },
    { label: 'Green', value: 'green', hex: '#0F7B6C', bgHex: '#DDEDEA' },
    { label: 'Blue', value: 'blue', hex: '#0B6E99', bgHex: '#DDEBF1' },
    { label: 'Purple', value: 'purple', hex: '#6940A5', bgHex: '#EAE4F2' },
    { label: 'Pink', value: 'pink', hex: '#AD1A72', bgHex: '#F4DFEB' },
    { label: 'Red', value: 'red', hex: '#E03E3E', bgHex: '#FBE4E4' },
  ];

  // Computed positions
  top = computed(() => {
    const rect = this.selection.state().rect;
    if (!rect) return 0;
    // Position above selection with some padding
    return Math.max(10, rect.y - 45 + window.scrollY);
  });

  left = computed(() => {
    const rect = this.selection.state().rect;
    if (!rect) return 0;
    // Center horizontally
    return Math.max(10, rect.x + (rect.width / 2) - 150 + window.scrollX);
  });

  constructor() {
    // Reset view state when selection changes
    effect(() => {
      if (!this.selection.state().hasSelection) {
        this.showLinkInput = false;
        this.showColorPicker = false;
      }
    });
  }

  toggleLinkInput() {
    this.showLinkInput = !this.showLinkInput;
    this.showColorPicker = false;

    if (this.showLinkInput) {
      this.linkUrl = this.selection.linkUrl() || '';
      // Focus input on next tick
      setTimeout(() => this.linkInputRef?.nativeElement.focus());
    }
  }

  toggleColorPicker() {
    this.showColorPicker = !this.showColorPicker;
    this.showLinkInput = false;
  }

  applyLink() {
    this.selection.insertLink(this.linkUrl);
    this.showLinkInput = false;
    this.formatApplied.emit();
  }

  applyColor(color: string) {
    // Note: SelectionService currently handles highlight, but not text color properly without more complex DOM manipulation
    // For now we'll implement what SelectionService supports, or update SelectionService later
    document.execCommand('foreColor', false, color === 'default' ? 'inherit' : this.getColorHex(color));
    this.showColorPicker = false;
    this.formatApplied.emit();
  }

  applyHighlight(color: string) {
    this.selection.setHighlight(color === 'transparent' ? null : color);
    this.showColorPicker = false;
    this.formatApplied.emit();
  }

  getColorHex(value: string): string {
    return this.colors.find(c => c.value === value)?.hex || 'inherit';
  }

  onAiAction() {
    // TODO: Emit AI action event
    console.log('AI Action requested on selection:', this.selection.selectedText());
  }
}
