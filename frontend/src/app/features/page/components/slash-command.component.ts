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
      class="slash-command-palette fixed z-50 w-60 max-h-[280px] overflow-hidden rounded-lg shadow-xl border"
      [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'"
      [style.left.px]="position.x"
      [style.top.px]="position.y">

      <!-- Search Input (Hidden but focusable, or very minimal) -->
      <div class="p-1.5 border-b" [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-100'">
        <input
          #searchInput
          type="text"
          [(ngModel)]="searchQuery"
          (input)="onSearch()"
          (keydown)="onInputKeyDown($event)"
          placeholder="Filter..."
          class="w-full px-1.5 py-0.5 text-[11px] bg-transparent
                 outline-none placeholder:opacity-50"
          [class]="theme.isDark()
            ? 'text-white placeholder:text-zinc-500'
            : 'text-zinc-900 placeholder:text-zinc-400'"
          autofocus />
      </div>

      <!-- Command List -->
      <div class="overflow-y-auto max-h-[240px] py-1">
        @for (category of categories; track category) {
          @if (getCommandsByCategory(category).length > 0) {
            <!-- Category Header -->
            <div class="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mt-1 first:mt-0">
              {{ getCategoryLabel(category) }}
            </div>

            <!-- Commands -->
            @for (command of getCommandsByCategory(category); track command.id; let i = $index) {
              <button
                (click)="selectCommand(command)"
                (mouseenter)="selectedIndex.set(getGlobalIndex(category, i))"
                class="w-full px-2 py-1 flex items-center gap-2 text-left transition-colors scroll-m-1"
                [class]="selectedIndex() === getGlobalIndex(category, i)
                  ? (theme.isDark() ? 'bg-zinc-700/50' : 'bg-zinc-100')
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/30'">
                <!-- Icon -->
                <div class="w-6 h-6 rounded border shadow-sm flex items-center justify-center shrink-0 bg-white dark:bg-zinc-700 dark:border-zinc-600">
                   @if (category === 'ai') {
                     <i [class]="'pi ' + command.icon + ' text-violet-500 text-[10px]'"></i>
                   } @else {
                     <img *ngIf="command.icon.startsWith('http')" [src]="command.icon" class="w-3 h-3" />
                     <i *ngIf="!command.icon.startsWith('http')" [class]="'pi ' + command.icon + ' text-zinc-600 dark:text-zinc-300 text-[10px]'"></i>
                   }
                </div>

                <!-- Label & Description -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-medium" [class]="theme.isDark() ? 'text-zinc-200' : 'text-zinc-700'">
                      {{ command.label }}
                    </span>
                    @if (command.shortcut) {
                       <span class="text-[9px] opacity-40 font-mono ml-2 border px-1 rounded bg-zinc-50 dark:bg-zinc-800">{{ command.shortcut }}</span>
                    }
                  </div>
                  <div class="text-[9px] opacity-50 truncate leading-tight">{{ command.description }}</div>
                </div>
              </button>
            }
          }
        }

        <!-- No Results -->
        @if (filteredCommands().length === 0) {
          <div class="px-2 py-3 text-center opacity-50 text-[10px]">
            <p>No results</p>
          </div>
        }
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

  categories: SlashCommandCategory[] = ['ai', 'basic', 'media', 'advanced'];
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
    // Remove leading slash if creating shortcut like /h1
    const cleanQuery = query.startsWith('/') ? query.substring(1) : query;

    if (!query) {
      this.filteredCommands.set(this.allCommands);
    } else {
      this.filteredCommands.set(
        this.allCommands.filter(cmd =>
          cmd.label.toLowerCase().includes(cleanQuery) ||
          cmd.labelEn.toLowerCase().includes(cleanQuery) ||
          cmd.description.toLowerCase().includes(cleanQuery) ||
          cmd.id.includes(cleanQuery) ||
          (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query)) // Search by shortcut (with /)
        )
      );
      // Force rebuild trigger - Timestamp: 2026-01-27
    }

    this.selectedIndex.set(0);
  }

  // Handle keys from Input
  onInputKeyDown(event: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
      event.preventDefault();
      this.handleNavigation(event.key);
    }
  }

  // Handle global keys (in case focus is lost but menu is open)
  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent) {
    // If input is focused, let onInputKeyDown handle it to avoid double handling
    if (document.activeElement === this.elementRef.nativeElement.querySelector('input')) {
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
      event.preventDefault();
      this.handleNavigation(event.key);
    }
  }

  private handleNavigation(key: string) {
    constcommands = this.filteredCommands();
    const max = commands.length - 1;

    switch (key) {
      case 'ArrowDown':
        this.selectedIndex.set(Math.min(this.selectedIndex() + 1, max));
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        this.selectedIndex.set(Math.max(this.selectedIndex() - 1, 0));
        this.scrollToSelected();
        break;
      case 'Enter':
        const selected = commands[this.selectedIndex()];
        if (selected) {
          this.selectCommand(selected);
        }
        break;
    }
  }

  private scrollToSelected() {
    // Simple scroll into view logic could be added here if needed
    // For now we rely on user scrolling or minimal height
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
