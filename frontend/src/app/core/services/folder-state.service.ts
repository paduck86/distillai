import { Injectable, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, Folder, CategoryWithCount, SmartFolder } from './api.service';

export interface FolderTreeNode {
  id: string;
  label: string;
  data: Folder;
  icon: string;
  color: string;
  children: FolderTreeNode[];
  expanded: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FolderStateService {
  private api = inject(ApiService);

  // State
  folders = signal<Folder[]>([]);
  categories = signal<CategoryWithCount[]>([]);
  selectedFolderId = signal<string | null>(null);
  selectedCategoryId = signal<string | null>(null);
  selectedSmartFolderId = signal<string | null>('dashboard');
  loading = signal(false);

  // Smart Folders (하드코딩)
  smartFolders = signal<SmartFolder[]>([
    { id: 'dashboard', name: '대시보드', nameEn: 'Dashboard', icon: 'pi-home', type: 'all' },
    { id: 'all', name: '전체', nameEn: 'All', icon: 'pi-list', type: 'all' },
    { id: 'recent', name: '최근 7일', nameEn: 'Recent 7 days', icon: 'pi-clock', type: 'recent' },
  ]);

  // Computed: 폴더 트리 구조
  folderTree = computed<FolderTreeNode[]>(() => {
    const folders = this.folders();
    const map = new Map<string | null, Folder[]>();

    // 부모 ID별로 그룹화
    folders.forEach(f => {
      const parentId = f.parentId;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(f);
    });

    // 재귀적으로 트리 구성
    const buildNode = (folder: Folder): FolderTreeNode => ({
      id: folder.id,
      label: folder.title,
      data: folder,
      icon: `pi-${folder.icon || 'folder'}`,
      color: folder.color,
      children: (map.get(folder.id) || [])
        .sort((a, b) => a.position - b.position)
        .map(buildNode),
      expanded: false,
    });

    // 루트 폴더들 (parentId가 null)
    return (map.get(null) || [])
      .sort((a, b) => a.position - b.position)
      .map(buildNode);
  });

  // 선택된 폴더, 카테고리 또는 스마트 폴더
  selectedFilter = computed(() => {
    const folderId = this.selectedFolderId();
    const categoryId = this.selectedCategoryId();
    const smartFolderId = this.selectedSmartFolderId();

    if (folderId) {
      return { type: 'folder' as const, folderId };
    }

    if (categoryId) {
      const category = this.categories().find(c => c.id === categoryId);
      return { type: 'category' as const, categoryId, category };
    }

    const smartFolder = this.smartFolders().find(sf => sf.id === smartFolderId);
    if (smartFolder) {
      return { type: 'smart' as const, smartFolder };
    }

    return { type: 'all' as const };
  });

  /**
   * 폴더 및 카테고리 목록 로드
   */
  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const [foldersRes, categoriesRes] = await Promise.all([
        firstValueFrom(this.api.getFolders()),
        firstValueFrom(this.api.getCategories()),
      ]);

      this.folders.set(foldersRes.data);
      this.categories.set(categoriesRes.data);
    } catch (error) {
      console.error('Failed to load folders/categories:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 폴더 선택
   */
  selectFolder(folderId: string | null): void {
    this.selectedFolderId.set(folderId);
    this.selectedCategoryId.set(null);
    this.selectedSmartFolderId.set(null);
  }

  /**
   * 카테고리 선택
   */
  selectCategory(categoryId: string | null): void {
    this.selectedCategoryId.set(categoryId);
    this.selectedFolderId.set(null);
    this.selectedSmartFolderId.set(null);
  }

  /**
   * 스마트 폴더 선택
   */
  selectSmartFolder(smartFolderId: string): void {
    this.selectedSmartFolderId.set(smartFolderId);
    this.selectedFolderId.set(null);
    this.selectedCategoryId.set(null);
  }

  /**
   * 폴더 생성
   */
  async createFolder(title: string, parentId?: string): Promise<Folder> {
    const response = await firstValueFrom(
      this.api.createFolder({ title, parentId })
    );
    await this.loadAll();
    return response.data;
  }

  /**
   * 폴더 수정
   */
  async updateFolder(folderId: string, data: Partial<Folder>): Promise<Folder> {
    const response = await firstValueFrom(
      this.api.updateFolder(folderId, data)
    );
    await this.loadAll();
    return response.data;
  }

  /**
   * 폴더 삭제
   */
  async deleteFolder(folderId: string): Promise<void> {
    await firstValueFrom(this.api.deleteFolder(folderId));
    await this.loadAll();

    // 삭제한 폴더가 선택되어 있었으면 선택 해제
    if (this.selectedFolderId() === folderId) {
      this.selectSmartFolder('all');
    }
  }

  /**
   * Distillation을 폴더로 이동
   */
  async moveLectureToFolder(lectureId: string, folderId: string | null): Promise<void> {
    await firstValueFrom(
      this.api.updateLecture(lectureId, { folderId })
    );
  }

  /**
   * 카테고리 조회 by ID
   */
  getCategoryById(categoryId: string): CategoryWithCount | undefined {
    return this.categories().find(c => c.id === categoryId);
  }

  /**
   * 카테고리 목록 직접 설정 (드래그 앤 드롭 정렬용)
   */
  setCategories(categories: CategoryWithCount[]): void {
    this.categories.set(categories);
  }
}
