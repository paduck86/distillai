import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

const WHISPER_MAX_SIZE = 24 * 1024 * 1024; // 24MB (leave 1MB buffer for safety)

/**
 * 오디오 버퍼의 크기를 확인하고 필요시 압축합니다.
 * Whisper API는 25MB 제한이 있으므로, 큰 파일은 ffmpeg로 압축합니다.
 */
export async function compressAudioIfNeeded(
  buffer: Uint8Array,
  mimeType: string = 'audio/webm'
): Promise<{ buffer: Uint8Array; compressed: boolean }> {
  // 24MB 이하면 압축 불필요
  if (buffer.length <= WHISPER_MAX_SIZE) {
    console.log(`Audio size ${(buffer.length / 1024 / 1024).toFixed(2)}MB - no compression needed`);
    return { buffer, compressed: false };
  }

  console.log(`Audio size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds limit - compressing...`);

  const tempDir = os.tmpdir();
  const tempId = crypto.randomBytes(8).toString('hex');
  const inputExt = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp3') ? 'mp3' : 'wav';
  const inputPath = path.join(tempDir, `input_${tempId}.${inputExt}`);
  const outputPath = path.join(tempDir, `output_${tempId}.mp3`);

  try {
    // 임시 파일에 원본 저장
    await fs.writeFile(inputPath, buffer);

    // 압축 비율 계산 (목표: 22MB)
    const targetSize = 22 * 1024 * 1024;
    const compressionRatio = targetSize / buffer.length;

    // 비트레이트 계산 (원본 128kbps 가정, 최소 32kbps)
    const estimatedBitrate = Math.max(32, Math.floor(128 * compressionRatio));

    // ffmpeg 명령어: MP3로 변환, 모노, 낮은 비트레이트
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vn -ac 1 -ar 16000 -b:a ${estimatedBitrate}k -f mp3 "${outputPath}" -y`;

    console.log(`Running ffmpeg with bitrate ${estimatedBitrate}kbps...`);
    await execAsync(ffmpegCmd);

    // 압축된 파일 읽기
    const compressedBuffer = await fs.readFile(outputPath);
    console.log(`Compressed: ${(buffer.length / 1024 / 1024).toFixed(2)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // 여전히 크면 더 공격적으로 압축
    if (compressedBuffer.length > WHISPER_MAX_SIZE) {
      console.log('Still too large, applying aggressive compression...');
      const aggressiveOutputPath = path.join(tempDir, `output_aggressive_${tempId}.mp3`);
      const aggressiveCmd = `ffmpeg -i "${inputPath}" -vn -ac 1 -ar 8000 -b:a 16k -f mp3 "${aggressiveOutputPath}" -y`;
      await execAsync(aggressiveCmd);

      const aggressiveBuffer = await fs.readFile(aggressiveOutputPath);
      console.log(`Aggressive compression: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB → ${(aggressiveBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      await fs.unlink(aggressiveOutputPath).catch(() => {});
      return { buffer: aggressiveBuffer, compressed: true };
    }

    return { buffer: compressedBuffer, compressed: true };
  } finally {
    // 임시 파일 정리
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

/**
 * 시스템에 ffmpeg가 설치되어 있는지 확인
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}
