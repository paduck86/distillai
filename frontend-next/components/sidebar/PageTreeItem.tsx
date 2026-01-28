"use client";

import { useMemo } from "react";
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

interface PageTreeItemProps {
    page: PageTreeNode;
    depth: number;
}

export default function PageTreeItem({ page, depth }: PageTreeItemProps) {
    const router = useRouter();
    const {
        selectedPageId,
        expandedPageIds,
        selectPage,
        toggleExpand,
        createPage
    } = usePageStore();

    const isSelected = selectedPageId === page.id;
    const isExpanded = expandedPageIds.includes(page.id);
    const hasChildren = page.children && page.children.length > 0;

    const handleClick = () => {
        selectPage(page.id);
        router.push(`/page/${page.id}`);
    };

    const handleCreateSubPage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // @ts-ignore
            const newPage = await createPage({ parentId: page.id });
            if (newPage?.id) {
                router.push(`/page/${newPage.id}`);
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
        <div className="flex flex-col">
            <div
                className="group flex items-center gap-1.5 py-1 cursor-pointer transition-colors duration-150 rounded-md mx-1"
                style={{
                    paddingLeft: `${depth * 12 + 12}px`,
                    paddingRight: "8px",
                    backgroundColor: isSelected ? "var(--sidebar-active)" : "transparent",
                    color: isSelected ? "var(--foreground)" : "var(--foreground-secondary)"
                }}
                onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
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

                {/* Title */}
                <span className="truncate text-sm flex-1">
                    {page.title || "Untitled"}
                </span>

                {/* Actions (Hover) */}
                <div
                    className="hidden group-hover:flex items-center gap-1"
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
                    <button
                        className="p-1 rounded transition-colors"
                        style={{ backgroundColor: "transparent" }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--background-hover)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Context menu
                        }}
                    >
                        <MoreHorizontal className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Children */}
            {isExpanded && page.children && (
                <div className="flex flex-col">
                    {page.children.map((child) => (
                        <PageTreeItem key={child.id} page={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}
