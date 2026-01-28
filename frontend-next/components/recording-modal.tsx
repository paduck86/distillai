'use client';

import { useState } from 'react';
import { Mic, Monitor, X } from 'lucide-react';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (captureTab: boolean) => void;
}

export function RecordingModal({ isOpen, onClose, onStartRecording }: RecordingModalProps) {
  const [selectedMode, setSelectedMode] = useState<'mic' | 'tab'>('mic');

  if (!isOpen) return null;

  const handleStart = () => {
    onStartRecording(selectedMode === 'tab');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-4 md:p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">녹음 시작</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedMode('mic')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              selectedMode === 'mic'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedMode === 'mic' ? 'bg-cyan-500/20' : 'bg-zinc-800'
            }`}>
              <Mic className={selectedMode === 'mic' ? 'text-cyan-400' : 'text-zinc-400'} size={24} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${selectedMode === 'mic' ? 'text-white' : 'text-zinc-300'}`}>
                마이크 녹음
              </p>
              <p className="text-sm text-zinc-500">
                마이크를 통해 음성을 녹음합니다
              </p>
            </div>
          </button>

          <button
            onClick={() => setSelectedMode('tab')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              selectedMode === 'tab'
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedMode === 'tab' ? 'bg-cyan-500/20' : 'bg-zinc-800'
            }`}>
              <Monitor className={selectedMode === 'tab' ? 'text-cyan-400' : 'text-zinc-400'} size={24} />
            </div>
            <div className="text-left">
              <p className={`font-medium ${selectedMode === 'tab' ? 'text-white' : 'text-zinc-300'}`}>
                탭 오디오 캡처
              </p>
              <p className="text-sm text-zinc-500">
                브라우저 탭의 오디오를 캡처합니다
              </p>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-zinc-900 bg-cyan-500 hover:bg-cyan-400 transition-colors"
          >
            녹음 시작
          </button>
        </div>
      </div>
    </div>
  );
}
