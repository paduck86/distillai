import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest, HttpEventType } from '@angular/common/http';
import { Observable, from, switchMap, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SupabaseService } from './supabase.service';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface Folder {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  parentId: string | null;
  color: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// 소스 유형
export type SourceType = 'youtube' | 'audio' | 'video' | 'url' | 'recording' | 'pdf' | 'website' | 'text';

export interface Distillation {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  description: string | null;
  audioPath: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  fileSize: number | null;
  summaryMd: string | null;
  fullTranscript: string | null;
  status: 'pending' | 'uploading' | 'processing' | 'crystallized' | 'failed';
  errorMessage: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // 소스 유형
  sourceType: SourceType;
  sourceUrl: string | null;
  // AI 카테고리 필드
  aiSuggestedCategoryId: string | null;
  aiSuggestedTags: string[];
  aiConfidence: number | null;
  aiReasoning: string | null;
  categoryConfirmed: boolean;
}

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  color: string;
  icon: string;
  isSystem: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends Category {
  distillationCount: number;
}

export interface SmartFolder {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  type: 'all' | 'recent' | 'uncategorized' | 'processing' | 'tag';
  value?: string;
  count?: number;
}

// Legacy alias
export type Lecture = Distillation;

// Supported languages for summarization
export type SupportedLanguage = 'ko' | 'en';

export interface ChatMessage {
  id: string;
  userId: string;
  distillationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);
  private baseUrl = environment.apiUrl;

  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.supabase.getAccessToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  private request<T>(method: string, url: string, body?: unknown): Observable<T> {
    return from(this.getHeaders()).pipe(
      switchMap(headers => {
        const options = { headers };
        switch (method) {
          case 'GET':
            return this.http.get<T>(`${this.baseUrl}${url}`, options);
          case 'POST':
            return this.http.post<T>(`${this.baseUrl}${url}`, body, options);
          case 'PUT':
            return this.http.put<T>(`${this.baseUrl}${url}`, body, options);
          case 'DELETE':
            return this.http.delete<T>(`${this.baseUrl}${url}`, options);
          default:
            throw new Error(`Unknown method: ${method}`);
        }
      })
    );
  }

  // Folders
  getFolders(): Observable<ApiResponse<Folder[]>> {
    return this.request('GET', '/folders');
  }

  getFolder(id: string): Observable<ApiResponse<Folder>> {
    return this.request('GET', `/folders/${id}`);
  }

  createFolder(data: Partial<Folder>): Observable<ApiResponse<Folder>> {
    return this.request('POST', '/folders', data);
  }

  updateFolder(id: string, data: Partial<Folder>): Observable<ApiResponse<Folder>> {
    return this.request('PUT', `/folders/${id}`, data);
  }

  deleteFolder(id: string): Observable<void> {
    return this.request('DELETE', `/folders/${id}`);
  }

  // Lectures
  getLectures(params?: {
    folderId?: string;
    categoryId?: string;
    status?: string;
    sourceType?: SourceType;
    search?: string;
    page?: number;
    limit?: number;
  }): Observable<ApiResponse<Lecture[]>> {
    const queryParams = new URLSearchParams();
    if (params?.folderId) queryParams.set('folderId', params.folderId);
    if (params?.categoryId) queryParams.set('categoryId', params.categoryId);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.sourceType) queryParams.set('sourceType', params.sourceType);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const query = queryParams.toString();
    return this.request('GET', `/lectures${query ? `?${query}` : ''}`);
  }

  getLecture(id: string): Observable<ApiResponse<Lecture>> {
    return this.request('GET', `/lectures/${id}`);
  }

  createLecture(data: Partial<Lecture>): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/lectures', data);
  }

  updateLecture(id: string, data: Partial<Lecture>): Observable<ApiResponse<Lecture>> {
    return this.request('PUT', `/lectures/${id}`, data);
  }

  deleteLecture(id: string): Observable<void> {
    return this.request('DELETE', `/lectures/${id}`);
  }

  async uploadAudio(lectureId: string, file: Blob, durationSeconds?: number): Promise<ApiResponse<Lecture>> {
    const token = await this.supabase.getAccessToken();
    const formData = new FormData();
    formData.append('audio', file, 'recording.webm');
    if (durationSeconds !== undefined) {
      formData.append('durationSeconds', String(Math.round(durationSeconds)));
    }

    const response = await fetch(`${this.baseUrl}/lectures/${lectureId}/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  /**
   * Get browser language preference (ko or en)
   */
  private getBrowserLanguage(): SupportedLanguage {
    const saved = localStorage.getItem('lang');
    if (saved === 'ko' || saved === 'en') return saved;

    const browserLang = navigator.language.slice(0, 2);
    return browserLang === 'ko' ? 'ko' : 'en';
  }

  summarizeLecture(id: string, language?: SupportedLanguage): Observable<ApiResponse<Lecture>> {
    const lang = language || this.getBrowserLanguage();
    return this.request('POST', `/lectures/${id}/summarize`, { language: lang });
  }

  // Chat (Agent D)
  sendChatMessage(distillationId: string, content: string): Observable<ApiResponse<ChatMessage>> {
    return this.request('POST', '/chat', { distillationId, content });
  }

  getChatHistory(distillationId: string): Observable<ApiResponse<ChatMessage[]>> {
    return this.request('GET', `/chat/${distillationId}/history`);
  }

  clearChatHistory(distillationId: string): Observable<void> {
    return this.request('DELETE', `/chat/${distillationId}`);
  }

  // Categories
  getCategories(): Observable<ApiResponse<CategoryWithCount[]>> {
    return this.request('GET', '/categories');
  }

  getSystemCategories(): Observable<ApiResponse<Category[]>> {
    return this.request('GET', '/categories/system');
  }

  createCategory(data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.request('POST', '/categories', data);
  }

  updateCategory(id: string, data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.request('PUT', `/categories/${id}`, data);
  }

  deleteCategory(id: string): Observable<void> {
    return this.request('DELETE', `/categories/${id}`);
  }

  reorderCategories(updates: { id: string; position: number }[]): Observable<void> {
    return this.request('PUT', `/categories/reorder`, { updates });
  }

  // Category Confirmation
  confirmCategory(lectureId: string, data: { categoryId?: string; tags?: string[] }): Observable<ApiResponse<Lecture>> {
    return this.request('PUT', `/lectures/${lectureId}/confirm-category`, data);
  }

  // Uncategorized lectures
  getUncategorizedLectures(params?: { page?: number; limit?: number }): Observable<ApiResponse<Lecture[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const query = queryParams.toString();
    return this.request('GET', `/lectures/uncategorized${query ? `?${query}` : ''}`);
  }

  // Import from YouTube
  createFromYoutube(url: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/lectures/youtube', { url, categoryId });
  }

  // Import from external URL
  createFromUrl(url: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/lectures/url', { url, categoryId });
  }

  // Import from text
  createFromText(text: string, title?: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/lectures/text', { text, title, categoryId });
  }

  // Upload file with progress tracking
  uploadFile(formData: FormData, onProgress?: (progress: number) => void): Observable<ApiResponse<Lecture>> {
    const result$ = new Subject<ApiResponse<Lecture>>();

    this.supabase.getAccessToken().then(token => {
      const req = new HttpRequest('POST', `${this.baseUrl}/lectures/upload`, formData, {
        headers: new HttpHeaders({
          ...(token && { Authorization: `Bearer ${token}` })
        }),
        reportProgress: true
      });

      this.http.request(req).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const progress = (event.loaded / event.total) * 100;
            onProgress?.(progress);
          } else if (event.type === HttpEventType.Response) {
            result$.next(event.body as ApiResponse<Lecture>);
            result$.complete();
          }
        },
        error: (error) => {
          result$.error(error);
        }
      });
    }).catch(error => {
      result$.error(error);
    });

    return result$.asObservable();
  }
}
