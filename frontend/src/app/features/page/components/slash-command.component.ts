/**
 * Slash Command Component
 *
 * / 입력 시 나타나는 명령 팔레트
 * 노션 스타일의 블록 추가 UI
 */

import { Component, Input, Output, EventEmitter, signal, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/services/theme.service';
import { SLASH_COMMANDS, SlashCommand, SlashCommandCategory } from '../../../core/types/block.types';

@Component({
  selector: 'app-slash-command',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="slash-command-palette fixed z-50 w-80 max-h-96 overflow-hidden rounded-xl shadow-2xl"
      [class]="theme.isDark() ? 'bg-zinc-800 border border-zinc-700' : 'bg-white border border-zinc-200'"
      [style.left.px]="position.x"
      [style.top.px]="position.y">

      <!-- Search Input -->
      <div class="p-3 border-b" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
        <input
          #searchInput
          type="text"
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
          (keydown)="onKeyDown($event)"
          placeholder="블록 검색..."
          class="w-full px-3 py-2 rounded-lg text-sm bg-transparent
                 border outline-none focus:ring-2 focus:ring-cyan-500"
          [class]="theme.isDark()
            ? 'border-zinc-600 text-white placeholder:text-zinc-500'
            : 'border-zinc-300 text-zinc-900 placeholder:text-zinc-400'"
          autofocus />
      </div>

      <!-- Command List -->
      <div class="overflow-y-auto max-h-72 py-2">
        @for (category of categories; track category) {
          @if (getCommandsByCategory(category).length > 0) {
            <!-- Category Header -->
            <div class="px-4 py-2 text-xs font-medium uppercase opacity-50">
              {{ getCategoryLabel(category) }}
            </div>

            <!-- Commands -->
            @for (command of getCommandsByCategory(category); track command.id; let i = $index) {
              <button
                (click)="selectCommand(command)"
                (mouseenter)="selectedIndex.set(getGlobalIndex(category, i))"
                class="w-full px-4 py-2 flex items-center gap-3 text-left transition-colors"
                [class]="selectedIndex() === getGlobalIndex(category, i)
                  ? (theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-100')
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'">
                <!-- Icon -->
                <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                     [class]="getIconBgClass(command.category)">
                  <i [class]="'pi ' + command.icon" [class]="getIconColorClass(command.category)"></i>
                </div>

                <!-- Label & Description -->
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{{ command.label }}</div>
                  <div class="text-xs opacity-50 truncate">{{ command.description }}</div>
                </div>

                <!-- Shortcut -->
                @if (command.shortcut) {
                  <kbd class="text-xs px-2 py-1 rounded opacity-50"
                       [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'">
                    {{ command.shortcut }}
                  </kbd>
                }
              </button>
            }
          }
        }

        <!-- No Results -->
        @if (filteredCommands().length === 0) {
          <div class="px-4 py-8 text-center opacity-50">
            <i class="pi pi-search text-2xl mb-2"></i>
            <p class="text-sm">검색 결과가 없습니다</p>
          </div>
        }
      </div>

      <!-- Footer Hint -->
      <div class="px-4 py-2 border-t text-xs opacity-50 flex items-center gap-4"
           [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
        <span><kbd class="px-1 rounded bg-zinc-200 dark:bg-zinc-700">↑↓</kbd> 이동</span>
        <span><kbd class="px-1 rounded bg-zinc-200 dark:bg-zinc-700">↵</kbd> 선택</span>
        <span><kbd class="px-1 rounded bg-zinc-200 dark:bg-zinc-700">Esc</kbd> 닫기</span>
      </div>
    </div>
  `,
  styles: [`
    .slash-command-palette {
      animation: slideIn 0.15s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SlashCommandComponent implements OnInit {
  theme = inject(ThemeService);
  private elementRef = inject(ElementRef);

  @Input() position = { x: 100, y: 100 };

  @Output() select = new EventEmitter<{ type: string; blockType?: string; aiAction?: string }>();
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  selectedIndex = signal(0);

  categories: SlashCommandCategory[] = ['basic', 'ai', 'media', 'advanced'];
  allCommands = SLASH_COMMANDS;
  filteredCommands = signal<SlashCommand[]>(SLASH_COMMANDS);

  ngOnInit() {
    this.onSearch();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close.emit();
  }

  onSearch() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredCommands.set(this.allCommands);
    } else {
      this.filteredCommands.set(
        this.allCommands.filter(cmd =>
          cmd.label.toLowerCase().includes(query) ||
          cmd.labelEn.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query) ||
          cmd.id.includes(query)
        )
      );
    }

    this.selectedIndex.set(0);
  }

  onKeyDown(event: KeyboardEvent) {
    const commands = this.filteredCommands();
    const max = commands.length - 1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.set(Math.min(this.selectedIndex() + 1, max));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.set(Math.max(this.selectedIndex() - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        const selected = commands[this.selectedIndex()];
        if (selected) {
          this.selectCommand(selected);
        }
        break;
    }
  }

  selectCommand(command: SlashCommand) {
    this.select.emit({
      type: command.id,
      blockType: command.blockType,
      aiAction: command.aiAction,
    });
  }

  getCommandsByCategory(category: SlashCommandCategory): SlashCommand[] {
    return this.filteredCommands().filter(cmd => cmd.category === category);
  }

  getCategoryLabel(category: SlashCommandCategory): string {
    const labels: Record<SlashCommandCategory, string> = {
      basic: '기본 블록',
      ai: 'AI 기능',
      media: '미디어',
      advanced: '고급',
    };
    return labels[category];
  }

  getIconBgClass(category: SlashCommandCategory): string {
    const classes: Record<SlashCommandCategory, string> = {
      basic: 'bg-zinc-100 dark:bg-zinc-700',
      ai: 'bg-violet-100 dark:bg-violet-900/30',
      media: 'bg-cyan-100 dark:bg-cyan-900/30',
      advanced: 'bg-amber-100 dark:bg-amber-900/30',
    };
    return classes[category];
  }

  getIconColorClass(category: SlashCommandCategory): string {
    const classes: Record<SlashCommandCategory, string> = {
      basic: 'text-zinc-600 dark:text-zinc-300',
      ai: 'text-violet-600 dark:text-violet-400',
      media: 'text-cyan-600 dark:text-cyan-400',
      advanced: 'text-amber-600 dark:text-amber-400',
    };
    return classes[category];
  }

  getGlobalIndex(category: SlashCommandCategory, localIndex: number): number {
    let globalIndex = 0;
    for (const cat of this.categories) {
      if (cat === category) {
        return globalIndex + localIndex;
      }
      globalIndex += this.getCommandsByCategory(cat).length;
    }
    return globalIndex + localIndex;
  }
}
