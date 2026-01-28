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
import ChildPageLinks from "./ChildPageLinks";
import AiIngestionModal from "./AiIngestionModal";
import RecorderModal from "./RecorderModal";
import RecordingBar from "./RecordingBar";

interface EditorProps {
    pageId: string;
}

// Helper to flatten BlockNote tree to backend flat structure
const flattenBlocks = (blocks: any[], pageId: string, parentId: string | null = null): any[] => {
    let flat: any[] = [];
    blocks.forEach((block: any, index: number) => {
        // Extract text content from rich text array if needed
        let content = "";
        if (Array.isArray(block.content)) {
            content = block.content.map((c: any) => c.text || "").join("");
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

// Custom filter function
const filterSuggestionItems = (items: any[], query: string) => {
    return items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.aliases && item.aliases.some((alias: string) => alias.toLowerCase().includes(query.toLowerCase())))
    );
};

// Localize default BlockNote items to Korean with Notion-style descriptions
const localizeDefaultItems = (items: any[]) => {
    const translations: Record<string, { title: string; subtext: string; aliases?: string[] }> = {
        // Headings
        "Heading 1": { title: "제목 1", subtext: "섹션 제목 (대)", aliases: ["h1", "제목1", "heading1"] },
        "Heading 2": { title: "제목 2", subtext: "섹션 제목 (중)", aliases: ["h2", "제목2", "heading2"] },
        "Heading 3": { title: "제목 3", subtext: "섹션 제목 (소)", aliases: ["h3", "제목3", "heading3"] },
        // Basic blocks
        "Paragraph": { title: "텍스트", subtext: "일반 텍스트를 사용하여 쓰기 시작하세요", aliases: ["p", "텍스트", "paragraph"] },
        "Bullet List": { title: "글머리 기호 목록", subtext: "간단한 글머리 기호 목록을 만드세요", aliases: ["ul", "글머리", "bullet"] },
        "Numbered List": { title: "번호 매기기 목록", subtext: "번호가 있는 목록을 만드세요", aliases: ["ol", "번호", "numbered"] },
        "Check List": { title: "할 일 목록", subtext: "할 일 목록으로 작업을 추적하세요", aliases: ["todo", "할일", "check"] },
        "Toggle List": { title: "토글 목록", subtext: "내용을 숨기고 하위 목록을 만드세요", aliases: ["toggle", "토글", "접기"] },
        "Quote": { title: "인용", subtext: "인용문을 캡처하세요", aliases: ["quote", "인용", "blockquote"] },
        // Media
        "Image": { title: "이미지", subtext: "이미지를 업로드하거나 링크로 삽입하세요", aliases: ["img", "이미지", "사진"] },
        "Video": { title: "비디오", subtext: "YouTube, Vimeo 등의 동영상을 삽입하세요", aliases: ["video", "비디오", "영상"] },
        "Audio": { title: "오디오", subtext: "오디오 파일을 업로드하거나 삽입하세요", aliases: ["audio", "오디오", "소리"] },
        "File": { title: "파일", subtext: "파일을 업로드하거나 삽입하세요", aliases: ["file", "파일", "첨부"] },
        // Advanced
        "Table": { title: "표", subtext: "표를 추가하여 정렬하세요", aliases: ["table", "표", "테이블"] },
        "Code Block": { title: "코드", subtext: "코드 스니펫을 캡처하세요", aliases: ["code", "코드", "codeblock"] },
        "Emoji": { title: "이모지", subtext: "이모지를 삽입하세요", aliases: ["emoji", "이모지", "이모티콘"] },
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
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<IngestionMode>("youtube");
    const [recorderModalOpen, setRecorderModalOpen] = useState(false);
    const [pageTitle, setPageTitle] = useState("");
    const { addRecentView, createPage } = usePageStore();
    const { theme } = useThemeStore();
    const router = useRouter();

    // Refs for auto-save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedContentRef = useRef<string>("");

    // Initialize editor
    const editor = useCreateBlockNote();

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
                const { data } = await api.pages.summarize(pageId);
                editor.removeBlocks(loadingBlock);

                const summaryContent = data.summary || "요약 정보가 없습니다.";

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
                const newPageId = await createPage({ parentId: pageId, title: "Untitled" });

                if (newPageId) {
                    editor.insertBlocks(
                        [{
                            type: "paragraph",
                            content: [{ type: "link", href: `/page/${newPageId}`, content: "Untitled" }]
                        } as any],
                        currentBlock,
                        "after"
                    );
                    router.push(`/page/${newPageId}`);
                }
            } catch (error) {
                console.error("Failed to create page:", error);
            }
        },
        aliases: ["page", "페이지", "document"],
        group: "Basic",
        icon: <FileText className="w-4 h-4" style={{ color: "var(--foreground-secondary)" }} />,
        subtext: "하위 페이지를 생성하고 링크합니다.",
    }), [editor, pageId, createPage, router]);

    // AI Ingestion Slash Commands (Modal-based approach)
    const insertYoutubeItem = useMemo(() => ({
        title: "YouTube 요약",
        onItemClick: () => {
            setModalMode("youtube");
            setModalOpen(true);
        },
        aliases: ["youtube", "유튜브", "video", "영상"],
        group: "AI 분석",
        icon: <Youtube className="w-4 h-4" style={{ color: "#e03e3e" }} />,
        subtext: "YouTube 영상을 AI로 요약합니다.",
    }), []);

    const insertPdfItem = useMemo(() => ({
        title: "PDF 분석",
        onItemClick: () => {
            setModalMode("pdf");
            setModalOpen(true);
        },
        aliases: ["pdf", "문서", "document"],
        group: "AI 분석",
        icon: <FileText className="w-4 h-4" style={{ color: "#cb912f" }} />,
        subtext: "PDF 문서를 AI로 분석합니다.",
    }), []);

    const insertAudioItem = useMemo(() => ({
        title: "음성 분석",
        onItemClick: () => {
            setModalMode("audio");
            setModalOpen(true);
        },
        aliases: ["audio", "음성", "녹음", "voice"],
        group: "AI 분석",
        icon: <Mic className="w-4 h-4" style={{ color: "#0f7b6c" }} />,
        subtext: "음성 파일을 텍스트로 변환합니다.",
    }), []);

    const insertImageItem = useMemo(() => ({
        title: "이미지 분석",
        onItemClick: () => {
            setModalMode("image");
            setModalOpen(true);
        },
        aliases: ["image", "이미지", "사진", "photo"],
        group: "AI 분석",
        icon: <ImageIcon className="w-4 h-4" style={{ color: "#9065b0" }} />,
        subtext: "이미지를 AI로 분석합니다.",
    }), []);

    const insertUrlItem = useMemo(() => ({
        title: "웹페이지 요약",
        onItemClick: () => {
            setModalMode("url");
            setModalOpen(true);
        },
        aliases: ["url", "웹", "link", "링크", "webpage"],
        group: "AI 분석",
        icon: <Link2 className="w-4 h-4" style={{ color: "#2383e2" }} />,
        subtext: "웹 페이지를 AI로 요약합니다.",
    }), []);

    // Recording Slash Command Item
    const insertRecordingItem = useMemo(() => ({
        title: "녹음",
        onItemClick: () => {
            setModalMode("record");
            setModalOpen(true);
        },
        aliases: ["record", "녹음", "recording", "voice", "음성녹음", "강의"],
        group: "AI 분석",
        icon: <Radio className="w-4 h-4" style={{ color: "#e03e3e" }} />,
        subtext: "오디오를 녹음하고 AI로 요약합니다.",
    }), []);

    // Handler for inserting AI-generated content from modal
    const handleModalInsert = (content: string) => {
        const currentBlock = editor.getTextCursorPosition().block;

        // Parse markdown-like content into blocks
        const lines = content.split('\n').filter(line => line.trim());
        const blocks: any[] = [];

        lines.forEach(line => {
            if (line.startsWith('## ')) {
                blocks.push({
                    type: "heading",
                    props: { level: 2 },
                    content: line.slice(3)
                });
            } else if (line.startsWith('### ')) {
                blocks.push({
                    type: "heading",
                    props: { level: 3 },
                    content: line.slice(4)
                });
            } else if (line.startsWith('- ')) {
                blocks.push({
                    type: "bulletListItem",
                    content: line.slice(2)
                });
            } else if (line.startsWith('**') && line.includes('**:')) {
                // Bold label with content
                blocks.push({
                    type: "paragraph",
                    content: [
                        { type: "text", text: line, styles: {} }
                    ]
                });
            } else {
                blocks.push({
                    type: "paragraph",
                    content: line
                });
            }
        });

        if (blocks.length > 0) {
            editor.insertBlocks(blocks, currentBlock, "after");
        }
    };

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
            try {
                const { data: page } = await api.pages.get(pageId);
                setPageTitle(page.title || "Untitled");
                addRecentView(pageId, page.title || "Untitled");

                const { data: blocks } = await api.blocks.get(pageId);
                if (blocks && blocks.length > 0) {
                    editor.replaceBlocks(editor.document, blocks as any);
                }
            } catch (err) {
                console.error("Failed to load page:", err);
            } finally {
                setIsLoading(false);
            }
        }
        if (editor) {
            load();
        }
    }, [pageId, addRecentView, editor]);

    // Auto-save function
    const saveBlocks = useCallback(async () => {
        if (!editor) return;

        const blocks = editor.document;
        const flatBlocks = flattenBlocks(blocks, pageId);

        // Optimistic check to avoid duplicate saves
        const contentString = JSON.stringify(flatBlocks);
        if (contentString === lastSavedContentRef.current) return;

        try {
            await api.blocks.updateBatch(pageId, flatBlocks);
            lastSavedContentRef.current = contentString;
            // console.log("Auto-saved blocks");
        } catch (error) {
            console.error("Failed to auto-save blocks:", error);
        }
    }, [editor, pageId]);

    const onChange = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveBlocks();
        }, 1000); // 1 second debounce
    }, [saveBlocks]);

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
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "var(--background)" }}>
            <div className="max-w-4xl mx-auto px-4 md:px-12 pt-8 md:pt-16 pb-4">
                <ChildPageLinks pageId={pageId} />
            </div>
            <div className="max-w-4xl mx-auto px-4 md:px-12 pb-16">
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

            {/* AI Ingestion Modal */}
            <AiIngestionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onInsert={handleModalInsert}
                initialMode={modalMode}
            />

            {/* Recording Modal */}
            <RecorderModal
                isOpen={recorderModalOpen}
                onClose={() => setRecorderModalOpen(false)}
                onRecordingStart={handleRecordingStart}
                onProcessWithAI={handleRecordingProcessWithAI}
                onSaveWithoutAI={handleRecordingSaveWithoutAI}
            />

            {/* Recording Bar (shown when recording) */}
            <RecordingBar
                pageTitle={pageTitle}
                onStop={handleRecordingStop}
            />
        </div>
    );
}
