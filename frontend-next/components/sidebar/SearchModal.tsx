"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, Command } from "lucide-react";
import { usePageStore, getFlattenedPages } from "@/store/usePageStore";
import { PageTreeNode } from "@/lib/types";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState("");
    const { pageTree, recentViews, selectPage } = usePageStore();

    const flattenedPages = useMemo(() => getFlattenedPages(pageTree), [pageTree]);

    // Build parent path for a page
    const getParentPath = (pageId: string): string => {
        const buildPath = (nodes: PageTreeNode[], targetId: string, path: string[] = []): string[] | null => {
            for (const node of nodes) {
                if (node.id === targetId) {
                    return path;
                }
                if (node.children) {
                    const found = buildPath(node.children, targetId, [...path, node.title || "Untitled"]);
                    if (found) return found;
                }
            }
            return null;
        };
        const path = buildPath(pageTree, pageId) || [];
        return path.join(" / ");
    };

    // Filter pages based on query
    const filteredPages = useMemo(() => {
        if (!query.trim()) return [];
        return flattenedPages.filter(p =>
            (p.title || "Untitled").toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);
    }, [query, flattenedPages]);

    // Get today's date string
    const getTodayLabel = (): string => {
        const today = new Date();
        return `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
    };

    // Get recent pages with full info
    const recentPages = useMemo(() => {
        return recentViews
            .slice(0, 5)
            .map(rv => {
                const page = flattenedPages.find(p => p.id === rv.id);
                return page ? { ...page, viewedAt: rv.viewedAt } : null;
            })
            .filter(Boolean) as (PageTreeNode & { viewedAt: string })[];
    }, [recentViews, flattenedPages]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }
    }, [isOpen, onClose]);

    const handlePageClick = (pageId: string) => {
        selectPage(pageId);
        router.push(`/page/${pageId}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-[600px] mx-4 rounded-xl shadow-2xl overflow-hidden"
                style={{
                    backgroundColor: "var(--card-background)",
                    border: "1px solid var(--border)"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    <Search
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "var(--foreground-tertiary)" }}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="검색..."
                        className="flex-1 bg-transparent outline-none text-base"
                        style={{ color: "var(--foreground)" }}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="p-1 rounded hover:opacity-70"
                        >
                            <X className="w-4 h-4" style={{ color: "var(--foreground-tertiary)" }} />
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto">
                    {query.trim() ? (
                        // Search Results
                        filteredPages.length > 0 ? (
                            <div className="py-2">
                                {filteredPages.map((page) => (
                                    <SearchResultItem
                                        key={page.id}
                                        page={page}
                                        parentPath={getParentPath(page.id)}
                                        onClick={() => handlePageClick(page.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div
                                className="px-4 py-8 text-center text-sm"
                                style={{ color: "var(--foreground-secondary)" }}
                            >
                                검색 결과가 없습니다
                            </div>
                        )
                    ) : (
                        // Recent Pages
                        recentPages.length > 0 && (
                            <div className="py-2">
                                <div
                                    className="px-4 py-2 text-xs font-medium"
                                    style={{ color: "var(--foreground-tertiary)" }}
                                >
                                    오늘 — {getTodayLabel()}
                                </div>
                                {recentPages.map((page) => (
                                    <SearchResultItem
                                        key={page.id}
                                        page={page}
                                        parentPath={getParentPath(page.id)}
                                        onClick={() => handlePageClick(page.id)}
                                    />
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer with keyboard shortcuts */}
                <div
                    className="flex items-center gap-4 px-4 py-2 text-xs"
                    style={{
                        borderTop: "1px solid var(--border)",
                        color: "var(--foreground-tertiary)"
                    }}
                >
                    <div className="flex items-center gap-1">
                        <kbd
                            className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{
                                backgroundColor: "var(--background-hover)",
                                border: "1px solid var(--border)"
                            }}
                        >
                            ↵
                        </kbd>
                        <span>열기</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd
                            className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{
                                backgroundColor: "var(--background-hover)",
                                border: "1px solid var(--border)"
                            }}
                        >
                            esc
                        </kbd>
                        <span>닫기</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SearchResultItem({
    page,
    parentPath,
    onClick
}: {
    page: PageTreeNode;
    parentPath: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer"
            style={{ color: "var(--foreground)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--background-hover)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
            <FileText
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--foreground-tertiary)" }}
            />
            <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium">
                    {page.title || "Untitled"}
                </div>
                {parentPath && (
                    <div
                        className="truncate text-xs mt-0.5"
                        style={{ color: "var(--foreground-tertiary)" }}
                    >
                        {parentPath}
                    </div>
                )}
            </div>
        </button>
    );
}
