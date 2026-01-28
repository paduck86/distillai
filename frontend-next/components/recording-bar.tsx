'use client';

import { Mic, Pause, Play, Square, X } from 'lucide-react';

interface RecordingBarProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  formatDuration: (seconds: number) => string;
}

export function RecordingBar({
  isRecording,
  isPaused,
  duration,
  onPause,
  onResume,
  onStop,
  onCancel,
  formatDuration,
}: RecordingBarProps) {
  if (!isRecording) return null;

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-auto">
      <div className="flex items-center justify-center gap-2 md:gap-4 px-4 md:px-6 py-2.5 md:py-3 bg-zinc-900 border border-zinc-700 rounded-full shadow-2xl">
        {/* Recording indicator */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className={`w-2.5 md:w-3 h-2.5 md:h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs md:text-sm font-medium text-white hidden sm:inline">
            {isPaused ? '일시정지' : '녹음 중'}
          </span>
        </div>

        {/* Duration */}
        <span className="text-base md:text-lg font-mono text-white min-w-[50px] md:min-w-[60px]">
          {formatDuration(duration)}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {isPaused ? (
            <button
              onClick={onResume}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-white rounded-full transition-colors active:scale-95"
            >
              <Play size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          ) : (
            <button
              onClick={onPause}
              className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 text-white rounded-full transition-colors active:scale-95"
            >
              <Pause size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          )}

          <button
            onClick={onStop}
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-red-500 hover:bg-red-400 text-white rounded-full transition-colors active:scale-95"
          >
            <Square size={14} className="md:w-[16px] md:h-[16px]" fill="currentColor" />
          </button>

          <button
            onClick={onCancel}
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-full transition-colors active:scale-95"
          >
            <X size={16} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
