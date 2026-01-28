"use client";

import { DragEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, File } from "lucide-react";
import { usePageStore } from "@/store/usePageStore";
import PageTreeItem from "./PageTreeItem";
import { SidebarLoadingItem } from "./SidebarLoadingItem";
import { SmartPageList } from "./SmartPageList";
import { cn } from "@/lib/utils";

export default function PageTree() {
    const router = useRouter();
    const {
        pageTree,
        isLoading,
        createPage,
        duplicatingPageId,
        selectedSmartFolderId,
        draggingPageId,
        setDraggingPageId,
        movePage
    } = usePageStore();

    const [showRootDropZone, setShowRootDropZone] = useState(false);

    const handleRootDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (draggingPageId) {
            setShowRootDropZone(true);
        }
    };

    const handleRootDragLeave = (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setShowRootDropZone(false);
        }
    };

    const handleRootDrop = async (e: DragEvent) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId) {
            await movePage(draggedId, null, pageTree.length);
        }
        setShowRootDropZone(false);
        setDraggingPageId(null);
    };

    const handleCreateRootPage = async () => {
        try {
            const newPageId = await createPage({});
            if (newPageId) {
                router.push(`/page/${newPageId}`);
            }
        } catch (error) {
        }
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <ChevronDown className="w-3 h-3" style={{ color: "var(--foreground-tertiary)" }} />
                    <span
                        className="text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: "var(--foreground-tertiary)" }}
                    >
                        {selectedSmartFolderId === "favorites" ? "즐겨찾기" :
                            selectedSmartFolderId === "recent" ? "최근 본 페이지" : "페이지"}
                    </span>
                </div>
                {selectedSmartFolderId === null && (
                    <button
                        onClick={handleCreateRootPage}
                        className="w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer"
                        style={{ color: "var(--foreground-tertiary)" }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--sidebar-hover)";
                            e.currentTarget.style.color = "var(--foreground)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--foreground-tertiary)";
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Tree Content */}
            <div
                className="flex-1 overflow-y-auto px-1 pb-4 scrollbar-thin"
                onDragOver={handleRootDragOver}
                onDragLeave={handleRootDragLeave}
                onDrop={handleRootDrop}
            >
                {selectedSmartFolderId === "favorites" ? (
                    <SmartPageList type="favorites" />
                ) : selectedSmartFolderId === "recent" ? (
                    <SmartPageList type="recent" />
                ) : (
                    <>
                        {isLoading && pageTree.length === 0 ? (
                            <div
                                className="px-4 py-2 text-xs animate-pulse"
                                style={{ color: "var(--foreground-secondary)" }}
                            >
                                로딩 중...
                            </div>
                        ) : pageTree.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                                    style={{ backgroundColor: "var(--background-hover)" }}
                                >
                                    <File className="w-5 h-5" style={{ color: "var(--foreground-tertiary)" }} />
                                </div>
                                <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                    페이지가 없습니다
                                </p>
                                <button
                                    onClick={handleCreateRootPage}
                                    className="mt-2 text-xs font-medium hover:underline cursor-pointer"
                                    style={{ color: "var(--color-primary)" }}
                                >
                                    첫 번째 페이지 만들기
                                </button>
                            </div>
                        ) : (
                            <>
                                {pageTree.map((page, index) => (
                                    <div key={page.id} className="flex flex-col">
                                        {duplicatingPageId === page.id && (
                                            <SidebarLoadingItem depth={0} />
                                        )}
                                        <PageTreeItem
                                            page={page}
                                            depth={0}
                                            index={index}
                                            parentId={null}
                                        />
                                    </div>
                                ))}
                                {/* Root drop zone indicator */}
                                {showRootDropZone && draggingPageId && (
                                    <div
                                        className="mx-3 my-1 h-0.5 rounded"
                                        style={{ backgroundColor: "var(--color-primary)" }}
                                    />
                                )}
                            </>
                        )}
                        {/* Removed old duplicatingParentId logic */}
                    </>
                )}
            </div>
        </div>
    );
}
