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
export type SourceType = 'youtube' | 'audio' | 'video' | 'url' | 'recording' | 'pdf' | 'website' | 'text' | 'note' | 'x_thread' | 'clipboard';

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
  // 사용자 노트
  userNotes: string | null;
  // X (Twitter) 관련 필드
  xAuthorHandle: string | null;
  xAuthorName: string | null;
  xTweetId: string | null;
  xMediaUrls: string[];
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
  type: 'all' | 'recent' | 'uncategorized' | 'processing' | 'tag' | 'favorites';
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

// Block types for Notion-style editor
export type BlockType =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'todo' | 'toggle'
  | 'quote' | 'callout' | 'divider' | 'code'
  | 'timestamp' | 'ai_summary' | 'embed'
  | 'image' | 'video' | 'audio' | 'file' | 'bookmark' | 'page' | 'table';

export type BlockColor =
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow'
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export interface BlockProperties {
  level?: 1 | 2 | 3;
  checked?: boolean;
  collapsed?: boolean;
  icon?: string;
  color?: BlockColor;
  language?: string;
  timestamp?: string;
  aiGenerated?: boolean;
  embedUrl?: string;
  embedType?: 'youtube' | 'image' | 'link';
  // Image properties
  imageUrl?: string;
  imageCaption?: string;
  imageWidth?: 'small' | 'medium' | 'large' | 'full';
  imageAlign?: 'left' | 'center' | 'right';
  // Table properties
  tableData?: string[][];
  tableHeaders?: boolean;
  tableColumnWidths?: number[];
  // Inline formatting
  highlight?: string;
}

export interface Block {
  id: string;
  distillationId: string;
  parentId: string | null;
  type: BlockType;
  content: string;
  properties: BlockProperties;
  position: number;
  createdAt: string;
  updatedAt: string;
  children?: Block[];
}

export interface CreateBlockInput {
  distillationId: string;
  parentId?: string;
  type: BlockType;
  content: string;
  properties?: BlockProperties;
  position?: number;
}

export interface UpdateBlockInput {
  type?: BlockType;
  content?: string;
  properties?: BlockProperties;
  position?: number;
  parentId?: string | null;
}

// ============================================
// Page Hierarchy Types
// ============================================

export interface PageTreeNode {
  id: string;
  parentId: string | null;
  title: string;
  pageIcon: string | null;
  isFolder: boolean;
  collapsed: boolean;
  position: number;
  status: 'pending' | 'uploading' | 'processing' | 'crystallized' | 'failed';
  sourceType: SourceType;
  audioUrl: string | null;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  depth: number;
  children: PageTreeNode[];
}

export interface CreatePage {
  title?: string;
  parentId?: string;
  isFolder?: boolean;
  pageIcon?: string;
  sourceType?: SourceType;
}

export interface MovePage {
  parentId: string | null;
  position: number;
}

export interface UpdatePage {
  title?: string;
  parentId?: string | null;
  pageIcon?: string | null;
  pageCover?: string | null;
  isFolder?: boolean;
  position?: number;
}

export interface DistillationWithHierarchy extends Distillation {
  parentId: string | null;
  position: number;
  isFolder: boolean;
  collapsed: boolean;
  pageIcon: string | null;
  pageCover: string | null;
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

    // Debug: log token status
    if (!token) {
      console.warn('[API] No access token available - user may not be logged in');
    }

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
    return this.request('GET', `/pages${query ? `?${query}` : ''}`);
  }

  getLecture(id: string): Observable<ApiResponse<Lecture>> {
    return this.request('GET', `/pages/${id}`);
  }

  createLecture(data: Partial<Lecture>): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages', data);
  }

  updateLecture(id: string, data: Partial<Lecture>): Observable<ApiResponse<Lecture>> {
    return this.request('PUT', `/pages/${id}`, data);
  }

  deleteLecture(id: string): Observable<void> {
    return this.request('DELETE', `/pages/${id}`);
  }

  async uploadAudio(lectureId: string, file: Blob, durationSeconds?: number): Promise<ApiResponse<Lecture>> {
    const token = await this.supabase.getAccessToken();
    const formData = new FormData();
    formData.append('audio', file, 'recording.webm');
    if (durationSeconds !== undefined) {
      formData.append('durationSeconds', String(Math.round(durationSeconds)));
    }

    const response = await fetch(`${this.baseUrl}/pages/${lectureId}/upload`, {
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
    return this.request('POST', `/pages/${id}/summarize`, { language: lang });
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
    return this.request('PUT', `/pages/${lectureId}/confirm-category`, data);
  }

  // Uncategorized lectures
  getUncategorizedLectures(params?: { page?: number; limit?: number }): Observable<ApiResponse<Lecture[]>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const query = queryParams.toString();
    return this.request('GET', `/pages/uncategorized${query ? `?${query}` : ''}`);
  }

  // Import from YouTube
  createFromYoutube(url: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/youtube', { url, categoryId });
  }

  // Import from external URL
  createFromUrl(url: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/url', { url, categoryId });
  }

  // Import from text
  createFromText(text: string, title?: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/text', { text, title, categoryId });
  }

  // Create blank note
  createNote(title: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/note', { title, categoryId });
  }

  // Create from clipboard content
  createFromClipboard(text: string, title?: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/clipboard', { text, title, categoryId });
  }

  // Create from X (Twitter) URL
  createFromX(url: string, categoryId?: string): Observable<ApiResponse<Lecture>> {
    return this.request('POST', '/pages/x', { url, categoryId });
  }

  // ============================================
  // Blocks (Notion-style editor)
  // ============================================

  getBlocks(distillationId: string): Observable<ApiResponse<Block[]>> {
    return this.request('GET', `/blocks/${distillationId}`);
  }

  getBlock(blockId: string): Observable<ApiResponse<Block>> {
    return this.request('GET', `/blocks/single/${blockId}`);
  }

  createBlock(input: CreateBlockInput): Observable<ApiResponse<Block>> {
    return this.request('POST', '/blocks', input);
  }

  createBlocks(distillationId: string, blocks: Omit<CreateBlockInput, 'distillationId'>[]): Observable<ApiResponse<Block[]>> {
    return this.request('POST', '/blocks/batch', { distillationId, blocks });
  }

  updateBlock(blockId: string, input: UpdateBlockInput): Observable<ApiResponse<Block>> {
    return this.request('PUT', `/blocks/${blockId}`, input);
  }

  deleteBlock(blockId: string): Observable<void> {
    return this.request('DELETE', `/blocks/${blockId}`);
  }

  deleteAllBlocks(distillationId: string): Observable<void> {
    return this.request('DELETE', `/blocks/all/${distillationId}`);
  }

  reorderBlocks(distillationId: string, blockIds: string[]): Observable<void> {
    return this.request('PUT', `/blocks/reorder/${distillationId}`, { blockIds });
  }

  moveBlock(blockId: string, newParentId: string | null, newPosition: number): Observable<ApiResponse<Block>> {
    return this.request('PUT', `/blocks/${blockId}/move`, { newParentId, newPosition });
  }

  migrateToBlocks(distillationId: string): Observable<ApiResponse<Block[]>> {
    return this.request('POST', `/blocks/migrate/${distillationId}`);
  }

  /**
   * Batch update all blocks for a distillation (auto-save)
   */
  updateBlocks(distillationId: string, blocks: Block[]): Observable<ApiResponse<Block[]>> {
    return this.request('PUT', `/blocks/batch/${distillationId}`, { blocks });
  }

  // ============================================
  // Page Hierarchy
  // ============================================

  getPageTree(): Observable<ApiResponse<PageTreeNode[]>> {
    return this.request('GET', '/pages/tree');
  }

  createPage(input: CreatePage): Observable<ApiResponse<DistillationWithHierarchy>> {
    return this.request('POST', '/pages', input);
  }

  updatePage(pageId: string, input: UpdatePage): Observable<ApiResponse<DistillationWithHierarchy>> {
    return this.request('PUT', `/pages/${pageId}`, input);
  }

  movePage(pageId: string, move: MovePage): Observable<{ success: boolean }> {
    return this.request('PUT', `/pages/${pageId}/move`, move);
  }

  togglePageCollapse(pageId: string): Observable<ApiResponse<DistillationWithHierarchy>> {
    return this.request('PUT', `/pages/${pageId}/collapse`);
  }

  reorderPages(pageIds: string[], parentId?: string | null): Observable<{ success: boolean }> {
    return this.request('POST', '/pages/reorder', { pageIds, parentId });
  }

  // Upload file with progress tracking
  uploadFile(formData: FormData, onProgress?: (progress: number) => void): Observable<ApiResponse<Lecture>> {
    const result$ = new Subject<ApiResponse<Lecture>>();

    this.supabase.getAccessToken().then(token => {
      const req = new HttpRequest('POST', `${this.baseUrl}/pages/upload`, formData, {
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
