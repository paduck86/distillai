/**
 * Page Component
 *
 * Notion-style 페이지 뷰어/에디터
 * 기존 lecture-detail을 대체하는 새로운 UI
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ApiService, Distillation, Block } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { AudioService } from '../../core/services/audio.service';
import { FolderStateService } from '../../core/services/folder-state.service';
import { markdownToBlocks } from '../../core/types/block.types';

import { PageHeaderComponent } from './components/page-header.component';
import { BlockRendererComponent } from './components/block-renderer.component';
import { SlashCommandComponent } from './components/slash-command.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PageHeaderComponent,
    BlockRendererComponent,
    SlashCommandComponent,
  ],
  template: `
    <div class="page-container min-h-screen" [class]="theme.isDark() ? 'bg-zinc-900' : 'bg-white'">
      <!-- Loading State -->
      @if (loading()) {
        <div class="flex items-center justify-center h-screen">
          <div class="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="flex flex-col items-center justify-center h-screen gap-4">
          <i class="pi pi-exclamation-circle text-4xl text-red-500"></i>
          <p class="text-red-500">{{ error() }}</p>
          <button
            (click)="goBack()"
            class="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors">
            <i class="pi pi-arrow-left mr-2"></i>
            돌아가기
          </button>
        </div>
      }

      <!-- Main Content -->
      @if (distillation() && !loading()) {
        <div class="page-content max-w-4xl mx-auto">
          <!-- Cover Image -->
          @if (distillation()?.pageCover) {
            <div class="cover-image h-48 w-full relative overflow-hidden">
              <img
                [src]="distillation()?.pageCover"
                class="w-full h-full object-cover"
                alt="Cover" />
              <button
                class="absolute bottom-4 right-4 px-3 py-1.5 text-sm rounded-lg
                       bg-black/50 text-white hover:bg-black/70 transition-colors">
                <i class="pi pi-image mr-1"></i>
                커버 변경
              </button>
            </div>
          }

          <!-- Page Header (Icon + Title) -->
          <app-page-header
            [distillation]="distillation()!"
            [icon]="distillation()?.pageIcon"
            (iconChange)="onIconChange($event)"
            (titleChange)="onTitleChange($event)"
            (addCover)="onAddCover()" />

          <!-- Blocks -->
          <div class="blocks-container px-16 py-8">
            @if (blocks().length === 0) {
              <!-- Empty State -->
              <div class="empty-state py-12 text-center opacity-50">
                <p class="mb-4">아직 콘텐츠가 없습니다</p>
                <p class="text-sm">/ 를 입력하여 블록을 추가하세요</p>
              </div>
            } @else {
              <!-- Block List -->
              @for (block of blocks(); track block.id) {
                <app-block-renderer
                  [block]="block"
                  [isEditing]="editingBlockId() === block.id"
                  (edit)="onBlockEdit(block)"
                  (update)="onBlockUpdate($event)"
                  (delete)="onBlockDelete(block.id)"
                  (duplicate)="onBlockDuplicate(block)"
                  (addBlockAfter)="onAddBlockAfter(block.id)"
                  (moveUp)="onMoveBlock(block.id, 'up')"
                  (moveDown)="onMoveBlock(block.id, 'down')"
                  (typeChange)="onBlockTypeChange($event)"
                  (aiAction)="onAiAction($event)" />
              }
            }

            <!-- Add Block Button -->
            <div
              class="add-block-row flex items-center gap-2 py-2 px-2 -ml-2 mt-4
                     opacity-0 hover:opacity-100 transition-opacity cursor-pointer group"
              (click)="showSlashCommand.set(true)">
              <div class="w-6 h-6 flex items-center justify-center rounded
                          group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                <i class="pi pi-plus text-sm opacity-50 group-hover:opacity-100"></i>
              </div>
              <span class="text-sm opacity-50 group-hover:opacity-100">
                클릭하거나 / 를 입력하세요
              </span>
            </div>
          </div>

          <!-- Slash Command Palette -->
          @if (showSlashCommand()) {
            <app-slash-command
              [position]="slashCommandPosition()"
              (select)="onSlashCommandSelect($event)"
              (close)="showSlashCommand.set(false)" />
          }
        </div>
      }

      <!-- Back to Dashboard Button -->
      <button
        (click)="goBack()"
        class="fixed top-4 left-4 p-2 rounded-lg transition-all z-40
               hover:bg-zinc-200 dark:hover:bg-zinc-700"
        [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
        <i class="pi pi-arrow-left text-lg"></i>
      </button>

      <!-- Audio Player (Fixed Bottom) -->
      @if (distillation()?.audioUrl) {
        <div class="audio-player-bar fixed bottom-0 left-0 right-0 z-50 py-3 px-6 border-t"
             [class]="theme.isDark()
               ? 'bg-zinc-900/95 backdrop-blur-sm border-zinc-800'
               : 'bg-white/95 backdrop-blur-sm border-zinc-200'">

          <!-- Hidden Audio Element -->
          <audio
            #audioPlayer
            [src]="distillation()?.audioUrl"
            preload="metadata"
            class="hidden">
          </audio>

          <div class="max-w-4xl mx-auto flex items-center gap-4">
            <!-- Play/Pause Button -->
            <button
              (click)="audioService.togglePlay()"
              class="w-10 h-10 rounded-full flex items-center justify-center transition-colors
                     bg-cyan-500 hover:bg-cyan-600 text-white">
              <i [class]="audioService.isPlaying() ? 'pi pi-pause' : 'pi pi-play'" class="text-sm"></i>
            </button>

            <!-- Skip Buttons -->
            <button
              (click)="audioService.skipBackward(10)"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors
                     hover:bg-zinc-200 dark:hover:bg-zinc-700"
              [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
              <i class="pi pi-replay text-sm"></i>
            </button>

            <!-- Progress Bar -->
            <div class="flex-1 flex items-center gap-3">
              <span class="text-xs font-mono w-12 text-right"
                    [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">
                {{ audioService.formattedCurrentTime() }}
              </span>

              <div
                class="progress-bar flex-1 h-1.5 rounded-full cursor-pointer relative"
                [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"
                (click)="onProgressClick($event)">
                <div
                  class="progress-fill h-full rounded-full bg-cyan-500 transition-all"
                  [style.width.%]="audioService.progress()">
                </div>
                <div
                  class="progress-handle absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-500
                         opacity-0 hover:opacity-100 transition-opacity"
                  [style.left.%]="audioService.progress()">
                </div>
              </div>

              <span class="text-xs font-mono w-12"
                    [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-500'">
                {{ audioService.formattedDuration() }}
              </span>
            </div>

            <!-- Skip Forward -->
            <button
              (click)="audioService.skipForward(10)"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-colors
                     hover:bg-zinc-200 dark:hover:bg-zinc-700"
              [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
              <i class="pi pi-forward text-sm"></i>
            </button>

            <!-- Speed Control -->
            <button
              (click)="cyclePlaybackSpeed()"
              class="px-2 py-1 rounded text-xs font-mono transition-colors
                     hover:bg-zinc-200 dark:hover:bg-zinc-700"
              [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
              {{ audioService.playbackRate() }}x
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      transition: background-color 0.2s;
    }

    .cover-image {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .blocks-container {
      min-height: calc(100vh - 400px);
      padding-bottom: 100px; /* Space for audio player */
    }

    .progress-bar:hover .progress-handle {
      opacity: 1;
    }

    .add-block-row:hover {
      opacity: 1 !important;
    }
  `]
})
export class PageComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private folderState = inject(FolderStateService);
  theme = inject(ThemeService);
  audioService = inject(AudioService);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  distillation = signal<(Distillation & { pageIcon?: string; pageCover?: string }) | null>(null);
  blocks = signal<Block[]>([]);
  editingBlockId = signal<string | null>(null);
  showSlashCommand = signal(false);
  slashCommandPosition = signal({ x: 0, y: 0 });

  // Computed
  pageTitle = computed(() => this.distillation()?.title || 'Untitled');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPage(id);
    } else {
      this.error.set('페이지 ID가 없습니다');
      this.loading.set(false);
    }
  }

  ngAfterViewInit() {
    // 오디오 플레이어가 렌더링된 후 AudioService에 등록
    setTimeout(() => {
      if (this.audioPlayerRef?.nativeElement) {
        this.audioService.registerAudioElement(this.audioPlayerRef.nativeElement);
      }
    });
  }

  ngOnDestroy() {
    this.audioService.unregisterAudioElement();
  }

  private async loadPage(id: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load distillation
      const response = await this.api.getLecture(id).toPromise();
      if (response?.data) {
        this.distillation.set(response.data as Distillation & { pageIcon?: string; pageCover?: string });

        // Add to recent views
        this.folderState.addRecentView(response.data.id, response.data.title);

        // Try to load blocks, or convert from markdown
        try {
          const blocksResponse = await this.api.getBlocks(id).toPromise();
          if (blocksResponse?.data && blocksResponse.data.length > 0) {
            this.blocks.set(blocksResponse.data);
          } else if (response.data.summaryMd) {
            // Convert markdown to blocks for display
            const convertedBlocks = markdownToBlocks(response.data.summaryMd);
            this.blocks.set(convertedBlocks as Block[]);
          }
        } catch {
          // If blocks API fails, convert from markdown
          if (response.data.summaryMd) {
            const convertedBlocks = markdownToBlocks(response.data.summaryMd);
            this.blocks.set(convertedBlocks as Block[]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load page:', err);
      this.error.set('페이지를 불러오는데 실패했습니다');
    } finally {
      this.loading.set(false);
    }
  }

  // Event Handlers
  onIconChange(icon: string) {
    const current = this.distillation();
    if (current) {
      this.distillation.set({ ...current, pageIcon: icon });
      // TODO: API call to save icon
    }
  }

  onTitleChange(title: string) {
    const current = this.distillation();
    if (current) {
      this.distillation.set({ ...current, title });
      this.api.updateLecture(current.id, { title }).subscribe();
    }
  }

  onAddCover() {
    // TODO: Open cover image picker
    console.log('Add cover clicked');
  }

  onBlockEdit(block: Block) {
    this.editingBlockId.set(block.id);
  }

  onBlockUpdate(update: { id: string; content?: string; properties?: Record<string, unknown> }) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === update.id);
    if (index !== -1) {
      const updatedBlock = {
        ...currentBlocks[index],
        ...(update.content !== undefined && { content: update.content }),
        ...(update.properties && { properties: { ...currentBlocks[index].properties, ...update.properties } }),
      };
      this.blocks.set([
        ...currentBlocks.slice(0, index),
        updatedBlock,
        ...currentBlocks.slice(index + 1),
      ]);

      // TODO: API call to save
    }
    this.editingBlockId.set(null);
  }

  onBlockDelete(blockId: string) {
    const currentBlocks = this.blocks();
    this.blocks.set(currentBlocks.filter(b => b.id !== blockId));
    // TODO: API call to delete
  }

  onBlockDuplicate(block: Block) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === block.id);
    const newBlock: Block = {
      ...block,
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: index + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([
      ...currentBlocks.slice(0, index + 1),
      newBlock,
      ...currentBlocks.slice(index + 1),
    ]);
    // TODO: API call to create duplicate
  }

  onBlockTypeChange(event: { id: string; newType: string }) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === event.id);
    if (index !== -1) {
      const updatedBlock = {
        ...currentBlocks[index],
        type: event.newType as Block['type'],
      };
      this.blocks.set([
        ...currentBlocks.slice(0, index),
        updatedBlock,
        ...currentBlocks.slice(index + 1),
      ]);
      // TODO: API call to update type
    }
  }

  onAiAction(event: { action: string; blockId: string; content: string }) {
    console.log('AI Action:', event);
    // TODO: Integrate with Agent D
    // For now, show a notification
    if (event.action === 'ask') {
      alert(`Agent D에게 질문: "${event.content.slice(0, 50)}..."`);
    } else if (event.action === 'summarize') {
      alert(`블록 요약 요청: "${event.content.slice(0, 50)}..."`);
    }
  }

  onAddBlockAfter(afterBlockId: string) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === afterBlockId);
    const newBlock: Block = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      distillationId: this.distillation()!.id,
      parentId: null,
      type: 'text',
      content: '',
      properties: {},
      position: index + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([
      ...currentBlocks.slice(0, index + 1),
      newBlock,
      ...currentBlocks.slice(index + 1),
    ]);
    this.editingBlockId.set(newBlock.id);
  }

  onMoveBlock(blockId: string, direction: 'up' | 'down') {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === blockId);

    if (direction === 'up' && index > 0) {
      const newBlocks = [...currentBlocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      this.blocks.set(newBlocks);
    } else if (direction === 'down' && index < currentBlocks.length - 1) {
      const newBlocks = [...currentBlocks];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      this.blocks.set(newBlocks);
    }
    // TODO: API call to reorder
  }

  onSlashCommandSelect(command: { type: string; blockType?: string }) {
    const newBlock: Block = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      distillationId: this.distillation()!.id,
      parentId: null,
      type: (command.blockType || 'text') as Block['type'],
      content: '',
      properties: {},
      position: this.blocks().length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([...this.blocks(), newBlock]);
    this.editingBlockId.set(newBlock.id);
    this.showSlashCommand.set(false);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  // Audio Control Methods
  onProgressClick(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;
    this.audioService.seekToProgress(progress);
  }

  cyclePlaybackSpeed() {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentSpeed = this.audioService.playbackRate();
    const currentIndex = speeds.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.audioService.setPlaybackRate(speeds[nextIndex]);
  }
}
