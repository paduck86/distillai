"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./block-selection.css";
import { Sparkles, FileText, Youtube, Mic, Image as ImageIcon, Link2, Radio } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { usePageStore } from "@/store/usePageStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useShallow } from "zustand/react/shallow";
import AiIngestionModal from "./AiIngestionModal";
import Breadcrumb from "./Breadcrumb";
import RecorderPanel from "./RecorderPanel";
import RecordingBar from "./RecordingBar";


interface EditorProps {
    pageId: string;
}

// Helper to convert rich text content to markdown string
const richTextToMarkdown = (content: any[]): string => {
    if (!Array.isArray(content)) return "";

    return content.map((item: any) => {
        if (item.type === "link") {
            // Convert link to markdown format [text](url)
            const linkText = Array.isArray(item.content)
                ? item.content.map((c: any) => c.text || "").join("")
                : (typeof item.content === "string" ? item.content : "");
            return `[${linkText}](${item.href})`;
        } else if (item.type === "text") {
            let text = item.text || "";
            // Apply styles as markdown
            if (item.styles?.bold) text = `**${text}**`;
            if (item.styles?.italic) text = `*${text}*`;
            if (item.styles?.strike) text = `~~${text}~~`;
            if (item.styles?.code) text = `\`${text}\``;
            return text;
        }
        return item.text || "";
    }).join("");
};

// Helper to flatten BlockNote tree to backend flat structure
const flattenBlocks = (blocks: any[], pageId: string, parentId: string | null = null): any[] => {
    let flat: any[] = [];
    blocks.forEach((block: any, index: number) => {
        // Extract text content from rich text array, preserving links as markdown
        let content = "";
        if (Array.isArray(block.content)) {
            content = richTextToMarkdown(block.content);
        } else if (typeof block.content === "string") {
            content = block.content;
        }

        // Map BlockNote types to backend BlockType
        let type = "text";
        let properties = { ...block.props };

        switch (block.type) {
            case "paragraph":
                type = "text";
                break;
            case "heading":
                if (block.props.level === 1) type = "heading1";
                else if (block.props.level === 2) type = "heading2";
                else if (block.props.level === 3) type = "heading3";
                else type = "heading1";
                break;
            case "bulletListItem":
                type = "bullet";
                break;
            case "numberedListItem":
                type = "numbered";
                break;
            case "checkListItem":
                type = "todo";
                break;
            case "image":
                type = "embed";
                properties.embedType = "image";
                properties.embedUrl = block.props.url;
                break;
            // Add other mappings as needed
            default:
                type = "text"; // Fallback
                console.warn(`Unknown block type: ${block.type}, falling back to text`);
        }

        flat.push({
            id: block.id,
            distillationId: pageId,
            parentId: parentId,
            type: type,
            content: content,
            properties: properties,
            position: index
        });

        if (block.children && block.children.length > 0) {
            flat = flat.concat(flattenBlocks(block.children, pageId, block.id));
        }
    });
    return flat;
};

// Parse inline markdown to BlockNote rich text format
// Supports: **bold**, *italic*, ~~strikethrough~~, `code`, [link](url)
const parseInlineMarkdown = (text: string): any[] => {
    if (!text) return [];

    const result: any[] = [];
    let remaining = text;
    let i = 0;

    while (i < remaining.length) {
        // Try bold first: **text**
        if (remaining.slice(i, i + 2) === "**") {
            const endIdx = remaining.indexOf("**", i + 2);
            if (endIdx !== -1) {
                if (i > 0) {
                    result.push({ type: "text", text: remaining.slice(0, i), styles: {} });
                }
                const boldText = remaining.slice(i + 2, endIdx);
                result.push({ type: "text", text: boldText, styles: { bold: true } });
                remaining = remaining.slice(endIdx + 2);
                i = 0;
                continue;
            }
        }

        // Try strikethrough: ~~text~~
        if (remaining.slice(i, i + 2) === "~~") {
            const endIdx = remaining.indexOf("~~", i + 2);
            if (endIdx !== -1) {
                if (i > 0) {
                    result.push({ type: "text", text: remaining.slice(0, i), styles: {} });
                }
                const strikeText = remaining.slice(i + 2, endIdx);
                result.push({ type: "text", text: strikeText, styles: { strike: true } });
                remaining = remaining.slice(endIdx + 2);
                i = 0;
                continue;
            }
        }

        // Try italic: *text* (not preceded by *)
        if (remaining[i] === "*" && remaining[i + 1] !== "*" && (i === 0 || remaining[i - 1] !== "*")) {
            const endIdx = remaining.indexOf("*", i + 1);
            if (endIdx !== -1 && endIdx > i + 1 && remaining[endIdx - 1] !== "*") {
                if (i > 0) {
                    result.push({ type: "text", text: remaining.slice(0, i), styles: {} });
                }
                const italicText = remaining.slice(i + 1, endIdx);
                result.push({ type: "text", text: italicText, styles: { italic: true } });
                remaining = remaining.slice(endIdx + 1);
                i = 0;
                continue;
            }
        }

        // Try inline code: `text`
        if (remaining[i] === "`") {
            const endIdx = remaining.indexOf("`", i + 1);
            if (endIdx !== -1) {
                if (i > 0) {
                    result.push({ type: "text", text: remaining.slice(0, i), styles: {} });
                }
                const codeText = remaining.slice(i + 1, endIdx);
                result.push({ type: "text", text: codeText, styles: { code: true } });
                remaining = remaining.slice(endIdx + 1);
                i = 0;
                continue;
            }
        }

        // Try link: [text](url)
        const linkMatch = remaining.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            if (i > 0) {
                result.push({ type: "text", text: remaining.slice(0, i), styles: {} });
            }
            // Add underline style for internal page links
            const isPageLink = linkMatch[2].startsWith("/page/");
            result.push({
                type: "link",
                content: [{ type: "text", text: linkMatch[1], styles: isPageLink ? { underline: true } : {} }],
                href: linkMatch[2]
            });
            remaining = remaining.slice(i + linkMatch[0].length);
            i = 0;
            continue;
        }

        i++;
    }

    // Add remaining text
    if (remaining.length > 0) {
        result.push({ type: "text", text: remaining, styles: {} });
    }

    return result.length > 0 ? result : [{ type: "text", text: text, styles: {} }];
};

// Helper to convert backend blocks to BlockNote format
const convertToBlockNoteBlocks = (blocks: any[]): any[] => {
    return blocks.map((block: any) => {
        let type = "paragraph";
        let props: any = {};

        switch (block.type) {
            case "text":
                type = "paragraph";
                break;
            case "heading1":
                type = "heading";
                props.level = 1;
                break;
            case "heading2":
                type = "heading";
                props.level = 2;
                break;
            case "heading3":
                type = "heading";
                props.level = 3;
                break;
            case "bullet":
                type = "bulletListItem";
                break;
            case "numbered":
                type = "numberedListItem";
                break;
            case "todo":
                type = "checkListItem";
                props.checked = block.properties?.checked || false;
                break;
            case "embed":
                if (block.properties?.embedType === "image") {
                    type = "image";
                    props.url = block.properties?.embedUrl || "";
                }
                break;
            default:
                type = "paragraph";
        }

        // Convert content string to rich text array with inline markdown parsing
        const content = block.content
            ? parseInlineMarkdown(block.content)
            : [];

        return {
            id: block.id,
            type,
            props: { ...props, ...block.properties },
            content,
            children: block.children ? convertToBlockNoteBlocks(block.children) : []
        };
    });
};

// Custom filter function
const filterSuggestionItems = (items: any[], query: string) => {
    return items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.aliases && item.aliases.some((alias: string) => alias.toLowerCase().includes(query.toLowerCase())))
    );
};

// Localize default BlockNote items to Korean with Notion-style shortcuts
const localizeDefaultItems = (items: any[]) => {
    const translations: Record<string, { title: string; subtext: string; aliases?: string[] }> = {
        // Headings - Notion shortcuts: # ## ###
        "Heading 1": { title: "제목 1", subtext: "단축키: #︎ + Space", aliases: ["h1", "제목1", "heading1", "#"] },
        "Heading 2": { title: "제목 2", subtext: "단축키: ## + Space", aliases: ["h2", "제목2", "heading2", "##"] },
        "Heading 3": { title: "제목 3", subtext: "단축키: ### + Space", aliases: ["h3", "제목3", "heading3", "###"] },
        // Basic blocks - Notion shortcuts
        "Paragraph": { title: "텍스트", subtext: "일반 텍스트로 작성을 시작하세요", aliases: ["p", "텍스트", "paragraph", "text"] },
        "Bullet List": { title: "글머리 기호 목록", subtext: "단축키: - + Space 또는 * + Space", aliases: ["ul", "글머리", "bullet", "-", "*"] },
        "Numbered List": { title: "번호 매기기 목록", subtext: "단축키: 1. + Space", aliases: ["ol", "번호", "numbered", "1."] },
        "Check List": { title: "할 일 목록", subtext: "단축키: [] + Space", aliases: ["todo", "할일", "check", "checkbox", "[]"] },
        "Toggle List": { title: "토글 목록", subtext: "단축키: > + Space", aliases: ["toggle", "토글", "접기", ">"] },
        "Quote": { title: "인용", subtext: "단축키: \" 또는 |", aliases: ["quote", "인용", "blockquote", "\"", "|"] },
        // Media
        "Image": { title: "이미지", subtext: "이미지를 업로드하거나 링크로 삽입", aliases: ["img", "이미지", "사진", "image"] },
        "Video": { title: "비디오", subtext: "YouTube, Vimeo 등의 동영상 삽입", aliases: ["video", "비디오", "영상"] },
        "Audio": { title: "오디오", subtext: "오디오 파일 업로드 또는 삽입", aliases: ["audio", "오디오", "소리"] },
        "File": { title: "파일", subtext: "파일 업로드 또는 삽입", aliases: ["file", "파일", "첨부"] },
        // Advanced
        "Table": { title: "표", subtext: "간단한 표 추가", aliases: ["table", "표", "테이블"] },
        "Code Block": { title: "코드", subtext: "단축키: ``` + Space", aliases: ["code", "코드", "codeblock", "```"] },
        "Emoji": { title: "이모지", subtext: "단축키: :", aliases: ["emoji", "이모지", "이모티콘", ":"] },
    };

    return items.map(item => {
        const translation = translations[item.title];
        if (translation) {
            return {
                ...item,
                title: translation.title,
                subtext: translation.subtext,
                aliases: [...(item.aliases || []), ...(translation.aliases || [])],
            };
        }
        return item;
    });
};

type IngestionMode = 'youtube' | 'pdf' | 'audio' | 'image' | 'url' | 'record';

export default function BlockNoteEditorComponent({ pageId }: EditorProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [activePanel, setActivePanel] = useState<IngestionMode | null>(null);
    const [panelBlockId, setPanelBlockId] = useState<string | null>(null);  // Track which block has the panel
    const [recorderModalOpen, setRecorderModalOpen] = useState(false);
    const [pageTitle, setPageTitle] = useState("");
    // Use shallow comparison to prevent re-renders when pageTree changes
    // Only subscribe to actions, not state (actions are stable references)
    const { addRecentView, createPage, updatePageTitleLocally, selectPage } = usePageStore(
        useShallow((state) => ({
            addRecentView: state.addRecentView,
            createPage: state.createPage,
            updatePageTitleLocally: state.updatePageTitleLocally,
            selectPage: state.selectPage,
        }))
    );
    const { theme } = useThemeStore();
    const router = useRouter();

    // Helper to find a page by ID in pageTree
    const findPageById = useCallback((nodes: any[], id: string): any | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findPageById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    // Refs for auto-save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef<string>("");
    const lastSavedTitleRef = useRef<string>("");
    const lastChildOrderRef = useRef<string>("");  // Track child page order for instant sidebar updates
    const loadedPageIdRef = useRef<string | null>(null);  // Track if page was already loaded
    const recentlyCreatedPagesRef = useRef<Set<string>>(new Set());  // Track pages created via slash command to prevent duplicate links
    const justLoadedRef = useRef<boolean>(false);  // Track if content was just loaded to prevent immediate useEffect interference
    const isCreatingPageRef = useRef<boolean>(false);  // Track if page is being created to prevent useEffect interference

    // Block selection state
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
    const [selectedPageBlockIds, setSelectedPageBlockIds] = useState<Set<string>>(new Set());  // Track which selected blocks are page links
    const selectedPageBlockIdsRef = useRef<Set<string>>(new Set());  // Sync ref for immediate access in event handlers
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const justSelectedRef = useRef<boolean>(false);  // Prevent immediate clear after Cmd+A

    // Drag selection state
    const isDraggingRef = useRef<boolean>(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const selectionRectRef = useRef<HTMLDivElement | null>(null);

    // Block reorder drag state
    const isReorderingRef = useRef<boolean>(false);
    const reorderGhostRef = useRef<HTMLDivElement | null>(null);
    const dropIndicatorRef = useRef<HTMLDivElement | null>(null);
    const draggedBlockIdsRef = useRef<string[]>([]);
    const selectedBlockIdsRef = useRef<Set<string>>(new Set());  // Sync ref for reorder handler

    // Initialize editor
    const editor = useCreateBlockNote();

    // Subscribe to TipTap transactions for drag-and-drop detection
    useEffect(() => {
        if (!editor) return;

        const tiptapEditor = (editor as any)._tiptapEditor;
        if (!tiptapEditor) return;

        const handleTransaction = ({ transaction }: any) => {
            // Check if this is a drag-and-drop operation (doc changed and steps involve node movement)
            if (transaction.docChanged && transaction.steps.length > 0) {
                // Small delay to ensure BlockNote's document is updated
                setTimeout(() => {
                    const blocks = editor.document;
                    const currentOrder = blocks
                        .filter((block: any) => {
                            if (!Array.isArray(block.content)) return false;
                            return block.content.some((item: any) =>
                                item.type === "link" && item.href?.startsWith("/page/")
                            );
                        })
                        .map((block: any) => {
                            const linkItem = block.content.find((item: any) =>
                                item.type === "link" && item.href?.startsWith("/page/")
                            );
                            return linkItem?.href?.replace("/page/", "") || "";
                        })
                        .filter(Boolean);

                    const currentOrderStr = currentOrder.join(',');

                    if (currentOrderStr !== lastChildOrderRef.current && currentOrder.length > 0) {
                        lastChildOrderRef.current = currentOrderStr;

                        // Update sidebar order
                        api.pages.reorder(currentOrder, pageId)
                            .then(() => usePageStore.getState().loadPageTree())
                            .catch((error) => {
                                console.error("Failed to reorder child pages:", error);
                            });
                    }
                }, 50);
            }
        };

        tiptapEditor.on('transaction', handleTransaction);

        return () => {
            tiptapEditor.off('transaction', handleTransaction);
        };
    }, [editor, pageId]);

    // Helper to filter out blocks that link to pages not in childPageIds
    const removeInvalidPageLinks = useCallback((blocks: any[], childPageIds: Set<string>): any[] => {
        return blocks.filter(block => {
            if (!Array.isArray(block.content)) return true;

            // Check if it's a page link block
            const linkItem = block.content.find((item: any) =>
                item.type === "link" && item.href?.startsWith("/page/")
            );

            if (linkItem) {
                const linkedPageId = linkItem.href.replace("/page/", "");
                // Only keep links to current children
                if (!childPageIds.has(linkedPageId)) {
                    return false;
                }
            }
            return true;
        });
    }, []);

    // Update child page links with latest info from pageTree
    const updateChildPageLinks = useCallback((blocks: any[], currentPageTree: any[]): any[] => {
        return blocks.map(block => {
            if (!Array.isArray(block.content)) return block;

            let hasPageLink = false;
            let pageId: string | null = null;

            // Check if this block contains a /page/ link
            block.content.forEach((item: any) => {
                if (item.type === "link" && item.href?.startsWith("/page/")) {
                    hasPageLink = true;
                    pageId = item.href.replace("/page/", "");
                }
            });

            if (!hasPageLink || !pageId) return block;

            // Find the page in pageTree
            const pageInfo = findPageById(currentPageTree, pageId);
            if (!pageInfo) return block; // Should be handled by removeInvalidPageLinks, but safe fallback

            const icon = pageInfo.pageIcon || "📄";
            const title = pageInfo.title || "Untitled";

            // Rebuild the block content with icon and updated title
            // Note: We completely reconstruct the content array to ensure consistency
            return {
                ...block,
                content: [
                    { type: "text", text: icon + " ", styles: {} },
                    {
                        type: "link",
                        href: `/page/${pageId}`,
                        content: [{ type: "text", text: title, styles: {} }]
                    }
                ]
            };
        });
    }, [findPageById]);

    // Handle page block clicks - prevent cursor and handle navigation
    // Note: This should NOT navigate if the block is selected (for reorder drag)
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Find the block this click is in
            const blockOuter = target.closest('.bn-block-outer[data-id]');
            if (!blockOuter) return;

            // Check if this block contains a /page/ link (don't rely on data attribute)
            const pageLink = blockOuter.querySelector('a[href^="/page/"]') as HTMLAnchorElement | null;
            if (!pageLink) return;

            const blockId = blockOuter.getAttribute('data-id');

            // If block is selected, let the reorder handler take over - don't navigate
            // Check using DOM class since state might not be synced yet
            const isBlockSelected = blockOuter.classList.contains('selected') ||
                (blockId && selectedPageBlockIdsRef.current.has(blockId));

            if (isBlockSelected) {
                // Don't navigate - let reorder handler manage this
                e.preventDefault();
                return;
            }

            // This is a page block - prevent cursor
            e.preventDefault();
            e.stopPropagation();

            // Blur any focused element
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            // Navigate to the page
            const href = pageLink.getAttribute('href') || '';
            const targetPageId = href.replace('/page/', '');
            if (targetPageId && targetPageId !== pageId) {
                selectPage(targetPageId);
                router.push(`/page/${targetPageId}`);
            }
        };

        document.addEventListener('mousedown', handleMouseDown, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
        };
    }, [router, selectPage, pageId]);

    // Helper to get page link block IDs from DOM (more reliable than parsing BlockNote content)
    const getPageLinkBlockIds = useCallback((): Set<string> => {
        const pageBlockIds = new Set<string>();
        document.querySelectorAll('.bn-block-outer a[href^="/page/"]').forEach(link => {
            const blockOuter = link.closest('.bn-block-outer[data-id]');
            const blockId = blockOuter?.getAttribute('data-id');
            if (blockId) {
                pageBlockIds.add(blockId);
            }
        });
        return pageBlockIds;
    }, []);

    // Clear block selection - defined before useEffects that use it
    const clearBlockSelection = useCallback(() => {
        setSelectedBlockIds(new Set());
        setSelectedPageBlockIds(new Set());
        selectedPageBlockIdsRef.current = new Set();
    }, []);

    // Get blocks within a rectangle area (returns both selected IDs and page block IDs)
    const getBlocksInRect = useCallback((rect: { left: number; top: number; right: number; bottom: number }): { selectedIds: Set<string>; pageBlockIds: Set<string> } => {
        const blockElements = document.querySelectorAll('.bn-block-outer[data-id]');
        const selectedIds = new Set<string>();
        const pageBlockIdsInRect = new Set<string>();
        const allPageBlockIds = getPageLinkBlockIds();

        blockElements.forEach((el) => {
            const blockRect = el.getBoundingClientRect();
            const blockId = el.getAttribute('data-id');

            // Check if block overlaps with selection rectangle
            const overlaps = !(
                blockRect.right < rect.left ||
                blockRect.left > rect.right ||
                blockRect.bottom < rect.top ||
                blockRect.top > rect.bottom
            );

            if (overlaps && blockId) {
                // Skip H1 title blocks - check for h1 tag or data-level="1"
                const hasH1Tag = el.querySelector('h1') !== null;
                const contentType = el.querySelector('[data-content-type]')?.getAttribute('data-content-type');
                const level = el.querySelector('[data-level]')?.getAttribute('data-level');
                const isTitle = hasH1Tag || (contentType === 'heading' && level === '1');

                if (!isTitle) {
                    selectedIds.add(blockId);
                    // Check if this is a page link block
                    if (allPageBlockIds.has(blockId)) {
                        pageBlockIdsInRect.add(blockId);
                    }
                }
            }
        });

        return { selectedIds, pageBlockIds: pageBlockIdsInRect };
    }, [getPageLinkBlockIds]);

    // Notion-style block selection (CSS-based via dynamic style tag, NOT text selection)
    const selectBlocksExceptTitle = useCallback(() => {
        if (!editor) return;

        // Clear any existing text selection to prevent formatting toolbar
        window.getSelection()?.removeAllRanges();

        // Collect block IDs, excluding the title block (H1 heading)
        const allBlockIds = new Set<string>();
        const collectBlockIds = (blocks: any[]) => {
            blocks.forEach((block: any) => {
                // Skip H1 heading blocks (title)
                const isTitle = block.type === 'heading' && block.props?.level === 1;
                if (!isTitle) {
                    allBlockIds.add(block.id);
                }
                if (block.children && block.children.length > 0) {
                    collectBlockIds(block.children);
                }
            });
        };
        if (editor.document) {
            collectBlockIds(editor.document);
        }

        // Find page link blocks from DOM (more reliable than parsing BlockNote content structure)
        const pageBlockIds = new Set<string>();
        document.querySelectorAll('.bn-block-outer a[href^="/page/"]').forEach(link => {
            const blockOuter = link.closest('.bn-block-outer[data-id]');
            const blockId = blockOuter?.getAttribute('data-id');
            if (blockId && allBlockIds.has(blockId)) {
                pageBlockIds.add(blockId);
            }
        });

        setSelectedBlockIds(allBlockIds);
        setSelectedPageBlockIds(pageBlockIds);
        selectedPageBlockIdsRef.current = pageBlockIds;  // Sync ref

        // Immediately set DOM attributes for page blocks (before React re-render)
        // This ensures the attribute is available for mousedown handlers
        pageBlockIds.forEach(blockId => {
            const blockEl = document.querySelector(`.bn-block-outer[data-id="${blockId}"]`);
            if (blockEl) {
                blockEl.setAttribute('data-page-block-selected', 'true');
                const contentEditable = blockEl.querySelector('[contenteditable]');
                if (contentEditable) {
                    (contentEditable as HTMLElement).contentEditable = 'false';
                }
            }
        });

        // Prevent immediate clear from click events
        justSelectedRef.current = true;
        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);

        // Clear text selection again after a tick
        setTimeout(() => {
            window.getSelection()?.removeAllRanges();
        }, 0);
    }, [editor]);

    // Mark page blocks with data attribute and disable contentEditable
    // This prevents cursor from appearing in page link blocks
    useEffect(() => {
        if (!editor || isLoading) return;

        // Function to mark all page blocks and disable editing
        const markPageBlocks = () => {
            document.querySelectorAll('.bn-block-outer[data-id]').forEach((el) => {
                const hasPageLink = el.querySelector('a[href^="/page/"]');
                const contentEditable = el.querySelector('[contenteditable]') as HTMLElement | null;

                if (hasPageLink) {
                    el.setAttribute('data-is-page-block', 'true');
                    // Disable contentEditable to prevent cursor
                    if (contentEditable && contentEditable.contentEditable !== 'false') {
                        contentEditable.contentEditable = 'false';
                    }
                } else {
                    el.removeAttribute('data-is-page-block');
                    // Re-enable contentEditable for non-page blocks
                    if (contentEditable && contentEditable.contentEditable === 'false') {
                        contentEditable.contentEditable = 'true';
                    }
                }
            });
        };

        // Initial marking with delay to ensure DOM is ready
        setTimeout(markPageBlocks, 100);

        // Observe DOM changes to keep attributes updated
        const observer = new MutationObserver(() => {
            requestAnimationFrame(markPageBlocks);
        });

        const editorEl = document.querySelector('.bn-editor');
        if (editorEl) {
            observer.observe(editorEl, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        return () => observer.disconnect();
    }, [editor, isLoading]);

    // Sync selectedBlockIds to ref for event handlers
    useEffect(() => {
        selectedBlockIdsRef.current = selectedBlockIds;
    }, [selectedBlockIds]);

    // Apply block selection styles via dynamic <style> tag (survives React re-renders)
    useEffect(() => {
        const styleId = 'block-selection-styles';
        let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

        if (selectedBlockIds.size === 0) {
            // Remove style element if no blocks selected
            if (styleEl) {
                styleEl.remove();
            }
            // Remove selected class and re-enable editing on non-page blocks only
            document.querySelectorAll('.bn-block-outer.selected, .bn-block-outer[data-page-block-selected="true"]').forEach((el) => {
                el.classList.remove('selected');
                el.removeAttribute('data-block-selected');
                el.removeAttribute('data-page-block-selected');
                // Only re-enable contentEditable for non-page blocks
                const isPageBlock = el.hasAttribute('data-is-page-block');
                const contentEditable = el.querySelector('[contenteditable]');
                if (contentEditable && !isPageBlock) {
                    (contentEditable as HTMLElement).contentEditable = 'true';
                }
            });
            return;
        }

        // Create style element if it doesn't exist
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }

        // Generate CSS rules for selected blocks
        const selectors = Array.from(selectedBlockIds)
            .map(id => `.bn-block-outer[data-id="${id}"]`)
            .join(',\n');

        // Generate CSS rules for selected page blocks (hide cursor, disable editing)
        const pageBlockSelectors = Array.from(selectedPageBlockIds)
            .map(id => `.bn-block-outer[data-id="${id}"]`)
            .join(',\n');

        let pageBlockStyles = '';
        if (selectedPageBlockIds.size > 0) {
            pageBlockStyles = `
            ${pageBlockSelectors} [contenteditable] {
                caret-color: transparent !important;
                cursor: default !important;
                user-select: none !important;
                -webkit-user-select: none !important;
            }
            ${pageBlockSelectors} .bn-inline-content {
                pointer-events: none !important;
            }
            `;
        }

        styleEl.textContent = `
            ${selectors} {
                background-color: rgba(173, 216, 230, 0.35) !important;
                border-radius: 4px;
                border: none !important;
                outline: none !important;
                box-shadow: 0 0 0 1px var(--background) !important;
            }
            .dark ${selectors} {
                background-color: rgba(135, 206, 235, 0.2) !important;
            }
            ${pageBlockStyles}
        `;

        // Mark selected blocks with class and data attribute
        document.querySelectorAll('.bn-block-outer[data-id]').forEach((el) => {
            const blockId = el.getAttribute('data-id');
            if (blockId && selectedBlockIds.has(blockId)) {
                el.classList.add('selected');
                el.setAttribute('data-block-selected', 'true');
            } else {
                el.classList.remove('selected');
                el.removeAttribute('data-block-selected');
            }

            if (blockId && selectedPageBlockIds.has(blockId)) {
                el.setAttribute('data-page-block-selected', 'true');
                const contentEditable = el.querySelector('[contenteditable]');
                if (contentEditable) {
                    (contentEditable as HTMLElement).contentEditable = 'false';
                    // Blur if currently focused
                    if (document.activeElement === contentEditable) {
                        (contentEditable as HTMLElement).blur();
                    }
                }
            }
        });

        // Blur the editor to hide any cursor in page blocks
        if (selectedPageBlockIds.size > 0) {
            const activeEl = document.activeElement as HTMLElement;
            if (activeEl?.closest?.('.bn-block-outer[data-page-block-selected="true"]')) {
                activeEl.blur();
            }
        }

        return () => {
            // Cleanup on unmount
            const el = document.getElementById(styleId);
            if (el) el.remove();
        };
    }, [selectedBlockIds, selectedPageBlockIds]);

    // Multi-block reorder: drag selected blocks to move them together
    useEffect(() => {
        if (!editor) return;

        let dropTargetBlockId: string | null = null;
        let dropPosition: 'before' | 'after' = 'after';

        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;

            // Use ref to get current selection (avoids closure issues)
            const currentSelection = selectedBlockIdsRef.current;
            if (currentSelection.size === 0) return;

            const target = e.target as HTMLElement;

            // Try to find blockOuter from click target
            let blockOuter = target.closest('.bn-block-outer[data-id]');

            // If not found directly, check if we clicked on bn-block-group which is inside bn-block-outer
            if (!blockOuter) {
                const blockGroup = target.closest('.bn-block-group');
                if (blockGroup) {
                    blockOuter = blockGroup.closest('.bn-block-outer[data-id]');
                }
            }

            // If still not found, check if click is within bounds of any selected block
            // This allows dragging from padding/margin areas of selected blocks
            // Use ref to find selected blocks (DOM attribute may not be set yet)
            if (!blockOuter) {
                for (const selectedId of currentSelection) {
                    const block = document.querySelector(`.bn-block-outer[data-id="${selectedId}"]`);
                    if (block) {
                        const rect = block.getBoundingClientRect();
                        if (e.clientX >= rect.left && e.clientX <= rect.right &&
                            e.clientY >= rect.top && e.clientY <= rect.bottom) {
                            blockOuter = block;
                            break;
                        }
                    }
                }
            }

            if (!blockOuter) return;

            const blockId = blockOuter.getAttribute('data-id');
            // Check if this block is selected (using ref since DOM attribute may not be set yet)
            const isSelected = blockId && currentSelection.has(blockId);
            if (!blockId || !isSelected) return;

            console.log('[Reorder] STARTING reorder drag!');
            // Starting reorder drag on a selected block
            e.preventDefault();
            e.stopPropagation();

            isReorderingRef.current = true;
            draggedBlockIdsRef.current = Array.from(currentSelection);

            // Create ghost element showing dragged blocks
            const ghost = document.createElement('div');
            ghost.className = 'block-reorder-ghost';
            ghost.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 10000;
                background: rgba(173, 216, 230, 0.9);
                border: 2px solid rgba(135, 206, 235, 0.8);
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 14px;
                color: #333;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0.95;
            `;
            ghost.textContent = `${currentSelection.size}개 블록 이동 중...`;
            document.body.appendChild(ghost);
            reorderGhostRef.current = ghost;

            // Create drop indicator line
            const indicator = document.createElement('div');
            indicator.className = 'block-drop-indicator';
            indicator.style.cssText = `
                position: absolute;
                left: 0;
                right: 0;
                height: 3px;
                background: #3b82f6;
                border-radius: 2px;
                pointer-events: none;
                z-index: 9999;
                display: none;
            `;
            document.body.appendChild(indicator);
            dropIndicatorRef.current = indicator;

            // Position ghost at cursor
            ghost.style.left = `${e.clientX + 10}px`;
            ghost.style.top = `${e.clientY + 10}px`;
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isReorderingRef.current) return;

            // Move ghost
            if (reorderGhostRef.current) {
                reorderGhostRef.current.style.left = `${e.clientX + 10}px`;
                reorderGhostRef.current.style.top = `${e.clientY + 10}px`;
            }

            // Find block under cursor
            const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
            let targetBlock: Element | null = null;

            for (const el of elementsUnderCursor) {
                const block = el.closest('.bn-block-outer[data-id]');
                if (block) {
                    const blockId = block.getAttribute('data-id');
                    // Don't target blocks being dragged
                    if (blockId && !draggedBlockIdsRef.current.includes(blockId)) {
                        targetBlock = block;
                        break;
                    }
                }
            }

            if (targetBlock && dropIndicatorRef.current) {
                const rect = targetBlock.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;

                // Determine if drop should be before or after
                if (e.clientY < midY) {
                    dropPosition = 'before';
                    dropIndicatorRef.current.style.top = `${rect.top + window.scrollY}px`;
                } else {
                    dropPosition = 'after';
                    dropIndicatorRef.current.style.top = `${rect.bottom + window.scrollY}px`;
                }

                dropIndicatorRef.current.style.left = `${rect.left}px`;
                dropIndicatorRef.current.style.width = `${rect.width}px`;
                dropIndicatorRef.current.style.display = 'block';

                dropTargetBlockId = targetBlock.getAttribute('data-id');
            } else if (dropIndicatorRef.current) {
                dropIndicatorRef.current.style.display = 'none';
                dropTargetBlockId = null;
            }
        };

        const handleMouseUp = () => {
            if (!isReorderingRef.current) return;

            isReorderingRef.current = false;

            // Cleanup ghost and indicator
            if (reorderGhostRef.current) {
                reorderGhostRef.current.remove();
                reorderGhostRef.current = null;
            }
            if (dropIndicatorRef.current) {
                dropIndicatorRef.current.remove();
                dropIndicatorRef.current = null;
            }

            // Perform the move
            if (dropTargetBlockId && draggedBlockIdsRef.current.length > 0) {
                try {
                    const allBlocks = editor.document;

                    // Get blocks to move in document order (preserve their relative order)
                    const blockIdsSet = new Set(draggedBlockIdsRef.current);
                    const blocksToMove = allBlocks
                        .filter((b: any) => blockIdsSet.has(b.id))
                        .map((b: any) => JSON.parse(JSON.stringify(b))); // Deep clone to preserve data

                    if (blocksToMove.length > 0) {
                        // Remove the blocks first
                        editor.removeBlocks(blocksToMove.map((b: any) => ({ id: b.id })));

                        // Find target block (after removal, indices may have changed)
                        const updatedBlocks = editor.document;
                        const targetBlock = updatedBlocks.find((b: any) => b.id === dropTargetBlockId);

                        if (targetBlock) {
                            // Insert blocks one by one to ensure all are inserted
                            // Always insert in order, just change the reference point
                            let referenceBlock = targetBlock;

                            for (let i = 0; i < blocksToMove.length; i++) {
                                if (i === 0) {
                                    // First block: insert relative to the target
                                    editor.insertBlocks([blocksToMove[i]], referenceBlock, dropPosition);
                                } else {
                                    // Subsequent blocks: always insert "after" the previous one
                                    const newBlocks = editor.document;
                                    const prevInserted = newBlocks.find((b: any) => b.id === blocksToMove[i - 1].id);
                                    if (prevInserted) {
                                        editor.insertBlocks([blocksToMove[i]], prevInserted, 'after');
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to reorder blocks:', err);
                }
            }

            draggedBlockIdsRef.current = [];
            dropTargetBlockId = null;

            // Clear selection after move
            setSelectedBlockIds(new Set());
            setSelectedPageBlockIds(new Set());
            selectedPageBlockIdsRef.current = new Set();
        };

        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('mouseup', handleMouseUp, true);

            // Cleanup on unmount
            if (reorderGhostRef.current) {
                reorderGhostRef.current.remove();
                reorderGhostRef.current = null;
            }
            if (dropIndicatorRef.current) {
                dropIndicatorRef.current.remove();
                dropIndicatorRef.current = null;
            }
        };
    }, [editor]);  // Only depend on editor, use refs for selection state

    // Handle Cmd+A to select only content below title (not the title itself)
    // This uses Notion-style BLOCK selection (CSS classes) NOT text selection
    // Works from anywhere on the page (not just inside editor)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Cmd+A (Mac) or Ctrl+A (Windows)
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                // Don't intercept if user is in an input field outside the editor
                const activeElement = document.activeElement;
                const isInInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
                const editorElement = editorContainerRef.current;

                // If in input outside editor, let default behavior happen
                if (isInInput && editorElement && !editorElement.contains(activeElement)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                selectBlocksExceptTitle();
            }
        };

        document.addEventListener('keydown', handleKeyDown, true);

        // Expose for testing
        (window as any).__selectBlocksExceptTitle = selectBlocksExceptTitle;

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            delete (window as any).__selectBlocksExceptTitle;
        };
    }, [selectBlocksExceptTitle]);

    // Clear block selection when clicking anywhere or typing
    useEffect(() => {
        const handleContentClick = (e: MouseEvent) => {
            // Don't clear if we just selected
            if (justSelectedRef.current) return;

            // Don't clear if clicking on a selected block (for reorder dragging)
            const target = e.target as HTMLElement;
            const blockOuter = target.closest?.('.bn-block-outer[data-id]');
            if (blockOuter?.hasAttribute('data-block-selected')) {
                // Clicking on selected block - don't clear selection
                return;
            }

            // Clear selection on any click when blocks are selected
            if (selectedBlockIds.size > 0) {
                clearBlockSelection();
            }

            // Blur editor when clicking on empty space (not on block content)
            const mainContent = target.closest('main');
            const inlineContent = target.closest('.bn-inline-content');
            const blockContent = target.closest('.bn-block-content');
            if (mainContent && !inlineContent && !blockContent && !blockOuter) {
                // Clicked on empty space - blur editor to hide cursor
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            }
        };

        const handleKeyPress = (e: KeyboardEvent) => {
            // Don't clear on Cmd+A itself
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') return;

            // Handle Delete/Backspace to remove selected blocks
            if (selectedBlockIds.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                e.stopPropagation();

                // Delete selected blocks
                const blocksToDelete = Array.from(selectedBlockIds).map(id => ({ id }));
                if (blocksToDelete.length > 0 && editor) {
                    try {
                        editor.removeBlocks(blocksToDelete);
                        clearBlockSelection();
                    } catch (err) {
                        console.error('Failed to delete blocks:', err);
                    }
                }
                return;
            }

            // Clear on any other key press when blocks are selected
            if (selectedBlockIds.size > 0 && !e.metaKey && !e.ctrlKey) {
                clearBlockSelection();
            }
        };

        document.addEventListener('click', handleContentClick, true);
        document.addEventListener('keydown', handleKeyPress, true);

        return () => {
            document.removeEventListener('click', handleContentClick, true);
            document.removeEventListener('keydown', handleKeyPress, true);
        };
    }, [selectedBlockIds, clearBlockSelection, editor]);

    // Mouse drag selection for blocks
    // Works from anywhere in main content area EXCEPT text content areas
    // Note: We register on document to capture clicks from ALL areas (including above editor)
    useEffect(() => {
        console.log('[DragSelect] useEffect running, registering on document');

        // Track selection during drag without React re-renders
        const dragSelectedIdsRef = { current: new Set<string>() };

        const handleMouseDown = (e: MouseEvent) => {
            // Only handle left click
            if (e.button !== 0) return;

            const target = e.target as HTMLElement;
            const className = typeof target.className === 'string' ? target.className : '';
            console.log('[DragSelect] mousedown, target:', className.slice(0, 50));

            // Don't start if on interactive elements
            if (target.closest('a, button, input, textarea, [role="button"], [data-radix-collection-item]')) {
                console.log('[DragSelect] on interactive element');
                return;
            }

            // Don't start if clicking on sidebar or header areas
            if (target.closest('[data-sidebar], nav, header, aside')) {
                console.log('[DragSelect] on sidebar/header');
                return;
            }

            // Don't start if clicking on slash menu or other popups
            if (target.closest('[data-tippy-root], [data-radix-popper-content-wrapper], .bn-suggestion-menu')) {
                console.log('[DragSelect] on popup');
                return;
            }

            // Check if we're in the main content area (right side, not sidebar)
            const mainContent = target.closest('main');
            if (!mainContent) {
                console.log('[DragSelect] not in main content');
                return;
            }

            // If blocks are selected, check if click is within any selected block's bounds
            // This allows reorder handler to take over instead of starting new drag selection
            if (selectedBlockIdsRef.current.size > 0) {
                for (const selectedId of selectedBlockIdsRef.current) {
                    const block = document.querySelector(`.bn-block-outer[data-id="${selectedId}"]`);
                    if (block) {
                        const rect = block.getBoundingClientRect();
                        if (e.clientX >= rect.left && e.clientX <= rect.right &&
                            e.clientY >= rect.top && e.clientY <= rect.bottom) {
                            console.log('[DragSelect] click within selected block bounds, skipping for reorder');
                            return;
                        }
                    }
                }
            }

            // Check if we're inside the editor area
            const editorRoot = target.closest('.bn-editor');

            if (editorRoot) {
                // We're inside the editor - check if we're clicking on block content
                const blockOuter = target.closest('.bn-block-outer[data-id]');
                if (blockOuter) {
                    // If clicking on a SELECTED block, don't start drag selection
                    // Let the reorder handler take over
                    const blockId = blockOuter.getAttribute('data-id');
                    if (blockId && selectedBlockIdsRef.current.has(blockId)) {
                        console.log('[DragSelect] on selected block, skipping for reorder');
                        return;
                    }

                    const blockRect = blockOuter.getBoundingClientRect();
                    const clickX = e.clientX;
                    // Allow drag from left margin (first 48px of block) - this is where drag handles are
                    const isInLeftMargin = clickX < blockRect.left + 48;

                    if (!isInLeftMargin) {
                        // Check if clicking inside actual block content area
                        const inlineContent = target.closest('.bn-inline-content');
                        const blockContent = target.closest('.bn-block-content');
                        if (inlineContent || blockContent) {
                            console.log('[DragSelect] on block content, not in margin');
                            return;
                        }
                    }
                }
                // If not inside a block, we're in editor padding/empty space - allow drag
            }
            // If outside editor but inside main, allow drag (empty space above/below/left/right of blocks)

            console.log('[DragSelect] Starting drag selection!');
            // Start drag selection from non-text areas (margins, padding, editor background)
            isDraggingRef.current = true;
            dragStartRef.current = { x: e.clientX, y: e.clientY };

            // Blur any focused element (removes cursor from editor)
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }

            // Prevent text selection
            e.preventDefault();
            document.body.classList.add('block-selecting');

            // Disable pointer events on all blocks during drag to prevent interference
            document.querySelectorAll('.bn-block-outer, .bn-inline-content, [contenteditable]').forEach((el) => {
                (el as HTMLElement).style.pointerEvents = 'none';
            });

            // Clear any existing text selection
            window.getSelection()?.removeAllRanges();

            // Create selection rectangle
            if (!selectionRectRef.current) {
                const rect = document.createElement('div');
                rect.className = 'block-selection-rect';
                rect.style.cssText = `
                    position: fixed;
                    pointer-events: none;
                    z-index: 1000;
                    background-color: rgba(173, 216, 230, 0.3);
                    border: 1px solid rgba(135, 206, 235, 0.6);
                    border-radius: 3px;
                `;
                document.body.appendChild(rect);
                selectionRectRef.current = rect;
            }
        };

        // Auto-scroll interval ref
        let autoScrollInterval: NodeJS.Timeout | null = null;
        const SCROLL_EDGE_SIZE = 60; // Distance from edge to trigger scroll
        const SCROLL_SPEED = 15; // Pixels per scroll tick

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current || !dragStartRef.current || !selectionRectRef.current) return;

            // Prevent any default behavior during drag
            e.preventDefault();
            // Note: Don't call stopPropagation() here as it would block other event handlers
            // like the drag reorder mousemove handler

            // Find the scrollable container (main element with overflow)
            const scrollContainer = document.querySelector('main');
            const scrollableDiv = scrollContainer?.querySelector('.overflow-y-auto') || scrollContainer;

            // Auto-scroll when near edges
            if (scrollableDiv) {
                const containerRect = scrollableDiv.getBoundingClientRect();
                const mouseY = e.clientY;

                // Clear existing auto-scroll
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }

                // Check if near top or bottom edge
                if (mouseY < containerRect.top + SCROLL_EDGE_SIZE) {
                    // Near top - scroll up
                    autoScrollInterval = setInterval(() => {
                        scrollableDiv.scrollTop -= SCROLL_SPEED;
                    }, 16);
                } else if (mouseY > containerRect.bottom - SCROLL_EDGE_SIZE) {
                    // Near bottom - scroll down
                    autoScrollInterval = setInterval(() => {
                        scrollableDiv.scrollTop += SCROLL_SPEED;
                    }, 16);
                }
            }

            const start = dragStartRef.current;
            const current = { x: e.clientX, y: e.clientY };

            // Calculate rectangle bounds (using viewport coordinates)
            const left = Math.min(start.x, current.x);
            const top = Math.min(start.y, current.y);
            const width = Math.abs(current.x - start.x);
            const height = Math.abs(current.y - start.y);

            // Update selection rectangle (fixed position, so uses viewport coords)
            selectionRectRef.current.style.left = `${left}px`;
            selectionRectRef.current.style.top = `${top}px`;
            selectionRectRef.current.style.width = `${width}px`;
            selectionRectRef.current.style.height = `${height}px`;
            selectionRectRef.current.style.display = 'block';

            // Find blocks within rectangle and store in ref (no re-render during drag)
            const rect = { left, top, right: left + width, bottom: top + height };
            const { selectedIds: blocksInRect } = getBlocksInRect(rect);
            dragSelectedIdsRef.current = blocksInRect;

            // Apply visual selection via direct DOM manipulation during drag
            document.querySelectorAll('.bn-block-outer[data-id]').forEach((el) => {
                const blockId = el.getAttribute('data-id');
                const htmlEl = el as HTMLElement;
                if (blockId && blocksInRect.has(blockId)) {
                    htmlEl.style.backgroundColor = 'rgba(173, 216, 230, 0.35)';
                    htmlEl.style.borderRadius = '4px';
                    htmlEl.style.border = 'none';
                    htmlEl.style.outline = 'none';
                } else {
                    htmlEl.style.backgroundColor = '';
                    htmlEl.style.borderRadius = '';
                    htmlEl.style.border = '';
                    htmlEl.style.outline = '';
                }
            });

            // Clear text selection
            window.getSelection()?.removeAllRanges();
        };

        // Cleanup auto-scroll on mouse up
        const clearAutoScroll = () => {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
        };

        const handleMouseUp = () => {
            if (!isDraggingRef.current) return;

            // Clear auto-scroll
            clearAutoScroll();

            isDraggingRef.current = false;
            dragStartRef.current = null;
            document.body.classList.remove('block-selecting');

            // Re-enable pointer events on all blocks
            document.querySelectorAll('.bn-block-outer, .bn-inline-content, [contenteditable]').forEach((el) => {
                (el as HTMLElement).style.pointerEvents = '';
            });

            // Remove selection rectangle
            if (selectionRectRef.current) {
                selectionRectRef.current.remove();
                selectionRectRef.current = null;
            }

            // Clear direct DOM styles
            document.querySelectorAll('.bn-block-outer[data-id]').forEach((el) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.backgroundColor = '';
                htmlEl.style.borderRadius = '';
                htmlEl.style.border = '';
                htmlEl.style.outline = '';
            });

            // Now update React state with final selection (triggers re-render with proper CSS)
            const finalSelection = dragSelectedIdsRef.current;
            if (finalSelection.size > 0) {
                setSelectedBlockIds(new Set(finalSelection));
                // Find which of the selected blocks are page link blocks
                const allPageBlockIds = getPageLinkBlockIds();
                const selectedPageBlocks = new Set<string>();
                finalSelection.forEach(id => {
                    if (allPageBlockIds.has(id)) {
                        selectedPageBlocks.add(id);
                    }
                });
                setSelectedPageBlockIds(selectedPageBlocks);
                selectedPageBlockIdsRef.current = selectedPageBlocks;  // Sync ref
                justSelectedRef.current = true;
                setTimeout(() => {
                    justSelectedRef.current = false;
                }, 100);
            }
            dragSelectedIdsRef.current = new Set();
        };

        // Use capture phase for all events to intercept before BlockNote/ProseMirror handlers
        // Register mousedown on document to capture clicks from anywhere in main (including above editor)
        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('mouseup', handleMouseUp, true);
            document.body.classList.remove('block-selecting');
            clearAutoScroll();
            // Cleanup pointer events on unmount
            document.querySelectorAll('.bn-block-outer, .bn-inline-content, [contenteditable]').forEach((el) => {
                (el as HTMLElement).style.pointerEvents = '';
            });
            if (selectionRectRef.current) {
                selectionRectRef.current.remove();
                selectionRectRef.current = null;
            }
        };
    }, [getBlocksInRect, getPageLinkBlockIds, editor, isLoading]);


    // AI Slash Command Item
    const insertMagicItem = useMemo(() => ({
        title: "AI 지식 증류",
        onItemClick: async () => {
            const currentBlock = editor.getTextCursorPosition().block;

            const loadingBlock = editor.insertBlocks(
                [{
                    type: "paragraph",
                    content: "AI가 이 페이지를 요약하고 있습니다...",
                    props: { textColor: "gray" }
                } as any],
                currentBlock,
                "after"
            );

            try {
                // Get browser language (ko, en, etc.)
                const browserLang = navigator.language.split('-')[0];
                const language = browserLang === 'ko' ? 'ko' : browserLang === 'en' ? 'en' : 'ko';

                const { data } = await api.pages.summarize(pageId, language);
                editor.removeBlocks(loadingBlock);

                // Backend returns summaryMd (not summary)
                const summaryContent = data.summaryMd || data.summary || (language === 'ko' ? "요약 정보가 없습니다." : "No summary available.");

                editor.insertBlocks(
                    [{
                        type: "paragraph",
                        content: [
                            { type: "text", text: "AI 요약", styles: { bold: true, code: true } },
                            { type: "text", text: "\n" + summaryContent, styles: {} }
                        ],
                        props: { backgroundColor: "gray" }
                    } as any],
                    currentBlock,
                    "after"
                );
            } catch (error) {
                console.error("AI generation failed:", error);
                editor.updateBlock(loadingBlock[0], {
                    type: "paragraph",
                    content: "AI 생성에 실패했습니다.",
                    props: { textColor: "red" }
                } as any);
            }
        },
        aliases: ["ai", "magic", "generate", "summarize", "지식"],
        group: "AI",
        icon: <Sparkles className="w-4 h-4" style={{ color: "#9065b0" }} />,
        subtext: "현재 페이지 내용을 요약합니다.",
    }), [editor, pageId]);

    // Page Slash Command Item
    const insertPageItem = useMemo(() => ({
        title: "페이지",
        onItemClick: async () => {
            const currentBlock = editor.getTextCursorPosition().block;

            try {
                // Mark that we're creating a page - prevents useEffect from adding duplicate links
                isCreatingPageRef.current = true;

                const newPageId = await createPage({ parentId: pageId, title: "Untitled" });

                if (newPageId) {
                    // Mark as recently created to prevent duplicate from useEffect
                    recentlyCreatedPagesRef.current.add(newPageId);
                    setTimeout(() => recentlyCreatedPagesRef.current.delete(newPageId), 2000);

                    // Check if current block is empty - if so, replace it instead of inserting after
                    const isCurrentBlockEmpty = !Array.isArray(currentBlock.content) ||
                        currentBlock.content.length === 0 ||
                        !currentBlock.content.some((c: any) => c.text && c.text.trim());

                    const newBlock = {
                        type: "paragraph",
                        content: [
                            { type: "text", text: "📄 ", styles: {} },
                            {
                                type: "link",
                                href: `/page/${newPageId}`,
                                content: [{ type: "text", text: "Untitled", styles: {} }]
                            }
                        ]
                    } as any;

                    if (isCurrentBlockEmpty && currentBlock.type === "paragraph") {
                        // Replace the empty block
                        editor.updateBlock(currentBlock, newBlock);
                    } else {
                        // Insert after
                        editor.insertBlocks([newBlock], currentBlock, "after");
                    }

                    // Save immediately before navigation to ensure the link block is persisted
                    const blocks = editor.document;
                    const flatBlocks = flattenBlocks(blocks, pageId);
                    try {
                        await api.blocks.updateBatch(pageId, flatBlocks);
                    } catch (err) {
                        console.error("Failed to save before navigation:", err);
                    }

                    // Navigate to the new page
                    selectPage(newPageId);
                    router.push(`/page/${newPageId}`);
                }
            } catch (error) {
                console.error("Failed to create page:", error);
            } finally {
                // Reset flag after small delay to ensure useEffect doesn't interfere
                setTimeout(() => { isCreatingPageRef.current = false; }, 500);
            }
        },
        aliases: ["page", "페이지", "document"],
        group: "Basic",
        icon: <FileText className="w-4 h-4" style={{ color: "var(--foreground-secondary)" }} />,
        subtext: "하위 페이지를 생성하고 링크합니다.",
    }), [editor, pageId, createPage, router, selectPage]);

    // Helper to open panel at current block
    const openPanelAtCurrentBlock = useCallback((mode: IngestionMode) => {
        const currentBlock = editor.getTextCursorPosition().block;
        setPanelBlockId(currentBlock.id);
        setActivePanel(mode);
    }, [editor]);

    // AI Ingestion Slash Commands (Inline panel approach)
    const insertYoutubeItem = useMemo(() => ({
        title: "YouTube 요약",
        onItemClick: () => openPanelAtCurrentBlock("youtube"),
        aliases: ["youtube", "유튜브", "video", "영상"],
        group: "AI 분석",
        icon: <Youtube className="w-4 h-4" style={{ color: "#e03e3e" }} />,
        subtext: "YouTube 영상을 AI로 요약합니다.",
    }), [openPanelAtCurrentBlock]);

    const insertPdfItem = useMemo(() => ({
        title: "PDF 분석",
        onItemClick: () => openPanelAtCurrentBlock("pdf"),
        aliases: ["pdf", "문서", "document"],
        group: "AI 분석",
        icon: <FileText className="w-4 h-4" style={{ color: "#cb912f" }} />,
        subtext: "PDF 문서를 AI로 분석합니다.",
    }), [openPanelAtCurrentBlock]);

    const insertAudioItem = useMemo(() => ({
        title: "음성 분석",
        onItemClick: () => openPanelAtCurrentBlock("audio"),
        aliases: ["audio", "음성", "녹음", "voice"],
        group: "AI 분석",
        icon: <Mic className="w-4 h-4" style={{ color: "#0f7b6c" }} />,
        subtext: "음성 파일을 텍스트로 변환합니다.",
    }), [openPanelAtCurrentBlock]);

    const insertImageItem = useMemo(() => ({
        title: "이미지 분석",
        onItemClick: () => openPanelAtCurrentBlock("image"),
        aliases: ["image", "이미지", "사진", "photo"],
        group: "AI 분석",
        icon: <ImageIcon className="w-4 h-4" style={{ color: "#9065b0" }} />,
        subtext: "이미지를 AI로 분석합니다.",
    }), [openPanelAtCurrentBlock]);

    const insertUrlItem = useMemo(() => ({
        title: "웹페이지 요약",
        onItemClick: () => openPanelAtCurrentBlock("url"),
        aliases: ["url", "웹", "link", "링크", "webpage"],
        group: "AI 분석",
        icon: <Link2 className="w-4 h-4" style={{ color: "#2383e2" }} />,
        subtext: "웹 페이지를 AI로 요약합니다.",
    }), [openPanelAtCurrentBlock]);

    // Recording Slash Command Item
    const insertRecordingItem = useMemo(() => ({
        title: "녹음",
        onItemClick: () => openPanelAtCurrentBlock("record"),
        aliases: ["record", "녹음", "recording", "voice", "음성녹음", "강의"],
        group: "AI 분석",
        icon: <Radio className="w-4 h-4" style={{ color: "#e03e3e" }} />,
        subtext: "오디오를 녹음하고 AI로 요약합니다.",
    }), [openPanelAtCurrentBlock]);

    // Helper to close panel
    const closePanel = useCallback(() => {
        setActivePanel(null);
        setPanelBlockId(null);
    }, []);

    // Handler for inserting AI-generated content from panel
    const handlePanelInsert = useCallback((content: string) => {
        // Find the block where panel was opened
        const targetBlock = panelBlockId
            ? editor.document.find((b: any) => b.id === panelBlockId)
            : editor.getTextCursorPosition().block;

        if (!targetBlock) return;

        // Parse markdown-like content into blocks
        const lines = content.split('\n').filter(line => line.trim());
        const blocks: any[] = [];

        lines.forEach(line => {
            if (line.startsWith('# ') && !line.startsWith('## ')) {
                blocks.push({
                    type: "heading",
                    props: { level: 1 },
                    content: parseInlineMarkdown(line.slice(2))
                });
            } else if (line.startsWith('## ')) {
                blocks.push({
                    type: "heading",
                    props: { level: 2 },
                    content: parseInlineMarkdown(line.slice(3))
                });
            } else if (line.startsWith('### ')) {
                blocks.push({
                    type: "heading",
                    props: { level: 3 },
                    content: parseInlineMarkdown(line.slice(4))
                });
            } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
                const checked = line.startsWith('- [x] ');
                blocks.push({
                    type: "checkListItem",
                    props: { checked },
                    content: parseInlineMarkdown(line.slice(6))
                });
            } else if (line.startsWith('- ')) {
                blocks.push({
                    type: "bulletListItem",
                    content: parseInlineMarkdown(line.slice(2))
                });
            } else if (/^\d+[-\.]\d+\.\s/.test(line)) {
                // Sub-section headers: 1-1. Title, 1.1. Title, 2-1. Title → heading level 3
                blocks.push({
                    type: "heading",
                    props: { level: 3 },
                    content: parseInlineMarkdown(line)
                });
            } else if (/^\d+\.\s/.test(line)) {
                // Section headers: 1. Title, 2. Title → heading level 2
                blocks.push({
                    type: "heading",
                    props: { level: 2 },
                    content: parseInlineMarkdown(line)
                });
            } else if (line.startsWith('> ')) {
                // Quote block - BlockNote doesn't have a native quote, use paragraph with styling
                blocks.push({
                    type: "paragraph",
                    props: { backgroundColor: "gray" },
                    content: parseInlineMarkdown(line.slice(2))
                });
            } else {
                blocks.push({
                    type: "paragraph",
                    content: parseInlineMarkdown(line)
                });
            }
        });

        if (blocks.length > 0) {
            editor.insertBlocks(blocks, targetBlock, "after");
        }

        // Close the panel after inserting
        closePanel();
    }, [editor, panelBlockId, closePanel]);

    // Handler for recording completed with AI processing
    const handleRecordingProcessWithAI = async (blob: Blob, duration: number) => {
        const currentBlock = editor.getTextCursorPosition().block;

        const loadingBlock = editor.insertBlocks(
            [{
                type: "paragraph",
                content: `녹음 분석 중... (${Math.floor(duration / 60)}분 ${duration % 60}초)`,
                props: { textColor: "gray" }
            } as any],
            currentBlock,
            "after"
        );

        try {
            const { data } = await api.audio.summarize(blob);

            editor.removeBlocks(loadingBlock);

            const blocks: any[] = [
                {
                    type: "heading",
                    props: { level: 2 },
                    content: "녹음 요약"
                },
                {
                    type: "paragraph",
                    content: data.summary
                }
            ];

            if (data.transcript) {
                blocks.push({
                    type: "heading",
                    props: { level: 3 },
                    content: "전체 텍스트"
                });
                blocks.push({
                    type: "paragraph",
                    content: data.transcript
                });
            }

            editor.insertBlocks(blocks, currentBlock, "after");
        } catch (error) {
            console.error("Recording analysis failed:", error);
            editor.updateBlock(loadingBlock[0], {
                type: "paragraph",
                content: "녹음 분석에 실패했습니다.",
                props: { textColor: "red" }
            } as any);
        }

        setRecorderModalOpen(false);
    };

    // Handler for saving recording without AI
    const handleRecordingSaveWithoutAI = (blob: Blob, duration: number) => {
        // TODO: Upload to storage and create audio block
        console.log("Save recording without AI:", blob, duration);
        setRecorderModalOpen(false);
    };

    // Handler for when recording starts
    const handleRecordingStart = () => {
        setRecorderModalOpen(false);
    };

    // Handler for when recording stops
    const handleRecordingStop = () => {
        // Open the recorder modal to show completed state
        setRecorderModalOpen(true);
    };



    // Load initial content
    useEffect(() => {
        async function load() {
            // Prevent duplicate loads for the same page
            if (loadedPageIdRef.current === pageId) return;
            loadedPageIdRef.current = pageId;

            try {
                const { data: page } = await api.pages.get(pageId);
                setPageTitle(page.title || "Untitled");
                lastSavedTitleRef.current = page.title || "Untitled";
                addRecentView(pageId, page.title || "Untitled");

                const { data: blocks } = await api.blocks.get(pageId);
                if (!editor.document) return;

                let contentBlocks: any[] = [];

                // Get current page tree for child page info
                const currentPageTree = usePageStore.getState().pageTree;

                // Find child pages first
                const findChildPages = (nodes: any[], parentId: string): any[] => {
                    for (const node of nodes) {
                        if (node.id === parentId) return node.children || [];
                        if (node.children) {
                            const found = findChildPages(node.children, parentId);
                            if (found.length > 0) return found;
                        }
                    }
                    return [];
                };
                const childPages = findChildPages(currentPageTree, pageId);
                const childPageIds = new Set(childPages.map(c => c.id));

                if (blocks && blocks.length > 0) {
                    contentBlocks = convertToBlockNoteBlocks(blocks);

                    // 1. Remove links to pages that are not current children
                    contentBlocks = removeInvalidPageLinks(contentBlocks, childPageIds);

                    // 2. Deduplicate child page links (keep first occurrence only)
                    const seenPageLinks = new Set<string>();
                    contentBlocks = contentBlocks.filter(block => {
                        if (!Array.isArray(block.content)) return true;
                        const linkItem = block.content.find((item: any) =>
                            item.type === "link" && item.href?.startsWith("/page/")
                        );
                        if (linkItem) {
                            const linkedPageId = linkItem.href.replace("/page/", "");
                            if (seenPageLinks.has(linkedPageId)) {
                                return false; // Duplicate, remove
                            }
                            seenPageLinks.add(linkedPageId);
                        }
                        return true;
                    });

                    // 3. Update child page links with latest info from pageTree (icon + title)
                    contentBlocks = updateChildPageLinks(contentBlocks, currentPageTree);

                    // 4. Ensure first block is a heading with title (if not present)
                    const firstBlock = contentBlocks[0];
                    const hasHeadingTitle = firstBlock?.type === "heading" &&
                        firstBlock?.props?.level === 1 &&
                        Array.isArray(firstBlock.content) &&
                        firstBlock.content.some((c: any) => c.text && c.text.trim());

                    if (!hasHeadingTitle && page.title) {
                        // Add title heading at the beginning
                        contentBlocks.unshift({
                            type: "heading",
                            props: { level: 1 },
                            content: [{ type: "text", text: page.title, styles: {} }]
                        });
                    }
                } else {
                    // Set default heading block for new pages
                    contentBlocks = [
                        {
                            type: "heading",
                            props: { level: 1 },
                            content: page.title || ""
                        },
                        {
                            type: "paragraph",
                            content: []
                        }
                    ];
                }

                // Ensure there's always an empty paragraph at the end for typing
                const lastBlock = contentBlocks[contentBlocks.length - 1];
                const isLastBlockEmpty = lastBlock?.type === "paragraph" &&
                    (!Array.isArray(lastBlock.content) || lastBlock.content.length === 0 ||
                        !lastBlock.content.some((c: any) => c.text && c.text.trim()));
                if (!isLastBlockEmpty) {
                    contentBlocks.push({ type: "paragraph", content: [] });
                }

                // Initialize child page order ref for instant sidebar updates
                const initialOrder: string[] = [];
                contentBlocks.forEach((block: any) => {
                    if (Array.isArray(block.content)) {
                        block.content.forEach((item: any) => {
                            if (item.type === "link" && item.href?.startsWith("/page/")) {
                                const childId = item.href.replace("/page/", "");
                                if (!initialOrder.includes(childId)) {
                                    initialOrder.push(childId);
                                }
                            }
                        });
                    }
                });
                lastChildOrderRef.current = initialOrder.join(',');

                editor.replaceBlocks(editor.document, contentBlocks as any);

                // Mark that content was just loaded - prevent useEffect interference
                justLoadedRef.current = true;
                setTimeout(() => { justLoadedRef.current = false; }, 500);
            } catch (err) {
                console.error("Failed to load page:", err);
            } finally {
                setIsLoading(false);
            }
        }
        if (editor && editor.document) {
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageId, addRecentView, editor]);

    // Watch for pageTree changes and sync child page links
    // This handles both: pages moved out (remove link) and pages moved in (add link)
    const currentChildren = usePageStore((state) => {
        const findChildren = (nodes: any[], parentId: string): any[] => {
            for (const node of nodes) {
                if (node.id === parentId) {
                    return (node.children || []).map((c: any) => ({
                        id: c.id,
                        title: c.title || "Untitled",
                        pageIcon: c.pageIcon || "📄"
                    }));
                }
                if (node.children) {
                    const found = findChildren(node.children, parentId);
                    if (found.length > 0) return found;
                }
            }
            return [];
        };
        const children = findChildren(state.pageTree, pageId);
        return JSON.stringify(children);
    });

    useEffect(() => {
        if (!editor || isLoading) return;

        // Skip if content was just loaded - prevent interfering with initial content
        if (justLoadedRef.current) return;

        // Skip if a page is being created - prevent duplicate links
        if (isCreatingPageRef.current) return;

        const children: { id: string; title: string; pageIcon: string }[] = JSON.parse(currentChildren || '[]');
        const childPageIds = new Set(children.map(c => c.id));
        const blocks = editor.document;

        // Find page links in current editor content
        const linksInEditor = new Set<string>();
        blocks.forEach((block: any) => {
            if (Array.isArray(block.content)) {
                block.content.forEach((item: any) => {
                    if (item.type === "link" && item.href?.startsWith("/page/")) {
                        linksInEditor.add(item.href.replace("/page/", ""));
                    }
                });
            }
        });

        // Check if any links need to be removed (pages moved out)
        const invalidLinks = [...linksInEditor].filter(id => !childPageIds.has(id));
        // Check if any children need links added (pages moved in)
        // Skip pages that were recently created via slash command (they already have links)
        const missingLinks = children.filter(c =>
            !linksInEditor.has(c.id) && !recentlyCreatedPagesRef.current.has(c.id)
        );

        if (invalidLinks.length > 0 || missingLinks.length > 0) {
            let updatedBlocks = [...blocks];

            // Remove invalid links
            if (invalidLinks.length > 0) {
                updatedBlocks = updatedBlocks.filter((block: any) => {
                    if (!Array.isArray(block.content)) return true;
                    const linkItem = block.content.find((item: any) =>
                        item.type === "link" && item.href?.startsWith("/page/")
                    );
                    if (linkItem) {
                        const linkedPageId = linkItem.href.replace("/page/", "");
                        return childPageIds.has(linkedPageId);
                    }
                    return true;
                });
            }

            // Add missing links
            missingLinks.forEach(child => {
                (updatedBlocks as any[]).push({
                    type: "paragraph",
                    content: [
                        { type: "text", text: child.pageIcon + " ", styles: {} },
                        {
                            type: "link",
                            href: `/page/${child.id}`,
                            content: [{ type: "text", text: child.title, styles: {} }]
                        }
                    ]
                });
            });

            editor.replaceBlocks(blocks, updatedBlocks as any);

            // Update lastChildOrderRef
            const newOrder = updatedBlocks
                .filter((block: any) => {
                    if (!Array.isArray(block.content)) return false;
                    return block.content.some((item: any) =>
                        item.type === "link" && item.href?.startsWith("/page/")
                    );
                })
                .map((block: any) => {
                    const linkItem = block.content.find((item: any) =>
                        item.type === "link" && item.href?.startsWith("/page/")
                    );
                    return linkItem?.href?.replace("/page/", "") || "";
                })
                .filter(Boolean);
            lastChildOrderRef.current = newOrder.join(',');
        }
    }, [currentChildren, editor, isLoading]);

    // Helper to check if a block is empty
    const isEmptyBlock = useCallback((block: any): boolean => {
        if (block.type !== "paragraph") return false;
        if (!Array.isArray(block.content) || block.content.length === 0) return true;
        const hasText = block.content.some((c: any) => c.text && c.text.trim());
        return !hasText;
    }, []);

    // Helper to extract child page IDs in order from blocks
    const extractChildPageOrder = useCallback((blocks: any[]): string[] => {
        const childPageIds: string[] = [];
        blocks.forEach((block: any) => {
            if (Array.isArray(block.content)) {
                block.content.forEach((item: any) => {
                    if (item.type === "link" && item.href?.startsWith("/page/")) {
                        const childId = item.href.replace("/page/", "");
                        if (!childPageIds.includes(childId)) {
                            childPageIds.push(childId);
                        }
                    }
                });
            }
        });
        return childPageIds;
    }, []);

    // Auto-save function
    const saveBlocks = useCallback(async () => {
        if (!editor) return;

        const blocks = editor.document;
        // Keep child page links to preserve user's custom ordering
        let contentBlocks = [...blocks];

        // Remove trailing empty paragraphs (keep only one for typing)
        while (contentBlocks.length > 1 && isEmptyBlock(contentBlocks[contentBlocks.length - 1])) {
            contentBlocks = contentBlocks.slice(0, -1);
        }

        const flatBlocks = flattenBlocks(contentBlocks, pageId);

        // Optimistic check to avoid duplicate saves
        const contentString = JSON.stringify(flatBlocks);
        if (contentString === lastSavedContentRef.current) return;

        // Extract title from first heading1 block
        const firstBlock = blocks[0] as any;
        let newTitle = "";
        if (firstBlock?.type === "heading" && firstBlock?.props?.level === 1) {
            if (Array.isArray(firstBlock.content)) {
                newTitle = firstBlock.content.map((c: any) => c.text || "").join("");
            } else if (typeof firstBlock.content === "string") {
                newTitle = firstBlock.content;
            }
        }

        // Update title locally if changed
        if (newTitle && newTitle !== lastSavedTitleRef.current) {
            lastSavedTitleRef.current = newTitle;
            setPageTitle(newTitle);
            updatePageTitleLocally(pageId, newTitle);
            // Also update on server
            api.pages.update(pageId, { title: newTitle }).catch(err => {
                console.error("Failed to update page title:", err);
            });
        }

        try {
            await api.blocks.updateBatch(pageId, flatBlocks);
            lastSavedContentRef.current = contentString;
        } catch (error) {
            console.error("Failed to auto-save blocks:", error);
        }
    }, [editor, pageId, updatePageTitleLocally, isEmptyBlock]);

    // Ref for order check timeout
    const orderCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onChange = useCallback(async () => {
        if (!editor) return;

        // Check for child page order changes with a small delay
        // (BlockNote may not have updated the document immediately after drag)
        if (orderCheckTimeoutRef.current) {
            clearTimeout(orderCheckTimeoutRef.current);
        }

        orderCheckTimeoutRef.current = setTimeout(async () => {
            const blocks = editor.document;
            const currentOrder = extractChildPageOrder(blocks);
            const currentOrderStr = currentOrder.join(',');

            if (currentOrderStr !== lastChildOrderRef.current && currentOrder.length > 0) {
                lastChildOrderRef.current = currentOrderStr;

                // Immediately update sidebar order
                try {
                    await api.pages.reorder(currentOrder, pageId);
                    await usePageStore.getState().loadPageTree();
                } catch (error) {
                    console.error("Failed to reorder child pages:", error);
                }
            }
        }, 100); // Small delay to let BlockNote update the document

        // Debounce content save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveBlocks();
        }, 1000); // 1 second debounce
    }, [saveBlocks, editor, extractChildPageOrder, pageId]);

    if (isLoading) {
        return (
            <div
                className="flex-1 flex items-center justify-center"
                style={{ backgroundColor: "var(--background)" }}
            >
                <div
                    className="animate-spin w-8 h-8 border-2 rounded-full"
                    style={{
                        borderColor: "var(--border)",
                        borderTopColor: "var(--color-primary)"
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-visible" style={{ backgroundColor: "var(--background)" }}>
            {/* Recording Panel (embedded at top) */}
            <RecorderPanel
                isOpen={recorderModalOpen}
                onClose={() => setRecorderModalOpen(false)}
                onRecordingStart={handleRecordingStart}
                onProcessWithAI={handleRecordingProcessWithAI}
                onSaveWithoutAI={handleRecordingSaveWithoutAI}
            />

            <div
                ref={editorContainerRef}
                className="max-w-4xl mx-auto pl-12 pr-4 md:pl-16 md:pr-12 pt-8 md:pt-16 pb-4 w-full overflow-visible flex-1"
                style={{ minHeight: 'calc(100vh - 100px)' }}
            >
                <Breadcrumb pageId={pageId} />

                {/* AI Ingestion Modal */}
                <AiIngestionModal
                    isOpen={activePanel !== null}
                    onClose={closePanel}
                    onInsert={handlePanelInsert}
                    initialMode={activePanel || 'youtube'}
                />

                <BlockNoteView
                    editor={editor}
                    theme={theme}
                    onChange={onChange}
                    slashMenu={false}
                >
                    <SuggestionMenuController
                        triggerCharacter={"/"}
                        getItems={async (query) => {
                            const defaultItems = getDefaultReactSlashMenuItems(editor);
                            const localizedItems = localizeDefaultItems(defaultItems);
                            return filterSuggestionItems(
                                [
                                    insertPageItem,
                                    insertMagicItem,
                                    insertRecordingItem,
                                    insertYoutubeItem,
                                    insertPdfItem,
                                    insertAudioItem,
                                    insertImageItem,
                                    insertUrlItem,
                                    ...localizedItems
                                ],
                                query
                            );
                        }}
                    />
                </BlockNoteView>
            </div>

            {/* Recording Bar (shown when recording) */}
            <RecordingBar
                pageTitle={pageTitle}
                onStop={handleRecordingStop}
            />
        </div>
    );
}
