"use client";

import { useState, useEffect } from "react";
import { Monitor, Mic, AppWindow, X, Loader2, Check, Sparkles, Save, Trash2 } from "lucide-react";
import { useRecorderStore } from "@/store/useRecorderStore";

type AudioSource = "tab" | "screen" | "mic";
type RecorderStep = "source-select" | "completed";

interface RecorderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRecordingStart: () => void;
    onProcessWithAI: (blob: Blob, duration: number) => void;
    onSaveWithoutAI: (blob: Blob, duration: number) => void;
}

export default function RecorderModal({
    isOpen,
    onClose,
    onRecordingStart,
    onProcessWithAI,
    onSaveWithoutAI
}: RecorderModalProps) {
    const [step, setStep] = useState<RecorderStep>("source-select");
    const [selectedSource, setSelectedSource] = useState<AudioSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState("업로드 중...");
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

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

    // Check if recording completed
    useEffect(() => {
        if (audioBlob && !isRecording) {
            setStep("completed");
            setAudioUrl(URL.createObjectURL(audioBlob));
        }
    }, [audioBlob, isRecording]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            // Check if there's already a completed recording
            if (audioBlob && !isRecording) {
                setStep("completed");
                setAudioUrl(URL.createObjectURL(audioBlob));
            } else {
                setStep("source-select");
                setSelectedSource(null);
            }
            setIsProcessing(false);
            setCurrentStepIndex(0);
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
            onClose();
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

        // Simulate progress
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading && !isProcessing) {
                    onClose();
                }
            }}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{
                    backgroundColor: "var(--card-background)",
                    border: "1px solid var(--border)"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                        <Mic size={20} className="text-[var(--color-primary)]" />
                        녹음 시작
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isLoading || isProcessing}
                        className="w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Source Selection */}
                {step === "source-select" && (
                    <div className="p-6 space-y-4">
                        <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                            어떤 오디오를 녹음할까요?
                        </p>

                        <div className="space-y-3">
                            {/* Tab Audio */}
                            <button
                                onClick={() => setSelectedSource("tab")}
                                className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                style={{
                                    border: selectedSource === "tab"
                                        ? "2px solid var(--color-primary)"
                                        : "2px solid var(--border)",
                                    backgroundColor: selectedSource === "tab"
                                        ? "var(--color-primary)/10"
                                        : "transparent"
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: "rgba(35, 131, 226, 0.2)" }}
                                >
                                    <AppWindow size={20} className="text-[var(--color-primary)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium" style={{ color: "var(--foreground)" }}>브라우저 탭</h3>
                                    <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                        탭에서 재생 중인 영상 오디오
                                    </p>
                                </div>
                                {selectedSource === "tab" && (
                                    <Check size={20} className="text-[var(--color-primary)]" />
                                )}
                            </button>

                            {/* System Audio */}
                            <button
                                onClick={() => setSelectedSource("screen")}
                                className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                style={{
                                    border: selectedSource === "screen"
                                        ? "2px solid var(--color-success)"
                                        : "2px solid var(--border)",
                                    backgroundColor: selectedSource === "screen"
                                        ? "var(--color-success)/10"
                                        : "transparent"
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: "rgba(15, 123, 108, 0.2)" }}
                                >
                                    <Monitor size={20} className="text-[var(--color-success)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium" style={{ color: "var(--foreground)" }}>시스템 오디오</h3>
                                    <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                        컴퓨터에서 나오는 모든 소리
                                    </p>
                                </div>
                                {selectedSource === "screen" && (
                                    <Check size={20} className="text-[var(--color-success)]" />
                                )}
                            </button>

                            {/* Microphone */}
                            <button
                                onClick={() => setSelectedSource("mic")}
                                className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                style={{
                                    border: selectedSource === "mic"
                                        ? "2px solid var(--color-warning)"
                                        : "2px solid var(--border)",
                                    backgroundColor: selectedSource === "mic"
                                        ? "var(--color-warning)/10"
                                        : "transparent"
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: "rgba(203, 145, 47, 0.2)" }}
                                >
                                    <Mic size={20} className="text-[var(--color-warning)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium" style={{ color: "var(--foreground)" }}>마이크</h3>
                                    <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                        직접 녹음 (오프라인 강의)
                                    </p>
                                </div>
                                {selectedSource === "mic" && (
                                    <Check size={20} className="text-[var(--color-warning)]" />
                                )}
                            </button>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartRecording}
                            disabled={!selectedSource || isLoading}
                            className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: "var(--color-primary)",
                                color: "white"
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>준비 중...</span>
                                </>
                            ) : (
                                <>
                                    <Mic size={18} />
                                    <span>녹음 시작</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Recording Completed */}
                {step === "completed" && (
                    <div className="p-6 space-y-4">
                        {/* Success Icon */}
                        <div className="text-center py-4">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ backgroundColor: "rgba(15, 123, 108, 0.2)" }}
                            >
                                <Check size={32} className="text-[var(--color-success)]" />
                            </div>
                            <h3 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                                녹음 완료!
                            </h3>
                            <p className="text-sm mt-1" style={{ color: "var(--foreground-secondary)" }}>
                                {formatDuration(duration)} 분량
                            </p>
                        </div>

                        {/* Audio Preview */}
                        {audioUrl && (
                            <div
                                className="rounded-xl p-4"
                                style={{
                                    backgroundColor: "var(--background-secondary)",
                                    border: "1px solid var(--border)"
                                }}
                            >
                                <audio src={audioUrl} controls className="w-full h-10" />
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!isProcessing ? (
                            <div className="space-y-2">
                                <button
                                    onClick={handleProcessWithAI}
                                    className="w-full py-3.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                    style={{
                                        backgroundColor: "var(--color-primary)",
                                        color: "white"
                                    }}
                                >
                                    <Sparkles size={18} />
                                    <span>AI 요약 생성</span>
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveWithoutAI}
                                        className="flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        style={{
                                            backgroundColor: "var(--background-tertiary)",
                                            color: "var(--foreground)"
                                        }}
                                    >
                                        <Save size={18} />
                                        <span>저장만</span>
                                    </button>

                                    <button
                                        onClick={handleDiscard}
                                        className="flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        style={{ color: "var(--color-error)" }}
                                    >
                                        <Trash2 size={18} />
                                        <span>취소</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Processing Progress */
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div
                                        className="inline-flex items-center gap-3 px-4 py-3 rounded-xl"
                                        style={{ backgroundColor: "var(--color-primary)/10" }}
                                    >
                                        <div className="relative">
                                            <div
                                                className="w-8 h-8 border-2 rounded-full animate-spin"
                                                style={{
                                                    borderColor: "var(--color-primary)/30",
                                                    borderTopColor: "var(--color-primary)"
                                                }}
                                            />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-sm" style={{ color: "var(--color-primary)" }}>
                                                {processingStep}
                                            </p>
                                            <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                                잠시만 기다려주세요
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Steps */}
                                <div className="flex items-center justify-center gap-2">
                                    {processingSteps.map((stepItem, i) => (
                                        <div key={stepItem.id} className="flex items-center gap-2">
                                            <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${getStepClass(i)}`}
                                            >
                                                {currentStepIndex > i ? (
                                                    <Check size={12} />
                                                ) : (
                                                    i + 1
                                                )}
                                            </div>
                                            {i < processingSteps.length - 1 && (
                                                <div
                                                    className="w-8 h-0.5 rounded-full transition-colors"
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

                                <p className="text-center text-xs" style={{ color: "var(--foreground-tertiary)" }}>
                                    녹음을 분석하고 요약을 생성하고 있습니다
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
