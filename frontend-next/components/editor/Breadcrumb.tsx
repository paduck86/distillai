"use client";

import { usePageStore } from "@/store/usePageStore";
import { PageTreeNode } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface BreadcrumbProps {
    pageId: string;
}

export default function Breadcrumb({ pageId }: BreadcrumbProps) {
    const { pageTree, selectPage } = usePageStore();
    const router = useRouter();

    // Build breadcrumb path from root to current page
    const buildPath = (nodes: PageTreeNode[], targetId: string, path: PageTreeNode[] = []): PageTreeNode[] | null => {
        for (const node of nodes) {
            if (node.id === targetId) {
                return [...path, node];
            }
            if (node.children) {
                const found = buildPath(node.children, targetId, [...path, node]);
                if (found) return found;
            }
        }
        return null;
    };

    let breadcrumbPath = buildPath(pageTree, pageId) || [];

    // For temp pages or pages not yet in tree, create a minimal breadcrumb
    if (breadcrumbPath.length === 0) {
        // Check if this is a temp page or newly created page
        const isTempPage = pageId.startsWith('temp-');

        // Try to find parent if this page has one (look for it in all nodes)
        const findParentPath = (nodes: PageTreeNode[]): PageTreeNode[] | null => {
            for (const node of nodes) {
                // Check if any child matches our pageId
                if (node.children?.some(child => child.id === pageId)) {
                    const parentPath = buildPath(pageTree, node.id);
                    return parentPath;
                }
                if (node.children) {
                    const found = findParentPath(node.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const parentPath = findParentPath(pageTree);

        if (parentPath) {
            // We have a parent path, add current page placeholder
            breadcrumbPath = [...parentPath, {
                id: pageId,
                title: "New page",
                parentId: parentPath[parentPath.length - 1]?.id || null,
                pageIcon: null,
                isFolder: false,
                collapsed: false,
                position: 0,
                status: "pending" as const,
                sourceType: "note" as const,
                audioUrl: null,
                durationSeconds: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                depth: parentPath.length,
                children: [],
            }];
        } else if (isTempPage) {
            // Root-level temp page - show minimal breadcrumb
            breadcrumbPath = [{
                id: pageId,
                title: "New page",
                parentId: null,
                pageIcon: null,
                isFolder: false,
                collapsed: false,
                position: 0,
                status: "pending" as const,
                sourceType: "note" as const,
                audioUrl: null,
                durationSeconds: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                depth: 0,
                children: [],
            }];
        } else {
            // Page truly not found - don't show breadcrumb
            return null;
        }
    }

    // Remove the last item (current page) from the clickable path
    const parentPath = breadcrumbPath.slice(0, -1);
    const currentPage = breadcrumbPath[breadcrumbPath.length - 1];

    const handleClick = (id: string) => {
        selectPage(id);
        router.push(`/page/${id}`);
    };

    return (
        <nav className="flex items-center gap-1 text-sm mb-4 flex-wrap">
            {parentPath.map((node, index) => (
                <div key={node.id} className="flex items-center gap-1">
                    <button
                        onClick={() => handleClick(node.id)}
                        className="px-1 py-0.5 rounded transition-colors truncate max-w-[200px]"
                        style={{ color: "var(--foreground-secondary)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--background-hover)";
                            e.currentTarget.style.color = "var(--foreground)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--foreground-secondary)";
                        }}
                    >
                        {node.pageIcon && <span className="mr-1">{node.pageIcon}</span>}
                        {node.title || "Untitled"}
                    </button>
                    <ChevronRight
                        className="w-3 h-3 flex-shrink-0"
                        style={{ color: "var(--foreground-tertiary)" }}
                    />
                </div>
            ))}
            <span
                className="px-1 py-0.5 truncate max-w-[200px]"
                style={{ color: "var(--foreground-secondary)" }}
            >
                {currentPage?.pageIcon && <span className="mr-1">{currentPage.pageIcon}</span>}
                {currentPage?.title || "Untitled"}
            </span>
        </nav>
    );
}
