import { Component, inject, computed, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { RecorderService } from '../../core/services/recorder.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AudioConverterService } from '../../core/services/audio-converter.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

type RecordingStep = 'select-source' | 'idle' | 'recording' | 'completed' | 'uploading';
type AudioSource = 'tab' | 'screen' | 'mic';

@Component({
  selector: 'app-record',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule, ProgressSpinnerModule],
  template: `
    <div class="min-h-screen bg-surface flex flex-col">
      <!-- Header -->
      <header class="border-b border-zinc-800 px-6 py-4">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <button
            (click)="goBack()"
            class="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <i class="pi pi-arrow-left"></i>
            <span>돌아가기</span>
          </button>
          <h1 class="font-display text-xl font-semibold text-white">새 녹음</h1>
          <div class="w-24"></div>
        </div>
      </header>

      <!-- Main Content (click background to go back on select-source step) -->
      <main
        class="flex-1 flex items-center justify-center p-6"
        (click)="onBackgroundClick($event)">
        <div class="w-full max-w-2xl" (click)="$event.stopPropagation()">

          <!-- Source Selection State -->
          @if (step() === 'select-source') {
            <div class="text-center space-y-8">
              <!-- Title -->
              <div class="space-y-3">
                <h2 class="font-display text-3xl font-bold text-white">녹음 소스 선택</h2>
                <p class="text-zinc-400">어떤 오디오를 녹음할까요?</p>
              </div>

              <!-- Source Cards -->
              <div class="grid gap-4 max-w-lg mx-auto">
                <!-- Tab Audio -->
                <button
                  (click)="selectSource('tab')"
                  class="w-full p-5 rounded-xl border-2 transition-all text-left
                         {{ selectedSource() === 'tab'
                            ? 'border-primary bg-primary/10'
                            : 'border-zinc-700 bg-surface-elevated hover:border-zinc-500' }}">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i class="pi pi-window-maximize text-xl text-primary"></i>
                    </div>
                    <div class="flex-1">
                      <h3 class="font-semibold text-white mb-1">브라우저 탭 오디오</h3>
                      <p class="text-sm text-zinc-400">
                        특정 탭에서 재생 중인 영상/강의의 오디오만 녹음합니다.
                        다른 소리는 녹음되지 않습니다.
                      </p>
                    </div>
                    @if (selectedSource() === 'tab') {
                      <i class="pi pi-check-circle text-primary text-xl"></i>
                    }
                  </div>
                </button>

                <!-- Screen/System Audio -->
                <button
                  (click)="selectSource('screen')"
                  class="w-full p-5 rounded-xl border-2 transition-all text-left
                         {{ selectedSource() === 'screen'
                            ? 'border-primary bg-primary/10'
                            : 'border-zinc-700 bg-surface-elevated hover:border-zinc-500' }}">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <i class="pi pi-desktop text-xl text-accent"></i>
                    </div>
                    <div class="flex-1">
                      <h3 class="font-semibold text-white mb-1">시스템 오디오</h3>
                      <p class="text-sm text-zinc-400">
                        컴퓨터에서 나오는 모든 소리를 녹음합니다.
                        화면 선택 후 오디오만 캡처됩니다.
                      </p>
                    </div>
                    @if (selectedSource() === 'screen') {
                      <i class="pi pi-check-circle text-primary text-xl"></i>
                    }
                  </div>
                </button>

                <!-- Microphone -->
                <button
                  (click)="selectSource('mic')"
                  class="w-full p-5 rounded-xl border-2 transition-all text-left
                         {{ selectedSource() === 'mic'
                            ? 'border-primary bg-primary/10'
                            : 'border-zinc-700 bg-surface-elevated hover:border-zinc-500' }}">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <i class="pi pi-microphone text-xl text-orange-500"></i>
                    </div>
                    <div class="flex-1">
                      <h3 class="font-semibold text-white mb-1">마이크</h3>
                      <p class="text-sm text-zinc-400">
                        마이크로 직접 녹음합니다.
                        오프라인 강의나 회의 녹음에 적합합니다.
                      </p>
                    </div>
                    @if (selectedSource() === 'mic') {
                      <i class="pi pi-check-circle text-primary text-xl"></i>
                    }
                  </div>
                </button>
              </div>

              <!-- Continue Button -->
              <button
                (click)="confirmSource()"
                [disabled]="!selectedSource()"
                class="btn-primary text-lg px-8 py-4 rounded-xl flex items-center gap-3 mx-auto
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:scale-105 transition-transform duration-200">
                <span>다음</span>
                <i class="pi pi-arrow-right"></i>
              </button>
            </div>
          }

          <!-- Idle State (Ready to Record) -->
          @if (step() === 'idle') {
            <div class="text-center space-y-8">
              <!-- Icon -->
              <div class="relative inline-block">
                <div class="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20
                            flex items-center justify-center border border-zinc-700">
                  @switch (selectedSource()) {
                    @case ('tab') {
                      <i class="pi pi-window-maximize text-5xl text-primary"></i>
                    }
                    @case ('screen') {
                      <i class="pi pi-desktop text-5xl text-accent"></i>
                    }
                    @case ('mic') {
                      <i class="pi pi-microphone text-5xl text-orange-500"></i>
                    }
                  }
                </div>
                <div class="absolute -inset-4 rounded-full border border-primary/30 animate-pulse"></div>
              </div>

              <!-- Title -->
              <div class="space-y-3">
                <h2 class="font-display text-3xl font-bold text-white">녹음 준비 완료</h2>
                <p class="text-zinc-400 max-w-md mx-auto">
                  @switch (selectedSource()) {
                    @case ('tab') {
                      녹음 시작 후 오디오를 캡처할 탭을 선택하세요.
                    }
                    @case ('screen') {
                      녹음 시작 후 "전체 화면" 또는 "창"을 선택하고 오디오 공유를 활성화하세요.
                    }
                    @case ('mic') {
                      마이크 권한을 허용하면 바로 녹음이 시작됩니다.
                    }
                  }
                </p>
              </div>

              <!-- Start Button -->
              <button
                (click)="startRecording()"
                [disabled]="isLoading()"
                class="btn-primary text-lg px-8 py-4 rounded-xl flex items-center gap-3 mx-auto
                       hover:scale-105 transition-transform duration-200">
                @if (isLoading()) {
                  <i class="pi pi-spin pi-spinner"></i>
                } @else {
                  <i class="pi pi-play-circle"></i>
                }
                <span>녹음 시작</span>
              </button>

              <!-- Change Source -->
              <button
                (click)="changeSource()"
                class="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-2 mx-auto">
                <i class="pi pi-arrow-left"></i>
                <span>소스 변경</span>
              </button>

              <!-- Tips -->
              <div class="bg-surface-elevated rounded-xl p-4 text-left border border-zinc-700 max-w-md mx-auto">
                <h3 class="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                  <i class="pi pi-info-circle text-primary"></i>
                  녹음 팁
                </h3>
                <ul class="text-sm text-zinc-400 space-y-1">
                  @switch (selectedSource()) {
                    @case ('tab') {
                      <li>• 강의 영상이 재생 중인 탭을 선택하세요</li>
                      <li>• "탭 오디오도 공유" 옵션을 체크하세요</li>
                      <li>• 녹음 중에도 다른 작업을 할 수 있습니다</li>
                    }
                    @case ('screen') {
                      <li>• 전체 화면을 선택하면 모든 소리가 녹음됩니다</li>
                      <li>• macOS에서는 시스템 오디오 캡처가 제한될 수 있습니다</li>
                      <li>• 알림음 등 모든 소리가 포함됩니다</li>
                    }
                    @case ('mic') {
                      <li>• 조용한 환경에서 녹음하세요</li>
                      <li>• 마이크에 가까이 말씀하세요</li>
                      <li>• 외장 마이크 사용 시 더 좋은 품질을 얻을 수 있습니다</li>
                    }
                  }
                </ul>
              </div>
            </div>
          }

          <!-- Recording State -->
          @if (step() === 'recording') {
            <div class="text-center space-y-8">
              <!-- Animated Recording Icon -->
              <div class="relative inline-block">
                <div class="w-40 h-40 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20
                            flex items-center justify-center border-2 border-red-500/50">
                  <div class="w-6 h-6 rounded-full bg-red-500 animate-pulse"></div>
                </div>
                <div class="absolute -inset-2 rounded-full border border-red-500/30 animate-ping"></div>
              </div>

              <!-- Timer -->
              <div class="space-y-2">
                <p class="text-sm text-red-400 font-medium flex items-center justify-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  녹음 중
                </p>
                <p class="font-mono text-5xl font-bold text-white tracking-wider">
                  {{ formattedDuration() }}
                </p>
              </div>

              <!-- Controls -->
              <div class="flex items-center justify-center gap-4">
                @if (!recorderState().isPaused) {
                  <button
                    (click)="pauseRecording()"
                    class="btn-secondary flex items-center gap-2 px-6 py-3">
                    <i class="pi pi-pause"></i>
                    <span>일시정지</span>
                  </button>
                } @else {
                  <button
                    (click)="resumeRecording()"
                    class="btn-accent flex items-center gap-2 px-6 py-3">
                    <i class="pi pi-play"></i>
                    <span>재개</span>
                  </button>
                }

                <button
                  (click)="stopRecording()"
                  class="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg
                         font-medium transition-colors flex items-center gap-2">
                  <i class="pi pi-stop-circle"></i>
                  <span>녹음 완료</span>
                </button>
              </div>

              <!-- Recording Info -->
              <p class="text-sm text-zinc-500">
                녹음이 완료되면 AI가 노트를 작성합니다
              </p>
            </div>
          }

          <!-- Completed State -->
          @if (step() === 'completed') {
            <div class="text-center space-y-8">
              <!-- Success Icon -->
              <div class="relative inline-block">
                <div class="w-32 h-32 rounded-full bg-gradient-to-br from-accent/20 to-green-500/20
                            flex items-center justify-center border border-accent">
                  <i class="pi pi-check-circle text-5xl text-accent"></i>
                </div>
              </div>

              <!-- Title -->
              <div class="space-y-3">
                <h2 class="font-display text-3xl font-bold text-white">녹음 완료!</h2>
                <p class="text-zinc-400">
                  총 {{ formattedDuration() }} 분량이 녹음되었습니다
                </p>
              </div>

              <!-- Audio Preview -->
              @if (audioUrl()) {
                <div class="bg-surface-elevated rounded-xl p-6 border border-zinc-700 max-w-md mx-auto">
                  <audio [src]="audioUrl()" controls class="w-full"></audio>
                </div>
              }

              <!-- Actions -->
              <div class="flex items-center justify-center gap-4">
                <button
                  (click)="downloadAudio()"
                  [disabled]="audioConverter.converting()"
                  class="btn-secondary flex items-center gap-2 px-6 py-3">
                  @if (audioConverter.converting()) {
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>MP3 변환 중... {{ audioConverter.progress() }}%</span>
                  } @else {
                    <i class="pi pi-download"></i>
                    <span>MP3 다운로드</span>
                  }
                </button>

                <button
                  (click)="startDistillation()"
                  [disabled]="uploading()"
                  class="btn-primary flex items-center gap-2 px-6 py-3">
                  @if (uploading()) {
                    <i class="pi pi-spin pi-spinner"></i>
                    <span>업로드 중...</span>
                  } @else {
                    <i class="pi pi-bolt"></i>
                    <span>AI 노트 생성</span>
                  }
                </button>
              </div>

              <!-- New Recording -->
              <button
                (click)="resetRecording()"
                class="text-zinc-400 hover:text-white transition-colors text-sm flex items-center gap-2 mx-auto">
                <i class="pi pi-refresh"></i>
                <span>새 녹음 시작</span>
              </button>
            </div>
          }

          <!-- Uploading State -->
          @if (step() === 'uploading') {
            <div class="text-center space-y-8">
              <!-- Uploading Icon -->
              <div class="relative inline-block">
                <div class="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20
                            flex items-center justify-center border border-primary">
                  <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
                </div>
              </div>

              <!-- Title -->
              <div class="space-y-3">
                <h2 class="font-display text-3xl font-bold text-white">
                  @if (uploadProgress() < 100) {
                    업로드 중...
                  } @else {
                    AI 분석 중...
                  }
                </h2>
                <p class="text-zinc-400">
                  @if (uploadProgress() < 100) {
                    오디오 파일을 서버에 업로드하고 있습니다
                  } @else {
                    Gemini AI가 노트를 작성하고 있습니다
                  }
                </p>
              </div>

              <!-- Progress -->
              <div class="max-w-md mx-auto">
                <div class="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary transition-all duration-300"
                    [style.width.%]="uploadProgress()">
                  </div>
                </div>
                <p class="text-sm text-zinc-500 mt-2">{{ uploadProgress() }}%</p>
              </div>
            </div>
          }

        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class RecordComponent implements OnDestroy {
  private recorder = inject(RecorderService);
  private router = inject(Router);
  private api = inject(ApiService);
  private titleService = inject(Title);
  private toast = inject(ToastService);
  audioConverter = inject(AudioConverterService);

  private originalTitle = 'Distillai';

  recorderState = this.recorder.state;
  isLoading = signal(false);
  uploading = signal(false);
  uploadProgress = signal(0);
  selectedSource = signal<AudioSource | null>(null);
  sourceConfirmed = signal(false);

  // Update browser tab title when recording
  private titleEffect = effect(() => {
    const state = this.recorderState();
    if (state.isRecording) {
      const duration = this.recorder.formatDuration(state.duration);
      const indicator = state.isPaused ? '⏸️' : '🔴';
      this.titleService.setTitle(`${indicator} ${duration} - 녹음 중`);
    } else {
      this.titleService.setTitle(this.originalTitle);
    }
  });

  ngOnDestroy() {
    // Restore original title when leaving
    this.titleService.setTitle(this.originalTitle);
  }

  step = computed<RecordingStep>(() => {
    if (this.uploading()) return 'uploading';
    const state = this.recorderState();
    if (state.audioBlob) return 'completed';
    if (state.isRecording) return 'recording';
    if (!this.sourceConfirmed()) return 'select-source';
    return 'idle';
  });

  formattedDuration = computed(() => {
    return this.recorder.formatDuration(this.recorderState().duration);
  });

  audioUrl = computed(() => {
    const blob = this.recorderState().audioBlob;
    return blob ? URL.createObjectURL(blob) : null;
  });

  selectSource(source: AudioSource) {
    this.selectedSource.set(source);
  }

  async confirmSource() {
    const source = this.selectedSource();
    if (!source) return;

    // 시스템 오디오 선택 시 바로 녹음 시작
    if (source === 'screen') {
      await this.startRecording();
    } else {
      this.sourceConfirmed.set(true);
    }
  }

  changeSource() {
    this.sourceConfirmed.set(false);
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
    } catch (error) {
      console.error('Failed to start recording:', error);
      const message = error instanceof Error ? error.message : '녹음을 시작할 수 없습니다';
      this.toast.error('녹음 실패', message);
    } finally {
      this.isLoading.set(false);
    }
  }

  pauseRecording() {
    this.recorder.pauseRecording();
  }

  resumeRecording() {
    this.recorder.resumeRecording();
  }

  stopRecording() {
    this.recorder.stopRecording();
  }

  async downloadAudio() {
    const blob = this.recorderState().audioBlob;
    if (!blob) return;

    try {
      // WebM을 MP3로 변환
      const mp3Blob = await this.audioConverter.convertToMp3(blob);

      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `distillai-recording-${new Date().toISOString().slice(0, 10)}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('MP3 conversion failed:', error);
      this.toast.error('변환 실패', 'MP3 변환 중 오류가 발생했습니다');
    }
  }

  async startDistillation() {
    const blob = this.recorderState().audioBlob;
    if (!blob) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);

    try {
      // 1. Create distillation record
      this.uploadProgress.set(10);
      const createResponse = await new Promise<any>((resolve, reject) => {
        this.api.createLecture({
          title: `녹음 ${new Date().toLocaleDateString('ko-KR')}`,
        }).subscribe({
          next: resolve,
          error: reject
        });
      });

      const distillationId = createResponse.data.id;
      this.uploadProgress.set(30);

      // 2. Upload audio file
      await this.api.uploadAudio(distillationId, blob);
      this.uploadProgress.set(60);

      // 3. Start AI summarization
      await new Promise<any>((resolve, reject) => {
        this.api.summarizeLecture(distillationId).subscribe({
          next: resolve,
          error: reject
        });
      });
      this.uploadProgress.set(100);

      // 4. Navigate to the distillation page
      this.recorder.reset();
      this.router.navigate(['/lecture', distillationId]);

    } catch (error) {
      console.error('Failed to process recording:', error);
      this.uploading.set(false);
      this.toast.error('업로드 실패', '녹음 파일을 처리하는 중 오류가 발생했습니다');
    }
  }

  resetRecording() {
    this.recorder.reset();
    this.uploading.set(false);
    this.sourceConfirmed.set(false);
    this.selectedSource.set(null);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  onBackgroundClick(event: MouseEvent) {
    // Only navigate back on background click during select-source step
    if (this.step() === 'select-source') {
      this.goBack();
    }
  }
}
