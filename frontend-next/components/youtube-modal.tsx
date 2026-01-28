'use client';

import { useState } from 'react';
import { Youtube, X, Loader2 } from 'lucide-react';

interface YoutubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
}

export function YoutubeModal({ isOpen, onClose, onSubmit }: YoutubeModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const validateYoutubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async () => {
    setError('');

    if (!url.trim()) {
      setError('URL을 입력해주세요');
      return;
    }

    if (!validateYoutubeUrl(url)) {
      setError('올바른 YouTube URL을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(url);
      setUrl('');
      onClose();
    } catch (err) {
      setError('요약 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-4 md:p-6 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Youtube className="text-red-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">YouTube 요약</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
            disabled={loading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Info */}
        <p className="text-sm text-zinc-500 mb-6">
          YouTube 영상의 자막을 추출하여 AI가 요약합니다.
          자막이 없는 영상은 요약할 수 없습니다.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !url.trim()}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-zinc-900 bg-cyan-500 hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                요약 중...
              </>
            ) : (
              '요약 생성'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
