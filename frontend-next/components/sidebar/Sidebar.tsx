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
    Sun,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageStore, getFlattenedPages } from "@/store/usePageStore";
import { useThemeStore } from "@/store/useThemeStore";
import PageTree from "./PageTree";
import SearchModal from "./SearchModal";

export default function Sidebar() {
    const router = useRouter();
    const { theme, toggleTheme } = useThemeStore();
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const {
        pageTree,
        loadPageTree,
        selectedSmartFolderId,
        selectSmartFolder,
    } = usePageStore();

    useEffect(() => {
        loadPageTree();
    }, [loadPageTree]);

    // Global keyboard shortcut for search (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchModalOpen(true);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <aside
            className="w-64 h-full flex flex-col overflow-hidden transition-colors duration-200"
            style={{
                backgroundColor: "var(--sidebar-background)",
                borderRight: "1px solid var(--border)"
            }}
        >
            {/* Search Button */}
            <div className="px-3 pt-3 pb-2 shrink-0">
                <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer"
                    style={{
                        backgroundColor: "var(--background-hover)",
                        color: "var(--foreground-tertiary)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
                        e.currentTarget.style.color = "var(--foreground-secondary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--background-hover)";
                        e.currentTarget.style.color = "var(--foreground-tertiary)";
                    }}
                >
                    <Search className="w-3.5 h-3.5" />
                    <span className="flex-1 text-left">검색...</span>
                    <kbd
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)"
                        }}
                    >
                        ⌘K
                    </kbd>
                </button>
            </div>

            {/* Search Modal */}
            <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
            />

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

            {/* Trash */}
            <div className="mt-auto shrink-0">
                <div className="mx-3" style={{ borderTop: "1px solid var(--border)" }} />
                <div className="px-2 py-2">
                    <SidebarButton
                        icon={<Trash2 className="w-4 h-4" />}
                        label="휴지통"
                        active={selectedSmartFolderId === "trash"}
                        onClick={() => {
                            selectSmartFolder("trash");
                            router.push("/trash");
                        }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div
                className="px-3 py-3 shrink-0 flex items-center justify-between"
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
