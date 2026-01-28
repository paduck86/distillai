"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Plus,
    ChevronRight,
    ChevronDown,
    Star,
    Clock,
    List,
    X,
    Settings,
    Moon,
    Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageStore, getFlattenedPages } from "@/store/usePageStore";
import { useThemeStore } from "@/store/useThemeStore";
import PageTree from "./PageTree";

export default function Sidebar() {
    const router = useRouter();
    const { theme, toggleTheme } = useThemeStore();
    const {
        pageTree,
        loadPageTree,
        searchQuery,
        setSearchQuery,
        selectedSmartFolderId,
        selectSmartFolder,
        recentViews,
        createPage
    } = usePageStore();

    useEffect(() => {
        loadPageTree();
    }, [loadPageTree]);

    const flattenedPages = getFlattenedPages(pageTree);
    const filteredPages = searchQuery.trim()
        ? flattenedPages.filter(p => (p.title || "Untitled").toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    return (
        <aside
            className="w-64 h-full flex flex-col overflow-hidden transition-colors duration-200"
            style={{
                backgroundColor: "var(--sidebar-background)",
                borderRight: "1px solid var(--border)"
            }}
        >
            {/* Search Box */}
            <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                        style={{ color: "var(--foreground-tertiary)" }}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="검색..."
                        className="w-full pl-9 pr-8 py-2 rounded-md text-sm outline-none transition-all"
                        style={{
                            backgroundColor: "var(--background-hover)",
                            color: "var(--foreground)",
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-70"
                        >
                            <X className="w-3 h-3" style={{ color: "var(--foreground-tertiary)" }} />
                        </button>
                    )}
                </div>

                {/* Search Results Overlay */}
                {searchQuery && (
                    <div
                        className="mt-2 max-h-60 overflow-y-auto rounded-lg shadow-lg z-50 relative"
                        style={{
                            backgroundColor: "var(--card-background)",
                            border: "1px solid var(--border)"
                        }}
                    >
                        {filteredPages.length > 0 ? (
                            filteredPages.slice(0, 10).map((page) => (
                                <button
                                    key={page.id}
                                    onClick={() => {
                                        router.push(`/page/${page.id}`);
                                        setSearchQuery("");
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer"
                                    style={{ color: "var(--foreground)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--background-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                >
                                    <span className="truncate">{page.title || "Untitled"}</span>
                                </button>
                            ))
                        ) : (
                            <div
                                className="px-3 py-4 text-center text-sm"
                                style={{ color: "var(--foreground-secondary)" }}
                            >
                                결과가 없습니다
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* New Page Button */}
            <div className="px-3 pb-3 shrink-0">
                <button
                    onClick={async () => {
                        const newPageId = await createPage({});
                        if (newPageId) {
                            router.push(`/page/${newPageId}`);
                        }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">새 페이지</span>
                </button>
            </div>

            {/* Quick Access */}
            <div className="px-2 pb-2 shrink-0">
                <div className="px-2 py-1.5 flex items-center gap-2">
                    <span
                        className="text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: "var(--foreground-tertiary)" }}
                    >
                        빠른 접근
                    </span>
                </div>

                <nav className="space-y-0.5">
                    <SidebarButton
                        icon={<List className="w-4 h-4" />}
                        label="전체"
                        active={selectedSmartFolderId === "all"}
                        onClick={() => selectSmartFolder("all")}
                    />
                    <SidebarButton
                        icon={<Star className={cn("w-4 h-4", selectedSmartFolderId === "favorites" && "fill-current")} />}
                        label="즐겨찾기"
                        active={selectedSmartFolderId === "favorites"}
                        onClick={() => selectSmartFolder("favorites")}
                    />
                    <SidebarButton
                        icon={<Clock className="w-4 h-4" />}
                        label="최근 본 항목"
                        active={selectedSmartFolderId === "recent"}
                        onClick={() => selectSmartFolder("recent")}
                    />
                </nav>
            </div>

            <div className="mx-3" style={{ borderTop: "1px solid var(--border)" }} />

            {/* Page Tree */}
            <PageTree />

            {/* Footer */}
            <div
                className="mt-auto px-3 py-3 shrink-0 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--border)" }}
            >
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    {theme === "light" ? (
                        <Moon className="w-4 h-4" />
                    ) : (
                        <Sun className="w-4 h-4" />
                    )}
                    <span className="text-xs">{theme === "light" ? "다크 모드" : "라이트 모드"}</span>
                </button>
                <button
                    className="p-1.5 rounded-md transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-tertiary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </aside>
    );
}

function SidebarButton({
    icon,
    label,
    active,
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
            style={{
                backgroundColor: active ? "var(--sidebar-active)" : "transparent",
                color: active ? "var(--foreground)" : "var(--foreground-secondary)",
                fontWeight: active ? 500 : 400
            }}
            onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
            }}
            onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "transparent";
            }}
        >
            {icon}
            <span className="flex-1 text-left">{label}</span>
        </button>
    );
}
