/**
 * Block Renderer Component
 *
 * 블록 타입에 따라 적절한 렌더링을 수행
 * 호버 시 드래그 핸들과 액션 메뉴 표시
 */

import { Component, Input, Output, EventEmitter, signal, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { AudioService } from '../../../core/services/audio.service';
import { Block, BlockType, BlockProperties } from '../../../core/services/api.service';
import { BLOCK_COLORS, BlockColor } from '../../../core/types/block.types';

@Component({
  selector: 'app-block-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="block-wrapper group relative flex items-start gap-2 py-1 -ml-8"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false); showMenu.set(false)">

      <!-- Hover Actions (Left side) -->
      <div class="hover-actions flex items-center gap-0.5 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <!-- Drag Handle -->
        <button
          class="w-6 h-6 rounded flex items-center justify-center
                 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-grab active:cursor-grabbing"
          [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'"
          title="드래그하여 이동">
          <i class="pi pi-th-large text-xs"></i>
        </button>

        <!-- Menu Button -->
        <button
          (click)="showMenu.set(!showMenu())"
          class="w-6 h-6 rounded flex items-center justify-center
                 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
          <i class="pi pi-ellipsis-h text-xs"></i>
        </button>

        <!-- Dropdown Menu -->
        @if (showMenu()) {
          <div class="menu-dropdown absolute left-0 top-full mt-1 py-2 rounded-xl shadow-xl z-50 min-w-52"
               [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'"
               (mouseleave)="closeSubmenus()">

            <!-- Turn Into -->
            <div class="relative"
                 (mouseenter)="showTurnIntoMenu.set(true)"
                 (mouseleave)="showTurnIntoMenu.set(false)">
              <button
                class="w-full px-4 py-2 text-left text-sm flex items-center gap-2 justify-between
                       hover:bg-zinc-100 dark:hover:bg-zinc-700">
                <span class="flex items-center gap-2">
                  <i class="pi pi-sync"></i>
                  변환
                </span>
                <i class="pi pi-chevron-right text-xs opacity-50"></i>
              </button>

              <!-- Turn Into Submenu -->
              @if (showTurnIntoMenu()) {
                <div class="absolute left-full top-0 ml-1 py-2 rounded-xl shadow-xl z-50 min-w-40"
                     [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'">
                  @for (type of blockTypes; track type.id) {
                    <button
                      (click)="turnInto(type.id)"
                      class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                             hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      [class.text-cyan-500]="block.type === type.id">
                      <i [class]="'pi ' + type.icon"></i>
                      {{ type.label }}
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Color -->
            <div class="relative"
                 (mouseenter)="showColorMenu.set(true)"
                 (mouseleave)="showColorMenu.set(false)">
              <button
                class="w-full px-4 py-2 text-left text-sm flex items-center gap-2 justify-between
                       hover:bg-zinc-100 dark:hover:bg-zinc-700">
                <span class="flex items-center gap-2">
                  <i class="pi pi-palette"></i>
                  색상
                </span>
                <i class="pi pi-chevron-right text-xs opacity-50"></i>
              </button>

              <!-- Color Submenu -->
              @if (showColorMenu()) {
                <div class="absolute left-full top-0 ml-1 p-3 rounded-xl shadow-xl z-50"
                     [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'">
                  <div class="grid grid-cols-5 gap-2">
                    @for (color of colorOptions; track color.id) {
                      <button
                        (click)="setColor(color.id)"
                        class="w-7 h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
                        [style.background]="color.bg"
                        [title]="color.label">
                        @if (block.properties?.color === color.id || (!block.properties?.color && color.id === 'default')) {
                          <i class="pi pi-check text-xs"
                             [style.color]="color.id === 'default' ? 'inherit' : color.text"></i>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="border-t my-1" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'"></div>

            <!-- Duplicate -->
            <button
              (click)="onDuplicate()"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700">
              <i class="pi pi-copy"></i>
              복제
            </button>

            <!-- Move -->
            <button
              (click)="moveUp.emit(); showMenu.set(false)"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700">
              <i class="pi pi-arrow-up"></i>
              위로 이동
            </button>
            <button
              (click)="moveDown.emit(); showMenu.set(false)"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700">
              <i class="pi pi-arrow-down"></i>
              아래로 이동
            </button>

            <div class="border-t my-1" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'"></div>

            <!-- AI Features -->
            <button
              (click)="askAgentD()"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700 text-violet-500">
              <i class="pi pi-comments"></i>
              Agent D에게 질문
            </button>
            <button
              (click)="summarizeBlock()"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700 text-violet-500">
              <i class="pi pi-sparkles"></i>
              이 블록 요약
            </button>

            <div class="border-t my-1" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'"></div>

            <!-- Delete -->
            <button
              (click)="onDelete()"
              class="w-full px-4 py-2 text-left text-sm flex items-center gap-2
                     hover:bg-zinc-100 dark:hover:bg-zinc-700 text-red-500">
              <i class="pi pi-trash"></i>
              삭제
            </button>
          </div>
        }
      </div>

      <!-- Block Content -->
      <div class="block-content flex-1 min-w-0" [ngClass]="getBlockClasses()">
        @switch (block.type) {
          <!-- Heading 1 -->
          @case ('heading1') {
            @if (isEditing) {
              <input
                #editInput
                type="text"
                [value]="block.content"
                (blur)="saveContent(editInput.value)"
                (keydown.enter)="saveContent(editInput.value)"
                (keydown.escape)="cancelEdit()"
                class="w-full text-3xl font-bold bg-transparent border-none outline-none"
                [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'"
                autofocus />
            } @else {
              <h1
                (click)="edit.emit()"
                class="text-3xl font-bold cursor-text"
                [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'">
                {{ block.content || '제목 1' }}
              </h1>
            }
          }

          <!-- Heading 2 -->
          @case ('heading2') {
            @if (isEditing) {
              <input
                #editInput
                type="text"
                [value]="block.content"
                (blur)="saveContent(editInput.value)"
                (keydown.enter)="saveContent(editInput.value)"
                class="w-full text-2xl font-semibold bg-transparent border-none outline-none"
                autofocus />
            } @else {
              <h2
                (click)="edit.emit()"
                class="text-2xl font-semibold cursor-text">
                {{ block.content || '제목 2' }}
              </h2>
            }
          }

          <!-- Heading 3 -->
          @case ('heading3') {
            @if (isEditing) {
              <input
                #editInput
                type="text"
                [value]="block.content"
                (blur)="saveContent(editInput.value)"
                (keydown.enter)="saveContent(editInput.value)"
                class="w-full text-xl font-medium bg-transparent border-none outline-none"
                autofocus />
            } @else {
              <h3
                (click)="edit.emit()"
                class="text-xl font-medium cursor-text">
                {{ block.content || '제목 3' }}
              </h3>
            }
          }

          <!-- Bullet List -->
          @case ('bullet') {
            <div class="flex items-start gap-2">
              <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-60"></span>
              @if (isEditing) {
                <input
                  #editInput
                  type="text"
                  [value]="block.content"
                  (blur)="saveContent(editInput.value)"
                  (keydown.enter)="saveContent(editInput.value)"
                  class="flex-1 bg-transparent border-none outline-none"
                  autofocus />
              } @else {
                <span (click)="edit.emit()" class="flex-1 cursor-text">
                  {{ block.content }}
                </span>
              }
            </div>
          }

          <!-- Numbered List -->
          @case ('numbered') {
            <div class="flex items-start gap-2">
              <span class="text-sm opacity-60 min-w-6">{{ block.position + 1 }}.</span>
              @if (isEditing) {
                <input
                  #editInput
                  type="text"
                  [value]="block.content"
                  (blur)="saveContent(editInput.value)"
                  (keydown.enter)="saveContent(editInput.value)"
                  class="flex-1 bg-transparent border-none outline-none"
                  autofocus />
              } @else {
                <span (click)="edit.emit()" class="flex-1 cursor-text">
                  {{ block.content }}
                </span>
              }
            </div>
          }

          <!-- Todo / Checkbox -->
          @case ('todo') {
            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                [checked]="block.properties?.checked"
                (change)="toggleChecked()"
                class="mt-1 w-4 h-4 rounded border-2 cursor-pointer
                       accent-cyan-500" />
              @if (isEditing) {
                <input
                  #editInput
                  type="text"
                  [value]="block.content"
                  (blur)="saveContent(editInput.value)"
                  (keydown.enter)="saveContent(editInput.value)"
                  class="flex-1 bg-transparent border-none outline-none"
                  [class.line-through]="block.properties?.checked"
                  [class.opacity-50]="block.properties?.checked"
                  autofocus />
              } @else {
                <span
                  (click)="edit.emit()"
                  class="flex-1 cursor-text"
                  [class.line-through]="block.properties?.checked"
                  [class.opacity-50]="block.properties?.checked">
                  {{ block.content }}
                </span>
              }
            </div>
          }

          <!-- Quote -->
          @case ('quote') {
            <div class="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 py-1 italic">
              @if (isEditing) {
                <textarea
                  #editInput
                  [value]="block.content"
                  (blur)="saveContent(editInput.value)"
                  (keydown.escape)="cancelEdit()"
                  rows="2"
                  class="w-full bg-transparent border-none outline-none resize-none"
                  autofocus></textarea>
              } @else {
                <p (click)="edit.emit()" class="cursor-text">{{ block.content }}</p>
              }
            </div>
          }

          <!-- Callout -->
          @case ('callout') {
            <div class="callout flex items-start gap-3 p-4 rounded-lg"
                 [style.background]="getCalloutBg()">
              <span class="text-xl">{{ block.properties?.icon || '💡' }}</span>
              <div class="flex-1">
                @if (isEditing) {
                  <textarea
                    #editInput
                    [value]="block.content"
                    (blur)="saveContent(editInput.value)"
                    (keydown.escape)="cancelEdit()"
                    rows="2"
                    class="w-full bg-transparent border-none outline-none resize-none"
                    autofocus></textarea>
                } @else {
                  <p (click)="edit.emit()" class="cursor-text">{{ block.content }}</p>
                }
              </div>
            </div>
          }

          <!-- Divider -->
          @case ('divider') {
            <hr class="border-t my-2" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'" />
          }

          <!-- Code -->
          @case ('code') {
            <div class="code-block rounded-lg overflow-hidden"
                 [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
              @if (block.properties?.language) {
                <div class="px-4 py-2 text-xs opacity-50 border-b"
                     [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
                  {{ block.properties.language }}
                </div>
              }
              <pre class="p-4 overflow-x-auto"><code
                class="font-mono text-sm"
                (click)="edit.emit()">{{ block.content }}</code></pre>
            </div>
          }

          <!-- Timestamp (Distillai-specific) -->
          @case ('timestamp') {
            <div
              class="timestamp-block flex items-center gap-3 p-3 rounded-lg cursor-pointer
                     transition-all group/ts"
              [class]="isTimestampActive()
                ? 'bg-cyan-500/10 border border-cyan-500/30'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'"
              (click)="onTimestampClick()">
              <div class="flex items-center gap-2 font-mono text-sm"
                   [class]="isTimestampActive() ? 'text-cyan-400' : 'text-cyan-500'">
                <i class="pi" [class]="isTimestampActive() ? 'pi-volume-up animate-pulse' : 'pi-clock'"></i>
                <span>{{ block.properties?.timestamp || '00:00' }}</span>
              </div>
              <button class="w-8 h-8 rounded-full flex items-center justify-center
                             transition-all"
                      [class]="isTimestampActive()
                        ? 'bg-cyan-500 text-white'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30'">
                <i [class]="isTimestampActive() ? 'pi pi-pause' : 'pi pi-play'"
                   class="text-xs"
                   [class.text-cyan-500]="!isTimestampActive()"></i>
              </button>
              @if (block.content) {
                <span class="text-sm flex-1"
                      [class]="isTimestampActive() ? 'opacity-100' : 'opacity-70'">
                  {{ block.content }}
                </span>
              }
              @if (!isTimestampActive()) {
                <span class="text-xs opacity-0 group-hover/ts:opacity-50 transition-opacity">
                  클릭하여 재생
                </span>
              }
            </div>
          }

          <!-- AI Summary (Distillai-specific) -->
          @case ('ai_summary') {
            <div class="ai-summary-block p-4 rounded-xl border transition-all"
                 [class]="theme.isDark()
                   ? 'bg-violet-500/10 border-violet-500/30'
                   : 'bg-violet-50 border-violet-200'">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-violet-500">✨</span>
                <span class="text-sm font-medium">AI 요약</span>
              </div>
              <div class="prose prose-sm">
                <p>{{ block.content }}</p>
              </div>
              <div class="flex gap-2 mt-4 pt-3 border-t border-violet-500/20">
                <button class="text-xs px-3 py-1.5 rounded-lg
                               bg-violet-500/20 hover:bg-violet-500/30 text-violet-500">
                  <i class="pi pi-refresh mr-1"></i> 재생성
                </button>
                <button (click)="edit.emit()" class="text-xs px-3 py-1.5 rounded-lg
                               hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <i class="pi pi-pencil mr-1"></i> 수정
                </button>
              </div>
            </div>
          }

          <!-- Toggle -->
          @case ('toggle') {
            <div class="toggle-block">
              <div
                class="flex items-center gap-2 cursor-pointer"
                (click)="toggleCollapsed()">
                <i class="pi text-sm transition-transform"
                   [class]="block.properties?.collapsed ? 'pi-chevron-right' : 'pi-chevron-down'"></i>
                @if (isEditing) {
                  <input
                    #editInput
                    type="text"
                    [value]="block.content"
                    (blur)="saveContent(editInput.value)"
                    (keydown.enter)="saveContent(editInput.value)"
                    (click)="$event.stopPropagation()"
                    class="flex-1 bg-transparent border-none outline-none"
                    autofocus />
                } @else {
                  <span class="flex-1">{{ block.content }}</span>
                }
              </div>
              @if (!block.properties?.collapsed && block.children?.length) {
                <div class="ml-6 mt-2 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                  @for (child of block.children; track child.id) {
                    <app-block-renderer
                      [block]="child"
                      [isEditing]="false"
                      (edit)="edit.emit()"
                      (update)="update.emit($event)"
                      (delete)="delete.emit()" />
                  }
                </div>
              }
            </div>
          }

          <!-- Default Text -->
          @default {
            @if (isEditing) {
              <textarea
                #editInput
                [value]="block.content"
                (blur)="saveContent(editInput.value)"
                (keydown.escape)="cancelEdit()"
                (keydown.enter)="handleEnter($event)"
                rows="1"
                class="w-full bg-transparent border-none outline-none resize-none leading-relaxed"
                [placeholder]="'텍스트를 입력하거나 / 를 입력하세요...'"
                autofocus></textarea>
            } @else {
              <p
                (click)="edit.emit()"
                class="cursor-text leading-relaxed min-h-6"
                [class.text-zinc-400]="!block.content">
                {{ block.content || '텍스트를 입력하거나 / 를 입력하세요...' }}
              </p>
            }
          }
        }
      </div>

      <!-- Add Block After (on hover) -->
      @if (isHovered()) {
        <button
          (click)="addBlockAfter.emit()"
          class="absolute -bottom-3 left-8 right-0 h-6 flex items-center justify-center
                 opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-full h-px bg-cyan-500"></div>
          <div class="absolute bg-cyan-500 text-white text-xs px-2 py-0.5 rounded">
            <i class="pi pi-plus text-xs"></i>
          </div>
        </button>
      }
    </div>
  `,
  styles: [`
    .block-wrapper {
      transition: background-color 0.15s;
    }

    .block-wrapper:hover {
      background: rgba(0, 0, 0, 0.02);
    }

    :host-context(.dark) .block-wrapper:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .menu-dropdown {
      animation: fadeIn 0.1s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class BlockRendererComponent {
  theme = inject(ThemeService);
  private audioService = inject(AudioService);

  @Input() block!: Block;
  @Input() isEditing = false;

  @Output() edit = new EventEmitter<void>();
  @Output() update = new EventEmitter<{ id: string; content?: string; properties?: Record<string, unknown> }>();
  @Output() delete = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() addBlockAfter = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() typeChange = new EventEmitter<{ id: string; newType: string }>();
  @Output() aiAction = new EventEmitter<{ action: string; blockId: string; content: string }>();

  @ViewChild('editInput') editInput?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;

  isHovered = signal(false);
  showMenu = signal(false);
  showTurnIntoMenu = signal(false);
  showColorMenu = signal(false);

  // Block type options for "Turn Into" menu
  blockTypes = [
    { id: 'text', label: '텍스트', icon: 'pi-align-left' },
    { id: 'heading1', label: '제목 1', icon: 'pi-hashtag' },
    { id: 'heading2', label: '제목 2', icon: 'pi-hashtag' },
    { id: 'heading3', label: '제목 3', icon: 'pi-hashtag' },
    { id: 'bullet', label: '글머리 기호', icon: 'pi-list' },
    { id: 'numbered', label: '번호 매기기', icon: 'pi-sort-numeric-up' },
    { id: 'todo', label: '할 일', icon: 'pi-check-square' },
    { id: 'quote', label: '인용', icon: 'pi-comment' },
    { id: 'callout', label: '콜아웃', icon: 'pi-info-circle' },
    { id: 'code', label: '코드', icon: 'pi-code' },
    { id: 'toggle', label: '토글', icon: 'pi-chevron-right' },
  ];

  // Color options
  colorOptions = [
    { id: 'default', label: '기본', bg: 'transparent', text: '#666' },
    { id: 'gray', label: '회색', bg: 'rgba(128, 128, 128, 0.1)', text: '#666' },
    { id: 'brown', label: '갈색', bg: 'rgba(159, 107, 83, 0.1)', text: '#9f6b53' },
    { id: 'orange', label: '주황', bg: 'rgba(255, 163, 68, 0.1)', text: '#d9730d' },
    { id: 'yellow', label: '노랑', bg: 'rgba(255, 220, 73, 0.1)', text: '#cb912f' },
    { id: 'green', label: '녹색', bg: 'rgba(77, 171, 154, 0.1)', text: '#448361' },
    { id: 'blue', label: '파랑', bg: 'rgba(82, 156, 202, 0.1)', text: '#337ea9' },
    { id: 'purple', label: '보라', bg: 'rgba(154, 109, 215, 0.1)', text: '#9065b0' },
    { id: 'pink', label: '분홍', bg: 'rgba(226, 85, 161, 0.1)', text: '#c14c8a' },
    { id: 'red', label: '빨강', bg: 'rgba(255, 115, 105, 0.1)', text: '#d44c47' },
  ];

  getBlockClasses(): string {
    const classes: string[] = [];

    if (this.block.properties?.color && this.block.properties.color !== 'default') {
      classes.push(`block-color-${this.block.properties.color}`);
    }

    return classes.join(' ');
  }

  getCalloutBg(): string {
    const color = this.block.properties?.color || 'default';
    return BLOCK_COLORS[color as BlockColor]?.bg || 'rgba(128, 128, 128, 0.1)';
  }

  saveContent(content: string) {
    this.update.emit({ id: this.block.id, content });
  }

  cancelEdit() {
    this.update.emit({ id: this.block.id });
  }

  toggleChecked() {
    const checked = !this.block.properties?.checked;
    this.update.emit({
      id: this.block.id,
      properties: { checked }
    });
  }

  toggleCollapsed() {
    const collapsed = !this.block.properties?.collapsed;
    this.update.emit({
      id: this.block.id,
      properties: { collapsed }
    });
  }

  onDelete() {
    this.delete.emit();
    this.showMenu.set(false);
  }

  onDuplicate() {
    this.duplicate.emit();
    this.showMenu.set(false);
  }

  closeSubmenus() {
    this.showTurnIntoMenu.set(false);
    this.showColorMenu.set(false);
  }

  turnInto(newType: string) {
    this.update.emit({
      id: this.block.id,
      properties: { ...this.block.properties, _newType: newType }
    });
    this.typeChange.emit({ id: this.block.id, newType });
    this.showMenu.set(false);
  }

  setColor(color: string) {
    this.update.emit({
      id: this.block.id,
      properties: { color }
    });
    this.showMenu.set(false);
  }

  askAgentD() {
    this.aiAction.emit({ action: 'ask', blockId: this.block.id, content: this.block.content });
    this.showMenu.set(false);
  }

  summarizeBlock() {
    this.aiAction.emit({ action: 'summarize', blockId: this.block.id, content: this.block.content });
    this.showMenu.set(false);
  }

  onTimestampClick() {
    const timestamp = this.block.properties?.timestamp;
    if (timestamp) {
      // If already playing at this timestamp, pause
      if (this.isTimestampActive() && this.audioService.isPlaying()) {
        this.audioService.pause();
      } else {
        this.audioService.seekToTimestamp(timestamp as string);
      }
    }
  }

  /**
   * 현재 재생 중인 시간이 이 타임스탬프 근처인지 확인
   */
  isTimestampActive(): boolean {
    if (this.block.type !== 'timestamp') return false;

    const timestamp = this.block.properties?.timestamp as string;
    if (!timestamp) return false;

    const blockSeconds = this.audioService.parseTimestamp(timestamp);
    if (blockSeconds < 0) return false;

    const currentSeconds = this.audioService.currentTime();
    // 타임스탬프 기준 ±5초 범위 내면 active
    return Math.abs(currentSeconds - blockSeconds) < 5;
  }

  handleEnter(event: Event) {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      const input = this.editInput?.nativeElement;
      if (input) {
        this.saveContent(input.value);
        this.addBlockAfter.emit();
      }
    }
  }
}
