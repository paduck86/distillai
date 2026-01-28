import { create } from "zustand";

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    audioBlob: Blob | null;
}

interface RecorderStore extends RecordingState {
    mediaRecorder: MediaRecorder | null;
    stream: MediaStream | null;
    startTime: number;
    pausedDuration: number;

    // Actions
    startRecording: (captureTab?: boolean) => Promise<void>;
    startScreenRecording: () => Promise<void>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    stopRecording: () => void;
    reset: () => void;
    formatDuration: (seconds: number) => string;

    // Internal
    setDuration: (duration: number) => void;
    setAudioBlob: (blob: Blob | null) => void;
}

let durationInterval: ReturnType<typeof setInterval> | null = null;

export const useRecorderStore = create<RecorderStore>((set, get) => ({
    // State
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    mediaRecorder: null,
    stream: null,
    startTime: 0,
    pausedDuration: 0,

    setDuration: (duration) => set({ duration }),
    setAudioBlob: (audioBlob) => set({ audioBlob }),

    startRecording: async (captureTab = true) => {
        try {
            let stream: MediaStream;

            if (captureTab) {
                // Capture tab audio
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: { width: 1, height: 1 }
                });

                // Stop video tracks immediately
                displayStream.getVideoTracks().forEach(track => track.stop());

                const audioTracks = displayStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    throw new Error("탭 오디오를 공유해주세요. 탭 선택 시 '탭 오디오 공유' 체크박스를 확인하세요.");
                }

                stream = new MediaStream(audioTracks);
            } else {
                // Capture microphone
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
            }

            if (stream.getAudioTracks().length === 0) {
                throw new Error("오디오 트랙을 찾을 수 없습니다.");
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus"
            });

            const audioChunks: Blob[] = [];
            const startTime = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                set({
                    isRecording: false,
                    isPaused: false,
                    audioBlob
                });

                if (durationInterval) {
                    clearInterval(durationInterval);
                    durationInterval = null;
                }

                // Cleanup stream
                const currentStream = get().stream;
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                set({ stream: null, mediaRecorder: null });
            };

            mediaRecorder.start(1000);

            // Start duration timer
            durationInterval = setInterval(() => {
                const state = get();
                if (!state.isPaused) {
                    const currentDuration = Date.now() - state.startTime + state.pausedDuration;
                    set({ duration: Math.floor(currentDuration / 1000) });
                }
            }, 1000);

            set({
                mediaRecorder,
                stream,
                startTime,
                pausedDuration: 0,
                isRecording: true,
                isPaused: false,
                duration: 0,
                audioBlob: null
            });

        } catch (error) {
            console.error("녹음 시작 실패:", error);
            const stream = get().stream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            set({ stream: null, mediaRecorder: null });

            if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                    throw new Error("녹음 권한이 거부되었습니다. 탭을 선택하고 오디오 공유를 허용해주세요.");
                }
                if (error.name === "NotSupportedError") {
                    throw new Error("이 브라우저는 탭 오디오 캡처를 지원하지 않습니다. Chrome 브라우저를 사용해주세요.");
                }
            }
            throw error;
        }
    },

    startScreenRecording: async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                audio: {
                    // @ts-ignore - systemAudio is a newer Chrome feature
                    systemAudio: "include",
                },
                video: true,
            });

            // Stop video tracks
            displayStream.getVideoTracks().forEach(track => track.stop());

            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error("시스템 오디오를 캡처할 수 없습니다. '오디오 공유' 옵션을 확인해주세요.");
            }

            const stream = new MediaStream(audioTracks);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus"
            });

            const audioChunks: Blob[] = [];
            const startTime = Date.now();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                set({
                    isRecording: false,
                    isPaused: false,
                    audioBlob
                });

                if (durationInterval) {
                    clearInterval(durationInterval);
                    durationInterval = null;
                }

                const currentStream = get().stream;
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
                set({ stream: null, mediaRecorder: null });
            };

            mediaRecorder.start(1000);

            durationInterval = setInterval(() => {
                const state = get();
                if (!state.isPaused) {
                    const currentDuration = Date.now() - state.startTime + state.pausedDuration;
                    set({ duration: Math.floor(currentDuration / 1000) });
                }
            }, 1000);

            set({
                mediaRecorder,
                stream,
                startTime,
                pausedDuration: 0,
                isRecording: true,
                isPaused: false,
                duration: 0,
                audioBlob: null
            });

        } catch (error) {
            console.error("시스템 오디오 녹음 시작 실패:", error);
            const stream = get().stream;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            set({ stream: null, mediaRecorder: null });

            if (error instanceof Error && error.name === "NotAllowedError") {
                throw new Error("화면 공유가 취소되었습니다.");
            }
            throw error;
        }
    },

    pauseRecording: () => {
        const { mediaRecorder, startTime, pausedDuration } = get();
        if (mediaRecorder?.state === "recording") {
            mediaRecorder.pause();
            set({
                isPaused: true,
                pausedDuration: pausedDuration + (Date.now() - startTime)
            });
        }
    },

    resumeRecording: () => {
        const { mediaRecorder } = get();
        if (mediaRecorder?.state === "paused") {
            mediaRecorder.resume();
            set({
                isPaused: false,
                startTime: Date.now()
            });
        }
    },

    stopRecording: () => {
        const { mediaRecorder } = get();
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
    },

    reset: () => {
        const { mediaRecorder, stream } = get();

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        if (durationInterval) {
            clearInterval(durationInterval);
            durationInterval = null;
        }

        set({
            isRecording: false,
            isPaused: false,
            duration: 0,
            audioBlob: null,
            mediaRecorder: null,
            stream: null,
            startTime: 0,
            pausedDuration: 0
        });
    },

    formatDuration: (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
}));
