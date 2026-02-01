"use client";

import { useMemo, useState, useRef, useEffect, DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronRight,
    ChevronDown,
    Plus,
    MoreHorizontal,
    FileEdit,
    Youtube,
    Mic,
    Volume2,
    Video,
    FileText,
    Link as LinkIcon,
    Globe,
    Twitter,
    Clipboard,
    Folder
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTreeNode, SourceType } from "@/lib/types";
import { usePageStore } from "@/store/usePageStore";
import { SidebarMenu } from "@/components/sidebar/SidebarMenu";
import { SidebarLoadingItem } from "@/components/sidebar/SidebarLoadingItem";
import { toast } from "sonner";

interface PageTreeItemProps {
    page: PageTreeNode;
    depth: number;
    index: number;
    parentId: string | null;
}

export default function PageTreeItem({ page, depth, index, parentId }: PageTreeItemProps) {
    const router = useRouter();
    const {
        selectedPageId,
        expandedPageIds,
        favorites,
        selectPage,
        toggleExpand,
        createPage,
        renamePage,
        deletePage,
        duplicatePage,
        toggleFavorite,
        duplicatingPageId,
        draggingPageId,
        setDraggingPageId,
        movePage
    } = usePageStore();

    const isSelected = selectedPageId === page.id;
    const isExpanded = expandedPageIds.includes(page.id);
    const isFavorite = favorites.includes(page.id);
    const hasChildren = page.children && page.children.length > 0;

    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(page.title);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [dropPosition, setDropPosition] = useState<"before" | "inside" | "after" | null>(null);
    const itemRef = useRef<HTMLDivElement>(null);

    const isDragging = draggingPageId === page.id;

    // Drag handlers
    const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", page.id);
        setDraggingPageId(page.id);
    };

    const handleDragEnd = () => {
        setDraggingPageId(null);
        setDropPosition(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggingPageId === page.id) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;

        // 상단 25%: before, 중간 50%: inside, 하단 25%: after
        if (y < height * 0.25) {
            setDropPosition("before");
        } else if (y > height * 0.75) {
            setDropPosition("after");
        } else {
            setDropPosition("inside");
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        // 자식 요소로 이동하는 경우는 무시
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropPosition(null);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === page.id) {
            setDropPosition(null);
            return;
        }

        if (dropPosition === "before") {
            await movePage(draggedId, parentId, index);
        } else if (dropPosition === "after") {
            await movePage(draggedId, parentId, index + 1);
        } else if (dropPosition === "inside") {
            // 하위 페이지로 이동 (첫 번째 위치)
            await movePage(draggedId, page.id, 0);
            // 부모 expand
            if (!expandedPageIds.includes(page.id)) {
                toggleExpand(page.id);
            }
        }

        setDropPosition(null);
        setDraggingPageId(null);
    };

    const handleClick = () => {
        if (isRenaming) return;
        selectPage(page.id);
        usePageStore.getState().addRecentView(page.id, page.title);
        router.push(`/page/${page.id}`);
    };

    const handleRenameSubmit = async () => {
        if (!renameValue.trim() || renameValue === page.title) {
            setIsRenaming(false);
            setRenameValue(page.title);
            return;
        }
        await renamePage(page.id, renameValue);
        setIsRenaming(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleRenameSubmit();
        } else if (e.key === "Escape") {
            setIsRenaming(false);
            setRenameValue(page.title);
        }
    };

    const handleCreateSubPage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            const newPageId = await createPage({ parentId: page.id, title: "New page" });
            if (newPageId) {
                router.push(`/page/${newPageId}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const Icon = useMemo(() => {
        if (page.pageIcon) return null;

        switch (page.sourceType) {
            case "youtube": return Youtube;
            case "recording": return Mic;
            case "audio": return Volume2;
            case "video": return Video;
            case "pdf": return FileText;
            case "url": return LinkIcon;
            case "website": return Globe;
            case "x_thread": return Twitter;
            case "text": return FileEdit;
            case "clipboard": return Clipboard;
            case "note":
            default:
                return page.isFolder ? Folder : FileEdit;
        }
    }, [page.sourceType, page.isFolder, page.pageIcon]);

    const iconColor = useMemo(() => {
        switch (page.sourceType) {
            case "youtube": return "#e03e3e";
            case "recording": return "#0f7b6c";
            case "audio": return "#0f7b6c";
            case "video": return "#9065b0";
            case "pdf": return "#cb912f";
            case "url": return "#2383e2";
            case "x_thread": return "var(--foreground-secondary)";
            default: return "var(--foreground-secondary)";
        }
    }, [page.sourceType]);

    return (
        <div className="flex flex-col relative">
            {/* Drop indicator - before */}
            {dropPosition === "before" && (
                <div
                    className="absolute left-0 right-0 h-0.5 z-10"
                    style={{
                        top: 0,
                        marginLeft: `${depth * 12 + 12}px`,
                        marginRight: "8px",
                        backgroundColor: "var(--color-primary)"
                    }}
                />
            )}

            <div
                ref={itemRef}
                draggable={!isRenaming}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "group flex items-center gap-1.5 py-1 cursor-pointer transition-colors duration-150 rounded-md mx-1",
                    isDragging && "opacity-50"
                )}
                style={{
                    paddingLeft: `${depth * 12 + 12}px`,
                    paddingRight: "8px",
                    backgroundColor: dropPosition === "inside"
                        ? "var(--color-primary-alpha)"
                        : isSelected || isMenuOpen
                            ? "var(--sidebar-active)"
                            : "transparent",
                    color: isSelected ? "var(--foreground)" : "var(--foreground-secondary)",
                    outline: dropPosition === "inside" ? "2px solid var(--color-primary)" : "none",
                    outlineOffset: "-2px"
                }}
                onMouseEnter={(e) => {
                    if (!isSelected && !isMenuOpen && !dropPosition) e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                    if (!isSelected && !isMenuOpen && !dropPosition) e.currentTarget.style.backgroundColor = "transparent";
                }}
                onClick={handleClick}
            >
                {/* Expand Toggle */}
                <div
                    className="w-4 h-4 flex items-center justify-center rounded transition-colors"
                    style={{ color: "var(--foreground-tertiary)" }}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(page.id);
                    }}
                >
                    {(hasChildren || page.isFolder) && (
                        isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    )}
                </div>

                {/* Icon */}
                <div className="shrink-0" style={{ color: iconColor }}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                </div>

                {/* Title or Rename Input */}
                {isRenaming ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-transparent text-sm outline-none border border-blue-400 rounded px-1 -ml-1"
                    />
                ) : (
                    <span className="truncate text-sm flex-1">
                        {page.title || "Untitled"}
                    </span>
                )}

                {/* Actions (Hover) */}
                <div
                    className={cn(
                        "items-center gap-1",
                        isMenuOpen ? "flex" : "hidden group-hover:flex"
                    )}
                    style={{ color: "var(--foreground-tertiary)" }}
                >
                    <button
                        className="p-1 rounded transition-colors"
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--background-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={handleCreateSubPage}
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                    <SidebarMenu
                        pageId={page.id}
                        isFavorite={isFavorite}
                        onOpenChange={setIsMenuOpen}
                        onRename={() => {
                            setRenameValue(page.title);
                            setIsRenaming(true);
                        }}
                        onDelete={async () => {
                            try {
                                console.log('[PageTreeItem] Deleting page:', page.id);
                                await deletePage(page.id);
                                console.log('[PageTreeItem] Page deleted:', page.id);
                                toast.success("페이지가 삭제되었습니다");
                            } catch (err) {
                                console.error('[PageTreeItem] Delete failed:', err);
                                toast.error("페이지 삭제에 실패했습니다");
                            }
                        }}
                        onDuplicate={async () => {
                            try {
                                const newId = await duplicatePage(page.id);
                                if (newId) {
                                    usePageStore.getState().addRecentView(newId, `${page.title} (Copy)`);
                                    router.push(`/page/${newId}`);
                                    toast.success("페이지가 복제되었습니다");
                                }
                            } catch {
                                toast.error("페이지 복제에 실패했습니다");
                            }
                        }}
                        onToggleFavorite={() => {
                            toggleFavorite(page.id);
                            toast.success(isFavorite ? "즐겨찾기에서 제거되었습니다" : "즐겨찾기에 추가되었습니다");
                        }}
                    />
                </div>
            </div>

            {/* Drop indicator - after */}
            {dropPosition === "after" && (
                <div
                    className="absolute left-0 right-0 h-0.5 z-10"
                    style={{
                        bottom: 0,
                        marginLeft: `${depth * 12 + 12}px`,
                        marginRight: "8px",
                        backgroundColor: "var(--color-primary)"
                    }}
                />
            )}

            {/* Children */}
            {(isExpanded || duplicatingPageId === page.id) && (
                <div className="flex flex-col">
                    {page.children && page.children.map((child, childIndex) => (
                        <div key={child.id} className="flex flex-col">
                            {duplicatingPageId === child.id && (
                                <SidebarLoadingItem depth={depth + 1} />
                            )}
                            <PageTreeItem
                                page={child}
                                depth={depth + 1}
                                index={childIndex}
                                parentId={page.id}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
