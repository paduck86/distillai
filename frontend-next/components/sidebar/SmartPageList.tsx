"use client";

import { usePageStore, getFlattenedPages } from "@/store/usePageStore";
import PageTreeItem from "./PageTreeItem";
import { File, Star, Clock } from "lucide-react";

interface SmartPageListProps {
    type: "favorites" | "recent";
}

export function SmartPageList({ type }: SmartPageListProps) {
    const { pageTree, favorites, recentViews } = usePageStore();

    // Flatten the tree to easily lookup nodes by ID
    const allPages = getFlattenedPages(pageTree);

    let itemsInfo: { id: string, title?: string }[] = [];

    if (type === "favorites") {
        itemsInfo = favorites.map(id => ({ id }));
    } else {
        itemsInfo = recentViews.map(view => ({ id: view.id, title: view.title }));
    }

    if (itemsInfo.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: "var(--background-hover)" }}
                >
                    {type === "favorites" ? (
                        <Star className="w-5 h-5" style={{ color: "var(--foreground-tertiary)" }} />
                    ) : (
                        <Clock className="w-5 h-5" style={{ color: "var(--foreground-tertiary)" }} />
                    )}
                </div>
                <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                    {type === "favorites" ? "즐겨찾기한 페이지가 없습니다" : "최근 본 페이지가 없습니다"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {itemsInfo.map((item) => {
                const pageNode = allPages.find(p => p.id === item.id);

                // If page not found (e.g. deleted but still in recents/favorites), skip or show placeholder.
                // For a polished UI, we should probably clean up the store, but skipping is safe for now.
                if (!pageNode) return null;

                return (
                    <PageTreeItem key={item.id} page={pageNode} depth={0} />
                );
            })}
        </div>
    );
}
