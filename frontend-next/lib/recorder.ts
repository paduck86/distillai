'use client';

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private intervalId: NodeJS.Timeout | null = null;

  private onStateChange: (state: Partial<RecordingState>) => void;

  constructor(onStateChange: (state: Partial<RecordingState>) => void) {
    this.onStateChange = onStateChange;
  }

  async startRecording(captureTab: boolean = false): Promise<void> {
    try {
      if (captureTab) {
        // Capture browser tab audio
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: false,
        });
      } else {
        // Capture microphone
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
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
        const audioUrl = URL.createObjectURL(audioBlob);
        this.onStateChange({
          isRecording: false,
          isPaused: false,
          audioUrl,
          audioBlob,
        });
      };

      this.mediaRecorder.start(1000); // Collect data every second

      // Update duration every second
      this.intervalId = setInterval(() => {
        const elapsed = Date.now() - this.startTime - this.pausedDuration;
        this.onStateChange({ duration: Math.floor(elapsed / 1000) });
      }, 1000);

      this.onStateChange({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioUrl: null,
        audioBlob: null,
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedDuration = Date.now();
      this.onStateChange({ isPaused: true });
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.pausedDuration = Date.now() - this.pausedDuration;
      this.mediaRecorder.resume();
      this.onStateChange({ isPaused: false });
    }
  }

  stopRecording(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
