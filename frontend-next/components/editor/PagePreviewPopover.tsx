"use client";
// Force rebuild v3 - instant show/hide on hover
import { useState, useEffect, useCallback, useRef } from "react";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";
import { usePageStore } from "@/store/usePageStore";

interface PagePreviewData {
    id: string;
    title: string;
    pageIcon?: string;
    breadcrumb: string[];
    preview: string;
    isPreviewLoading: boolean;
}

interface PopoverPosition {
    x: number;
    top: number | null;
    bottom: number | null;
}

export default function PagePreviewPopover() {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<PopoverPosition>({ x: 0, top: null, bottom: null });
    const [pageData, setPageData] = useState<PagePreviewData | null>(null);
    const currentPageIdRef = useRef<string | null>(null);
    const currentAnchorRef = useRef<HTMLAnchorElement | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Get pageTree from store to build breadcrumb
    const pageTree = usePageStore((state) => state.pageTree);

    // Find page info from pageTree
    const findPageInTree = useCallback((targetId: string, nodes: any[]): any | null => {
        for (const node of nodes) {
            if (node.id === targetId) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const found = findPageInTree(targetId, node.children);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Build breadcrumb path for a page
    const buildBreadcrumb = useCallback((targetId: string, nodes: any[], path: string[] = []): string[] | null => {
        for (const node of nodes) {
            if (node.id === targetId) {
                return path;
            }
            if (node.children && node.children.length > 0) {
                const result = buildBreadcrumb(targetId, node.children, [...path, node.title || "Untitled"]);
                if (result) return result;
            }
        }
        return null;
    }, []);

    // Initialize with pageTree data instantly, then fetch preview from API
    const initializePageData = useCallback((pageId: string) => {
        // Skip if same page
        if (currentPageIdRef.current === pageId && pageData?.id === pageId) {
            return;
        }

        currentPageIdRef.current = pageId;

        // Instantly show data from pageTree
        const pageInfo = findPageInTree(pageId, pageTree);
        const breadcrumb = buildBreadcrumb(pageId, pageTree) || [];

        // Set initial data immediately (from pageTree)
        setPageData({
            id: pageId,
            title: pageInfo?.title || "Untitled",
            pageIcon: pageInfo?.pageIcon || undefined,
            breadcrumb,
            preview: "",
            isPreviewLoading: true
        });

        // Fetch preview content from API in background
        (async () => {
            try {
                const { data: blocks } = await api.blocks.get(pageId);

                // Build preview from first few blocks (skip title heading)
                let preview = "";
                const contentBlocks = blocks?.slice(0, 8) || [];
                for (const block of contentBlocks) {
                    if (block.content && typeof block.content === "string") {
                        // Skip if it's just the title
                        if (block.type === "heading1" && block.content === (pageInfo?.title || "")) continue;
                        preview += block.content + " ";
                        if (preview.length > 150) break;
                    }
                }
                preview = preview.trim().slice(0, 150);
                if (preview.length === 150) preview += "...";

                // Update with preview (only if still showing same page)
                if (currentPageIdRef.current === pageId) {
                    setPageData(prev => prev ? {
                        ...prev,
                        preview,
                        isPreviewLoading: false
                    } : null);
                }
            } catch (error) {
                console.error("Failed to fetch page preview:", error);
                if (currentPageIdRef.current === pageId) {
                    setPageData(prev => prev ? {
                        ...prev,
                        isPreviewLoading: false
                    } : null);
                }
            }
        })();
    }, [pageTree, findPageInTree, buildBreadcrumb, pageData?.id]);

    // Set up event listeners
    useEffect(() => {
        const showPopover = (anchor: HTMLAnchorElement, pageId: string) => {
            currentAnchorRef.current = anchor;

            const rect = anchor.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const popoverHeight = 220;
            const popoverWidth = 256;
            const gap = 8;

            let x = rect.left;
            if (x + popoverWidth > viewportWidth - 16) {
                x = viewportWidth - popoverWidth - 16;
            }
            if (x < 16) {
                x = 16;
            }

            const spaceBelow = viewportHeight - rect.bottom;
            const showAbove = spaceBelow < popoverHeight + gap;

            if (showAbove) {
                setPosition({
                    x,
                    top: null,
                    bottom: viewportHeight - rect.top + gap
                });
            } else {
                setPosition({
                    x,
                    top: rect.bottom + gap,
                    bottom: null
                });
            }

            setIsVisible(true);
            initializePageData(pageId);
        };

        const hidePopover = () => {
            currentAnchorRef.current = null;
            currentPageIdRef.current = null;
            setIsVisible(false);
            setPageData(null);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a[href^="/page/"]') as HTMLAnchorElement | null;

            if (!anchor) return;

            // Don't show preview while text is being selected/dragged
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && selection.toString().length > 0) {
                return;
            }

            // Don't show preview if mouse button is pressed (dragging)
            if (e.buttons !== 0) return;

            // Only show preview for page links inside the editor (not sidebar)
            const isInEditor = anchor.closest('.bn-editor');
            if (!isInEditor) return;

            const href = anchor.getAttribute('href') || '';
            const pageId = href.replace('/page/', '');

            if (!pageId) return;

            // If already showing for this anchor, skip
            if (currentAnchorRef.current === anchor) return;

            showPopover(anchor, pageId);
        };

        const handleMouseMove = (e: MouseEvent) => {
            // Only check if popover is visible
            if (!currentAnchorRef.current) return;

            const anchor = currentAnchorRef.current;
            const rect = anchor.getBoundingClientRect();

            // Check if mouse is still over the anchor
            const isOverAnchor =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (!isOverAnchor) {
                hidePopover();
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [initializePageData]);

    if (!isVisible) return null;

    return (
        <div
            id="page-preview-popover"
            ref={popoverRef}
            className="fixed z-50 w-64 min-h-[180px] rounded-xl shadow-lg border overflow-hidden pointer-events-none"
            style={{
                left: `${position.x}px`,
                top: position.top !== null ? `${position.top}px` : 'auto',
                bottom: position.bottom !== null ? `${position.bottom}px` : 'auto',
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
        >
            {pageData ? (
                <div className="p-4">
                    {/* Icon */}
                    <div className="mb-3">
                        {pageData.pageIcon ? (
                            <span className="text-4xl">{pageData.pageIcon}</span>
                        ) : (
                            <FileText
                                className="w-10 h-10"
                                style={{ color: 'var(--foreground-secondary)' }}
                            />
                        )}
                    </div>

                    {/* Breadcrumb */}
                    {pageData.breadcrumb.length > 0 && (
                        <div
                            className="text-xs mb-1 truncate"
                            style={{ color: 'var(--foreground-tertiary)' }}
                        >
                            {pageData.breadcrumb.join(' / ')}
                        </div>
                    )}

                    {/* Title */}
                    <div
                        className="font-semibold text-base mb-3"
                        style={{ color: 'var(--foreground)' }}
                    >
                        {pageData.title}
                    </div>

                    {/* Preview */}
                    <div
                        className="text-sm min-h-[40px]"
                        style={{ color: 'var(--foreground-secondary)' }}
                    >
                        {pageData.isPreviewLoading ? (
                            <div className="flex items-center gap-2">
                                <div
                                    className="animate-spin w-3 h-3 border border-t-transparent rounded-full"
                                    style={{ borderColor: 'var(--foreground-tertiary)', borderTopColor: 'transparent' }}
                                />
                                <span style={{ color: 'var(--foreground-tertiary)' }}>로딩 중...</span>
                            </div>
                        ) : pageData.preview ? (
                            <div className="line-clamp-3">{pageData.preview}</div>
                        ) : (
                            <span style={{ color: 'var(--foreground-tertiary)' }}>내용 없음</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-4 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    페이지를 불러올 수 없습니다.
                </div>
            )}
        </div>
    );
}
