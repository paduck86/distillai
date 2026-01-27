/**
 * Page State Service
 *
 * 페이지 계층 구조 상태 관리 (노션 스타일)
 * - 페이지 트리 관리
 * - 선택 상태 관리
 * - 확장/접힘 상태 관리
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, PageTreeNode, CreatePage, MovePage, SmartFolder, SourceType } from './api.service';

// localStorage 키
const EXPANDED_PAGES_KEY = 'distillai_expanded_pages';
const RECENT_VIEWS_KEY = 'distillai_recent_views';
const FAVORITES_KEY = 'distillai_favorites';

export interface RecentView {
  id: string;
  title: string;
  viewedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PageStateService {
  private api = inject(ApiService);

  // ============================================
  // State
  // ============================================

  // 페이지 트리 (계층적)
  pageTree = signal<PageTreeNode[]>([]);

  // 선택된 페이지 ID
  selectedPageId = signal<string | null>(null);

  // 선택된 스마트 폴더 ID
  selectedSmartFolderId = signal<string | null>('all');

  // 확장된 페이지 ID 집합
  expandedPageIds = signal<Set<string>>(this.loadExpandedPages());

  // 로딩 상태
  loading = signal(false);

  // 최근 본 항목
  recentViews = signal<RecentView[]>(this.loadRecentViews());

  // 즐겨찾기
  favorites = signal<string[]>(this.loadFavorites());

  // 스마트 폴더 (고정)
  smartFolders = signal<SmartFolder[]>([
    { id: 'all', name: '전체', nameEn: 'All', icon: 'pi-list', type: 'all' },
    { id: 'favorites', name: '즐겨찾기', nameEn: 'Favorites', icon: 'pi-star-fill', type: 'favorites' },
    { id: 'recent', name: '최근 본 항목', nameEn: 'Recent', icon: 'pi-clock', type: 'recent' },
  ]);

  // ============================================
  // Computed
  // ============================================

  // 플랫화된 페이지 목록 (검색/필터링용)
  flattenedPages = computed(() => this.flattenTree(this.pageTree()));

  // 선택된 페이지
  selectedPage = computed(() => {
    const id = this.selectedPageId();
    if (!id) return null;
    return this.findPageById(this.pageTree(), id);
  });

  // 현재 필터 상태
  currentFilter = computed(() => {
    const pageId = this.selectedPageId();
    const smartFolderId = this.selectedSmartFolderId();

    if (pageId) {
      return { type: 'page' as const, pageId };
    }

    const smartFolder = this.smartFolders().find(sf => sf.id === smartFolderId);
    if (smartFolder) {
      return { type: 'smart' as const, smartFolder };
    }

    return { type: 'all' as const };
  });

  // 루트 페이지 수
  rootPageCount = computed(() => this.pageTree().length);

  // 전체 페이지 수
  totalPageCount = computed(() => this.flattenedPages().length);

  // 즐겨찾기 수
  favoriteCount = computed(() => this.favorites().length);

  // 최근 본 항목 수
  recentCount = computed(() => this.recentViews().length);

  // ============================================
  // Actions
  // ============================================

  /**
   * 페이지 트리 로드
   */
  async loadPageTree(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.api.getPageTree());
      this.pageTree.set(response.data);

      // 저장된 확장 상태 적용
      this.applyExpandedState();
    } catch (error) {
      console.error('Failed to load page tree:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 새 페이지 생성
   */
  async createPage(input: CreatePage = {}): Promise<PageTreeNode | null> {
    try {
      const response = await firstValueFrom(this.api.createPage(input));
      await this.loadPageTree();

      // 새 페이지 선택
      this.selectPage(response.data.id);

      // 부모가 있으면 확장
      if (input.parentId) {
        this.expandPage(input.parentId);
      }

      return this.findPageById(this.pageTree(), response.data.id);
    } catch (error) {
      console.error('Failed to create page:', error);
      return null;
    }
  }

  /**
   * 하위 페이지 생성
   */
  async createSubPage(parentId: string, title?: string): Promise<PageTreeNode | null> {
    return this.createPage({ parentId, title });
  }

  /**
   * 페이지 이동
   */
  async movePage(pageId: string, newParentId: string | null, newPosition: number): Promise<void> {
    try {
      await firstValueFrom(this.api.movePage(pageId, { parentId: newParentId, position: newPosition }));
      await this.loadPageTree();
    } catch (error) {
      console.error('Failed to move page:', error);
    }
  }

  /**
   * 페이지 순서 변경
   */
  async reorderPages(pageIds: string[], parentId: string | null): Promise<void> {
    try {
      await firstValueFrom(this.api.reorderPages(pageIds, parentId));
      await this.loadPageTree();
    } catch (error) {
      console.error('Failed to reorder pages:', error);
    }
  }

  /**
   * 페이지 선택
   */
  selectPage(pageId: string | null): void {
    this.selectedPageId.set(pageId);
    this.selectedSmartFolderId.set(null);
  }

  /**
   * 스마트 폴더 선택
   */
  selectSmartFolder(smartFolderId: string): void {
    this.selectedSmartFolderId.set(smartFolderId);
    this.selectedPageId.set(null);
  }

  /**
   * 페이지 확장/접힘 토글
   */
  toggleExpand(pageId: string): void {
    const expanded = new Set(this.expandedPageIds());
    if (expanded.has(pageId)) {
      expanded.delete(pageId);
    } else {
      expanded.add(pageId);
    }
    this.expandedPageIds.set(expanded);
    this.saveExpandedPages();

    // 서버에도 동기화 (선택적)
    this.api.togglePageCollapse(pageId).subscribe({
      error: (err) => console.error('Failed to toggle collapse:', err)
    });
  }

  /**
   * 페이지 확장
   */
  expandPage(pageId: string): void {
    const expanded = new Set(this.expandedPageIds());
    expanded.add(pageId);
    this.expandedPageIds.set(expanded);
    this.saveExpandedPages();
  }

  /**
   * 페이지 접기
   */
  collapsePage(pageId: string): void {
    const expanded = new Set(this.expandedPageIds());
    expanded.delete(pageId);
    this.expandedPageIds.set(expanded);
    this.saveExpandedPages();
  }

  /**
   * 페이지가 확장되어 있는지 확인
   */
  isExpanded(pageId: string): boolean {
    return this.expandedPageIds().has(pageId);
  }

  // ============================================
  // Recent Views
  // ============================================

  private readonly MAX_RECENT_ITEMS = 20;

  /**
   * 최근 본 항목 추가
   */
  addRecentView(id: string, title: string): void {
    const now = new Date().toISOString();
    let recent = this.recentViews().filter(r => r.id !== id);
    recent.unshift({ id, title, viewedAt: now });
    recent = recent.slice(0, this.MAX_RECENT_ITEMS);

    this.recentViews.set(recent);
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(recent));
  }

  /**
   * 최근 본 항목에서 제거
   */
  removeRecentView(id: string): void {
    const recent = this.recentViews().filter(r => r.id !== id);
    this.recentViews.set(recent);
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(recent));
  }

  /**
   * 최근 본 항목 초기화
   */
  clearRecentViews(): void {
    this.recentViews.set([]);
    localStorage.removeItem(RECENT_VIEWS_KEY);
  }

  private loadRecentViews(): RecentView[] {
    try {
      const stored = localStorage.getItem(RECENT_VIEWS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // ============================================
  // Favorites
  // ============================================

  /**
   * 즐겨찾기 토글
   */
  toggleFavorite(id: string): void {
    const current = this.favorites();
    const isFavorite = current.includes(id);

    const updated = isFavorite
      ? current.filter(fid => fid !== id)
      : [...current, id];

    this.favorites.set(updated);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }

  /**
   * 즐겨찾기 여부 확인
   */
  isFavorite(id: string): boolean {
    return this.favorites().includes(id);
  }

  /**
   * 즐겨찾기 추가
   */
  addFavorite(id: string): void {
    if (!this.isFavorite(id)) {
      const updated = [...this.favorites(), id];
      this.favorites.set(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    }
  }

  /**
   * 즐겨찾기 제거
   */
  removeFavorite(id: string): void {
    const updated = this.favorites().filter(fid => fid !== id);
    this.favorites.set(updated);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }

  private loadFavorites(): string[] {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // ============================================
  // Helper Functions
  // ============================================

  /**
   * 트리를 플랫 배열로 변환
   */
  private flattenTree(nodes: PageTreeNode[]): PageTreeNode[] {
    const result: PageTreeNode[] = [];
    const flatten = (items: PageTreeNode[]) => {
      for (const node of items) {
        result.push(node);
        if (node.children?.length) {
          flatten(node.children);
        }
      }
    };
    flatten(nodes);
    return result;
  }

  /**
   * ID로 페이지 찾기
   */
  private findPageById(nodes: PageTreeNode[], id: string): PageTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children?.length) {
        const found = this.findPageById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 저장된 확장 상태 적용
   */
  private applyExpandedState(): void {
    const expanded = this.expandedPageIds();
    const applyCollapsed = (nodes: PageTreeNode[]) => {
      for (const node of nodes) {
        node.collapsed = !expanded.has(node.id);
        if (node.children?.length) {
          applyCollapsed(node.children);
        }
      }
    };
    const tree = this.pageTree();
    applyCollapsed(tree);
    this.pageTree.set([...tree]);
  }

  /**
   * 확장 상태 저장
   */
  private saveExpandedPages(): void {
    const ids = Array.from(this.expandedPageIds());
    localStorage.setItem(EXPANDED_PAGES_KEY, JSON.stringify(ids));
  }

  /**
   * 확장 상태 로드
   */
  private loadExpandedPages(): Set<string> {
    try {
      const stored = localStorage.getItem(EXPANDED_PAGES_KEY);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  }

  /**
   * 페이지의 부모 경로 (breadcrumb용)
   */
  getPagePath(pageId: string): PageTreeNode[] {
    const path: PageTreeNode[] = [];
    const findPath = (nodes: PageTreeNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          path.push(node);
          return true;
        }
        if (node.children?.length && findPath(node.children, targetId)) {
          path.unshift(node);
          return true;
        }
      }
      return false;
    };
    findPath(this.pageTree(), pageId);
    return path;
  }

  /**
   * 페이지 아이콘 가져오기 (sourceType 기반)
   */
  getPageIcon(page: PageTreeNode): string {
    if (page.pageIcon) return page.pageIcon;

    // sourceType에 따른 기본 아이콘
    switch (page.sourceType) {
      case 'youtube': return 'pi-youtube';
      case 'recording': return 'pi-microphone';
      case 'audio': return 'pi-volume-up';
      case 'video': return 'pi-video';
      case 'pdf': return 'pi-file-pdf';
      case 'url': return 'pi-link';
      case 'website': return 'pi-globe';
      case 'x_thread': return 'pi-twitter';
      case 'text': return 'pi-file-edit';
      case 'clipboard': return 'pi-clipboard';
      case 'note':
      default:
        return page.isFolder ? 'pi-folder' : 'pi-file-edit';
    }
  }

  /**
   * 페이지 아이콘 색상 가져오기
   */
  getPageIconColor(page: PageTreeNode): string {
    switch (page.sourceType) {
      case 'youtube': return 'text-red-500';
      case 'recording': return 'text-cyan-500';
      case 'audio': return 'text-cyan-400';
      case 'video': return 'text-purple-400';
      case 'pdf': return 'text-orange-500';
      case 'url': return 'text-blue-400';
      case 'x_thread': return 'text-zinc-400';
      default: return 'text-zinc-400';
    }
  }
}
