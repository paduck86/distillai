import { Injectable, signal } from '@angular/core';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
}

@Injectable({
  providedIn: 'root'
})
export class RecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;
  private pausedDuration = 0;
  private durationInterval: ReturnType<typeof setInterval> | null = null;

  // Signals for reactive state
  private _state = signal<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null
  });

  state = this._state.asReadonly();

  async startRecording(captureTab = true): Promise<void> {
    try {
      // Get audio stream
      if (captureTab) {
        // Capture tab audio (requires user to select a tab)
        // Note: getDisplayMedia requires video, we'll discard it and only use audio
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: { width: 1, height: 1 } // Minimal video to satisfy API requirement
        });

        // Stop video tracks immediately (we only need audio)
        displayStream.getVideoTracks().forEach(track => track.stop());

        // Create new stream with only audio tracks
        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length === 0) {
          throw new Error('탭 오디오를 공유해주세요. 탭 선택 시 "탭 오디오 공유" 체크박스를 확인하세요.');
        }

        this.stream = new MediaStream(audioTracks);
      } else {
        // Capture microphone
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      }

      // Verify we have audio tracks
      if (this.stream.getAudioTracks().length === 0) {
        throw new Error('오디오 트랙을 찾을 수 없습니다.');
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle stop
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this._state.update(s => ({
          ...s,
          isRecording: false,
          isPaused: false,
          audioBlob
        }));
        this.stopDurationTimer();
        this.cleanupStream();
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second

      // Start duration timer
      this.startDurationTimer();

      this._state.update(s => ({
        ...s,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null
      }));

    } catch (error) {
      console.error('녹음 시작 실패:', error);
      this.cleanupStream();

      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('녹음 권한이 거부되었습니다. 탭을 선택하고 오디오 공유를 허용해주세요.');
        }
        if (error.name === 'NotSupportedError') {
          throw new Error('이 브라우저는 탭 오디오 캡처를 지원하지 않습니다. Chrome 브라우저를 사용해주세요.');
        }
      }
      throw error;
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedDuration += Date.now() - this.startTime;
      this._state.update(s => ({ ...s, isPaused: true }));
      this.stopDurationTimer();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
      this.startTime = Date.now();
      this._state.update(s => ({ ...s, isPaused: false }));
      this.startDurationTimer();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // Screen/System audio recording - captures entire screen with system audio
  async startScreenRecording(): Promise<void> {
    try {
      // Request screen share with system audio
      // On Windows: systemAudio allows capturing all system sounds
      // On macOS: limited to the selected window/screen audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          // @ts-ignore - systemAudio is a newer Chrome feature
          systemAudio: 'include',
        },
        video: true, // Required for screen share
      });

      // Stop video tracks (we only want audio)
      displayStream.getVideoTracks().forEach(track => track.stop());

      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('시스템 오디오를 캡처할 수 없습니다. "오디오 공유" 옵션을 확인해주세요.');
      }

      this.stream = new MediaStream(audioTracks);
      await this.initializeRecorder();

    } catch (error) {
      console.error('시스템 오디오 녹음 시작 실패:', error);
      this.cleanupStream();

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('화면 공유가 취소되었습니다.');
        }
      }
      throw error;
    }
  }

  // Common recorder initialization
  private async initializeRecorder(): Promise<void> {
    if (!this.stream || this.stream.getAudioTracks().length === 0) {
      throw new Error('오디오 트랙을 찾을 수 없습니다.');
    }

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.audioChunks = [];
    this.startTime = Date.now();
    this.pausedDuration = 0;

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this._state.update(s => ({
        ...s,
        isRecording: false,
        isPaused: false,
        audioBlob
      }));
      this.stopDurationTimer();
      this.cleanupStream();
    };

    this.mediaRecorder.start(1000);
    this.startDurationTimer();

    this._state.update(s => ({
      ...s,
      isRecording: true,
      isPaused: false,
      duration: 0,
      audioBlob: null
    }));
  }

  getAudioBlob(): Blob | null {
    return this._state().audioBlob;
  }

  reset(): void {
    this.stopRecording();
    this.cleanupStream();
    this._state.set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null
    });
  }

  private startDurationTimer(): void {
    this.durationInterval = setInterval(() => {
      const currentDuration = Date.now() - this.startTime + this.pausedDuration;
      this._state.update(s => ({
        ...s,
        duration: Math.floor(currentDuration / 1000)
      }));
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private cleanupStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
