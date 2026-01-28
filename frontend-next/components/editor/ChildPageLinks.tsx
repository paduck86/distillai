"use client";

import { usePageStore } from "@/store/usePageStore";
import { PageTreeNode } from "@/lib/types";
import { FileText, Folder, File, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChildPageLinksProps {
    pageId: string;
}

export default function ChildPageLinks({ pageId }: ChildPageLinksProps) {
    const { pageTree } = usePageStore();

    // Recursive helper to find node
    const findNode = (nodes: PageTreeNode[], id: string): PageTreeNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findNode(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const currentNode = findNode(pageTree, pageId);

    if (!currentNode || !currentNode.children || currentNode.children.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1 mb-6 px-4 md:px-12 max-w-4xl mx-auto">
            {currentNode.children.map((child) => (
                <Link
                    key={child.id}
                    href={`/page/${child.id}`}
                    className="flex items-center gap-2 p-2 rounded transition-colors group"
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
                    <FileText className="w-4 h-4" style={{ color: "var(--foreground-tertiary)" }} />
                    <span
                        className="pb-0.5"
                        style={{ borderBottom: "1px solid var(--border)" }}
                    >
                        {child.title || "Untitled"}
                    </span>
                </Link>
            ))}
        </div>
    );
}
