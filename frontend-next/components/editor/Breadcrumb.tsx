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

    const breadcrumbPath = buildPath(pageTree, pageId) || [];

    // Don't show if page not found in tree
    if (breadcrumbPath.length === 0) {
        return null;
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
