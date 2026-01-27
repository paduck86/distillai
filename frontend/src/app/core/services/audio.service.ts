/**
 * Audio Service
 *
 * 오디오 재생 상태 관리 및 제어
 * 타임스탬프 블록과 오디오 플레이어 연동
 */

import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  // 오디오 엘리먼트 참조
  private audioElement: HTMLAudioElement | null = null;

  // 상태 시그널
  private _currentTime = signal(0);
  private _duration = signal(0);
  private _isPlaying = signal(false);
  private _playbackRate = signal(1);
  private _isLoaded = signal(false);
  private _audioUrl = signal<string | null>(null);

  // 읽기 전용 시그널
  currentTime = this._currentTime.asReadonly();
  duration = this._duration.asReadonly();
  isPlaying = this._isPlaying.asReadonly();
  playbackRate = this._playbackRate.asReadonly();
  isLoaded = this._isLoaded.asReadonly();
  audioUrl = this._audioUrl.asReadonly();

  // 계산된 값
  progress = computed(() => {
    const duration = this._duration();
    if (duration <= 0) return 0;
    return (this._currentTime() / duration) * 100;
  });

  formattedCurrentTime = computed(() => this.formatTime(this._currentTime()));
  formattedDuration = computed(() => this.formatTime(this._duration()));

  /**
   * 오디오 엘리먼트 등록
   */
  registerAudioElement(audio: HTMLAudioElement): void {
    this.audioElement = audio;
    this.setupEventListeners();
  }

  /**
   * 오디오 엘리먼트 해제
   */
  unregisterAudioElement(): void {
    if (this.audioElement) {
      this.removeEventListeners();
      this.audioElement = null;
    }
    this.reset();
  }

  /**
   * 오디오 URL 설정
   */
  setAudioUrl(url: string | null): void {
    this._audioUrl.set(url);
    if (!url) {
      this.reset();
    }
  }

  /**
   * 재생/일시정지 토글
   */
  togglePlay(): void {
    if (!this.audioElement) return;

    if (this._isPlaying()) {
      this.audioElement.pause();
    } else {
      this.audioElement.play().catch(err => console.error('Failed to play:', err));
    }
  }

  /**
   * 재생
   */
  play(): void {
    if (!this.audioElement) return;
    this.audioElement.play().catch(err => console.error('Failed to play:', err));
  }

  /**
   * 일시정지
   */
  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
  }

  /**
   * 특정 시간으로 이동
   */
  seekTo(seconds: number): void {
    if (!this.audioElement || !this._isLoaded()) return;

    const duration = this._duration();
    if (duration <= 0) return;

    const clampedSeconds = Math.max(0, Math.min(seconds, duration));
    this.audioElement.currentTime = clampedSeconds;
    this._currentTime.set(clampedSeconds);
  }

  /**
   * 타임스탬프 문자열로 이동 (HH:MM:SS 또는 MM:SS 형식)
   */
  seekToTimestamp(timestamp: string): void {
    const seconds = this.parseTimestamp(timestamp);
    if (seconds >= 0) {
      this.seekTo(seconds);
      this.play();
    }
  }

  /**
   * 진행률(%)로 이동
   */
  seekToProgress(progress: number): void {
    const duration = this._duration();
    if (duration <= 0) return;

    const clampedProgress = Math.max(0, Math.min(progress, 100));
    const seconds = (clampedProgress / 100) * duration;
    this.seekTo(seconds);
  }

  /**
   * 재생 속도 설정
   */
  setPlaybackRate(rate: number): void {
    if (!this.audioElement) return;

    const clampedRate = Math.max(0.25, Math.min(rate, 4));
    this.audioElement.playbackRate = clampedRate;
    this._playbackRate.set(clampedRate);
  }

  /**
   * 앞으로 건너뛰기
   */
  skipForward(seconds: number = 10): void {
    this.seekTo(this._currentTime() + seconds);
  }

  /**
   * 뒤로 건너뛰기
   */
  skipBackward(seconds: number = 10): void {
    this.seekTo(this._currentTime() - seconds);
  }

  /**
   * 타임스탬프 문자열 파싱 (HH:MM:SS 또는 MM:SS)
   */
  parseTimestamp(timestamp: string): number {
    if (!timestamp) return -1;

    // 대괄호 제거 [00:15:30] -> 00:15:30
    const cleaned = timestamp.replace(/[\[\]]/g, '').trim();
    const parts = cleaned.split(':').map(p => parseInt(p, 10));

    if (parts.some(isNaN)) return -1;

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    }

    return -1;
  }

  /**
   * 초를 타임스탬프 문자열로 변환
   */
  formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '00:00';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 현재 시간을 타임스탬프 문자열로 반환
   */
  getCurrentTimestamp(): string {
    return this.formatTime(this._currentTime());
  }

  /**
   * 상태 리셋
   */
  private reset(): void {
    this._currentTime.set(0);
    this._duration.set(0);
    this._isPlaying.set(false);
    this._playbackRate.set(1);
    this._isLoaded.set(false);
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audioElement.addEventListener('timeupdate', this.onTimeUpdate);
    this.audioElement.addEventListener('play', this.onPlay);
    this.audioElement.addEventListener('pause', this.onPause);
    this.audioElement.addEventListener('ended', this.onEnded);
    this.audioElement.addEventListener('error', this.onError);
  }

  /**
   * 이벤트 리스너 제거
   */
  private removeEventListeners(): void {
    if (!this.audioElement) return;

    this.audioElement.removeEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audioElement.removeEventListener('timeupdate', this.onTimeUpdate);
    this.audioElement.removeEventListener('play', this.onPlay);
    this.audioElement.removeEventListener('pause', this.onPause);
    this.audioElement.removeEventListener('ended', this.onEnded);
    this.audioElement.removeEventListener('error', this.onError);
  }

  // 이벤트 핸들러 (화살표 함수로 this 바인딩 유지)
  private onLoadedMetadata = (): void => {
    if (!this.audioElement) return;
    const duration = this.audioElement.duration;
    if (isFinite(duration) && duration > 0) {
      this._duration.set(duration);
      this._isLoaded.set(true);
    }
  };

  private onTimeUpdate = (): void => {
    if (!this.audioElement) return;
    this._currentTime.set(this.audioElement.currentTime);
  };

  private onPlay = (): void => {
    this._isPlaying.set(true);
  };

  private onPause = (): void => {
    this._isPlaying.set(false);
  };

  private onEnded = (): void => {
    this._isPlaying.set(false);
    this._currentTime.set(0);
  };

  private onError = (event: Event): void => {
    console.error('Audio error:', event);
    this._isLoaded.set(false);
  };
}
