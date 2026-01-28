import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { PageTreeNode, SmartFolder, RecentView, SourceType } from "@/lib/types";

interface TrashedPage {
    id: string;
    title: string;
    trashedAt: string;
    sourceType?: string;
}

interface PageState {
    pageTree: PageTreeNode[];
    trashPages: TrashedPage[];
    selectedPageId: string | null;
    selectedSmartFolderId: string | null;
    expandedPageIds: string[];
    recentViews: RecentView[];
    favorites: string[];
    isLoading: boolean;
    searchQuery: string;
    duplicatingPageId: string | null | undefined;
    draggingPageId: string | null;

    // Actions
    loadPageTree: () => Promise<void>;
    loadTrash: () => Promise<void>;
    selectPage: (id: string | null) => void;
    selectSmartFolder: (id: string | null) => void;
    toggleExpand: (id: string) => void;
    createPage: (input: { parentId?: string; title?: string }) => Promise<string | null>;
    renamePage: (id: string, title: string) => Promise<void>;
    updatePageTitleLocally: (id: string, title: string) => void;
    deletePage: (id: string) => Promise<void>;
    restorePage: (id: string) => Promise<void>;
    deletePermanently: (id: string) => Promise<void>;
    emptyTrash: () => Promise<void>;
    duplicatePage: (id: string) => Promise<string | null>;
    toggleFavorite: (id: string) => void;
    addRecentView: (id: string, title: string) => void;
    setSearchQuery: (query: string) => void;
    setDraggingPageId: (id: string | null) => void;
    movePage: (pageId: string, targetParentId: string | null, targetIndex: number) => Promise<void>;
}

export const usePageStore = create<PageState>()(
    persist(
        (set, get) => ({
            pageTree: [],
            trashPages: [],
            selectedPageId: null,
            selectedSmartFolderId: "all",
            expandedPageIds: [],
            recentViews: [],
            favorites: [],
            isLoading: false,
            searchQuery: "",
            duplicatingPageId: undefined,
            draggingPageId: null,

            loadPageTree: async () => {
                set({ isLoading: true });
                try {
                    const { data } = await api.pages.getTree();
                    console.log("[loadPageTree] Received data:", JSON.stringify(data, null, 2));
                    set({ pageTree: data });
                } catch (error) {
                    console.error("Failed to load page tree:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            loadTrash: async () => {
                try {
                    const { data } = await api.pages.getTrash();
                    set({ trashPages: data });
                } catch (error) {
                    console.error("Failed to load trash:", error);
                }
            },

            selectPage: (id) => set({ selectedPageId: id, selectedSmartFolderId: null }),
            selectSmartFolder: (id) => set({ selectedSmartFolderId: id, selectedPageId: null }),

            toggleExpand: (id) => {
                const { expandedPageIds } = get();
                const next = expandedPageIds.includes(id)
                    ? expandedPageIds.filter((eid) => eid !== id)
                    : [...expandedPageIds, id];

                // Optimistic: 즉시 반영 (서버 동기화는 선택적)
                set({ expandedPageIds: next });

                // 백그라운드에서 서버 동기화 (실패해도 무시 - 로컬 상태가 더 중요)
                api.pages.toggleCollapse(id).catch(() => {
                    // 무시 - expand 상태는 로컬 우선
                });
            },

            createPage: async (input) => {
                // Optimistic: 임시 ID로 먼저 UI 반영
                const tempId = `temp-${Date.now()}`;
                const now = new Date().toISOString();
                const newNode: PageTreeNode = {
                    id: tempId,
                    parentId: input.parentId || null,
                    title: input.title || "Untitled",
                    pageIcon: null,
                    isFolder: false,
                    collapsed: false,
                    position: 0,
                    status: "pending",
                    sourceType: "note",
                    audioUrl: null,
                    durationSeconds: null,
                    createdAt: now,
                    updatedAt: now,
                    depth: 0,
                    children: [],
                };

                const { pageTree, expandedPageIds } = get();

                // 트리에 즉시 추가
                if (input.parentId) {
                    const addToParent = (nodes: PageTreeNode[]): PageTreeNode[] => {
                        return nodes.map(node => {
                            if (node.id === input.parentId) {
                                return { ...node, children: [...(node.children || []), newNode] };
                            }
                            if (node.children) {
                                return { ...node, children: addToParent(node.children) };
                            }
                            return node;
                        });
                    };
                    set({
                        pageTree: addToParent(pageTree),
                        expandedPageIds: expandedPageIds.includes(input.parentId)
                            ? expandedPageIds
                            : [...expandedPageIds, input.parentId]
                    });
                } else {
                    set({ pageTree: [...pageTree, newNode] });
                }

                // 백그라운드에서 서버 동기화
                try {
                    const { data } = await api.pages.create(input);

                    // 실제 ID로 교체
                    const replaceTemp = (nodes: PageTreeNode[]): PageTreeNode[] => {
                        return nodes.map(node => {
                            if (node.id === tempId) {
                                return { ...node, id: data.id };
                            }
                            if (node.children) {
                                return { ...node, children: replaceTemp(node.children) };
                            }
                            return node;
                        });
                    };
                    set({
                        pageTree: replaceTemp(get().pageTree),
                        selectedPageId: data.id,
                        selectedSmartFolderId: null
                    });
                    return data.id;
                } catch (error) {
                    console.error("Failed to create page:", error);
                    // 롤백: 임시 노드 제거
                    const removeTemp = (nodes: PageTreeNode[]): PageTreeNode[] => {
                        return nodes
                            .filter(node => node.id !== tempId)
                            .map(node => ({
                                ...node,
                                children: node.children ? removeTemp(node.children) : []
                            }));
                    };
                    set({ pageTree: removeTemp(get().pageTree) });
                    return null;
                }
            },

            renamePage: async (id, title) => {
                const { pageTree } = get();

                // 이전 타이틀 저장 (롤백용)
                const findTitle = (nodes: PageTreeNode[]): string => {
                    for (const node of nodes) {
                        if (node.id === id) return node.title;
                        if (node.children) {
                            const found = findTitle(node.children);
                            if (found) return found;
                        }
                    }
                    return "";
                };
                const oldTitle = findTitle(pageTree);

                // Optimistic: 즉시 반영
                get().updatePageTitleLocally(id, title);

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.update(id, { title });
                } catch (error) {
                    console.error("Failed to rename page:", error);
                    // 롤백
                    get().updatePageTitleLocally(id, oldTitle);
                }
            },

            updatePageTitleLocally: (id, title) => {
                const { pageTree } = get();
                const updateTitle = (nodes: PageTreeNode[]): PageTreeNode[] => {
                    return nodes.map(node => {
                        if (node.id === id) {
                            return { ...node, title };
                        }
                        if (node.children) {
                            return { ...node, children: updateTitle(node.children) };
                        }
                        return node;
                    });
                };
                set({ pageTree: updateTitle(pageTree) });
            },

            deletePage: async (id) => {
                const { pageTree, trashPages, selectedPageId } = get();

                // 삭제할 페이지 정보 저장 (롤백용)
                const findPage = (nodes: PageTreeNode[]): PageTreeNode | null => {
                    for (const node of nodes) {
                        if (node.id === id) return node;
                        if (node.children) {
                            const found = findPage(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const deletedPage = findPage(pageTree);

                // Optimistic: 트리에서 즉시 제거
                const removeFromTree = (nodes: PageTreeNode[]): PageTreeNode[] => {
                    return nodes
                        .filter(node => node.id !== id)
                        .map(node => ({
                            ...node,
                            children: node.children ? removeFromTree(node.children) : []
                        }));
                };

                // 휴지통에 즉시 추가
                const trashedItem: TrashedPage = {
                    id,
                    title: deletedPage?.title || "Untitled",
                    trashedAt: new Date().toISOString(),
                    sourceType: deletedPage?.sourceType
                };

                set({
                    pageTree: removeFromTree(pageTree),
                    trashPages: [trashedItem, ...trashPages],
                    selectedPageId: selectedPageId === id ? null : selectedPageId
                });

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.moveToTrash(id);
                } catch (error) {
                    console.error("Failed to move page to trash:", error);
                    // 롤백: 페이지 복원
                    if (deletedPage) {
                        await get().loadPageTree();
                        await get().loadTrash();
                    }
                }
            },

            restorePage: async (id) => {
                const { trashPages, pageTree } = get();

                // 복원할 페이지 찾기
                const restoredPage = trashPages.find(p => p.id === id);
                if (!restoredPage) return;

                // Optimistic: 휴지통에서 제거, 트리에 추가
                const now = new Date().toISOString();
                const restoredNode: PageTreeNode = {
                    id: restoredPage.id,
                    parentId: null,
                    title: restoredPage.title,
                    pageIcon: null,
                    isFolder: false,
                    collapsed: false,
                    position: 0,
                    status: "crystallized",
                    sourceType: (restoredPage.sourceType as SourceType) || "note",
                    audioUrl: null,
                    durationSeconds: null,
                    createdAt: now,
                    updatedAt: now,
                    depth: 0,
                    children: [],
                };

                set({
                    trashPages: trashPages.filter(p => p.id !== id),
                    pageTree: [...pageTree, restoredNode]
                });

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.restore(id);
                    // 서버에서 정확한 위치 정보 가져오기
                    await get().loadPageTree();
                } catch (error) {
                    console.error("Failed to restore page:", error);
                    // 롤백
                    set({
                        trashPages: [...get().trashPages, restoredPage],
                        pageTree: get().pageTree.filter(p => p.id !== id)
                    });
                }
            },

            deletePermanently: async (id) => {
                const { trashPages } = get();
                const deletedPage = trashPages.find(p => p.id === id);

                // Optimistic: 휴지통에서 즉시 제거
                set({ trashPages: trashPages.filter(p => p.id !== id) });

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.deletePermanently(id);
                } catch (error) {
                    console.error("Failed to delete page permanently:", error);
                    // 롤백
                    if (deletedPage) {
                        set({ trashPages: [...get().trashPages, deletedPage] });
                    }
                }
            },

            emptyTrash: async () => {
                const { trashPages } = get();
                const backup = [...trashPages];

                // Optimistic: 즉시 비우기
                set({ trashPages: [] });

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.emptyTrash();
                } catch (error) {
                    console.error("Failed to empty trash:", error);
                    // 롤백
                    set({ trashPages: backup });
                }
            },

            duplicatePage: async (id) => {
                const { pageTree } = get();

                // 원본 페이지 찾기
                const findPage = (nodes: PageTreeNode[]): PageTreeNode | null => {
                    for (const node of nodes) {
                        if (node.id === id) return node;
                        if (node.children) {
                            const found = findPage(node.children);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                const originalPage = findPage(pageTree);
                if (!originalPage) return null;

                // Optimistic: 임시 복제본 즉시 추가
                const tempId = `temp-dup-${Date.now()}`;
                const now = new Date().toISOString();
                const duplicateNode: PageTreeNode = {
                    id: tempId,
                    parentId: originalPage.parentId,
                    title: `${originalPage.title} (Copy)`,
                    pageIcon: originalPage.pageIcon,
                    isFolder: originalPage.isFolder,
                    collapsed: false,
                    position: originalPage.position,
                    status: originalPage.status,
                    sourceType: originalPage.sourceType,
                    audioUrl: originalPage.audioUrl,
                    durationSeconds: originalPage.durationSeconds,
                    createdAt: now,
                    updatedAt: now,
                    depth: originalPage.depth,
                    children: [],
                };

                // 원본 바로 앞에 삽입
                const insertBefore = (nodes: PageTreeNode[]): PageTreeNode[] => {
                    const result: PageTreeNode[] = [];
                    for (const node of nodes) {
                        if (node.id === id) {
                            result.push(duplicateNode);
                        }
                        if (node.children) {
                            result.push({ ...node, children: insertBefore(node.children) });
                        } else {
                            result.push(node);
                        }
                    }
                    return result;
                };

                set({ pageTree: insertBefore(pageTree), duplicatingPageId: id });

                // 백그라운드에서 서버 동기화
                try {
                    const { data: fullPage } = await api.pages.get(id);
                    const { data: newPage } = await api.pages.create({
                        parentId: fullPage.parentId,
                        title: `${fullPage.title} (Copy)`
                    });

                    // 블록 복제
                    try {
                        const { data: blocks } = await api.blocks.get(id);
                        if (blocks && blocks.length > 0) {
                            const firstBlock = blocks[0];
                            const isTitleBlock = firstBlock.type === "heading1" || (firstBlock.type === "heading" && firstBlock.props?.level === 1);
                            if (isTitleBlock) {
                                blocks[0] = { ...firstBlock, content: `${fullPage.title} (Copy)` };
                            }
                            await api.blocks.updateBatch(newPage.id, blocks);
                        }
                    } catch (blockError) {
                        console.warn("Failed to duplicate blocks:", blockError);
                    }

                    // 순서 정렬
                    const siblingInfo = findSiblingsInfo(get().pageTree, id);
                    if (siblingInfo) {
                        const { siblings, parentId } = siblingInfo;
                        const newOrderIds = siblings.map(p => p.id === tempId ? newPage.id : p.id);
                        await api.pages.reorder(newOrderIds, parentId);
                    }

                    // 임시 ID를 실제 ID로 교체
                    const replaceTemp = (nodes: PageTreeNode[]): PageTreeNode[] => {
                        return nodes.map(node => {
                            if (node.id === tempId) {
                                return { ...node, id: newPage.id };
                            }
                            if (node.children) {
                                return { ...node, children: replaceTemp(node.children) };
                            }
                            return node;
                        });
                    };

                    set({
                        pageTree: replaceTemp(get().pageTree),
                        selectedPageId: newPage.id,
                        selectedSmartFolderId: null,
                        duplicatingPageId: undefined
                    });
                    return newPage.id;

                } catch (error) {
                    console.error("Failed to duplicate page:", error);
                    // 롤백: 임시 노드 제거
                    const removeTemp = (nodes: PageTreeNode[]): PageTreeNode[] => {
                        return nodes
                            .filter(node => node.id !== tempId)
                            .map(node => ({
                                ...node,
                                children: node.children ? removeTemp(node.children) : []
                            }));
                    };
                    set({ pageTree: removeTemp(get().pageTree), duplicatingPageId: undefined });
                    return null;
                }
            },

            toggleFavorite: (id) => {
                const { favorites } = get();
                const next = favorites.includes(id)
                    ? favorites.filter((fid) => fid !== id)
                    : [...favorites, id];
                set({ favorites: next });
            },

            addRecentView: (id, title) => {
                const { recentViews } = get();
                const filtered = recentViews.filter((r) => r.id !== id);
                const next = [{ id, title, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
                set({ recentViews: next });
            },

            setSearchQuery: (query) => set({ searchQuery: query }),

            setDraggingPageId: (id) => set({ draggingPageId: id }),

            movePage: async (pageId, targetParentId, targetIndex) => {
                const { pageTree, expandedPageIds } = get();
                const originalTree = JSON.parse(JSON.stringify(pageTree)); // 깊은 복사 (롤백용)

                // 대상 부모의 자식들 가져오기
                const getChildren = (nodes: PageTreeNode[], parentId: string | null): PageTreeNode[] => {
                    if (parentId === null) {
                        return nodes;
                    }
                    for (const node of nodes) {
                        if (node.id === parentId) {
                            return node.children || [];
                        }
                        if (node.children) {
                            const result = getChildren(node.children, parentId);
                            if (result.length > 0 || node.children.some(c => c.id === parentId)) {
                                return result;
                            }
                        }
                    }
                    return [];
                };

                // 자기 자신의 하위 페이지로 이동 방지
                const isDescendant = (nodes: PageTreeNode[], ancestorId: string, descendantId: string): boolean => {
                    for (const node of nodes) {
                        if (node.id === ancestorId) {
                            const checkChildren = (children: PageTreeNode[]): boolean => {
                                for (const child of children) {
                                    if (child.id === descendantId) return true;
                                    if (child.children && checkChildren(child.children)) return true;
                                }
                                return false;
                            };
                            return checkChildren(node.children || []);
                        }
                        if (node.children) {
                            if (isDescendant(node.children, ancestorId, descendantId)) return true;
                        }
                    }
                    return false;
                };

                if (targetParentId && isDescendant(pageTree, pageId, targetParentId)) {
                    console.warn("Cannot move page into its own descendant");
                    return;
                }

                // 페이지 찾기
                const findAndRemovePage = (nodes: PageTreeNode[]): { nodes: PageTreeNode[], removed: PageTreeNode | null } => {
                    let removed: PageTreeNode | null = null;
                    const newNodes = nodes.filter(node => {
                        if (node.id === pageId) {
                            removed = node;
                            return false;
                        }
                        return true;
                    }).map(node => {
                        if (node.children) {
                            const result = findAndRemovePage(node.children);
                            if (result.removed) removed = result.removed;
                            return { ...node, children: result.nodes };
                        }
                        return node;
                    });
                    return { nodes: newNodes, removed };
                };

                const { nodes: treeWithoutPage, removed: movedPage } = findAndRemovePage(pageTree);
                if (!movedPage) return;

                // 새 위치에 삽입
                const insertPage = (nodes: PageTreeNode[], parentId: string | null): PageTreeNode[] => {
                    if (parentId === null) {
                        const newNodes = [...nodes];
                        newNodes.splice(targetIndex, 0, movedPage);
                        return newNodes;
                    }
                    return nodes.map(node => {
                        if (node.id === parentId) {
                            const children = [...(node.children || [])];
                            children.splice(targetIndex, 0, movedPage);
                            return { ...node, children };
                        }
                        if (node.children) {
                            return { ...node, children: insertPage(node.children, parentId) };
                        }
                        return node;
                    });
                };

                const newTree = insertPage(treeWithoutPage, targetParentId);

                // Optimistic: 즉시 반영
                set({
                    pageTree: newTree,
                    expandedPageIds: targetParentId && !expandedPageIds.includes(targetParentId)
                        ? [...expandedPageIds, targetParentId]
                        : expandedPageIds
                });

                // 새로운 순서 계산 (API용)
                const siblings = getChildren(newTree, targetParentId);
                const newOrderIds = siblings.map(s => s.id);

                // 백그라운드에서 서버 동기화
                try {
                    await api.pages.reorder(newOrderIds, targetParentId);
                } catch (error) {
                    console.error("Failed to move page:", error);
                    // 롤백
                    set({ pageTree: originalTree });
                }
            },
        }),
        {
            name: "distillai-page-storage",
            partialize: (state) => ({
                expandedPageIds: state.expandedPageIds,
                recentViews: state.recentViews,
                favorites: state.favorites,
            }),
        }
    )
);

// Helper to flatten tree for searching
export const getFlattenedPages = (nodes: PageTreeNode[]): PageTreeNode[] => {
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
};

// Helper to find siblings and parent for reordering
const findSiblingsInfo = (nodes: PageTreeNode[], targetId: string, parentId: string | null = null): { siblings: PageTreeNode[], parentId: string | null } | null => {
    // Check if target is in current level
    if (nodes.some(n => n.id === targetId)) {
        return { siblings: nodes, parentId };
    }
    // Search children
    for (const node of nodes) {
        if (node.children) {
            const result = findSiblingsInfo(node.children, targetId, node.id);
            if (result) return result;
        }
    }
    return null;
};
