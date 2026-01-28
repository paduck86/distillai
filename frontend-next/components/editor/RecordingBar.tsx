"use client";

import { Pause, Play, Square, Bookmark, FileEdit } from "lucide-react";
import { useRecorderStore } from "@/store/useRecorderStore";

interface RecordingBarProps {
    pageTitle?: string;
    showMarkerButton?: boolean;
    onStop: () => void;
    onAddMarker?: (time: number) => void;
}

export default function RecordingBar({
    pageTitle = "",
    showMarkerButton = true,
    onStop,
    onAddMarker
}: RecordingBarProps) {
    const {
        isRecording,
        isPaused,
        duration,
        pauseRecording,
        resumeRecording,
        stopRecording,
        formatDuration
    } = useRecorderStore();

    if (!isRecording) return null;

    const handleStop = () => {
        stopRecording();
        onStop();
    };

    const handleAddMarker = () => {
        if (onAddMarker) {
            onAddMarker(duration);
        }
    };

    const getBarHeight = (index: number): number => {
        if (isPaused) return 8;
        const heights = [12, 20, 16, 24, 14, 22, 18, 16];
        return heights[index - 1] || 12;
    };

    return (
        <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom-4 duration-300"
            style={{
                backgroundColor: "var(--card-background)",
                border: "1px solid var(--border)"
            }}
        >
            {/* Recording Indicator */}
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span
                        className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                        style={{
                            backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)"
                        }}
                    />
                    <span
                        className="relative inline-flex rounded-full h-3 w-3"
                        style={{
                            backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)"
                        }}
                    />
                </span>
                <span
                    className="text-sm font-medium"
                    style={{
                        color: isPaused ? "var(--color-warning)" : "var(--color-error)"
                    }}
                >
                    {isPaused ? "일시정지" : "REC"}
                </span>
            </div>

            {/* Timer */}
            <div
                className="font-mono text-lg font-semibold min-w-[80px]"
                style={{ color: "var(--foreground)" }}
            >
                {formatDuration(duration)}
            </div>

            {/* Waveform */}
            <div className="hidden sm:flex items-center gap-0.5 h-6 px-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                        key={i}
                        className="w-1 rounded-full transition-all"
                        style={{
                            backgroundColor: "var(--color-primary)",
                            height: `${getBarHeight(i)}px`,
                            animationDelay: `${i * 100}ms`,
                            animation: isPaused ? "none" : "wave 0.8s ease-in-out infinite alternate"
                        }}
                    />
                ))}
            </div>

            {/* Divider */}
            <div
                className="h-6 w-px"
                style={{ backgroundColor: "var(--border)" }}
            />

            {/* Controls */}
            <div className="flex items-center gap-2">
                {/* Pause/Resume Button */}
                {!isPaused ? (
                    <button
                        onClick={pauseRecording}
                        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                        style={{
                            color: "var(--foreground-secondary)"
                        }}
                        title="일시정지"
                    >
                        <Pause size={18} />
                    </button>
                ) : (
                    <button
                        onClick={resumeRecording}
                        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors text-white"
                        style={{
                            backgroundColor: "var(--color-success)"
                        }}
                        title="재개"
                    >
                        <Play size={18} />
                    </button>
                )}

                {/* Stop/Complete Button */}
                <button
                    onClick={handleStop}
                    className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors text-white"
                    style={{
                        backgroundColor: "var(--color-error)"
                    }}
                    title="녹음 완료"
                >
                    <Square size={16} fill="currentColor" />
                    <span className="hidden sm:inline">완료</span>
                </button>

                {/* Add Marker Button */}
                {showMarkerButton && (
                    <button
                        onClick={handleAddMarker}
                        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                        style={{
                            color: "var(--foreground-secondary)"
                        }}
                        title="마크 추가"
                    >
                        <Bookmark size={18} />
                    </button>
                )}
            </div>

            {/* Page Title */}
            {pageTitle && (
                <div className="hidden md:flex items-center gap-2 ml-2 max-w-[200px]">
                    <div
                        className="h-6 w-px"
                        style={{ backgroundColor: "var(--border)" }}
                    />
                    <FileEdit size={14} style={{ color: "var(--foreground-tertiary)" }} />
                    <span
                        className="text-sm truncate"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        {pageTitle}
                    </span>
                </div>
            )}

            <style jsx>{`
                @keyframes wave {
                    from {
                        height: 8px;
                    }
                    to {
                        height: 20px;
                    }
                }
            `}</style>
        </div>
    );
}
