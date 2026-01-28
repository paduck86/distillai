"use client";

import { useState, useEffect } from "react";
import { Monitor, Mic, AppWindow, X, Loader2, Check, Sparkles, Save, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useRecorderStore } from "@/store/useRecorderStore";

type AudioSource = "tab" | "screen" | "mic";

interface RecorderPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingStart: () => void;
    onProcessWithAI: (blob: Blob, duration: number) => void;
    onSaveWithoutAI: (blob: Blob, duration: number) => void;
}

export default function RecorderPanel({
    isOpen,
    onClose,
    onRecordingStart,
    onProcessWithAI,
    onSaveWithoutAI
}: RecorderPanelProps) {
    const [selectedSource, setSelectedSource] = useState<AudioSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState("업로드 중...");
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const {
        audioBlob,
        duration,
        isRecording,
        startRecording,
        startScreenRecording,
        formatDuration,
        reset
    } = useRecorderStore();

    const processingSteps = [
        { id: "upload", label: "업로드 중" },
        { id: "transcribe", label: "전사 중" },
        { id: "summarize", label: "요약 생성" },
    ];

    const isCompleted = audioBlob && !isRecording;

    // Create audio URL when recording completes
    useEffect(() => {
        if (audioBlob && !isRecording) {
            setAudioUrl(URL.createObjectURL(audioBlob));
        }
    }, [audioBlob, isRecording]);

    // Reset when panel opens
    useEffect(() => {
        if (isOpen && !audioBlob && !isRecording) {
            setSelectedSource(null);
            setIsProcessing(false);
            setCurrentStepIndex(0);
            setIsCollapsed(false);
        }
    }, [isOpen, audioBlob, isRecording]);

    // Cleanup audio URL
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleStartRecording = async () => {
        if (!selectedSource) return;

        setIsLoading(true);

        try {
            if (selectedSource === "mic") {
                await startRecording(false);
            } else if (selectedSource === "screen") {
                await startScreenRecording();
            } else {
                await startRecording(true);
            }

            onRecordingStart();
        } catch (error) {
            console.error("Failed to start recording:", error);
            alert(error instanceof Error ? error.message : "녹음을 시작할 수 없습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleProcessWithAI = () => {
        if (!audioBlob) return;

        setIsProcessing(true);
        setCurrentStepIndex(0);
        setProcessingStep("업로드 중...");

        setTimeout(() => {
            setCurrentStepIndex(1);
            setProcessingStep("전사 중...");
        }, 2000);

        setTimeout(() => {
            setCurrentStepIndex(2);
            setProcessingStep("요약 생성 중...");
        }, 5000);

        onProcessWithAI(audioBlob, duration);
    };

    const handleSaveWithoutAI = () => {
        if (!audioBlob) return;
        onSaveWithoutAI(audioBlob, duration);
        handleDiscard();
    };

    const handleDiscard = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        reset();
        onClose();
    };

    const getStepClass = (index: number): string => {
        if (index < currentStepIndex) {
            return "bg-[var(--color-primary)] text-white";
        } else if (index === currentStepIndex) {
            return "bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]";
        }
        return "bg-[var(--background-tertiary)] text-[var(--foreground-tertiary)]";
    };

    if (!isOpen) return null;

    return (
        <div
            className="sticky top-0 z-20 border-b shadow-sm"
            style={{
                backgroundColor: "var(--card-background)",
                borderColor: "var(--border)"
            }}
        >
            {/* Header - Always visible */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: "rgba(35, 131, 226, 0.15)" }}
                    >
                        <Mic size={16} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                            {isCompleted ? "녹음 완료" : isRecording ? "녹음 중..." : "녹음 시작"}
                        </h3>
                        {isRecording && (
                            <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                에디터에서 메모하면서 녹음하세요
                            </p>
                        )}
                        {isCompleted && (
                            <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                {formatDuration(duration)} 분량
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isRecording && !isProcessing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--background-tertiary)]"
                            style={{ color: "var(--foreground-secondary)" }}
                        >
                            <X size={18} />
                        </button>
                    )}
                    <button
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--background-tertiary)]"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {/* Content - Collapsible */}
            {!isCollapsed && (
                <div className="px-4 pb-4">
                    {/* Source Selection (before recording) */}
                    {!isRecording && !isCompleted && (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                {/* Tab Audio */}
                                <button
                                    onClick={() => setSelectedSource("tab")}
                                    className="flex-1 p-3 rounded-xl text-left transition-all flex items-center gap-3"
                                    style={{
                                        border: selectedSource === "tab"
                                            ? "2px solid var(--color-primary)"
                                            : "2px solid var(--border)",
                                        backgroundColor: selectedSource === "tab"
                                            ? "rgba(35, 131, 226, 0.1)"
                                            : "transparent"
                                    }}
                                >
                                    <AppWindow size={18} className="text-[var(--color-primary)]" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>탭</span>
                                    </div>
                                    {selectedSource === "tab" && <Check size={16} className="text-[var(--color-primary)] ml-auto" />}
                                </button>

                                {/* System Audio */}
                                <button
                                    onClick={() => setSelectedSource("screen")}
                                    className="flex-1 p-3 rounded-xl text-left transition-all flex items-center gap-3"
                                    style={{
                                        border: selectedSource === "screen"
                                            ? "2px solid var(--color-success)"
                                            : "2px solid var(--border)",
                                        backgroundColor: selectedSource === "screen"
                                            ? "rgba(15, 123, 108, 0.1)"
                                            : "transparent"
                                    }}
                                >
                                    <Monitor size={18} className="text-[var(--color-success)]" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>시스템</span>
                                    </div>
                                    {selectedSource === "screen" && <Check size={16} className="text-[var(--color-success)] ml-auto" />}
                                </button>

                                {/* Microphone */}
                                <button
                                    onClick={() => setSelectedSource("mic")}
                                    className="flex-1 p-3 rounded-xl text-left transition-all flex items-center gap-3"
                                    style={{
                                        border: selectedSource === "mic"
                                            ? "2px solid var(--color-warning)"
                                            : "2px solid var(--border)",
                                        backgroundColor: selectedSource === "mic"
                                            ? "rgba(203, 145, 47, 0.1)"
                                            : "transparent"
                                    }}
                                >
                                    <Mic size={18} className="text-[var(--color-warning)]" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>마이크</span>
                                    </div>
                                    {selectedSource === "mic" && <Check size={16} className="text-[var(--color-warning)] ml-auto" />}
                                </button>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStartRecording}
                                disabled={!selectedSource || isLoading}
                                className="w-full py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: "var(--color-primary)",
                                    color: "white"
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>준비 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Mic size={16} />
                                        <span>녹음 시작</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Recording Completed */}
                    {isCompleted && (
                        <div className="space-y-3">
                            {/* Audio Preview */}
                            {audioUrl && (
                                <div
                                    className="rounded-xl p-3"
                                    style={{
                                        backgroundColor: "var(--background-secondary)",
                                        border: "1px solid var(--border)"
                                    }}
                                >
                                    <audio src={audioUrl} controls className="w-full h-8" />
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!isProcessing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleProcessWithAI}
                                        className="flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                        style={{
                                            backgroundColor: "var(--color-primary)",
                                            color: "white"
                                        }}
                                    >
                                        <Sparkles size={16} />
                                        <span>AI 요약</span>
                                    </button>

                                    <button
                                        onClick={handleSaveWithoutAI}
                                        className="py-2.5 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        style={{
                                            backgroundColor: "var(--background-tertiary)",
                                            color: "var(--foreground)"
                                        }}
                                    >
                                        <Save size={16} />
                                    </button>

                                    <button
                                        onClick={handleDiscard}
                                        className="py-2.5 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        style={{ color: "var(--color-error)" }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                /* Processing Progress */
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-5 h-5 border-2 rounded-full animate-spin"
                                            style={{
                                                borderColor: "var(--color-primary)/30",
                                                borderTopColor: "var(--color-primary)"
                                            }}
                                        />
                                        <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                                            {processingStep}
                                        </span>
                                    </div>

                                    {/* Progress Steps */}
                                    <div className="flex items-center gap-1">
                                        {processingSteps.map((stepItem, i) => (
                                            <div key={stepItem.id} className="flex items-center gap-1">
                                                <div
                                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${getStepClass(i)}`}
                                                >
                                                    {currentStepIndex > i ? <Check size={10} /> : i + 1}
                                                </div>
                                                {i < processingSteps.length - 1 && (
                                                    <div
                                                        className="w-4 h-0.5 rounded-full transition-colors"
                                                        style={{
                                                            backgroundColor: currentStepIndex > i
                                                                ? "var(--color-primary)"
                                                                : "var(--border)"
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
