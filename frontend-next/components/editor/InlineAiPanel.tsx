"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import AiIngestionPanel from "./AiIngestionPanel";

type IngestionMode = 'youtube' | 'pdf' | 'audio' | 'image' | 'url' | 'record';

interface InlineAiPanelProps {
    mode: IngestionMode;
    blockId: string;
    onInsert: (content: string) => void;
    onClose: () => void;
}

export default function InlineAiPanel({ mode, blockId, onInsert, onClose }: InlineAiPanelProps) {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Find the block element by data-id attribute
        const blockElement = document.querySelector(`[data-id="${blockId}"]`);

        if (blockElement) {
            // Create a wrapper div to hold the panel
            const wrapper = document.createElement('div');
            wrapper.className = 'inline-ai-panel-wrapper';
            wrapper.style.width = '100%';
            wrapper.style.marginTop = '8px';
            wrapper.style.marginBottom = '8px';

            // Insert the wrapper after the block element
            blockElement.parentNode?.insertBefore(wrapper, blockElement.nextSibling);

            wrapperRef.current = wrapper;
            setContainer(wrapper);
        }

        return () => {
            // Cleanup: remove the wrapper when component unmounts
            if (wrapperRef.current && wrapperRef.current.parentNode) {
                wrapperRef.current.parentNode.removeChild(wrapperRef.current);
            }
        };
    }, [blockId]);

    if (!container) {
        // Fallback: render at top if block not found
        return (
            <div className="mb-4">
                <AiIngestionPanel
                    mode={mode}
                    onInsert={onInsert}
                    onClose={onClose}
                />
            </div>
        );
    }

    return createPortal(
        <AiIngestionPanel
            mode={mode}
            onInsert={onInsert}
            onClose={onClose}
        />,
        container
    );
}
