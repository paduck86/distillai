"use client";

import dynamic from "next/dynamic";

// BlockNote requires window/document, so it must be client-side only
const BlockNoteEditor = dynamic(() => import("./BlockNoteEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
    ),
});

export default function EditorWrapper({ pageId }: { pageId: string }) {
    return <BlockNoteEditor pageId={pageId} />;
}
