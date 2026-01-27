/**
 * Upload Service
 *
 * 이미지 업로드 처리를 위한 서비스
 * 파일 업로드, URL 임베드, 클립보드 붙여넣기 지원
 */

import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, Subject } from 'rxjs';
import { HttpClient, HttpHeaders, HttpRequest, HttpEventType } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';

export interface ImageUploadResult {
  path: string;
  url: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  progress: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);
  private baseUrl = environment.apiUrl;

  // Upload state
  uploading = signal(false);
  uploadProgress = signal(0);
  uploadError = signal<string | null>(null);

  // Allowed image types
  private readonly allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  // Max file size (5MB)
  private readonly maxFileSize = 5 * 1024 * 1024;

  /**
   * Upload an image file
   */
  async uploadImage(
    file: File,
    distillationId: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResult> {
    // Validate file type
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error(`지원하지 않는 이미지 형식입니다: ${file.type}`);
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new Error('이미지 크기는 5MB 이하여야 합니다');
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set(null);

    try {
      const token = await this.supabase.getAccessToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('distillationId', distillationId);

      return new Promise<ImageUploadResult>((resolve, reject) => {
        const req = new HttpRequest('POST', `${this.baseUrl}/pages/upload/image`, formData, {
          headers: new HttpHeaders({
            ...(token && { Authorization: `Bearer ${token}` })
          }),
          reportProgress: true
        });

        this.http.request(req).subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              const progress = Math.round((event.loaded / event.total) * 100);
              this.uploadProgress.set(progress);
              onProgress?.(progress);
            } else if (event.type === HttpEventType.Response) {
              const response = event.body as { data: ImageUploadResult };
              this.uploading.set(false);
              resolve(response.data);
            }
          },
          error: (error) => {
            this.uploading.set(false);
            this.uploadError.set(error.message || '업로드 실패');
            reject(error);
          }
        });
      });
    } catch (error) {
      this.uploading.set(false);
      this.uploadError.set((error as Error).message);
      throw error;
    }
  }

  /**
   * Upload image from URL (proxy through backend)
   */
  async uploadFromUrl(
    url: string,
    distillationId: string
  ): Promise<ImageUploadResult> {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('유효한 URL을 입력해주세요');
    }

    // For now, we'll return the URL directly
    // In a full implementation, the backend would download and re-upload
    return {
      path: url,
      url: url,
    };
  }

  /**
   * Handle paste event and extract image
   */
  async uploadFromPaste(
    event: ClipboardEvent,
    distillationId: string
  ): Promise<ImageUploadResult | null> {
    const items = event.clipboardData?.items;
    if (!items) return null;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          return this.uploadImage(file, distillationId);
        }
      }
    }

    return null;
  }

  /**
   * Handle dropped files
   */
  async uploadFromDrop(
    event: DragEvent,
    distillationId: string
  ): Promise<ImageUploadResult | null> {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return null;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 업로드할 수 있습니다');
    }

    return this.uploadImage(file, distillationId);
  }

  /**
   * Validate if a file is an allowed image type
   */
  isValidImageFile(file: File): boolean {
    return this.allowedTypes.includes(file.type);
  }

  /**
   * Get human-readable file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Reset upload state
   */
  reset(): void {
    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.uploadError.set(null);
  }
}
