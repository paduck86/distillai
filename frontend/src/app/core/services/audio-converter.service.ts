import { Injectable, signal } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

@Injectable({
  providedIn: 'root'
})
export class AudioConverterService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  converting = signal(false);
  progress = signal(0);

  private async load(): Promise<FFmpeg> {
    if (this.ffmpeg && this.loaded) {
      return this.ffmpeg;
    }

    this.ffmpeg = new FFmpeg();

    // Load FFmpeg with progress
    this.ffmpeg.on('progress', ({ progress }) => {
      this.progress.set(Math.round(progress * 100));
    });

    // Load from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.loaded = true;
    return this.ffmpeg;
  }

  /**
   * WebM 오디오를 MP3로 변환
   */
  async convertToMp3(webmBlob: Blob): Promise<Blob> {
    this.converting.set(true);
    this.progress.set(0);

    try {
      const ffmpeg = await this.load();

      // Write input file
      const inputData = await fetchFile(webmBlob);
      await ffmpeg.writeFile('input.webm', inputData);

      // Convert to MP3
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-vn',  // No video
        '-ar', '44100',  // Sample rate
        '-ac', '2',  // Stereo
        '-b:a', '192k',  // Bitrate
        'output.mp3'
      ]);

      // Read output file
      const outputData = await ffmpeg.readFile('output.mp3');
      const mp3Blob = new Blob([outputData], { type: 'audio/mp3' });

      // Cleanup
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp3');

      return mp3Blob;
    } finally {
      this.converting.set(false);
      this.progress.set(0);
    }
  }
}
