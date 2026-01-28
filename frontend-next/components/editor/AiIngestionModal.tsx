"use client";

import { useState, useRef, useEffect } from "react";
import { Youtube, FileText, Mic, Image as ImageIcon, Link2, Loader2, CheckCircle2, XCircle, X, Radio, Monitor, AppWindow, Play, Pause, Square, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useRecorderStore } from "@/store/useRecorderStore";

type IngestionMode = 'youtube' | 'pdf' | 'audio' | 'image' | 'url' | 'record';
type AudioSource = 'tab' | 'screen' | 'mic';

interface AiIngestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (content: string) => void;
    initialMode?: IngestionMode;
}

export default function AiIngestionModal({ isOpen, onClose, onInsert, initialMode = "youtube" }: AiIngestionModalProps) {
    const [mode, setMode] = useState<IngestionMode>(initialMode);
    const [inputValue, setInputValue] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState("");
    const [error, setError] = useState("");
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

    // Reset mode when initialMode changes
    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
        }
    }, [isOpen, initialMode]);

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
        handleReset();
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

    const tabs = [
        { id: 'record', icon: Radio, label: '녹음', color: '#e03e3e' },
        { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#e03e3e' },
        { id: 'pdf', icon: FileText, label: 'PDF', color: '#cb912f' },
        { id: 'audio', icon: Mic, label: '음성파일', color: '#0f7b6c' },
        { id: 'image', icon: ImageIcon, label: '이미지', color: '#9065b0' },
        { id: 'url', icon: Link2, label: '웹페이지', color: '#2383e2' },
    ] as const;

    if (!isOpen) return null;

    const isButtonDisabled = (() => {
        if (isLoading) return true;
        if (mode === 'youtube' || mode === 'url') return !inputValue;
        if (mode === 'record') return !audioBlob || isRecording;
        return !selectedFile;
    })();

    const canClose = !isLoading && !isRecording;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={(e) => e.target === e.currentTarget && canClose && onClose()}
        >
            <div
                className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
                style={{
                    backgroundColor: "var(--card-background)",
                    border: "1px solid var(--border)"
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                >
                    <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                        AI 콘텐츠 분석
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={!canClose}
                        className="p-2 rounded-lg transition-colors disabled:opacity-50"
                        style={{ color: "var(--foreground-secondary)" }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div
                    className="flex overflow-x-auto"
                    style={{
                        borderBottom: "1px solid var(--border)",
                        backgroundColor: "var(--background-secondary)"
                    }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = mode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (!isLoading && !isRecording) {
                                        setMode(tab.id as IngestionMode);
                                        handleReset();
                                    }
                                }}
                                disabled={isLoading || isRecording}
                                className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap disabled:opacity-50"
                                style={{
                                    borderColor: isActive ? tab.color : "transparent",
                                    color: isActive ? tab.color : "var(--foreground-secondary)",
                                    backgroundColor: isActive ? "var(--card-background)" : "transparent"
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Description */}
                    <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                        {mode === 'record' && "오디오를 녹음하고 AI가 텍스트로 변환하고 요약합니다."}
                        {mode === 'youtube' && "YouTube 영상 URL을 입력하면 AI가 내용을 요약합니다."}
                        {mode === 'pdf' && "PDF 문서를 업로드하면 AI가 핵심 내용을 추출합니다."}
                        {mode === 'audio' && "음성 파일을 업로드하면 AI가 텍스트로 변환하고 요약합니다."}
                        {mode === 'image' && "이미지를 업로드하면 AI가 내용을 분석합니다."}
                        {mode === 'url' && "웹 페이지 URL을 입력하면 AI가 콘텐츠를 요약합니다."}
                    </p>

                    {/* Recording Mode */}
                    {mode === 'record' && !result && (
                        <div className="space-y-4">
                            {/* Not recording and no audio blob - show source selection */}
                            {!isRecording && !audioBlob && (
                                <>
                                    <div className="space-y-3">
                                        {/* Tab Audio */}
                                        <button
                                            onClick={() => setSelectedSource('tab')}
                                            className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                            style={{
                                                border: selectedSource === 'tab'
                                                    ? "2px solid var(--color-primary)"
                                                    : "2px solid var(--border)",
                                                backgroundColor: selectedSource === 'tab'
                                                    ? "rgba(35, 131, 226, 0.1)"
                                                    : "transparent"
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: "rgba(35, 131, 226, 0.2)" }}
                                            >
                                                <AppWindow size={20} className="text-[#2383e2]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium" style={{ color: "var(--foreground)" }}>브라우저 탭</h3>
                                                <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                                    탭에서 재생 중인 영상 오디오
                                                </p>
                                            </div>
                                            {selectedSource === 'tab' && <Check size={20} className="text-[#2383e2]" />}
                                        </button>

                                        {/* System Audio */}
                                        <button
                                            onClick={() => setSelectedSource('screen')}
                                            className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                            style={{
                                                border: selectedSource === 'screen'
                                                    ? "2px solid var(--color-success)"
                                                    : "2px solid var(--border)",
                                                backgroundColor: selectedSource === 'screen'
                                                    ? "rgba(15, 123, 108, 0.1)"
                                                    : "transparent"
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: "rgba(15, 123, 108, 0.2)" }}
                                            >
                                                <Monitor size={20} className="text-[#0f7b6c]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium" style={{ color: "var(--foreground)" }}>시스템 오디오</h3>
                                                <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                                    컴퓨터에서 나오는 모든 소리
                                                </p>
                                            </div>
                                            {selectedSource === 'screen' && <Check size={20} className="text-[#0f7b6c]" />}
                                        </button>

                                        {/* Microphone */}
                                        <button
                                            onClick={() => setSelectedSource('mic')}
                                            className="w-full p-4 rounded-xl text-left transition-all flex items-center gap-4"
                                            style={{
                                                border: selectedSource === 'mic'
                                                    ? "2px solid var(--color-warning)"
                                                    : "2px solid var(--border)",
                                                backgroundColor: selectedSource === 'mic'
                                                    ? "rgba(203, 145, 47, 0.1)"
                                                    : "transparent"
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: "rgba(203, 145, 47, 0.2)" }}
                                            >
                                                <Mic size={20} className="text-[#cb912f]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium" style={{ color: "var(--foreground)" }}>마이크</h3>
                                                <p className="text-xs" style={{ color: "var(--foreground-secondary)" }}>
                                                    직접 녹음 (오프라인 강의)
                                                </p>
                                            </div>
                                            {selectedSource === 'mic' && <Check size={20} className="text-[#cb912f]" />}
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleStartRecording}
                                        disabled={!selectedSource}
                                        className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: "var(--color-error)",
                                            color: "white"
                                        }}
                                    >
                                        <Radio size={18} />
                                        녹음 시작
                                    </button>
                                </>
                            )}

                            {/* Recording in progress */}
                            {isRecording && (
                                <div className="space-y-4">
                                    <div
                                        className="rounded-xl p-6 text-center"
                                        style={{
                                            backgroundColor: "var(--background-secondary)",
                                            border: "1px solid var(--border)"
                                        }}
                                    >
                                        {/* Recording indicator */}
                                        <div className="flex items-center justify-center gap-3 mb-4">
                                            <span className="relative flex h-4 w-4">
                                                <span
                                                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                                                    style={{ backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)" }}
                                                />
                                                <span
                                                    className="relative inline-flex rounded-full h-4 w-4"
                                                    style={{ backgroundColor: isPaused ? "var(--color-warning)" : "var(--color-error)" }}
                                                />
                                            </span>
                                            <span
                                                className="text-lg font-semibold"
                                                style={{ color: isPaused ? "var(--color-warning)" : "var(--color-error)" }}
                                            >
                                                {isPaused ? "일시정지" : "녹음 중"}
                                            </span>
                                        </div>

                                        {/* Timer */}
                                        <div
                                            className="font-mono text-4xl font-bold mb-6"
                                            style={{ color: "var(--foreground)" }}
                                        >
                                            {formatDuration(duration)}
                                        </div>

                                        {/* Controls */}
                                        <div className="flex items-center justify-center gap-4">
                                            {!isPaused ? (
                                                <button
                                                    onClick={pauseRecording}
                                                    className="w-12 h-12 flex items-center justify-center rounded-full transition-colors"
                                                    style={{
                                                        backgroundColor: "var(--background-tertiary)",
                                                        color: "var(--foreground)"
                                                    }}
                                                    title="일시정지"
                                                >
                                                    <Pause size={24} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={resumeRecording}
                                                    className="w-12 h-12 flex items-center justify-center rounded-full transition-colors text-white"
                                                    style={{ backgroundColor: "var(--color-success)" }}
                                                    title="재개"
                                                >
                                                    <Play size={24} />
                                                </button>
                                            )}

                                            <button
                                                onClick={handleStopRecording}
                                                className="w-14 h-14 flex items-center justify-center rounded-full transition-colors text-white"
                                                style={{ backgroundColor: "var(--color-error)" }}
                                                title="녹음 완료"
                                            >
                                                <Square size={24} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Recording completed */}
                            {!isRecording && audioBlob && (
                                <div className="space-y-4">
                                    <div
                                        className="flex items-center gap-2 text-sm font-medium"
                                        style={{ color: "var(--color-success)" }}
                                    >
                                        <CheckCircle2 size={18} />
                                        녹음 완료 ({formatDuration(duration)})
                                    </div>

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

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleReset}
                                            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                                            style={{
                                                backgroundColor: "var(--background-tertiary)",
                                                color: "var(--foreground)"
                                            }}
                                        >
                                            다시 녹음
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                            style={{
                                                backgroundColor: "var(--color-primary)",
                                                color: "white"
                                            }}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    분석 중...
                                                </>
                                            ) : (
                                                "AI 요약 생성"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Other modes (YouTube, PDF, Audio file, Image, URL) */}
                    {mode !== 'record' && !result && (
                        <div className="space-y-4">
                            {(mode === 'youtube' || mode === 'url') ? (
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={mode === 'youtube' ? "https://youtube.com/watch?v=..." : "https://example.com/article"}
                                    className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
                                    style={{
                                        backgroundColor: "var(--input-background)",
                                        border: "1px solid var(--input-border)",
                                        color: "var(--foreground)"
                                    }}
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
                                        accept={
                                            mode === 'pdf' ? ".pdf" :
                                            mode === 'audio' ? "audio/*,.webm,.mp3,.wav,.m4a,.ogg" :
                                            "image/*"
                                        }
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        className="w-full rounded-lg p-8 text-center transition-colors disabled:opacity-50"
                                        style={{
                                            border: "2px dashed var(--border)",
                                            backgroundColor: "var(--background-hover)",
                                            color: "var(--foreground-secondary)"
                                        }}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            {mode === 'pdf' && <FileText size={32} />}
                                            {mode === 'audio' && <Mic size={32} />}
                                            {mode === 'image' && <ImageIcon size={32} />}
                                            <span className="text-sm">
                                                {selectedFile ? selectedFile.name : "클릭하여 파일 업로드"}
                                            </span>
                                            {selectedFile && (
                                                <span className="text-xs opacity-60">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={isButtonDisabled}
                                className="w-full px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                style={{
                                    backgroundColor: "var(--color-primary)",
                                    color: "white"
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        AI가 분석 중입니다...
                                    </>
                                ) : (
                                    "분석 시작"
                                )}
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-2 p-4 rounded-lg text-sm"
                            style={{
                                backgroundColor: "rgba(224, 62, 62, 0.1)",
                                color: "var(--color-error)"
                            }}
                        >
                            <XCircle size={18} />
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-4">
                            <div
                                className="flex items-center gap-2 text-sm font-medium"
                                style={{ color: "var(--color-success)" }}
                            >
                                <CheckCircle2 size={18} />
                                분석 완료
                            </div>

                            <div
                                className="rounded-lg p-4 max-h-64 overflow-y-auto text-sm whitespace-pre-wrap"
                                style={{
                                    backgroundColor: "var(--background-secondary)",
                                    border: "1px solid var(--border)",
                                    color: "var(--foreground)"
                                }}
                            >
                                {result}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                                    style={{
                                        backgroundColor: "var(--background-tertiary)",
                                        color: "var(--foreground)"
                                    }}
                                >
                                    다시 분석
                                </button>
                                <button
                                    onClick={handleInsert}
                                    className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                                    style={{
                                        backgroundColor: "var(--color-primary)",
                                        color: "white"
                                    }}
                                >
                                    에디터에 삽입
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
