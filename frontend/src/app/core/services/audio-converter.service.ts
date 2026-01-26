import { Injectable, signal } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

@Injectable({
  providedIn: 'root'
})
export class AudioConverterService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loadingPromise: Promise<FFmpeg> | null = null;

  converting = signal(false);
  progress = signal(0);
  error = signal<string | null>(null);

  private async load(): Promise<FFmpeg> {
    if (this.ffmpeg && this.loaded) {
      return this.ffmpeg;
    }

    // 이미 로딩 중이면 기존 Promise 반환
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.doLoad();
    return this.loadingPromise;
  }

  private async doLoad(): Promise<FFmpeg> {
    try {
      console.log('[FFmpeg] Starting to load...');
      this.ffmpeg = new FFmpeg();

      // 로그 이벤트 리스너
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
      });

      // 진행률 이벤트 리스너
      this.ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        console.log('[FFmpeg Progress]', percent, '%');
        this.progress.set(percent);
      });

      // 단일 스레드 버전 사용 (SharedArrayBuffer 불필요)
      const baseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';
      console.log('[FFmpeg] Loading from:', baseURL);

      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      console.log('[FFmpeg] URLs loaded, initializing FFmpeg...');
      await this.ffmpeg.load({
        coreURL,
        wasmURL,
      });

      this.loaded = true;
      console.log('[FFmpeg] Successfully loaded!');
      return this.ffmpeg;
    } catch (error) {
      console.error('[FFmpeg] Failed to load:', error);
      this.loadingPromise = null;
      throw error;
    }
  }

  /**
   * WebM 오디오를 MP3로 변환
   */
  async convertToMp3(webmBlob: Blob): Promise<Blob> {
    this.converting.set(true);
    this.progress.set(0);
    this.error.set(null);

    try {
      console.log('[FFmpeg] Starting conversion, blob size:', webmBlob.size);

      const ffmpeg = await this.load();

      // Write input file
      console.log('[FFmpeg] Writing input file...');
      const inputData = await fetchFile(webmBlob);
      await ffmpeg.writeFile('input.webm', inputData);

      // Convert to MP3
      console.log('[FFmpeg] Starting MP3 conversion...');
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vn',  // No video
        '-ar', '44100',  // Sample rate
        '-ac', '2',  // Stereo
        '-b:a', '128k',  // Bitrate (128k for faster conversion)
        'output.mp3'
      ]);

      // Read output file
      console.log('[FFmpeg] Reading output file...');
      const outputData = await ffmpeg.readFile('output.mp3');
      const mp3Blob = new Blob([outputData], { type: 'audio/mp3' });
      console.log('[FFmpeg] Conversion complete, MP3 size:', mp3Blob.size);

      // Cleanup
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp3');

      return mp3Blob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FFmpeg] Conversion failed:', errorMessage);
      this.error.set(errorMessage);
      throw error;
    } finally {
      this.converting.set(false);
    }
  }
}
