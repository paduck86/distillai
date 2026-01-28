/**
 * Block Renderer Component
 *
 * 블록 타입에 따라 적절한 렌더링을 수행
 * 호버 시 드래그 핸들과 액션 메뉴 표시
 */

import { Component, Input, Output, EventEmitter, signal, inject, ElementRef, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { AudioService } from '../../../core/services/audio.service';
import { UploadService } from '../../../core/services/upload.service';
import { SelectionService } from '../../../core/services/selection.service';
import { Block, BlockType, BlockProperties } from '../../../core/services/api.service';
import { BLOCK_COLORS, BlockColor } from '../../../core/types/block.types';
import { ImageUploadComponent } from './image-upload.component';
import { TableEditorComponent } from './table-editor.component';

@Component({
  selector: 'app-block-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent, TableEditorComponent],
  template: `
    <div
      class="block-wrapper group relative flex items-start gap-2 py-1 -ml-8"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false); showMenu.set(false)">

      <!-- Hover Actions (Left side) - Notion-style -->
      <div class="hover-actions flex items-center gap-0.5 w-14 -ml-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">


        <!-- Drag Handle (also opens menu on click) -->
        <button
          (click)="showMenu.set(!showMenu())"
          draggable="true"
          (dragstart)="onDragStart($event)"
          (dragend)="onDragEnd($event)"
          class="w-6 h-6 rounded flex items-center justify-center cursor-grab active:cursor-grabbing
                 transition-colors duration-150"
          [class]="theme.isDark()
            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
            : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200'"
          title="드래그하여 이동 / 클릭하여 메뉴">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="4" cy="3" r="1.5"/>
            <circle cx="10" cy="3" r="1.5"/>
            <circle cx="4" cy="7" r="1.5"/>
            <circle cx="10" cy="7" r="1.5"/>
            <circle cx="4" cy="11" r="1.5"/>
            <circle cx="10" cy="11" r="1.5"/>
          </svg>
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
            <h1
              #contentBlock
              contenteditable="true"
              [attr.data-placeholder]="'제목 1'"
              [attr.data-block-id]="block.id"
              (input)="onContentInput($event)"
              (keydown)="onKeyDown($event)"
              (focus)="onFocus()"
              (blur)="onBlur($event)"
              (paste)="onPaste($event)"
              class="text-3xl font-bold outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
              [class]="theme.isDark() ? 'text-white' : 'text-zinc-900'">
            </h1>
          }

          <!-- Heading 2 -->
          @case ('heading2') {
            <h2
              #contentBlock
              contenteditable="true"
              [attr.data-placeholder]="'제목 2'"
              [attr.data-block-id]="block.id"
              (input)="onContentInput($event)"
              (keydown)="onKeyDown($event)"
              (focus)="onFocus()"
              (blur)="onBlur($event)"
              (paste)="onPaste($event)"
              class="text-2xl font-semibold outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
            </h2>
          }

          <!-- Heading 3 -->
          @case ('heading3') {
            <h3
              #contentBlock
              contenteditable="true"
              [attr.data-placeholder]="'제목 3'"
              [attr.data-block-id]="block.id"
              (input)="onContentInput($event)"
              (keydown)="onKeyDown($event)"
              (focus)="onFocus()"
              (blur)="onBlur($event)"
              (paste)="onPaste($event)"
              class="text-xl font-medium outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
            </h3>
          }

          <!-- Bullet List -->
          @case ('bullet') {
            <div class="flex items-start gap-2">
              <span class="mt-2 w-1.5 h-1.5 rounded-full bg-current opacity-60 shrink-0"></span>
              <span
                #contentBlock
                contenteditable="true"
                [attr.data-placeholder]="'목록 아이템'"
                [attr.data-block-id]="block.id"
                (input)="onContentInput($event)"
                (keydown)="onKeyDown($event)"
                (focus)="onFocus()"
                (blur)="onBlur($event)"
                (paste)="onPaste($event)"
                class="flex-1 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
              </span>
            </div>
          }

          <!-- Numbered List -->
          @case ('numbered') {
            <div class="flex items-start gap-2">
              <span class="text-sm opacity-60 min-w-6 shrink-0">{{ block.position + 1 }}.</span>
              <span
                #contentBlock
                contenteditable="true"
                [attr.data-placeholder]="'목록 아이템'"
                [attr.data-block-id]="block.id"
                (input)="onContentInput($event)"
                (keydown)="onKeyDown($event)"
                (focus)="onFocus()"
                (blur)="onBlur($event)"
                (paste)="onPaste($event)"
                class="flex-1 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
              </span>
            </div>
          }

          <!-- Todo / Checkbox -->
          @case ('todo') {
            <div class="flex items-start gap-2">
              <input
                type="checkbox"
                [checked]="block.properties?.checked"
                (change)="toggleChecked()"
                class="mt-1 w-4 h-4 rounded border-2 cursor-pointer shrink-0
                       accent-cyan-500" />
              <span
                #contentBlock
                contenteditable="true"
                [attr.data-placeholder]="'할 일'"
                [attr.data-block-id]="block.id"
                (input)="onContentInput($event)"
                (keydown)="onKeyDown($event)"
                (focus)="onFocus()"
                (blur)="onBlur($event)"
                (paste)="onPaste($event)"
                class="flex-1 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
                [class.line-through]="block.properties?.checked"
                [class.opacity-50]="block.properties?.checked">
              </span>
            </div>
          }

          <!-- Quote -->
          @case ('quote') {
            <div class="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 py-1 italic">
              <p
                #contentBlock
                contenteditable="true"
                [attr.data-placeholder]="'인용문'"
                [attr.data-block-id]="block.id"
                (input)="onContentInput($event)"
                (keydown)="onKeyDown($event)"
                (focus)="onFocus()"
                (blur)="onBlur($event)"
                (paste)="onPaste($event)"
                class="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
              </p>
            </div>
          }

          <!-- Callout -->
          @case ('callout') {
            <div class="callout flex items-start gap-3 p-4 rounded-lg"
                 [style.background]="getCalloutBg()">
              <button (click)="showEmojiPicker.set(!showEmojiPicker())"
                      class="text-xl hover:scale-110 transition-transform shrink-0">
                {{ block.properties?.icon || '💡' }}
              </button>
              <div class="flex-1">
                <p
                  #contentBlock
                  contenteditable="true"
                  [attr.data-placeholder]="'콜아웃 내용'"
                  [attr.data-block-id]="block.id"
                  (input)="onContentInput($event)"
                  (keydown)="onKeyDown($event)"
                  (focus)="onFocus()"
                  (blur)="onBlur($event)"
                  (paste)="onPaste($event)"
                  class="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
                </p>
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
              <div class="flex items-center gap-2">
                <button
                  (click)="toggleCollapsed()"
                  class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 shrink-0">
                  <i class="pi text-sm transition-transform"
                     [class]="block.properties?.collapsed ? 'pi-chevron-right' : 'pi-chevron-down'"></i>
                </button>
                <span
                  #contentBlock
                  contenteditable="true"
                  [attr.data-placeholder]="'토글'"
                  [attr.data-block-id]="block.id"
                  (input)="onContentInput($event)"
                  (keydown)="onKeyDown($event)"
                  (focus)="onFocus()"
                  (blur)="onBlur($event)"
                  (paste)="onPaste($event)"
                  class="flex-1 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
                </span>
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

          <!-- Image Block -->
          @case ('image') {
            <div class="image-block relative group/image">
              @if (block.properties?.imageUrl) {
                <!-- Image Display -->
                <figure class="relative">
                  <div class="relative inline-block"
                       [class]="getImageWidthClass()">
                    <img
                      [src]="block.properties.imageUrl"
                      [alt]="block.properties?.imageCaption || ''"
                      class="rounded-lg max-w-full h-auto"
                      [class]="getImageAlignClass()" />

                    <!-- Image Toolbar (on hover) -->
                    <div class="image-toolbar absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                      <!-- Size Options -->
                      <div class="flex items-center gap-0.5 p-1 rounded-lg"
                           [class]="theme.isDark() ? 'bg-zinc-800/90' : 'bg-white/90'">
                        <button
                          (click)="setImageWidth('small')"
                          class="px-2 py-1 text-xs rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageWidth === 'small'
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="작게">S</button>
                        <button
                          (click)="setImageWidth('medium')"
                          class="px-2 py-1 text-xs rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageWidth === 'medium' || !block.properties?.imageWidth
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="중간">M</button>
                        <button
                          (click)="setImageWidth('large')"
                          class="px-2 py-1 text-xs rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageWidth === 'large'
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="크게">L</button>
                        <button
                          (click)="setImageWidth('full')"
                          class="px-2 py-1 text-xs rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageWidth === 'full'
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="전체">F</button>
                      </div>

                      <!-- Align Options -->
                      <div class="flex items-center gap-0.5 p-1 rounded-lg ml-1"
                           [class]="theme.isDark() ? 'bg-zinc-800/90' : 'bg-white/90'">
                        <button
                          (click)="setImageAlign('left')"
                          class="p-1.5 rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageAlign === 'left'
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="왼쪽">
                          <i class="pi pi-align-left text-xs"></i>
                        </button>
                        <button
                          (click)="setImageAlign('center')"
                          class="p-1.5 rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageAlign === 'center' || !block.properties?.imageAlign
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="가운데">
                          <i class="pi pi-align-center text-xs"></i>
                        </button>
                        <button
                          (click)="setImageAlign('right')"
                          class="p-1.5 rounded transition-colors cursor-pointer"
                          [class]="block.properties?.imageAlign === 'right'
                            ? 'bg-cyan-500 text-white'
                            : (theme.isDark() ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100')"
                          title="오른쪽">
                          <i class="pi pi-align-right text-xs"></i>
                        </button>
                      </div>

                      <!-- Replace Image -->
                      <button
                        (click)="replaceImage()"
                        class="p-1.5 rounded transition-colors cursor-pointer ml-1"
                        [class]="theme.isDark() ? 'bg-zinc-800/90 hover:bg-zinc-700' : 'bg-white/90 hover:bg-zinc-100'"
                        title="이미지 변경">
                        <i class="pi pi-refresh text-xs"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Caption -->
                  <figcaption
                    contenteditable="true"
                    [attr.data-placeholder]="'캡션 추가...'"
                    class="mt-2 text-sm text-center outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
                    [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'"
                    (blur)="onCaptionChange($event)">{{ block.properties?.imageCaption || '' }}</figcaption>
                </figure>
              } @else {
                <!-- Image Upload Placeholder -->
                <app-image-upload
                  [distillationId]="block.distillationId"
                  (uploaded)="onImageUploaded($event)" />
              }
            </div>
          }

          <!-- Table Block -->
          @case ('table') {
            <app-table-editor
              [data]="block.properties?.tableData || [['', ''], ['', '']]"
              [hasHeader]="block.properties?.tableHeaders ?? true"
              [columnWidths]="block.properties?.tableColumnWidths || []"
              (dataChange)="onTableDataChange($event)"
              (headerToggle)="onTableHeaderToggle($event)"
              (columnWidthsChange)="onTableColumnWidthsChange($event)" />
          }

          <!-- New Media Types (Placeholder Implementation) -->
          @case ('video') {
             <div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 flex items-center gap-3">
               <i class="pi pi-video text-xl opacity-50"></i>
               <span class="opacity-50">동영상 블록 (준비 중)</span>
             </div>
          }
          @case ('audio') {
             <div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 flex items-center gap-3">
               <i class="pi pi-volume-up text-xl opacity-50"></i>
               <span class="opacity-50">오디오 블록 (준비 중)</span>
             </div>
          }
          @case ('file') {
             <div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 flex items-center gap-3">
               <i class="pi pi-file text-xl opacity-50"></i>
               <span class="opacity-50">파일 블록 (준비 중)</span>
             </div>
          }
          @case ('bookmark') {
             <div class="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border dark:border-zinc-700 flex items-center gap-3">
               <i class="pi pi-bookmark text-xl opacity-50"></i>
               <span class="opacity-50">웹 북마크 (준비 중)</span>
             </div>
          }
          @case ('page') {
             <div class="flex items-center gap-2 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer transition-colors">
               <i class="pi pi-file text-lg opacity-60"></i>
               <span class="underline decoration-zinc-300 underline-offset-4">Untitled Page</span>
             </div>
          }

          <!-- Default Text (Explicit) -->
          @case ('text') {
            <p
              #contentBlock
              contenteditable="true"
              [attr.data-placeholder]="''"
              [attr.data-block-id]="block.id"
              (input)="onContentInput($event)"
              (keydown)="onKeyDown($event)"
              (focus)="onFocus()"
              (blur)="onBlur($event)"
              (paste)="onPaste($event)"
              class="leading-relaxed min-h-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400"
              style="white-space: pre-wrap; word-break: break-word;">
            </p>
          }

          <!-- Unknown / Default -->
          @default {
            <p
              #contentBlock
              contenteditable="true"
              [attr.data-placeholder]="'텍스트를 입력하거나 / 를 입력하세요...'"
              [attr.data-block-id]="block.id"
              (input)="onContentInput($event)"
              (keydown)="onKeyDown($event)"
              (focus)="onFocus()"
              (blur)="onBlur($event)"
              (paste)="onPaste($event)"
              class="leading-relaxed min-h-6 outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400">
            </p>
          }
        }
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .block-wrapper {
      transition: background-color 0.15s, opacity 0.2s;
      padding-left: 1.5rem;
    }

    .block-wrapper:hover {
      background: rgba(0, 0, 0, 0.02);
    }

    :host-context(.dark) .block-wrapper:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    /* Drag feedback */
    .block-wrapper.dragging {
      opacity: 0.5;
      background: rgba(6, 182, 212, 0.1);
    }

    .block-wrapper.drag-over {
      border-top: 2px solid rgb(6, 182, 212);
    }

    .menu-dropdown {
      animation: fadeIn 0.1s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Contenteditable placeholder styling */
    [contenteditable]:empty:before {
      content: attr(data-placeholder);
      color: rgb(161 161 170);
      pointer-events: none;
    }
  `]
})
export class BlockRendererComponent implements AfterViewInit, OnChanges {
  theme = inject(ThemeService);
  private audioService = inject(AudioService);
  private selection = inject(SelectionService);

  @Input() block!: Block;
  @Input() isEditing = false;

  @Output() edit = new EventEmitter<void>();
  @Output() update = new EventEmitter<{ id: string; content?: string; properties?: Record<string, unknown> }>();
  @Output() delete = new EventEmitter<void>();
  @Output() duplicate = new EventEmitter<void>();
  @Output() addBlockAfter = new EventEmitter<void>();
  @Output() showSlashMenu = new EventEmitter<{ afterBlockId: string; position: { x: number; y: number } }>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() typeChange = new EventEmitter<{ id: string; newType: string }>();
  @Output() aiAction = new EventEmitter<{ action: string; blockId: string; content: string }>();
  @Output() splitBlock = new EventEmitter<{ id: string; beforeContent: string; afterContent: string }>();
  @Output() mergeWithPrevious = new EventEmitter<{ id: string; content: string }>();
  @Output() slashCommand = new EventEmitter<{ id: string; position: { x: number; y: number } }>();
  @Output() focusBlock = new EventEmitter<{ id: string; position?: 'start' | 'end' }>();
  @Output() dragStart = new EventEmitter<{ id: string; event: DragEvent }>();
  @Output() dragEnd = new EventEmitter<{ id: string; event: DragEvent }>();

  @ViewChild('editInput') editInput?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;
  @ViewChild('contentBlock') contentBlock?: ElementRef<HTMLElement>;

  isHovered = signal(false);
  showMenu = signal(false);
  showTurnIntoMenu = signal(false);
  showColorMenu = signal(false);
  showEmojiPicker = signal(false);
  isFocused = signal(false);

  // Track previous block id to detect when block changes
  private previousBlockId: string | null = null;
  private initialized = false;

  // Debounce for auto-save
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit() {
    // Set initial content after view is initialized
    this.setInitialContent();
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only update content if block id changed (not during typing)
    if (changes['block'] && this.initialized) {
      const newBlock = changes['block'].currentValue as Block;
      const oldBlock = changes['block'].previousValue as Block | undefined;

      // Reset content if block id changed or block type changed
      // OR content changed while not focused (e.g. split operation from parent)
      if (newBlock && (
        newBlock.id !== this.previousBlockId ||
        (oldBlock && newBlock.type !== oldBlock.type) ||
        (!this.isFocused() && newBlock.content !== this.contentBlock?.nativeElement.textContent)
      )) {
        // Use setTimeout to wait for the DOM to update with new element type
        setTimeout(() => this.setInitialContent(), 0);
      }
    }
  }

  /**
   * Set initial content to contenteditable element
   * Only called on init or when block id changes
   */
  private setInitialContent() {
    if (!this.contentBlock?.nativeElement) return;

    const element = this.contentBlock.nativeElement;
    // Only set if the content is different and we're not focused
    if (!this.isFocused() && element.textContent !== this.block.content) {
      element.textContent = this.block.content || '';
    }
    this.previousBlockId = this.block.id;
  }

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
    { id: 'image', label: '이미지', icon: 'pi-image' },
    { id: 'table', label: '표', icon: 'pi-table' },
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

  // ============ Contenteditable Event Handlers ============

  onContentInput(event: Event) {
    const target = event.target as HTMLElement;
    const content = target.textContent || '';

    // Check for slash command - trigger when '/' is typed at start of empty/whitespace-only block
    // or when the content ends with '/' after a space or at start
    const trimmedContent = content.trim();
    if (trimmedContent === '/' ||
      (content.endsWith('/') && (content.length === 1 || content[content.length - 2] === ' '))) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        this.slashCommand.emit({
          id: this.block.id,
          position: { x: rect.left, y: rect.bottom + 4 }
        });
        return;
      }
    }

    // Debounced save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.update.emit({ id: this.block.id, content });
    }, 300);
  }

  onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const content = target.textContent || '';
    const selection = window.getSelection();

    // Text Formatting Shortcuts (Cmd/Ctrl + Key)
    if (event.metaKey || event.ctrlKey) {
      switch (event.key.toLowerCase()) {
        case 'b': // Bold
          event.preventDefault();
          this.selection.toggleBold();
          return;
        case 'i': // Italic
          event.preventDefault();
          this.selection.toggleItalic();
          return;
        case 'u': // Underline
          event.preventDefault();
          this.selection.toggleUnderline();
          return;
        case 'e': // Code (Cmd+E)
          event.preventDefault();
          this.selection.toggleCode();
          return;

        // Strikethrough (Cmd+Shift+X or Cmd+Shift+S)
        case 'x':
        case 's':
          if (event.shiftKey) {
            event.preventDefault();
            this.selection.toggleStrikethrough();
            return;
          }
          break;
      }
    }

    // Enter key - split block
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(target);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const caretOffset = preCaretRange.toString().length;

        const beforeContent = content.slice(0, caretOffset);
        const afterContent = content.slice(caretOffset);

        // Manually update DOM to prevent duplication when focus changes
        if (target.textContent !== beforeContent) {
          target.textContent = beforeContent;
        }

        // If at the start of the block, stop propagation to prevent
        // the SlashCommand menu (if open) from intercepting and duplicating actions
        if (caretOffset === 0) {
          event.stopPropagation();
        }

        this.splitBlock.emit({
          id: this.block.id,
          beforeContent,
          afterContent
        });
      } else {
        this.addBlockAfter.emit();
      }
      return;
    }

    // Backspace at start - merge with previous
    if (event.key === 'Backspace') {
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.startOffset === 0 && range.endOffset === 0) {
          event.preventDefault();
          this.mergeWithPrevious.emit({
            id: this.block.id,
            content: content
          });
          return;
        }
      }
    }

    // Arrow keys for navigation
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const isAtStart = this.isCaretAtStart();
      const isAtEnd = this.isCaretAtEnd();

      if (event.key === 'ArrowUp' && isAtStart) {
        event.preventDefault();
        this.focusBlock.emit({ id: this.block.id, position: 'end' });
      } else if (event.key === 'ArrowDown' && isAtEnd) {
        event.preventDefault();
        this.focusBlock.emit({ id: this.block.id, position: 'start' });
      }
    }

    // Check for markdown shortcuts at start of block
    if (event.key === ' ') {
      const trimmedContent = content.trimStart();

      // Heading shortcuts
      if (trimmedContent === '#') {
        event.preventDefault();
        this.turnInto('heading1');
        target.textContent = '';
        return;
      }
      if (trimmedContent === '##') {
        event.preventDefault();
        this.turnInto('heading2');
        target.textContent = '';
        return;
      }
      if (trimmedContent === '###') {
        event.preventDefault();
        this.turnInto('heading3');
        target.textContent = '';
        return;
      }

      // Bullet shortcut
      if (trimmedContent === '-' || trimmedContent === '*') {
        event.preventDefault();
        this.turnInto('bullet');
        target.textContent = '';
        return;
      }

      // Numbered list shortcut
      if (/^\d+\.$/.test(trimmedContent)) {
        event.preventDefault();
        this.turnInto('numbered');
        target.textContent = '';
        return;
      }

      // Todo shortcut
      if (trimmedContent === '[]' || trimmedContent === '[ ]') {
        event.preventDefault();
        this.turnInto('todo');
        target.textContent = '';
        return;
      }

      // Quote shortcut
      if (trimmedContent === '>') {
        event.preventDefault();
        this.turnInto('quote');
        target.textContent = '';
        return;
      }

      // Toggle shortcut
      if (trimmedContent === '>>' || trimmedContent === '▶') {
        event.preventDefault();
        this.turnInto('toggle');
        target.textContent = '';
        return;
      }

      // Divider shortcut
      if (trimmedContent === '---' || trimmedContent === '***') {
        event.preventDefault();
        this.turnInto('divider');
        target.textContent = '';
        return;
      }

      // Code shortcut
      if (trimmedContent === '```') {
        event.preventDefault();
        this.turnInto('code');
        target.textContent = '';
        return;
      }
    }
  }

  onFocus() {
    this.isFocused.set(true);
    this.edit.emit();
  }

  onBlur(event: FocusEvent) {
    this.isFocused.set(false);
    const target = event.target as HTMLElement;
    const content = target.textContent || '';

    // Clear any pending save timeout and save immediately
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    this.update.emit({ id: this.block.id, content });
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';

    // Insert plain text at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  }

  // ============ Utility Methods ============

  private isCaretAtStart(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    return range.startOffset === 0 && range.endOffset === 0;
  }

  private isCaretAtEnd(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const target = this.contentBlock?.nativeElement;
    if (!target) return false;

    const range = selection.getRangeAt(0);
    const content = target.textContent || '';
    return range.endOffset >= content.length;
  }

  /**
   * Focus this block's contenteditable element
   */
  focus(position: 'start' | 'end' = 'end') {
    const element = this.contentBlock?.nativeElement;
    if (!element) return;

    element.focus();

    const range = document.createRange();
    const selection = window.getSelection();

    if (position === 'start') {
      range.setStart(element, 0);
      range.setEnd(element, 0);
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  // ============ Drag & Drop ============

  onDragStart(event: DragEvent) {
    event.dataTransfer?.setData('text/plain', this.block.id);
    event.dataTransfer!.effectAllowed = 'move';
    this.dragStart.emit({ id: this.block.id, event });
  }

  onDragEnd(event: DragEvent) {
    this.dragEnd.emit({ id: this.block.id, event });
  }

  // ============ Plus Button ============

  onPlusButtonClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    if (button) {
      const rect = button.getBoundingClientRect();
      this.showSlashMenu.emit({
        afterBlockId: this.block.id,
        position: { x: rect.left, y: rect.bottom + 4 }
      });
    }
  }

  // ============ Image Block Methods ============

  getImageWidthClass(): string {
    const width = this.block.properties?.imageWidth || 'medium';
    switch (width) {
      case 'small': return 'max-w-xs';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-2xl';
      case 'full': return 'w-full';
      default: return 'max-w-md';
    }
  }

  getImageAlignClass(): string {
    const align = this.block.properties?.imageAlign || 'center';
    switch (align) {
      case 'left': return '';
      case 'center': return 'mx-auto block';
      case 'right': return 'ml-auto block';
      default: return 'mx-auto block';
    }
  }

  setImageWidth(width: 'small' | 'medium' | 'large' | 'full'): void {
    this.update.emit({
      id: this.block.id,
      properties: { imageWidth: width }
    });
  }

  setImageAlign(align: 'left' | 'center' | 'right'): void {
    this.update.emit({
      id: this.block.id,
      properties: { imageAlign: align }
    });
  }

  onImageUploaded(result: { url: string; path: string }): void {
    this.update.emit({
      id: this.block.id,
      properties: {
        imageUrl: result.url,
        imageWidth: 'medium',
        imageAlign: 'center'
      }
    });
  }

  onCaptionChange(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const caption = target.textContent || '';
    this.update.emit({
      id: this.block.id,
      properties: { imageCaption: caption }
    });
  }

  replaceImage(): void {
    // Clear the image URL to show upload form
    this.update.emit({
      id: this.block.id,
      properties: { imageUrl: undefined }
    });
  }

  // ============ Table Block Methods ============

  onTableDataChange(data: string[][]): void {
    this.update.emit({
      id: this.block.id,
      properties: { tableData: data }
    });
  }

  onTableHeaderToggle(hasHeader: boolean): void {
    this.update.emit({
      id: this.block.id,
      properties: { tableHeaders: hasHeader }
    });
  }

  onTableColumnWidthsChange(widths: number[]): void {
    this.update.emit({
      id: this.block.id,
      properties: { tableColumnWidths: widths }
    });
  }
}
