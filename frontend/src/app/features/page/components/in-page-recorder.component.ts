/**
 * In-Page Recorder Component
 *
 * 페이지 내에서 녹음을 시작하기 위한 모달/인라인 컴포넌트
 * 소스 선택 → 녹음 시작 → 완료 후 처리
 */

import { Component, inject, signal, Output, EventEmitter, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecorderService } from '../../../core/services/recorder.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

type AudioSource = 'tab' | 'screen' | 'mic';
type RecorderStep = 'source-select' | 'recording' | 'completed';

export interface RecordingResult {
  audioBlob: Blob;
  durationMs: number;
}

@Component({
  selector: 'app-in-page-recorder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Overlay -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      (click)="onOverlayClick($event)">

      <!-- Modal Content -->
      <div
        class="modal-content w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
        [class]="theme.isDark() ? 'bg-zinc-900' : 'bg-white'"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="px-6 py-4 border-b flex items-center justify-between"
             [class]="theme.isDark() ? 'border-zinc-800' : 'border-zinc-100'">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <i class="pi pi-microphone text-cyan-500"></i>
            녹음 시작
          </h2>
          <button
            (click)="close.emit()"
            class="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            [class]="theme.isDark() ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Source Selection -->
        @if (step() === 'source-select') {
          <div class="p-6 space-y-4">
            <p class="text-sm opacity-70">어떤 오디오를 녹음할까요?</p>

            <!-- Source Options -->
            <div class="space-y-3">
              <!-- Tab Audio -->
              <button
                (click)="selectSource('tab')"
                class="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4"
                [class]="selectedSource() === 'tab'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : (theme.isDark() ? 'border-zinc-700 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-300')">
                <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <i class="pi pi-window-maximize text-cyan-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium">브라우저 탭</h3>
                  <p class="text-xs opacity-60 truncate">탭에서 재생 중인 영상 오디오</p>
                </div>
                @if (selectedSource() === 'tab') {
                  <i class="pi pi-check-circle text-cyan-500"></i>
                }
              </button>

              <!-- System Audio -->
              <button
                (click)="selectSource('screen')"
                class="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4"
                [class]="selectedSource() === 'screen'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : (theme.isDark() ? 'border-zinc-700 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-300')">
                <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <i class="pi pi-desktop text-emerald-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium">시스템 오디오</h3>
                  <p class="text-xs opacity-60 truncate">컴퓨터에서 나오는 모든 소리</p>
                </div>
                @if (selectedSource() === 'screen') {
                  <i class="pi pi-check-circle text-emerald-500"></i>
                }
              </button>

              <!-- Microphone -->
              <button
                (click)="selectSource('mic')"
                class="w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4"
                [class]="selectedSource() === 'mic'
                  ? 'border-orange-500 bg-orange-500/10'
                  : (theme.isDark() ? 'border-zinc-700 hover:border-zinc-600' : 'border-zinc-200 hover:border-zinc-300')">
                <div class="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <i class="pi pi-microphone text-orange-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium">마이크</h3>
                  <p class="text-xs opacity-60 truncate">직접 녹음 (오프라인 강의)</p>
                </div>
                @if (selectedSource() === 'mic') {
                  <i class="pi pi-check-circle text-orange-500"></i>
                }
              </button>
            </div>

            <!-- Start Button -->
            <button
              (click)="startRecording()"
              [disabled]="!selectedSource() || isLoading()"
              class="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
              [class]="theme.isDark()
                ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
              @if (isLoading()) {
                <i class="pi pi-spin pi-spinner"></i>
                <span>준비 중...</span>
              } @else {
                <i class="pi pi-play-circle"></i>
                <span>녹음 시작</span>
              }
            </button>
          </div>
        }

        <!-- Recording Completed -->
        @if (step() === 'completed') {
          <div class="p-6 space-y-4">
            <!-- Success Icon -->
            <div class="text-center py-4">
              <div class="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-check text-3xl text-emerald-500"></i>
              </div>
              <h3 class="text-lg font-semibold">녹음 완료!</h3>
              <p class="text-sm opacity-60 mt-1">{{ formattedDuration() }} 분량</p>
            </div>

            <!-- Audio Preview -->
            @if (audioUrl()) {
              <div class="rounded-xl p-4 border"
                   [class]="theme.isDark() ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'">
                <audio [src]="audioUrl()" controls class="w-full h-10"></audio>
              </div>
            }

            <!-- Action Buttons -->
            @if (!isProcessing()) {
              <div class="space-y-2">
                <button
                  (click)="processWithAI()"
                  class="w-full py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer
                         focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  [class]="theme.isDark()
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-zinc-900'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'">
                  <i class="pi pi-sparkles"></i>
                  <span>AI 요약 생성</span>
                </button>

                <div class="flex gap-2">
                  <button
                    (click)="saveWithoutAI()"
                    class="flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-zinc-400/50"
                    [class]="theme.isDark()
                      ? 'bg-zinc-800 hover:bg-zinc-700'
                      : 'bg-zinc-100 hover:bg-zinc-200'">
                    <i class="pi pi-save"></i>
                    <span>저장만</span>
                  </button>

                  <button
                    (click)="discardRecording()"
                    class="flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-red-500 cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    [class]="theme.isDark() ? 'hover:bg-red-500/10' : 'hover:bg-red-50'">
                    <i class="pi pi-trash"></i>
                    <span>취소</span>
                  </button>
                </div>
              </div>
            } @else {
              <!-- Processing Progress -->
              <div class="space-y-4">
                <div class="text-center">
                  <div class="inline-flex items-center gap-3 px-4 py-3 rounded-xl"
                       [class]="theme.isDark() ? 'bg-cyan-500/10' : 'bg-indigo-50'">
                    <div class="relative">
                      <div class="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    </div>
                    <div class="text-left">
                      <p class="font-medium text-sm" [class]="theme.isDark() ? 'text-cyan-400' : 'text-indigo-600'">
                        {{ processingStep() }}
                      </p>
                      <p class="text-xs opacity-60">잠시만 기다려주세요</p>
                    </div>
                  </div>
                </div>

                <!-- Progress Steps -->
                <div class="flex items-center justify-center gap-2">
                  @for (stepItem of processingSteps; track stepItem.id; let i = $index) {
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                           [class]="getStepClass(i)">
                        @if (currentStepIndex() > i) {
                          <i class="pi pi-check text-xs"></i>
                        } @else {
                          {{ i + 1 }}
                        }
                      </div>
                      @if (i < processingSteps.length - 1) {
                        <div class="w-8 h-0.5 rounded-full transition-colors"
                             [class]="currentStepIndex() > i
                               ? 'bg-cyan-500'
                               : (theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200')"></div>
                      }
                    </div>
                  }
                </div>

                <p class="text-center text-xs opacity-50">
                  녹음을 분석하고 요약을 생성하고 있습니다
                </p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .modal-content {
      animation: modalIn 0.2s ease-out;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `]
})
export class InPageRecorderComponent implements OnInit {
  private recorder = inject(RecorderService);
  private toast = inject(ToastService);
  theme = inject(ThemeService);

  // Input: Page ID to associate recording with
  pageId = input.required<string>();

  // Outputs
  @Output() close = new EventEmitter<void>();
  @Output() recordingStarted = new EventEmitter<void>();
  @Output() recordingCompleted = new EventEmitter<RecordingResult>();
  @Output() processWithAIRequested = new EventEmitter<RecordingResult>();
  @Output() saveWithoutAIRequested = new EventEmitter<RecordingResult>();

  // State
  step = signal<RecorderStep>('source-select');
  selectedSource = signal<AudioSource | null>(null);
  isLoading = signal(false);
  isProcessing = signal(false);
  audioUrl = signal<string | null>(null);
  recordedBlob = signal<Blob | null>(null);
  recordedDuration = signal(0);
  currentStepIndex = signal(0);

  // Processing steps for visual feedback
  processingSteps = [
    { id: 'upload', label: '업로드 중' },
    { id: 'transcribe', label: '전사 중' },
    { id: 'summarize', label: '요약 생성' },
  ];

  processingStep = signal('업로드 중...');

  ngOnInit() {
    // Check if there's already a recorded blob (recording just completed)
    const state = this.recorder.state();
    if (state.audioBlob && !state.isRecording) {
      this.showCompletedState(state.audioBlob, state.duration);
    }
  }

  formattedDuration() {
    return this.recorder.formatDuration(this.recordedDuration());
  }

  selectSource(source: AudioSource) {
    this.selectedSource.set(source);
  }

  async startRecording() {
    const source = this.selectedSource();
    if (!source) return;

    this.isLoading.set(true);

    try {
      if (source === 'mic') {
        await this.recorder.startRecording(false);
      } else if (source === 'screen') {
        await this.recorder.startScreenRecording();
      } else {
        await this.recorder.startRecording(true);
      }

      // Recording started successfully - close modal and show recording bar
      this.recordingStarted.emit();
      this.close.emit();

    } catch (error) {
      console.error('Failed to start recording:', error);
      const message = error instanceof Error ? error.message : '녹음을 시작할 수 없습니다';
      this.toast.error('녹음 실패', message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Called when recording stops (from RecordingBarComponent)
  showCompletedState(blob: Blob, durationMs: number) {
    this.recordedBlob.set(blob);
    this.recordedDuration.set(durationMs);
    this.audioUrl.set(URL.createObjectURL(blob));
    this.step.set('completed');
  }

  processWithAI() {
    const blob = this.recordedBlob();
    if (!blob) return;

    this.isProcessing.set(true);
    this.currentStepIndex.set(0);
    this.processingStep.set('업로드 중...');

    // Simulate progress steps (actual progress would come from backend)
    this.simulateProgress();

    this.processWithAIRequested.emit({
      audioBlob: blob,
      durationMs: this.recordedDuration(),
    });
  }

  private simulateProgress() {
    // Step 1 → 2 after 2s
    setTimeout(() => {
      if (this.isProcessing()) {
        this.currentStepIndex.set(1);
        this.processingStep.set('전사 중...');
      }
    }, 2000);

    // Step 2 → 3 after 5s
    setTimeout(() => {
      if (this.isProcessing()) {
        this.currentStepIndex.set(2);
        this.processingStep.set('요약 생성 중...');
      }
    }, 5000);
  }

  getStepClass(index: number): string {
    const current = this.currentStepIndex();
    if (index < current) {
      // Completed step
      return 'bg-cyan-500 text-white';
    } else if (index === current) {
      // Current step
      return this.theme.isDark()
        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
        : 'bg-indigo-100 text-indigo-600 border border-indigo-300';
    } else {
      // Future step
      return this.theme.isDark()
        ? 'bg-zinc-800 text-zinc-500'
        : 'bg-zinc-100 text-zinc-400';
    }
  }

  saveWithoutAI() {
    const blob = this.recordedBlob();
    if (!blob) return;

    this.saveWithoutAIRequested.emit({
      audioBlob: blob,
      durationMs: this.recordedDuration(),
    });
  }

  discardRecording() {
    this.cleanup();
    this.close.emit();
  }

  private cleanup() {
    const url = this.audioUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.audioUrl.set(null);
    this.recordedBlob.set(null);
    this.recordedDuration.set(0);
    this.recorder.reset();
  }

  onOverlayClick(event: MouseEvent) {
    // Don't close during loading/processing
    if (this.isLoading() || this.isProcessing()) return;

    // Close on overlay click if in source-select step
    if (this.step() === 'source-select') {
      this.close.emit();
    }
  }
}
