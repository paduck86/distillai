"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { List } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface HeadingItem {
    id: string;
    text: string;
    level: number;
}

// Table of Contents Custom Block
export const TableOfContentsBlock = createReactBlockSpec(
    {
        type: "tableOfContents" as const,
        propSchema: {},
        content: "none",
    },
    {
        render: (props) => {
            const [headings, setHeadings] = useState<HeadingItem[]>([]);

            // Function to scan headings from the editor
            const scanHeadings = useCallback(() => {
                const editor = props.editor;
                if (!editor || !editor.document) return;

                const newHeadings: HeadingItem[] = [];

                const scanBlocks = (blocks: any[]) => {
                    blocks.forEach((block) => {
                        if (block.type === "heading") {
                            const level = block.props?.level || 1;
                            // Extract text from content array
                            let text = "";
                            if (Array.isArray(block.content)) {
                                text = block.content
                                    .map((item: any) => {
                                        if (item.type === "text") return item.text || "";
                                        if (item.type === "link") {
                                            return item.content
                                                ?.map((c: any) => c.text || "")
                                                .join("") || "";
                                        }
                                        return "";
                                    })
                                    .join("");
                            } else if (typeof block.content === "string") {
                                text = block.content;
                            }

                            if (text.trim()) {
                                newHeadings.push({
                                    id: block.id,
                                    text: text.trim(),
                                    level,
                                });
                            }
                        }

                        // Recursively scan children
                        if (block.children && block.children.length > 0) {
                            scanBlocks(block.children);
                        }
                    });
                };

                scanBlocks(editor.document);
                setHeadings(newHeadings);
            }, [props.editor]);

            // Initial scan and subscribe to editor changes
            useEffect(() => {
                scanHeadings();

                // Subscribe to editor changes using TipTap's transaction handler
                const editor = props.editor;
                if (!editor) return;

                const tiptapEditor = (editor as any)._tiptapEditor;
                if (!tiptapEditor) return;

                const handleTransaction = () => {
                    // Debounce the scan to avoid excessive updates
                    setTimeout(scanHeadings, 100);
                };

                tiptapEditor.on("transaction", handleTransaction);

                return () => {
                    tiptapEditor.off("transaction", handleTransaction);
                };
            }, [scanHeadings, props.editor]);

            // Handle click to scroll to heading
            const handleHeadingClick = (headingId: string) => {
                // Find the heading block element in the DOM
                const blockElement = document.querySelector(
                    `.bn-block-outer[data-id="${headingId}"]`
                );

                if (blockElement) {
                    blockElement.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });

                    // Optionally focus the block
                    try {
                        props.editor.setTextCursorPosition(headingId, "start");
                    } catch {
                        // Ignore if focus fails
                    }
                }
            };

            // Calculate indentation based on heading level
            const getIndentStyle = (level: number) => {
                const baseIndent = (level - 1) * 16;
                return { paddingLeft: `${baseIndent}px` };
            };

            return (
                <div
                    className="my-4 rounded-lg overflow-hidden"
                    style={{
                        backgroundColor: "var(--background-secondary)",
                        border: "1px solid var(--border)",
                    }}
                    contentEditable={false}
                >
                    <div className="p-4">
                        {/* Header */}
                        <div
                            className="flex items-center gap-2 mb-3 pb-2"
                            style={{ borderBottom: "1px solid var(--border)" }}
                        >
                            <List
                                size={16}
                                style={{ color: "var(--foreground-secondary)" }}
                            />
                            <span
                                className="text-sm font-medium"
                                style={{ color: "var(--foreground)" }}
                            >
                                Table of Contents
                            </span>
                        </div>

                        {/* Heading List */}
                        {headings.length === 0 ? (
                            <div
                                className="text-sm py-2"
                                style={{ color: "var(--foreground-secondary)" }}
                            >
                                No headings found. Add headings (H1, H2, H3) to see them here.
                            </div>
                        ) : (
                            <nav className="space-y-1">
                                {headings.map((heading) => (
                                    <button
                                        key={heading.id}
                                        onClick={() => handleHeadingClick(heading.id)}
                                        className="block w-full text-left text-sm py-1.5 px-2 rounded transition-colors hover:bg-[var(--background)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                        style={{
                                            ...getIndentStyle(heading.level),
                                            color:
                                                heading.level === 1
                                                    ? "var(--foreground)"
                                                    : "var(--foreground-secondary)",
                                            fontWeight:
                                                heading.level === 1 ? 600 : 400,
                                        }}
                                    >
                                        {heading.text}
                                    </button>
                                ))}
                            </nav>
                        )}
                    </div>
                </div>
            );
        },
    }
);

// Export the block type for schema registration
export const tableOfContentsBlockType = "tableOfContents";
