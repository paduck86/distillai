import { create } from "zustand";
import { api, SyncedBlock, SyncedBlockContent, SyncedBlockWithRefs, SyncedBlockReference } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface SyncedBlockState {
    // State
    syncedBlocks: SyncedBlock[];
    isLoading: boolean;
    error: string | null;
    realtimeChannel: RealtimeChannel | null;

    // Actions
    loadSyncedBlocks: () => Promise<void>;
    getSyncedBlock: (id: string) => Promise<SyncedBlockWithRefs>;
    createSyncedBlock: (content: SyncedBlockContent[], title?: string) => Promise<SyncedBlock>;
    updateSyncedBlock: (id: string, content: SyncedBlockContent[], title?: string) => Promise<SyncedBlock>;
    deleteSyncedBlock: (id: string) => Promise<void>;

    // Block connections
    convertBlockToSynced: (blockId: string) => Promise<SyncedBlock>;
    linkBlockToSynced: (syncedBlockId: string, blockId: string) => Promise<void>;
    unlinkBlockFromSynced: (blockId: string) => Promise<void>;
    getSyncedBlockReferences: (syncedBlockId: string) => Promise<SyncedBlockReference[]>;

    // Realtime
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;

    // Callbacks for external updates (e.g., editor refresh)
    onSyncedBlockUpdate: ((syncedBlock: SyncedBlock) => void) | null;
    setOnSyncedBlockUpdate: (callback: ((syncedBlock: SyncedBlock) => void) | null) => void;
}

export const useSyncedBlockStore = create<SyncedBlockState>((set, get) => ({
    // Initial state
    syncedBlocks: [],
    isLoading: false,
    error: null,
    realtimeChannel: null,
    onSyncedBlockUpdate: null,

    // Load all synced blocks
    loadSyncedBlocks: async () => {
        set({ isLoading: true, error: null });
        try {
            const { data } = await api.syncedBlocks.getAll();
            set({ syncedBlocks: data, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    // Get single synced block with references
    getSyncedBlock: async (id: string) => {
        try {
            const { data } = await api.syncedBlocks.get(id);
            return data;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Create new synced block
    createSyncedBlock: async (content: SyncedBlockContent[], title?: string) => {
        try {
            const { data } = await api.syncedBlocks.create(content, title);
            set((state) => ({
                syncedBlocks: [data, ...state.syncedBlocks],
            }));
            return data;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Update synced block
    updateSyncedBlock: async (id: string, content: SyncedBlockContent[], title?: string) => {
        try {
            const { data } = await api.syncedBlocks.update(id, { content, title });
            set((state) => ({
                syncedBlocks: state.syncedBlocks.map((sb) =>
                    sb.id === id ? data : sb
                ),
            }));
            return data;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Delete synced block
    deleteSyncedBlock: async (id: string) => {
        try {
            await api.syncedBlocks.delete(id);
            set((state) => ({
                syncedBlocks: state.syncedBlocks.filter((sb) => sb.id !== id),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Convert existing block to synced block
    convertBlockToSynced: async (blockId: string) => {
        try {
            const { data } = await api.syncedBlocks.convertFromBlock(blockId);
            set((state) => ({
                syncedBlocks: [data, ...state.syncedBlocks],
            }));
            return data;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Link block to synced block
    linkBlockToSynced: async (syncedBlockId: string, blockId: string) => {
        try {
            await api.syncedBlocks.linkToBlock(syncedBlockId, blockId);
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Unlink block from synced block
    unlinkBlockFromSynced: async (blockId: string) => {
        try {
            await api.syncedBlocks.unlinkFromBlock(blockId);
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Get references to a synced block
    getSyncedBlockReferences: async (syncedBlockId: string) => {
        try {
            const { data } = await api.syncedBlocks.getReferences(syncedBlockId);
            return data;
        } catch (error) {
            set({ error: (error as Error).message });
            throw error;
        }
    },

    // Subscribe to realtime updates
    subscribeToRealtime: () => {
        const { realtimeChannel, onSyncedBlockUpdate } = get();
        if (realtimeChannel) return; // Already subscribed

        const channel = supabase
            .channel("synced_blocks_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "distillai",
                    table: "synced_blocks",
                },
                (payload) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    if (eventType === "INSERT") {
                        const newBlock: SyncedBlock = {
                            id: newRecord.id,
                            userId: newRecord.user_id,
                            content: newRecord.content,
                            title: newRecord.title,
                            createdAt: newRecord.created_at,
                            updatedAt: newRecord.updated_at,
                        };
                        set((state) => ({
                            syncedBlocks: [newBlock, ...state.syncedBlocks],
                        }));
                    } else if (eventType === "UPDATE") {
                        const updatedBlock: SyncedBlock = {
                            id: newRecord.id,
                            userId: newRecord.user_id,
                            content: newRecord.content,
                            title: newRecord.title,
                            createdAt: newRecord.created_at,
                            updatedAt: newRecord.updated_at,
                        };
                        set((state) => ({
                            syncedBlocks: state.syncedBlocks.map((sb) =>
                                sb.id === updatedBlock.id ? updatedBlock : sb
                            ),
                        }));
                        // Notify external listeners (e.g., editor)
                        if (onSyncedBlockUpdate) {
                            onSyncedBlockUpdate(updatedBlock);
                        }
                    } else if (eventType === "DELETE") {
                        set((state) => ({
                            syncedBlocks: state.syncedBlocks.filter(
                                (sb) => sb.id !== oldRecord.id
                            ),
                        }));
                    }
                }
            )
            .subscribe();

        set({ realtimeChannel: channel });
    },

    // Unsubscribe from realtime updates
    unsubscribeFromRealtime: () => {
        const { realtimeChannel } = get();
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
            set({ realtimeChannel: null });
        }
    },

    // Set callback for synced block updates
    setOnSyncedBlockUpdate: (callback) => {
        set({ onSyncedBlockUpdate: callback });
    },
}));
