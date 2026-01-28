'use client';

import { useState, useCallback, useRef } from 'react';
import { AudioRecorder, RecordingState } from '@/lib/recorder';

const initialState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  audioUrl: null,
  audioBlob: null,
};

export function useRecorder() {
  const [state, setState] = useState<RecordingState>(initialState);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const updateState = useCallback((update: Partial<RecordingState>) => {
    setState((prev) => ({ ...prev, ...update }));
  }, []);

  const startRecording = useCallback(async (captureTab: boolean = false) => {
    if (!recorderRef.current) {
      recorderRef.current = new AudioRecorder(updateState);
    }
    await recorderRef.current.startRecording(captureTab);
  }, [updateState]);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pauseRecording();
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resumeRecording();
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stopRecording();
  }, []);

  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState(initialState);
  }, [state.audioUrl]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    formatDuration,
  };
}
