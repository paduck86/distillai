import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { PageTreeNode, SmartFolder, RecentView } from "@/lib/types";

interface PageState {
    pageTree: PageTreeNode[];
    selectedPageId: string | null;
    selectedSmartFolderId: string | null;
    expandedPageIds: string[];
    recentViews: RecentView[];
    favorites: string[];
    isLoading: boolean;
    searchQuery: string;

    // Actions
    loadPageTree: () => Promise<void>;
    selectPage: (id: string | null) => void;
    selectSmartFolder: (id: string | null) => void;
    toggleExpand: (id: string) => void;
    createPage: (input: { parentId?: string; title?: string }) => Promise<string | null>;
    addRecentView: (id: string, title: string) => void;
    setSearchQuery: (query: string) => void;
}

export const usePageStore = create<PageState>()(
    persist(
        (set, get) => ({
            pageTree: [],
            selectedPageId: null,
            selectedSmartFolderId: "all",
            expandedPageIds: [],
            recentViews: [],
            favorites: [],
            isLoading: false,
            searchQuery: "",

            loadPageTree: async () => {
                set({ isLoading: true });
                try {
                    const { data } = await api.pages.getTree();
                    set({ pageTree: data });
                } catch (error) {
                    console.error("Failed to load page tree:", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            selectPage: (id) => set({ selectedPageId: id, selectedSmartFolderId: null }),
            selectSmartFolder: (id) => set({ selectedSmartFolderId: id, selectedPageId: null }),

            toggleExpand: async (id) => {
                const { expandedPageIds } = get();
                const next = expandedPageIds.includes(id)
                    ? expandedPageIds.filter((eid) => eid !== id)
                    : [...expandedPageIds, id];

                set({ expandedPageIds: next });
                try {
                    await api.pages.toggleCollapse(id);
                } catch (error) {
                    console.error("Failed to toggle collapse on server:", error);
                }
            },

            createPage: async (input) => {
                set({ isLoading: true });
                try {
                    const { data } = await api.pages.create(input);
                    await get().loadPageTree();
                    set({ selectedPageId: data.id, selectedSmartFolderId: null });
                    if (input.parentId) {
                        const { expandedPageIds } = get();
                        if (!expandedPageIds.includes(input.parentId)) {
                            set({ expandedPageIds: [...expandedPageIds, input.parentId] });
                        }
                    }
                    return data.id;
                } catch (error) {
                    console.error("Failed to create page:", error);
                    return null;
                } finally {
                    set({ isLoading: false });
                }
            },

            addRecentView: (id, title) => {
                const { recentViews } = get();
                const filtered = recentViews.filter((r) => r.id !== id);
                const next = [{ id, title, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
                set({ recentViews: next });
            },

            setSearchQuery: (query) => set({ searchQuery: query }),
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
