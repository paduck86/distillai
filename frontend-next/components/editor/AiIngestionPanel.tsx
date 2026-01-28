"use client";

import { useState, useRef, useEffect } from "react";
import { Youtube, FileText, Mic, Image as ImageIcon, Link2, Loader2, CheckCircle2, XCircle, X, Radio, Monitor, AppWindow, Play, Pause, Square, Check, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { useRecorderStore } from "@/store/useRecorderStore";

type IngestionMode = 'youtube' | 'pdf' | 'audio' | 'image' | 'url' | 'record';
type AudioSource = 'tab' | 'screen' | 'mic';

interface AiIngestionPanelProps {
    mode: IngestionMode;
    onInsert: (content: string) => void;
    onClose: () => void;
}

export default function AiIngestionPanel({ mode, onInsert, onClose }: AiIngestionPanelProps) {
    const [inputValue, setInputValue] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Recording specific states
    const [selectedSource, setSelectedSource] = useState<AudioSource | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const {
        isRecording,
        isPaused,
        duration,
        audioBlob,
        startRecording,
        startScreenRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        formatDuration,
        reset: resetRecorder
    } = useRecorderStore();

    // Handle recording completion
    useEffect(() => {
        if (audioBlob && !isRecording && mode === 'record') {
            setAudioUrl(URL.createObjectURL(audioBlob));
        }
    }, [audioBlob, isRecording, mode]);

    // Cleanup audio URL
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const getModeInfo = () => {
        switch (mode) {
            case 'record': return { icon: Radio, label: '녹음', color: '#e03e3e' };
            case 'youtube': return { icon: Youtube, label: 'YouTube 요약', color: '#e03e3e' };
            case 'pdf': return { icon: FileText, label: 'PDF 분석', color: '#cb912f' };
            case 'audio': return { icon: Mic, label: '음성 분석', color: '#0f7b6c' };
            case 'image': return { icon: ImageIcon, label: '이미지 분석', color: '#9065b0' };
            case 'url': return { icon: Link2, label: '웹페이지 요약', color: '#2383e2' };
        }
    };

    const modeInfo = getModeInfo();
    const Icon = modeInfo.icon;

    const handleSubmit = async () => {
        if (mode === 'youtube' || mode === 'url') {
            if (!inputValue) return;
        } else if (mode === 'record') {
            if (!audioBlob) return;
        } else {
            if (!selectedFile) return;
        }

        setIsLoading(true);
        setError("");

        try {
            let summary = "";

            switch (mode) {
                case 'youtube': {
                    const { data } = await api.youtube.summarize(inputValue);
                    summary = data.summary;
                    if (data.title) {
                        summary = `## ${data.title}\n\n${summary}`;
                    }
                    break;
                }
                case 'pdf': {
                    if (!selectedFile) throw new Error("파일을 선택해주세요.");
                    const { data } = await api.pdf.summarize(selectedFile);
                    summary = `## PDF 요약: ${selectedFile.name}\n\n${data.summary}`;
                    break;
                }
                case 'audio': {
                    if (!selectedFile) throw new Error("파일을 선택해주세요.");
                    const blob = new Blob([await selectedFile.arrayBuffer()], { type: selectedFile.type });
                    const { data } = await api.audio.summarize(blob);
                    summary = `## 음성 요약: ${selectedFile.name}\n\n${data.summary}`;
                    if (data.transcript) {
                        summary += `\n\n### 전체 텍스트\n${data.transcript}`;
                    }
                    break;
                }
                case 'image': {
                    if (!selectedFile) throw new Error("파일을 선택해주세요.");
                    const { data } = await api.image.analyze(selectedFile);
                    summary = `## 이미지 분석: ${selectedFile.name}\n\n${data.analysis}`;
                    break;
                }
                case 'url': {
                    const { data } = await api.url.summarize(inputValue);
                    summary = data.summary;
                    if (data.title) {
                        summary = `## ${data.title}\n\n${summary}`;
                    }
                    break;
                }
                case 'record': {
                    if (!audioBlob) throw new Error("녹음 파일이 없습니다.");
                    const { data } = await api.audio.summarize(audioBlob);
                    summary = `## 녹음 요약 (${formatDuration(duration)})\n\n${data.summary}`;
                    if (data.transcript) {
                        summary += `\n\n### 전체 텍스트\n${data.transcript}`;
                    }
                    break;
                }
            }

            setResult(summary);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = () => {
        onInsert(result);
        onClose();
    };

    const handleReset = () => {
        setInputValue("");
        setSelectedFile(null);
        setResult("");
        setError("");
        setIsLoading(false);
        setSelectedSource(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
        resetRecorder();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setInputValue(file.name);
        }
    };

    const handleStartRecording = async () => {
        if (!selectedSource) return;

        setError("");
        try {
            if (selectedSource === 'mic') {
                await startRecording(false);
            } else if (selectedSource === 'screen') {
                await startScreenRecording();
            } else {
                await startRecording(true);
            }
        } catch (err) {
            console.error("Failed to start recording:", err);
            setError(err instanceof Error ? err.message : "녹음을 시작할 수 없습니다.");
        }
    };

    const handleStopRecording = () => {
        stopRecording();
    };

    const canClose = !isLoading && !isRecording;

    const isButtonDisabled = (() => {
        if (isLoading) return true;
        if (mode === 'youtube' || mode === 'url') return !inputValue;
        if (mode === 'record') return !audioBlob || isRecording;
        return !selectedFile;
    })();

    return (
        <div
            className="rounded-xl mb-4 overflow-hidden"
            style={{
                backgroundColor: "var(--card-background)",
                border: "1px solid var(--border)"
            }}
        >
            {/* Header - Always visible */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{ borderBottom: isCollapsed ? "none" : "1px solid var(--border)" }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${modeInfo.color}20` }}
                    >
                        <Icon size={16} style={{ color: modeInfo.color }} />
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
                        {modeInfo.label}
                    </span>
                    {isRecording && (
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: "var(--color-error)" }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--color-error)" }} />
                            </span>
                            <span className="text-xs font-mono" style={{ color: "var(--color-error)" }}>
                                {formatDuration(duration)}
                            </span>
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" size={14} style={{ color: "var(--color-primary)" }} />
                            <span className="text-xs" style={{ color: "var(--foreground-secondary)" }}>분석 중...</span>
                        </div>
                    )}
                    {result && !isLoading && (
                        <div className="flex items-center gap-1">
                            <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
                            <span className="text-xs" style={{ color: "var(--color-success)" }}>완료</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <button
                        onClick={(e) => { e.stopPropagation(); canClose && onClose(); }}
                        disabled={!canClose}
                        className="p-1 rounded transition-colors disabled:opacity-50"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content - Collapsible */}
            {!isCollapsed && (
                <div className="p-4 space-y-4">
                    {/* Recording Mode */}
                    {mode === 'record' && !result && (
                        <div className="space-y-3">
                            {/* Not recording and no audio blob - show source selection */}
                            {!isRecording && !audioBlob && (
                                <>
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Tab Audio */}
                                        <button
                                            onClick={() => setSelectedSource('tab')}
                                            className="p-3 rounded-lg text-center transition-all"
                                            style={{
                                                border: selectedSource === 'tab' ? "2px solid var(--color-primary)" : "1px solid var(--border)",
                                                backgroundColor: selectedSource === 'tab' ? "rgba(35, 131, 226, 0.1)" : "transparent"
                                            }}
                                        >
                                            <AppWindow size={20} className="mx-auto mb-1" style={{ color: "#2383e2" }} />
                                            <span className="text-xs" style={{ color: "var(--foreground)" }}>브라우저 탭</span>
                                        </button>

                                        {/* System Audio */}
                                        <button
                                            onClick={() => setSelectedSource('screen')}
                                            className="p-3 rounded-lg text-center transition-all"
                                            style={{
                                                border: selectedSource === 'screen' ? "2px solid var(--color-success)" : "1px solid var(--border)",
                                                backgroundColor: selectedSource === 'screen' ? "rgba(15, 123, 108, 0.1)" : "transparent"
                                            }}
                                        >
                                            <Monitor size={20} className="mx-auto mb-1" style={{ color: "#0f7b6c" }} />
                                            <span className="text-xs" style={{ color: "var(--foreground)" }}>시스템</span>
                                        </button>

                                        {/* Microphone */}
                                        <button
                                            onClick={() => setSelectedSource('mic')}
                                            className="p-3 rounded-lg text-center transition-all"
                                            style={{
                                                border: selectedSource === 'mic' ? "2px solid var(--color-warning)" : "1px solid var(--border)",
                                                backgroundColor: selectedSource === 'mic' ? "rgba(203, 145, 47, 0.1)" : "transparent"
                                            }}
                                        >
                                            <Mic size={20} className="mx-auto mb-1" style={{ color: "#cb912f" }} />
                                            <span className="text-xs" style={{ color: "var(--foreground)" }}>마이크</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleStartRecording}
                                        disabled={!selectedSource}
                                        className="w-full py-2 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        style={{ backgroundColor: "var(--color-error)", color: "white" }}
                                    >
                                        <Radio size={16} />
                                        녹음 시작
                                    </button>
                                </>
                            )}

                            {/* Recording in progress */}
                            {isRecording && (
                                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--background-secondary)" }}>
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)" }} />
                                            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)" }} />
                                        </span>
                                        <span className="font-mono text-lg font-bold" style={{ color: "var(--foreground)" }}>
                                            {formatDuration(duration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isPaused ? (
                                            <button onClick={pauseRecording} className="p-2 rounded-full" style={{ backgroundColor: "var(--background-tertiary)" }}>
                                                <Pause size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={resumeRecording} className="p-2 rounded-full text-white" style={{ backgroundColor: "var(--color-success)" }}>
                                                <Play size={18} />
                                            </button>
                                        )}
                                        <button onClick={handleStopRecording} className="p-2 rounded-full text-white" style={{ backgroundColor: "var(--color-error)" }}>
                                            <Square size={18} fill="currentColor" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Recording completed */}
                            {!isRecording && audioBlob && (
                                <div className="space-y-3">
                                    {audioUrl && (
                                        <audio src={audioUrl} controls className="w-full h-10" />
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={handleReset} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--background-tertiary)", color: "var(--foreground)" }}>
                                            다시 녹음
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : "AI 요약"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Other modes (YouTube, PDF, Audio file, Image, URL) */}
                    {mode !== 'record' && !result && (
                        <div className="space-y-3">
                            {(mode === 'youtube' || mode === 'url') ? (
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={mode === 'youtube' ? "https://youtube.com/watch?v=..." : "https://example.com/article"}
                                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                                    style={{ backgroundColor: "var(--input-background)", border: "1px solid var(--input-border)", color: "var(--foreground)" }}
                                    onKeyDown={(e) => e.key === 'Enter' && !isButtonDisabled && handleSubmit()}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            ) : (
                                <div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        accept={mode === 'pdf' ? ".pdf" : mode === 'audio' ? "audio/*,.webm,.mp3,.wav,.m4a,.ogg" : "image/*"}
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        className="w-full rounded-lg p-4 text-center transition-colors disabled:opacity-50"
                                        style={{ border: "2px dashed var(--border)", backgroundColor: "var(--background-hover)", color: "var(--foreground-secondary)" }}
                                    >
                                        <span className="text-sm">{selectedFile ? selectedFile.name : "클릭하여 파일 업로드"}</span>
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isButtonDisabled}
                                className="w-full px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                            >
                                {isLoading ? <><Loader2 className="animate-spin" size={16} /> 분석 중...</> : "분석 시작"}
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(224, 62, 62, 0.1)", color: "var(--color-error)" }}>
                            <XCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-3">
                            <div className="rounded-lg p-3 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap" style={{ backgroundColor: "var(--background-secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                                {result}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleReset} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--background-tertiary)", color: "var(--foreground)" }}>
                                    다시 분석
                                </button>
                                <button onClick={handleInsert} className="flex-1 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                                    에디터에 삽입
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
