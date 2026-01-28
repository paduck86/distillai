/**
 * Page Component
 *
 * Notion-style 페이지 뷰어/에디터
 * 기존 lecture-detail을 대체하는 새로운 UI
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ApiService, Distillation, Block } from '../../core/services/api.service';
import { ThemeService } from '../../core/services/theme.service';
import { AudioService } from '../../core/services/audio.service';
import { FolderStateService } from '../../core/services/folder-state.service';
import { PageStateService } from '../../core/services/page-state.service';
import { markdownToBlocks, generateBlockId } from '../../core/types/block.types';

import { PageHeaderComponent } from './components/page-header.component';
import { BlockRendererComponent } from './components/block-renderer.component';
import { SlashCommandComponent } from './components/slash-command.component';
import { InPageRecorderComponent, RecordingResult } from './components/in-page-recorder.component';
import { RecordingBarComponent } from './components/recording-bar.component';
import { FormattingToolbarComponent } from './components/formatting-toolbar.component';
import { RecorderService } from '../../core/services/recorder.service';
import { SidebarComponent } from '../dashboard/components/sidebar.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { SelectionService } from '../../core/services/selection.service';

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
    InPageRecorderComponent,
    RecordingBarComponent,
    SidebarComponent,
    FormattingToolbarComponent,
  ],
  template: `
    <div class="page-layout flex min-h-screen" [class]="theme.isDark() ? 'bg-zinc-900' : 'bg-white'">
      <!-- Sidebar -->
      <div
        class="sidebar-wrapper shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out z-30"
        [class]="sidebarCollapsed() ? 'w-0 overflow-hidden' : 'w-64'">
        <app-sidebar
          (pageSelected)="onSidebarPageSelected($event)"
          (createPageRequested)="onSidebarCreatePage($event)" />
      </div>

      <!-- Sidebar Toggle Button -->
      <button
        (click)="toggleSidebar()"
        class="fixed top-4 z-40 w-8 h-8 rounded-lg flex items-center justify-center
               transition-all duration-300 cursor-pointer shadow-md
               focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        [style.left.px]="sidebarCollapsed() ? 16 : 272"
        [class]="theme.isDark()
          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
          : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'"
        [title]="sidebarCollapsed() ? '사이드바 열기' : '사이드바 닫기'">
        <i class="pi text-xs transition-transform duration-300"
           [class]="sidebarCollapsed() ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
      </button>

      <!-- Main Content Area -->
      <div class="page-container flex-1 min-w-0">
        <!-- Loading State with Skeleton -->
        @if (loading()) {
        <div class="max-w-4xl mx-auto px-4 md:px-8 lg:px-16 py-12 animate-pulse">
          <!-- Skeleton: Icon + Title -->
          <div class="flex items-center gap-4 mb-8">
            <div class="w-16 h-16 rounded-xl" [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-200'"></div>
            <div class="flex-1">
              <div class="h-8 rounded-lg w-2/3 mb-2" [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-200'"></div>
              <div class="h-4 rounded w-1/3" [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-200'"></div>
            </div>
          </div>
          <!-- Skeleton: Blocks -->
          <div class="space-y-4">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="h-6 rounded w-full" [style.width.%]="85 - i * 10"
                   [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-200'"></div>
            }
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="flex flex-col items-center justify-center h-screen gap-6 px-4">
          <div class="w-20 h-20 rounded-2xl flex items-center justify-center"
               [class]="theme.isDark() ? 'bg-red-500/10' : 'bg-red-50'">
            <i class="pi pi-exclamation-triangle text-4xl text-red-500"></i>
          </div>
          <div class="text-center max-w-md">
            <h2 class="text-xl font-semibold mb-2">문제가 발생했습니다</h2>
            <p class="mb-6" [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">{{ error() }}</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              (click)="retryLoad()"
              class="min-w-[120px] h-11 px-5 rounded-xl font-medium transition-colors
                     bg-cyan-500 hover:bg-cyan-600 text-white cursor-pointer">
              <i class="pi pi-refresh mr-2"></i>
              다시 시도
            </button>
            <button
              (click)="goBack()"
              class="min-w-[120px] h-11 px-5 rounded-xl font-medium transition-colors cursor-pointer"
              [class]="theme.isDark()
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'">
              <i class="pi pi-arrow-left mr-2"></i>
              돌아가기
            </button>
          </div>
        </div>
      }

      <!-- Fixed Top Right: User Menu + Save Status -->
      <div class="fixed top-4 right-4 z-50 flex items-center gap-3">
        <!-- Save Status Indicator -->
        @if (distillation() && !loading()) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
               [class]="getSaveStatusClasses()">
            @switch (saveStatus()) {
              @case ('saving') {
                <i class="pi pi-spinner pi-spin text-xs"></i>
                <span>저장 중...</span>
              }
              @case ('saved') {
                <i class="pi pi-check text-xs"></i>
                <span>저장됨</span>
              }
              @case ('unsaved') {
                <i class="pi pi-circle-fill text-xs text-amber-500"></i>
                <span>수정됨</span>
              }
              @case ('error') {
                <i class="pi pi-exclamation-triangle text-xs text-red-500"></i>
                <span>저장 실패</span>
              }
            }
          </div>
        }

        <!-- User Menu -->
        <div class="relative">
          <button
            (click)="showUserMenu.set(!showUserMenu())"
            class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            [class]="theme.isDark()
              ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700'
              : 'bg-white hover:bg-zinc-100 border border-zinc-200 shadow-sm'">
            <div class="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-cyan-600
                        flex items-center justify-center text-white text-xs font-medium">
              {{ userInitial() }}
            </div>
          </button>

          @if (showUserMenu()) {
            <div class="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl overflow-hidden z-50 border"
                 [class]="theme.isDark() ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'">
              <div class="px-4 py-3 border-b"
                   [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-100'">
                <p class="text-sm font-medium truncate">{{ userEmail() }}</p>
              </div>
              <button
                (click)="goToDashboard()"
                class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer"
                [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'">
                <i class="pi pi-home"></i>
                <span>대시보드</span>
              </button>
              <button
                (click)="signOut()"
                class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer"
                [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'">
                <i class="pi pi-sign-out"></i>
                <span>로그아웃</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- User Menu Overlay (close on click outside) -->
      @if (showUserMenu()) {
        <div (click)="showUserMenu.set(false)" class="fixed inset-0 z-40"></div>
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
          <div class="blocks-container px-4 md:px-8 lg:px-16 py-6">
            @if (blocks().length === 0) {
              <!-- Empty State - Auto create first block and show hint -->
              <div class="empty-state-hint text-center py-8"
                   [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                <p class="text-sm mb-2">
                  <kbd class="px-1.5 py-0.5 rounded font-mono text-xs"
                       [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">/</kbd>
                  를 입력하여 녹음, 요약 등 기능을 사용하세요
                </p>
                <div class="flex items-center justify-center gap-4 text-xs mt-4">
                  <button (click)="startRecording()" class="flex items-center gap-1.5 hover:text-red-400 transition-colors cursor-pointer">
                    <i class="pi pi-microphone"></i> 녹음
                  </button>
                  <button (click)="showSlashCommand.set(true)" class="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer">
                    <i class="pi pi-sparkles"></i> AI 요약
                  </button>
                </div>
              </div>
            }

            <!-- Block List -->
            @for (block of blocks(); track block.id; let i = $index) {
              <app-block-renderer
                #blockRef
                [block]="block"
                [isEditing]="editingBlockId() === block.id"
                (edit)="onBlockEdit(block)"
                (update)="onBlockUpdate($event)"
                (delete)="onBlockDelete(block.id)"
                (duplicate)="onBlockDuplicate(block)"
                (addBlockAfter)="onAddBlockAfter(block.id)"
                (showSlashMenu)="onShowSlashMenuAfterBlock($event)"
                (moveUp)="onMoveBlock(block.id, 'up')"
                (moveDown)="onMoveBlock(block.id, 'down')"
                (typeChange)="onBlockTypeChange($event)"
                (aiAction)="onAiAction($event)"
                (splitBlock)="onSplitBlock($event)"
                (mergeWithPrevious)="onMergeWithPrevious($event, i)"
                (slashCommand)="onSlashCommandFromBlock($event)"
                (focusBlock)="onFocusBlock($event, i)"
                (dragStart)="onBlockDragStart($event)"
                (dragEnd)="onBlockDragEnd($event)"
                (dragover)="onBlockDragOver($event, i)"
                (drop)="onBlockDrop($event, i)" />
            }


          </div>

          <!-- Slash Command Palette -->
          @if (showSlashCommand()) {
            <app-slash-command
              [position]="slashCommandPosition()"
              (select)="onSlashCommandSelect($event)"
              (close)="onSlashCommandClose()" />
          }

          <!-- Inline Formatting Toolbar (appears on text selection) -->
          <app-formatting-toolbar
            (formatApplied)="onFormatApplied()" />
        </div>
      }


      <!-- Recording Bar (shown when recording) -->
      @if (isRecording() && !showRecorderModal()) {
        <app-recording-bar
          [pageTitle]="pageTitle()"
          [showMarkerButton]="true"
          (stop)="onRecordingStop()"
          (addMarker)="onAddRecordingMarker($event)" />
      }

      <!-- In-Page Recorder Modal -->
      @if (showRecorderModal()) {
        <app-in-page-recorder
          [pageId]="distillation()!.id"
          (close)="showRecorderModal.set(false)"
          (recordingStarted)="onRecordingStarted()"
          (processWithAIRequested)="onProcessWithAI($event)"
          (saveWithoutAIRequested)="onSaveWithoutAI($event)" />
      }

      <!-- Audio Player (Fixed Bottom) -->
      @if (distillation()?.audioUrl && !isRecording()) {
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
              class="w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer
                     bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none">
              <i [class]="audioService.isPlaying() ? 'pi pi-pause' : 'pi pi-play'" class="text-sm"></i>
            </button>

            <!-- Skip Buttons -->
            <button
              (click)="audioService.skipBackward(10)"
              class="w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer
                     hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-400/50 focus:outline-none"
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
                class="progress-bar flex-1 h-2 rounded-full cursor-pointer relative group"
                [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"
                (click)="onProgressClick($event)">
                <div
                  class="progress-fill h-full rounded-full bg-cyan-500 transition-all"
                  [style.width.%]="audioService.progress()">
                </div>
                <div
                  class="progress-handle absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-cyan-500
                         shadow-md opacity-0 group-hover:opacity-100 transition-opacity -ml-2"
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
              class="w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer
                     hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-400/50 focus:outline-none"
              [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
              <i class="pi pi-forward text-sm"></i>
            </button>

            <!-- Speed Control -->
            <button
              (click)="cyclePlaybackSpeed()"
              class="min-w-[44px] h-11 px-3 rounded-lg text-xs font-mono transition-colors cursor-pointer
                     hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:ring-2 focus:ring-zinc-400/50 focus:outline-none"
              [class]="theme.isDark() ? 'text-zinc-400' : 'text-zinc-600'">
              {{ audioService.playbackRate() }}x
            </button>
          </div>
        </div>
      }
      </div><!-- End .page-container -->
    </div><!-- End .page-layout -->
  `,
  styles: [`
    .page-layout {
      min-height: 100vh;
    }

    .page-container {
      transition: background-color 0.2s;
    }

    .sidebar-wrapper {
      border-right: 1px solid rgba(0, 0, 0, 0.1);
    }

    :host-context(.dark) .sidebar-wrapper {
      border-right-color: rgba(255, 255, 255, 0.1);
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
  private pageState = inject(PageStateService);
  private recorder = inject(RecorderService);
  private supabase = inject(SupabaseService);
  theme = inject(ThemeService);
  audioService = inject(AudioService);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;
  @ViewChildren('blockRef') blockRefs!: QueryList<BlockRendererComponent>;

  // User menu state
  showUserMenu = signal(false);

  // State
  loading = signal(true);
  error = signal<string | null>(null);
  distillation = signal<(Distillation & { pageIcon?: string; pageCover?: string }) | null>(null);
  blocks = signal<Block[]>([]);
  editingBlockId = signal<string | null>(null);
  showSlashCommand = signal(false);
  slashCommandPosition = signal({ x: 0, y: 0 });
  insertAfterBlockId = signal<string | null>(null); // Track which block to insert after when using + button

  // Sidebar state
  sidebarCollapsed = signal(false);

  // Drag and drop state
  draggingBlockId = signal<string | null>(null);
  dragOverIndex = signal<number | null>(null);

  // Auto-save state
  saveStatus = signal<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingChanges = signal(false);

  // Recording state
  showRecorderModal = signal(false);
  isRecording = computed(() => this.recorder.state().isRecording);
  recorderState = this.recorder.state;

  // Computed
  pageTitle = computed(() => this.distillation()?.title || 'Untitled');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPage(id).then(() => {
        // Handle quick action query params from dashboard
        this.handleQuickAction();
      });
    } else {
      this.error.set('페이지 ID가 없습니다');
      this.loading.set(false);
    }
  }

  /**
   * Handle query params for quick actions from dashboard
   * ?action=youtube | pdf | record
   */
  private handleQuickAction() {
    const action = this.route.snapshot.queryParamMap.get('action');
    if (!action) return;

    // Clear the query param after reading
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });

    // Execute action after a short delay to ensure UI is ready
    setTimeout(() => {
      switch (action) {
        case 'youtube':
          this.showYouTubeImport();
          break;
        case 'pdf':
          this.showPdfImport();
          break;
        case 'record':
          this.startRecording();
          break;
      }
    }, 100);
  }

  // Show YouTube import UI
  private showYouTubeImport() {
    // Open slash command with pre-selected youtube
    this.showSlashCommand.set(true);
    // TODO: Auto-focus on youtube option or show dedicated modal
  }

  // Show PDF import UI
  private showPdfImport() {
    // Open slash command with pre-selected pdf
    this.showSlashCommand.set(true);
    // TODO: Auto-focus on pdf option or show dedicated modal
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
        let hasBlocks = false;
        try {
          const blocksResponse = await this.api.getBlocks(id).toPromise();
          if (blocksResponse?.data && blocksResponse.data.length > 0) {
            this.blocks.set(blocksResponse.data);
            hasBlocks = true;
          } else if (response.data.summaryMd) {
            // Convert markdown to blocks for display
            const convertedBlocks = markdownToBlocks(response.data.summaryMd).map((b, i) => ({
              ...b,
              distillationId: id,
              parentId: null,
              properties: b.properties || {},
              position: i,
              createdAt: response.data!.createdAt,
              updatedAt: response.data!.updatedAt
            }));
            this.blocks.set(convertedBlocks as Block[]);
            hasBlocks = true;
          }
        } catch {
          // If blocks API fails, convert from markdown
          if (response.data.summaryMd) {
            const convertedBlocks = markdownToBlocks(response.data.summaryMd).map((b, i) => ({
              ...b,
              distillationId: id,
              parentId: null,
              properties: b.properties || {},
              position: i,
              createdAt: response.data!.createdAt,
              updatedAt: response.data!.updatedAt
            }));
            this.blocks.set(convertedBlocks as Block[]);
            hasBlocks = true;
          }
        }

        // If no blocks, create first empty text block (Notion-style)
        if (!hasBlocks) {
          this.createFirstBlockAndFocus(id);
        }
      }
    } catch (err) {
      console.error('Failed to load page:', err);
      this.error.set('페이지를 불러오는데 실패했습니다');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Create first text block and auto-focus for Notion-style editing
   */
  private createFirstBlockAndFocus(distillationId: string) {
    const newBlock: Block = {
      id: generateBlockId(),
      distillationId,
      parentId: null,
      type: 'text',
      content: '',
      properties: {},
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([newBlock]);
    this.editingBlockId.set(newBlock.id);

    // Focus the first block after DOM renders
    setTimeout(() => {
      const blockRefs = this.blockRefs?.toArray();
      if (blockRefs && blockRefs.length > 0) {
        blockRefs[0].focus('start');
      }
    }, 100);
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
      // Optimistic update
      this.distillation.set({ ...current, title });

      // Update status
      this.saveStatus.set('saving');

      this.api.updateLecture(current.id, { title }).subscribe({
        next: (response) => {
          console.log('Title saved successfully:', response);
          this.saveStatus.set('saved');
          setTimeout(() => this.saveStatus.set('saved'), 2000); // Keep saved status for a bit
        },
        error: (err) => {
          console.error('Failed to save title:', err);
          this.saveStatus.set('error');
          // Revert on error?
        }
      });
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

      // Schedule auto-save
      this.scheduleAutoSave();
    }
    this.editingBlockId.set(null);
  }

  onBlockDelete(blockId: string) {
    const currentBlocks = this.blocks();
    this.blocks.set(currentBlocks.filter(b => b.id !== blockId));
    // Schedule auto-save
    this.scheduleAutoSave();
  }

  onBlockDuplicate(block: Block) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === block.id);
    const newBlock: Block = {
      ...block,
      id: generateBlockId(),
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
      id: generateBlockId(),
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

    // Focus the new block after DOM renders
    setTimeout(() => {
      const blockRefs = this.blockRefs?.toArray();
      if (blockRefs && blockRefs[index + 1]) {
        blockRefs[index + 1].focus('start');
      }
    }, 50);
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

  // Split block at cursor position (Enter key)
  onSplitBlock(event: { id: string; beforeContent: string; afterContent: string }) {
    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === event.id);
    if (index === -1) return;

    // Update current block with content before cursor
    const updatedBlock = { ...currentBlocks[index], content: event.beforeContent };

    // Create new block with content after cursor
    const newBlock: Block = {
      id: generateBlockId(),
      distillationId: this.distillation()!.id,
      parentId: null,
      type: 'text', // New block is always text
      content: event.afterContent,
      properties: {},
      position: index + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([
      ...currentBlocks.slice(0, index),
      updatedBlock,
      newBlock,
      ...currentBlocks.slice(index + 1),
    ]);

    // Focus the new block after DOM update
    setTimeout(() => {
      const blockRefs = this.blockRefs.toArray();
      if (blockRefs[index + 1]) {
        blockRefs[index + 1].focus('start');
      }
    }, 0);
  }

  // Merge with previous block (Backspace at start)
  onMergeWithPrevious(event: { id: string; content: string }, currentIndex: number) {
    if (currentIndex === 0) return; // Can't merge first block

    const currentBlocks = this.blocks();
    const prevBlock = currentBlocks[currentIndex - 1];
    const currentBlock = currentBlocks[currentIndex];

    // Merge content
    const mergedContent = (prevBlock.content || '') + (event.content || '');
    const cursorPosition = (prevBlock.content || '').length;

    // Update previous block with merged content
    const updatedPrevBlock = { ...prevBlock, content: mergedContent };

    // Remove current block
    this.blocks.set([
      ...currentBlocks.slice(0, currentIndex - 1),
      updatedPrevBlock,
      ...currentBlocks.slice(currentIndex + 1),
    ]);

    // Focus previous block at the merge point
    setTimeout(() => {
      const blockRefs = this.blockRefs.toArray();
      if (blockRefs[currentIndex - 1]) {
        blockRefs[currentIndex - 1].focus('end');
        // TODO: Set cursor position to cursorPosition
      }
    }, 0);
  }

  // Handle slash command from within a block
  // Handle slash command from within a block
  onSlashCommandFromBlock(event: { id: string; position: { x: number; y: number } }) {
    // Check for bottom edge
    const menuHeight = 280;
    const windowHeight = window.innerHeight;
    let y = event.position.y;

    if (y + menuHeight > windowHeight - 20) {
      y = y - menuHeight - 40;
    }

    this.slashCommandPosition.set({ x: event.position.x, y });
    this.showSlashCommand.set(true);
    this.editingBlockId.set(event.id);
    this.insertAfterBlockId.set(null); // Clear insert mode
  }

  // Handle + button click - show slash menu to insert after this block
  onShowSlashMenuAfterBlock(event: { afterBlockId: string; position: { x: number; y: number } }) {
    // Check for bottom edge
    const menuHeight = 280;
    const windowHeight = window.innerHeight;
    let y = event.position.y;

    if (y + menuHeight > windowHeight - 20) {
      y = y - menuHeight - 40;
    }

    this.slashCommandPosition.set({ x: event.position.x, y });
    this.showSlashCommand.set(true);
    this.insertAfterBlockId.set(event.afterBlockId);
    this.editingBlockId.set(null); // Not editing existing block
  }

  // Focus next/previous block
  onFocusBlock(event: { id: string; position?: 'start' | 'end' }, currentIndex: number) {
    const currentBlocks = this.blocks();

    // If position is 'end', we came from ArrowUp, go to previous block
    if (event.position === 'end' && currentIndex > 0) {
      setTimeout(() => {
        const blockRefs = this.blockRefs.toArray();
        if (blockRefs[currentIndex - 1]) {
          blockRefs[currentIndex - 1].focus('end');
        }
      }, 0);
    }
    // If position is 'start', we came from ArrowDown, go to next block
    else if (event.position === 'start' && currentIndex < currentBlocks.length - 1) {
      setTimeout(() => {
        const blockRefs = this.blockRefs.toArray();
        if (blockRefs[currentIndex + 1]) {
          blockRefs[currentIndex + 1].focus('start');
        }
      }, 0);
    }
  }

  // ============ Drag & Drop Handlers ============

  onBlockDragStart(event: { id: string; event: DragEvent }) {
    this.draggingBlockId.set(event.id);
  }

  onBlockDragEnd(event: { id: string; event: DragEvent }) {
    this.draggingBlockId.set(null);
    this.dragOverIndex.set(null);
  }

  onBlockDragOver(event: Event, index: number) {
    const dragEvent = event as DragEvent;
    dragEvent.preventDefault();
    dragEvent.dataTransfer!.dropEffect = 'move';
    this.dragOverIndex.set(index);
  }

  onBlockDrop(event: Event, dropIndex: number) {
    const dragEvent = event as DragEvent;
    dragEvent.preventDefault();

    const draggedId = this.draggingBlockId();
    if (!draggedId) return;

    const currentBlocks = this.blocks();
    const draggedIndex = currentBlocks.findIndex(b => b.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    // Reorder blocks
    const newBlocks = [...currentBlocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex;
    newBlocks.splice(insertIndex, 0, draggedBlock);

    // Update positions
    newBlocks.forEach((block, i) => {
      block.position = i;
    });

    this.blocks.set(newBlocks);
    this.draggingBlockId.set(null);
    this.dragOverIndex.set(null);

    // TODO: API call to persist order
  }

  onSlashCommandSelect(command: { type: string; blockType?: string; aiAction?: string }) {
    this.showSlashCommand.set(false);

    // Handle special actions
    if (command.aiAction === 'summarize') {
      this.clearSlashFromEditingBlock();
      this.summarizePage();
      return;
    }

    if (command.aiAction === 'record') {
      // Clear slash from current block if any
      this.clearSlashFromEditingBlock();
      this.startRecording();
      return;
    }

    if (command.aiAction === 'subpage') {
      this.clearSlashFromEditingBlock();
      this.createSubPage();
      return;
    }

    // Check if we should convert existing block or create new
    const editingId = this.editingBlockId();
    const currentBlocks = this.blocks();

    if (editingId) {
      const existingIndex = currentBlocks.findIndex(b => b.id === editingId);
      if (existingIndex !== -1) {
        const existingBlock = currentBlocks[existingIndex];
        const content = existingBlock.content?.trim() || '';

        // If block only has '/' or is empty, convert it to the new type
        if (content === '/' || content === '') {
          const updatedBlock = {
            ...existingBlock,
            type: (command.blockType || 'text') as Block['type'],
            content: '',
          };
          this.blocks.set([
            ...currentBlocks.slice(0, existingIndex),
            updatedBlock,
            ...currentBlocks.slice(existingIndex + 1),
          ]);

          // Focus the converted block
          setTimeout(() => {
            const blockRefs = this.blockRefs?.toArray();
            if (blockRefs && blockRefs[existingIndex]) {
              blockRefs[existingIndex].focus('start');
            }
          }, 50);
          return;
        }
      }
    }

    // Check if we're inserting after a specific block (from + button)
    const insertAfterId = this.insertAfterBlockId();
    let insertIndex = currentBlocks.length;

    if (insertAfterId) {
      const afterIndex = currentBlocks.findIndex(b => b.id === insertAfterId);
      if (afterIndex !== -1) {
        insertIndex = afterIndex + 1;
      }
    }

    // Create a new block
    const newBlock: Block = {
      id: generateBlockId(),
      distillationId: this.distillation()!.id,
      parentId: null,
      type: (command.blockType || 'text') as Block['type'],
      content: '',
      properties: {},
      position: insertIndex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert at the correct position
    this.blocks.set([
      ...currentBlocks.slice(0, insertIndex),
      newBlock,
      ...currentBlocks.slice(insertIndex),
    ]);
    this.editingBlockId.set(newBlock.id);
    this.insertAfterBlockId.set(null); // Clear insert mode

    // Focus the new block after DOM renders
    setTimeout(() => {
      const blockRefs = this.blockRefs?.toArray();
      if (blockRefs && blockRefs[insertIndex]) {
        blockRefs[insertIndex].focus('start');
      }
    }, 50);
  }

  /**
   * Clear '/' from the currently editing block
   */
  private clearSlashFromEditingBlock() {
    const editingId = this.editingBlockId();
    if (!editingId) return;

    const currentBlocks = this.blocks();
    const index = currentBlocks.findIndex(b => b.id === editingId);
    if (index !== -1) {
      const block = currentBlocks[index];
      const content = block.content?.trim() || '';
      if (content === '/') {
        const updatedBlock = { ...block, content: '' };
        this.blocks.set([
          ...currentBlocks.slice(0, index),
          updatedBlock,
          ...currentBlocks.slice(index + 1),
        ]);
      }
    }
  }

  /**
   * Handle slash command close (Escape or click outside)
   */
  onSlashCommandClose() {
    this.showSlashCommand.set(false);
    this.insertAfterBlockId.set(null);
  }

  // Recording handler - show in-page recorder modal
  startRecording() {
    const current = this.distillation();
    if (!current) return;

    this.showRecorderModal.set(true);
  }

  // Add first text block for empty pages
  addFirstBlock() {
    const newBlock: Block = {
      id: generateBlockId(),
      distillationId: this.distillation()!.id,
      parentId: null,
      type: 'text',
      content: '',
      properties: {},
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([newBlock]);
    this.editingBlockId.set(newBlock.id);

    // Focus the block after DOM renders
    setTimeout(() => {
      const blockRefs = this.blockRefs?.toArray();
      if (blockRefs && blockRefs.length > 0) {
        blockRefs[0].focus('start');
      }
    }, 50);
  }

  // Recording events
  onRecordingStarted() {
    this.showRecorderModal.set(false);
  }

  onRecordingStop() {
    // Recording stopped, show completion modal
    const state = this.recorder.state();
    if (state.audioBlob) {
      this.showRecorderModal.set(true);
    }
  }

  async onProcessWithAI(result: RecordingResult) {
    const current = this.distillation();
    if (!current) return;

    try {
      // Upload audio to this page
      const durationSeconds = Math.round(result.durationMs / 1000);
      await this.api.uploadAudio(current.id, result.audioBlob, durationSeconds);

      // Start AI summarization
      await this.api.summarizeLecture(current.id).toPromise();

      // Reload page to show updated content
      this.showRecorderModal.set(false);
      this.recorder.reset();
      await this.loadPage(current.id);

    } catch (error) {
      console.error('Failed to process recording:', error);
    }
  }

  /**
   * Summarize the current page content using AI
   */
  async summarizePage() {
    const current = this.distillation();
    if (!current) return;

    this.saveStatus.set('saving');
    try {
      // First, ensure all current blocks are saved
      await this.performAutoSave();

      // Start AI summarization (this now supports block-based notes on the backend)
      const response = await this.api.summarizeLecture(current.id).toPromise();

      if (response?.data && response.data.summaryMd) {
        // Convert summary markdown to blocks
        const summaryBlocks = markdownToBlocks(response.data.summaryMd);

        // Map blocks to include distillationId and valid positions
        const currentBlocks = this.blocks();
        const editingId = this.editingBlockId();
        let insertIndex = currentBlocks.length;

        if (editingId) {
          const idx = currentBlocks.findIndex(b => b.id === editingId);
          if (idx !== -1) insertIndex = idx + 1;
        }

        const headBlock: Block = {
          id: generateBlockId(),
          distillationId: current.id,
          parentId: null,
          type: 'heading3',
          content: '✨ AI 요약 결과',
          properties: { color: 'blue' },
          position: insertIndex,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const resultBlocks: Block[] = summaryBlocks.map((b, i) => ({
          id: generateBlockId(),
          distillationId: current.id,
          parentId: null,
          type: b.type as any,
          content: b.content,
          properties: b.properties || {},
          position: insertIndex + 1 + i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        const finalBlocks = [
          ...currentBlocks.slice(0, insertIndex),
          headBlock,
          ...resultBlocks,
          ...currentBlocks.slice(insertIndex)
        ];

        // Re-calculate all positions to be safe
        finalBlocks.forEach((b, i) => b.position = i);

        this.blocks.set(finalBlocks);
        this.saveStatus.set('saved');

        // Save the new blocks structure
        await this.performAutoSave();

        // Scroll to the summary or focus it
        this.editingBlockId.set(headBlock.id);
      }
    } catch (error) {
      console.error('Summarization failed:', error);
      this.saveStatus.set('error');
    }
  }

  async onSaveWithoutAI(result: RecordingResult) {
    const current = this.distillation();
    if (!current) return;

    try {
      // Upload audio to this page without AI processing
      const durationSeconds = Math.round(result.durationMs / 1000);
      await this.api.uploadAudio(current.id, result.audioBlob, durationSeconds);

      // Reload page
      this.showRecorderModal.set(false);
      this.recorder.reset();
      await this.loadPage(current.id);

    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  }

  onAddRecordingMarker(timeMs: number) {
    // Add a timestamp block at current position
    const timeStr = this.formatTimestamp(timeMs);
    const newBlock: Block = {
      id: generateBlockId(),
      distillationId: this.distillation()!.id,
      parentId: null,
      type: 'timestamp',
      content: '',
      properties: { timestamp: timeStr },
      position: this.blocks().length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.blocks.set([...this.blocks(), newBlock]);
    this.editingBlockId.set(newBlock.id);
  }

  private formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Create sub-page under current page
  private async createSubPage() {
    const current = this.distillation();
    if (!current) return;

    try {
      const result = await this.pageState.createPage({
        title: '',
        parentId: current.id,
        sourceType: 'note',
      });

      if (result) {
        // Navigate to the new sub-page
        this.router.navigate(['/page', result.id]);
      }
    } catch (error) {
      console.error('Failed to create sub-page:', error);
    }
  }

  // Formatting toolbar handler
  onFormatApplied() {
    // Trigger auto-save when formatting is applied
    this.scheduleAutoSave();
  }

  // Sidebar methods
  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  // User menu methods
  userEmail() {
    return this.supabase.user()?.email || 'User';
  }

  userInitial() {
    return this.userEmail().charAt(0).toUpperCase();
  }

  goToDashboard() {
    this.showUserMenu.set(false);
    this.router.navigate(['/dashboard']);
  }

  async signOut() {
    this.showUserMenu.set(false);
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }

  onSidebarPageSelected(pageId: string) {
    // Navigate to selected page
    if (pageId !== this.distillation()?.id) {
      this.router.navigate(['/page', pageId]);
    }
  }

  async onSidebarCreatePage(parentId?: string) {
    try {
      const result = await this.pageState.createPage({
        title: '',
        parentId,
        sourceType: 'note',
      });
      if (result) {
        this.router.navigate(['/page', result.id]);
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  retryLoad() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.error.set(null);
      this.loadPage(id);
    }
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

  // ============ Auto-Save Methods ============

  getSaveStatusClasses(): string {
    const base = this.theme.isDark()
      ? 'bg-zinc-800/90 backdrop-blur-sm border border-zinc-700'
      : 'bg-white/90 backdrop-blur-sm border border-zinc-200 shadow-sm';

    switch (this.saveStatus()) {
      case 'saving':
        return base + ' text-cyan-500';
      case 'saved':
        return base + (this.theme.isDark() ? ' text-zinc-400' : ' text-zinc-500');
      case 'unsaved':
        return base + ' text-amber-500';
      case 'error':
        return base + ' text-red-500';
      default:
        return base;
    }
  }

  /**
   * Schedule auto-save with debounce
   */
  private scheduleAutoSave() {
    this.saveStatus.set('unsaved');
    this.pendingChanges.set(true);

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.performAutoSave();
    }, 1500); // 1.5 second debounce
  }

  /**
   * Perform the actual save operation
   */
  private async performAutoSave() {
    if (!this.pendingChanges()) return;

    const distillation = this.distillation();
    if (!distillation) return;

    this.saveStatus.set('saving');

    try {
      // Save blocks to API
      const blocks = this.blocks();
      await this.api.updateBlocks(distillation.id, blocks).toPromise();

      this.saveStatus.set('saved');
      this.pendingChanges.set(false);

      // Auto-hide saved status after 2 seconds
      setTimeout(() => {
        if (this.saveStatus() === 'saved') {
          // Keep showing saved status but make it subtle
        }
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.saveStatus.set('error');
    }
  }
}
