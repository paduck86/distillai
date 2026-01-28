"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Youtube, FileText, Mic, Image as ImageIcon, Link2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState, useRef } from "react";

type IngestionMode = 'youtube' | 'pdf' | 'audio' | 'image' | 'url';

// Simple custom block
export const AiIngestionBlock = createReactBlockSpec(
    {
        type: "aiIngestion" as const,
        propSchema: {
            mode: { default: "youtube" },
        },
        content: "none",
    },
    {
        render: (props) => {
            const mode = props.block.props.mode || "youtube";
            const [inputValue, setInputValue] = useState("");
            const [isLoading, setIsLoading] = useState(false);
            const [result, setResult] = useState("");
            const fileInputRef = useRef<HTMLInputElement>(null);

            const handleSubmit = async () => {
                if (!inputValue) return;
                setIsLoading(true);

                try {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    setResult(`AI Summary for ${mode}: ${inputValue}\n\nThis is a simulated summary.`);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };

            const tabs = [
                { id: 'youtube', icon: Youtube, label: 'YouTube' },
                { id: 'pdf', icon: FileText, label: 'PDF' },
                { id: 'audio', icon: Mic, label: 'Audio' },
            ] as const;

            return (
                <div
                    className="my-4 rounded-lg overflow-hidden"
                    style={{
                        backgroundColor: "var(--background-secondary)",
                        border: "1px solid var(--border)"
                    }}
                >
                    <div className="p-4 space-y-4">
                        <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            AI 콘텐츠 분석 ({mode})
                        </div>

                        {!result && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="URL 또는 텍스트 입력..."
                                    className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
                                    style={{
                                        backgroundColor: "var(--input-background)",
                                        border: "1px solid var(--input-border)",
                                        color: "var(--foreground)"
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!inputValue || isLoading}
                                    className="px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                                    style={{
                                        backgroundColor: "var(--color-primary)",
                                        color: "white"
                                    }}
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={16} /> : "요약"}
                                </button>
                            </div>
                        )}

                        {result && (
                            <div
                                className="rounded-md p-4"
                                style={{
                                    backgroundColor: "var(--background)",
                                    border: "1px solid var(--border)"
                                }}
                            >
                                <div className="flex items-center gap-2 mb-2" style={{ color: "var(--color-success)" }}>
                                    <CheckCircle2 size={16} />
                                    분석 완료
                                </div>
                                <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                                    {result}
                                </div>
                                <button
                                    onClick={() => {
                                        props.editor.insertBlocks(
                                            [{ type: "paragraph", content: result } as any],
                                            props.block,
                                            "after"
                                        );
                                        setResult("");
                                        setInputValue("");
                                    }}
                                    className="mt-3 text-xs underline"
                                    style={{ color: "var(--foreground-secondary)" }}
                                >
                                    텍스트로 변환
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        },
    }
);
