"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { Sparkles, FileText, Youtube, Mic, Image as ImageIcon, Link2, Radio } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { usePageStore } from "@/store/usePageStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useShallow } from "zustand/react/shallow";
import InlineAiPanel from "./InlineAiPanel";
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
                        content: [{ type: "text", text: title, styles: { underline: true } }]
                    }
                ]
            };
        });
    }, [findPageById]);

    // Handle internal link clicks - use mousedown to catch before BlockNote/TipTap
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Find anchor tag
            const anchor = target.tagName === 'A'
                ? target as HTMLAnchorElement
                : target.closest('a');

            if (!anchor) return;

            const href = anchor.getAttribute('href') || '';

            // Check if it's an internal page link
            if (href.startsWith('/page/')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const targetPageId = href.replace('/page/', '');

                if (targetPageId && targetPageId !== pageId) {
                    selectPage(targetPageId);
                    router.push(`/page/${targetPageId}`);
                }
            }
        };

        // mousedown fires before click, so we can intercept first
        document.addEventListener('mousedown', handleMouseDown, true);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
        };
    }, [router, selectPage, pageId]);

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
                                content: [{ type: "text", text: "Untitled", styles: { underline: true } }]
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
                            content: [{ type: "text", text: child.title, styles: { underline: true } }]
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

            <div className="max-w-4xl mx-auto pl-12 pr-4 md:pl-16 md:pr-12 pt-8 md:pt-16 pb-4 w-full overflow-visible">
                <Breadcrumb pageId={pageId} />

                {/* AI Ingestion Panel (inline at block position) */}
                {activePanel && panelBlockId && (
                    <InlineAiPanel
                        mode={activePanel}
                        blockId={panelBlockId}
                        onInsert={handlePanelInsert}
                        onClose={closePanel}
                    />
                )}

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
