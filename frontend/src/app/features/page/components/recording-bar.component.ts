/**
 * Recording Bar Component
 *
 * 페이지 내 녹음 중 표시되는 플로팅 컨트롤 바
 * 녹음 상태, 시간, 컨트롤 버튼 표시
 */

import { Component, inject, computed, Output, EventEmitter, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecorderService } from '../../../core/services/recorder.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-recording-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="recording-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-50
             flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-lg"
      [class]="theme.isDark()
        ? 'bg-zinc-900/95 border-zinc-700'
        : 'bg-white/95 border-zinc-200'">

      <!-- Recording Indicator -->
      <div class="flex items-center gap-2">
        <span class="relative flex h-3 w-3">
          <span
            class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
            [class]="recorderState().isPaused ? 'bg-yellow-500' : 'bg-red-500'">
          </span>
          <span
            class="relative inline-flex rounded-full h-3 w-3"
            [class]="recorderState().isPaused ? 'bg-yellow-500' : 'bg-red-500'">
          </span>
        </span>
        <span class="text-sm font-medium" [class]="recorderState().isPaused ? 'text-yellow-500' : 'text-red-500'">
          {{ recorderState().isPaused ? '일시정지' : 'REC' }}
        </span>
      </div>

      <!-- Timer -->
      <div class="font-mono text-lg font-semibold min-w-[80px]">
        {{ formattedDuration() }}
      </div>

      <!-- Waveform Placeholder -->
      <div class="hidden sm:flex items-center gap-0.5 h-6 px-2">
        @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
          <div
            class="w-1 rounded-full transition-all"
            [class]="theme.isDark() ? 'bg-cyan-400' : 'bg-indigo-500'"
            [style.height.px]="getBarHeight(i)"
            [style.animation-delay.ms]="i * 100">
          </div>
        }
      </div>

      <!-- Divider -->
      <div class="h-6 w-px" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <!-- Pause/Resume Button -->
        @if (!recorderState().isPaused) {
          <button
            (click)="onPause()"
            class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-700 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-600'"
            title="일시정지">
            <i class="pi pi-pause"></i>
          </button>
        } @else {
          <button
            (click)="onResume()"
            class="w-9 h-9 flex items-center justify-center rounded-full transition-colors bg-emerald-500 hover:bg-emerald-600 text-white"
            title="재개">
            <i class="pi pi-play"></i>
          </button>
        }

        <!-- Stop/Complete Button -->
        <button
          (click)="onStop()"
          class="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
          title="녹음 완료">
          <i class="pi pi-stop-circle"></i>
          <span class="hidden sm:inline">완료</span>
        </button>

        <!-- Add Marker Button -->
        @if (showMarkerButton()) {
          <button
            (click)="onAddMarker()"
            class="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            [class]="theme.isDark()
              ? 'hover:bg-zinc-700 text-zinc-300'
              : 'hover:bg-zinc-100 text-zinc-600'"
            title="마크 추가">
            <i class="pi pi-bookmark"></i>
          </button>
        }
      </div>

      <!-- Page Title -->
      @if (pageTitle()) {
        <div class="hidden md:flex items-center gap-2 ml-2 max-w-[200px]">
          <div class="h-6 w-px" [class]="theme.isDark() ? 'bg-zinc-700' : 'bg-zinc-200'"></div>
          <i class="pi pi-file-edit text-sm opacity-50"></i>
          <span class="text-sm truncate opacity-70">{{ pageTitle() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .recording-bar {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    /* Waveform animation */
    .recording-bar div[style*="animation-delay"] {
      animation: wave 0.8s ease-in-out infinite alternate;
    }

    @keyframes wave {
      from {
        height: 8px;
      }
      to {
        height: 20px;
      }
    }
  `]
})
export class RecordingBarComponent {
  private recorder = inject(RecorderService);
  theme = inject(ThemeService);

  // Inputs
  pageTitle = input<string>('');
  showMarkerButton = input<boolean>(true);

  // Outputs
  @Output() stop = new EventEmitter<void>();
  @Output() addMarker = new EventEmitter<number>();

  // State
  recorderState = this.recorder.state;

  formattedDuration = computed(() => {
    return this.recorder.formatDuration(this.recorderState().duration);
  });

  getBarHeight(index: number): number {
    if (this.recorderState().isPaused) {
      return 8;
    }
    // Random-ish heights for waveform effect
    const heights = [12, 20, 16, 24, 14, 22, 18, 16];
    return heights[index - 1] || 12;
  }

  onPause() {
    this.recorder.pauseRecording();
  }

  onResume() {
    this.recorder.resumeRecording();
  }

  onStop() {
    this.recorder.stopRecording();
    this.stop.emit();
  }

  onAddMarker() {
    const currentTime = this.recorderState().duration;
    this.addMarker.emit(currentTime);
  }
}
