"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, Link2, Search, X } from "lucide-react";
import { useSyncedBlockStore } from "@/store/useSyncedBlockStore";
import { SyncedBlock } from "@/lib/api";

interface SyncedBlockMenuProps {
    position: { x: number; y: number };
    selectedBlockId: string;
    onClose: () => void;
    onConvertToSynced: (syncedBlock: SyncedBlock) => void;
    onLinkToSynced: (syncedBlockId: string) => void;
}

/**
 * SyncedBlockMenu
 *
 * 블록 선택 시 나타나는 동기화 블록 메뉴
 * - 새 동기화 블록 만들기
 * - 기존 동기화 블록 연결
 */
export default function SyncedBlockMenu({
    position,
    selectedBlockId,
    onClose,
    onConvertToSynced,
    onLinkToSynced,
}: SyncedBlockMenuProps) {
    const [mode, setMode] = useState<"main" | "search">("main");
    const [searchQuery, setSearchQuery] = useState("");
    const [isConverting, setIsConverting] = useState(false);

    const {
        syncedBlocks,
        loadSyncedBlocks,
        convertBlockToSynced,
        isLoading,
    } = useSyncedBlockStore();

    // Load synced blocks on mount
    useEffect(() => {
        loadSyncedBlocks();
    }, [loadSyncedBlocks]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(".synced-block-menu")) {
                onClose();
            }
        };
        setTimeout(() => {
            window.addEventListener("click", handleClickOutside);
        }, 100);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [onClose]);

    const handleConvertToSynced = useCallback(async () => {
        try {
            setIsConverting(true);
            const syncedBlock = await convertBlockToSynced(selectedBlockId);
            onConvertToSynced(syncedBlock);
            onClose();
        } catch (error) {
            console.error("Failed to convert to synced block:", error);
        } finally {
            setIsConverting(false);
        }
    }, [selectedBlockId, convertBlockToSynced, onConvertToSynced, onClose]);

    const handleLinkToSynced = useCallback((syncedBlockId: string) => {
        onLinkToSynced(syncedBlockId);
        onClose();
    }, [onLinkToSynced, onClose]);

    const filteredSyncedBlocks = syncedBlocks.filter((block) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const title = block.title?.toLowerCase() || "";
        const content = block.content
            .map((c) => c.content.toLowerCase())
            .join(" ");
        return title.includes(query) || content.includes(query);
    });

    return (
        <div
            className="synced-block-menu fixed z-[9999] w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <RefreshCw className="w-4 h-4 text-cyan-500" />
                    <span>동기화 블록</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {mode === "main" ? (
                <div className="p-2">
                    {/* Create new synced block */}
                    <button
                        onClick={handleConvertToSynced}
                        disabled={isConverting}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded transition-colors disabled:opacity-50"
                    >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/30 rounded">
                            <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <div className="font-medium">
                                {isConverting ? "변환 중..." : "동기화 블록 만들기"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                이 블록을 다른 페이지에서 참조 가능하게 만듭니다
                            </div>
                        </div>
                    </button>

                    {/* Link to existing synced block */}
                    <button
                        onClick={() => setMode("search")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded transition-colors"
                    >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded">
                            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <div className="font-medium">기존 동기화 블록 연결</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                다른 페이지의 동기화 블록을 여기에 표시합니다
                            </div>
                        </div>
                    </button>
                </div>
            ) : (
                <div className="p-2">
                    {/* Search input */}
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="동기화 블록 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-none rounded focus:ring-2 focus:ring-cyan-500 outline-none"
                        />
                    </div>

                    {/* Synced blocks list */}
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                                로딩 중...
                            </div>
                        ) : filteredSyncedBlocks.length === 0 ? (
                            <div className="text-center py-4 text-sm text-gray-500">
                                {searchQuery
                                    ? "검색 결과가 없습니다"
                                    : "동기화 블록이 없습니다"}
                            </div>
                        ) : (
                            filteredSyncedBlocks.map((block) => (
                                <button
                                    key={block.id}
                                    onClick={() => handleLinkToSynced(block.id)}
                                    className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                >
                                    <RefreshCw className="flex-shrink-0 w-4 h-4 mt-0.5 text-cyan-500" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium truncate">
                                            {block.title ||
                                                block.content[0]?.content?.slice(0, 30) ||
                                                "제목 없음"}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {block.content
                                                .map((c) => c.content)
                                                .join(" ")
                                                .slice(0, 50)}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Back button */}
                    <button
                        onClick={() => setMode("main")}
                        className="w-full mt-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        ← 뒤로
                    </button>
                </div>
            )}
        </div>
    );
}
