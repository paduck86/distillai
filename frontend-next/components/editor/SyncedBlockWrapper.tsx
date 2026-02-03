"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Link2, Unlink, ExternalLink } from "lucide-react";
import { useSyncedBlockStore } from "@/store/useSyncedBlockStore";
import { SyncedBlock, SyncedBlockReference } from "@/lib/api";

interface SyncedBlockWrapperProps {
    syncedBlockId: string;
    children: React.ReactNode;
    onContentUpdate?: (content: any[]) => void;
    onUnlink?: () => void;
    isEditing?: boolean;
}

/**
 * SyncedBlockWrapper
 *
 * 동기화 블록을 감싸는 래퍼 컴포넌트
 * - 특별한 테두리로 동기화 블록 표시
 * - 참조 수 및 연결된 페이지 정보 표시
 * - 연결 해제 기능
 * - 실시간 업데이트 수신
 */
export default function SyncedBlockWrapper({
    syncedBlockId,
    children,
    onContentUpdate,
    onUnlink,
    isEditing = false,
}: SyncedBlockWrapperProps) {
    const [syncedBlock, setSyncedBlock] = useState<SyncedBlock | null>(null);
    const [references, setReferences] = useState<SyncedBlockReference[]>([]);
    const [showReferences, setShowReferences] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const {
        getSyncedBlock,
        getSyncedBlockReferences,
        subscribeToRealtime,
        unsubscribeFromRealtime,
        setOnSyncedBlockUpdate,
    } = useSyncedBlockStore();

    // Load synced block data
    const loadSyncedBlock = useCallback(async () => {
        try {
            setIsLoading(true);
            const block = await getSyncedBlock(syncedBlockId);
            setSyncedBlock(block);

            const refs = await getSyncedBlockReferences(syncedBlockId);
            setReferences(refs);
        } catch (error) {
            console.error("Failed to load synced block:", error);
        } finally {
            setIsLoading(false);
        }
    }, [syncedBlockId, getSyncedBlock, getSyncedBlockReferences]);

    // Subscribe to realtime updates
    useEffect(() => {
        loadSyncedBlock();
        subscribeToRealtime();

        // Set callback for updates
        setOnSyncedBlockUpdate((updatedBlock) => {
            if (updatedBlock.id === syncedBlockId) {
                setSyncedBlock(updatedBlock);
                // Notify parent to update editor content
                if (onContentUpdate) {
                    onContentUpdate(updatedBlock.content);
                }
            }
        });

        return () => {
            unsubscribeFromRealtime();
            setOnSyncedBlockUpdate(null);
        };
    }, [syncedBlockId, loadSyncedBlock, subscribeToRealtime, unsubscribeFromRealtime, setOnSyncedBlockUpdate, onContentUpdate]);

    const handleUnlink = useCallback(() => {
        if (onUnlink) {
            onUnlink();
        }
    }, [onUnlink]);

    if (isLoading) {
        return (
            <div className="synced-block-wrapper loading">
                <div className="synced-block-skeleton animate-pulse">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="synced-block-wrapper group relative">
            {/* Synced block indicator bar */}
            <div className="synced-block-indicator absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-l" />

            {/* Header with sync info */}
            <div className="synced-block-header flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-cyan-500/20 dark:border-cyan-400/20 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-tr">
                <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin-slow" />
                <span className="font-medium text-cyan-600 dark:text-cyan-400">
                    동기화 블록
                </span>

                {/* Reference count */}
                <button
                    onClick={() => setShowReferences(!showReferences)}
                    className="ml-auto flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                    <Link2 className="w-3 h-3" />
                    <span>{references.length}곳에서 참조</span>
                </button>

                {/* Unlink button */}
                {!isEditing && onUnlink && (
                    <button
                        onClick={handleUnlink}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="동기화 해제"
                    >
                        <Unlink className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* References dropdown */}
            {showReferences && references.length > 0 && (
                <div className="synced-block-references absolute z-50 top-full left-4 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                        이 블록을 참조하는 페이지
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {references.map((ref) => (
                            <a
                                key={ref.blockId}
                                href={`/page/${ref.distillationId}`}
                                className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{ref.pageTitle}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Block content */}
            <div className="synced-block-content pl-4 pr-2 py-2 border-l-0 border border-cyan-500/20 dark:border-cyan-400/20 rounded-r rounded-bl bg-white dark:bg-gray-900">
                {children}
            </div>

            {/* Styles */}
            <style jsx>{`
                .synced-block-wrapper {
                    margin: 8px 0;
                }

                .synced-block-wrapper.loading .synced-block-skeleton {
                    opacity: 0.5;
                }

                @keyframes spin-slow {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
            `}</style>
        </div>
    );
}
