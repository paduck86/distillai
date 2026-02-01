"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
    Trash2,
    Home,
    LogOut,
    User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageStore, getFlattenedPages } from "@/store/usePageStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useAuthStore } from "@/store/useAuthStore";
import PageTree from "./PageTree";
import SearchModal from "./SearchModal";

export default function Sidebar() {
    const router = useRouter();
    const { theme, toggleTheme } = useThemeStore();
    const { user, signOut } = useAuthStore();
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [mounted, setMounted] = useState(false);
    const userButtonRef = useRef<HTMLButtonElement>(null);
    const {
        pageTree,
        loadPageTree,
        createPage,
        selectedSmartFolderId,
        selectSmartFolder,
    } = usePageStore();

    useEffect(() => {
        setMounted(true);
    }, []);

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

    const handleCreatePage = async () => {
        const newPageId = await createPage({ title: "New page" });
        if (newPageId) {
            router.push(`/page/${newPageId}`);
        }
    };

    // Get user display name and initial
    const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '사용자';
    const userInitial = userDisplayName.charAt(0).toUpperCase();
    const userAvatar = user?.user_metadata?.avatar_url;

    return (
        <aside
            className="w-64 h-full flex flex-col overflow-hidden transition-colors duration-200"
            style={{
                backgroundColor: "var(--sidebar-background)",
                borderRight: "1px solid var(--border)"
            }}
        >
            {/* User Profile Section */}
            <div className="px-2 pt-2.5 pb-1 shrink-0">
                <div className="relative">
                    <button
                        ref={userButtonRef}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors cursor-pointer group"
                        style={{ color: "var(--foreground)" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                        {/* Avatar */}
                        {userAvatar ? (
                            <img
                                src={userAvatar}
                                alt={userDisplayName}
                                className="w-5 h-5 rounded-sm object-cover"
                            />
                        ) : (
                            <div
                                className="w-5 h-5 rounded-sm flex items-center justify-center text-[11px] font-medium"
                                style={{
                                    backgroundColor: "var(--color-primary)",
                                    color: "white"
                                }}
                            >
                                {userInitial}
                            </div>
                        )}
                        <span className="flex-1 text-left text-sm font-medium truncate">
                            {userDisplayName}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                    </button>

                    {/* User Dropdown Menu - Rendered via Portal */}
                    {showUserMenu && mounted && createPortal(
                        <>
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setShowUserMenu(false)}
                            />
                            <div
                                className="fixed z-[9999] rounded-md shadow-lg overflow-hidden"
                                style={{
                                    backgroundColor: "var(--card-background)",
                                    border: "1px solid var(--border)",
                                    top: userButtonRef.current ? userButtonRef.current.getBoundingClientRect().bottom + 4 : 0,
                                    left: userButtonRef.current ? userButtonRef.current.getBoundingClientRect().left : 0,
                                    width: userButtonRef.current ? userButtonRef.current.getBoundingClientRect().width : 'auto',
                                }}
                            >
                                <div className="p-1">
                                    <button
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            router.push("/settings");
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer"
                                        style={{ color: "var(--foreground-secondary)" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span>설정</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            toggleTheme();
                                            setShowUserMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer"
                                        style={{ color: "var(--foreground-secondary)" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        {theme === "light" ? (
                                            <Moon className="w-4 h-4" />
                                        ) : (
                                            <Sun className="w-4 h-4" />
                                        )}
                                        <span>{theme === "light" ? "다크 모드" : "라이트 모드"}</span>
                                    </button>
                                    <div className="my-1" style={{ borderTop: "1px solid var(--border)" }} />
                                    <button
                                        onClick={async () => {
                                            setShowUserMenu(false);
                                            await signOut();
                                            router.push("/login");
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors cursor-pointer"
                                        style={{ color: "var(--color-error)" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>로그아웃</span>
                                    </button>
                                </div>
                            </div>
                        </>,
                        document.body
                    )}
                </div>
            </div>

            {/* Search & New Page */}
            <div className="px-2 pb-1 shrink-0 space-y-0.5">
                {/* Search Button - Notion style */}
                <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Search className="w-4 h-4" />
                    <span className="flex-1 text-left">검색</span>
                    <kbd
                        className="px-1.5 py-0.5 rounded text-[10px]"
                        style={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground-tertiary)"
                        }}
                    >
                        ⌘K
                    </kbd>
                </button>

                {/* Home */}
                <button
                    onClick={() => {
                        selectSmartFolder("all");
                        router.push("/dashboard");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Home className="w-4 h-4" />
                    <span>홈</span>
                </button>

                {/* New Page */}
                <button
                    onClick={handleCreatePage}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer"
                    style={{ color: "var(--foreground-secondary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sidebar-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <Plus className="w-4 h-4" />
                    <span>새 페이지</span>
                </button>
            </div>

            {/* Search Modal */}
            <SearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                userName={userDisplayName}
            />

            <div className="mx-3 mt-1 mb-2" style={{ borderTop: "1px solid var(--border)" }} />

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
