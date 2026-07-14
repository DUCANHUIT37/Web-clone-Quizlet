'use client';
import Link from 'next/link';
import { Trophy, RotateCcw, Home, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface ResultScreenProps {
  totalCards: number;
  correctCount: number;
  mode: string;
  deckId: string;
  onRestart?: () => void;
  timeSeconds?: number;
  score?: number;
}

export function ResultScreen({
  totalCards,
  correctCount,
  mode,
  deckId,
  onRestart,
  timeSeconds,
  score,
}: ResultScreenProps) {
  const incorrectCount = totalCards - correctCount;
  const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

  const getEmoji = () => {
    if (accuracy === 100) return '🏆';
    if (accuracy >= 80) return '🌟';
    if (accuracy >= 60) return '💪';
    return '📚';
  };

  const getMessage = () => {
    if (accuracy === 100) return 'Hoàn hảo! Bạn đã thuộc tất cả!';
    if (accuracy >= 80) return 'Tuyệt vời! Tiếp tục phát huy!';
    if (accuracy >= 60) return 'Khá tốt! Ôn thêm một chút nữa nhé!';
    return 'Cần luyện tập thêm. Đừng nản lòng!';
  };

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-slide-up">
      {/* Trophy */}
      <div className="text-6xl">{getEmoji()}</div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text)]">{getMessage()}</h2>
        <p className="text-[var(--text-muted)] mt-1">Kết quả phiên học</p>
      </div>

      {/* Score ring */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke={accuracy >= 80 ? '#10B981' : accuracy >= 60 ? '#F59E0B' : '#EF4444'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - accuracy / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[var(--text)]">{accuracy}%</span>
          <span className="text-xs text-[var(--text-muted)]">chính xác</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[var(--text)]">{totalCards}</div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center justify-center gap-1">
            <TrendingUp size={10} /> Tổng
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
          <div className="text-xs text-emerald-600/70 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle size={10} /> Đúng
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-500">{incorrectCount}</div>
          <div className="text-xs text-red-500/70 mt-0.5 flex items-center justify-center gap-1">
            <XCircle size={10} /> Sai
          </div>
        </div>
      </div>

      {/* Time & Score */}
      {(timeSeconds !== undefined || score !== undefined) && (
        <div className="flex gap-3">
          {timeSeconds !== undefined && (
            <span className="px-4 py-2 rounded-xl bg-[var(--bg)] text-sm font-medium text-[var(--text-muted)]">
              ⏱️ {timeSeconds}s
            </span>
          )}
          {score !== undefined && (
            <span className="px-4 py-2 rounded-xl bg-[var(--bg)] text-sm font-medium text-[var(--primary)]">
              🎯 {score} điểm
            </span>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 w-full max-w-sm">
        {onRestart && (
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] font-semibold hover:bg-[var(--primary-light)] transition-all"
          >
            <RotateCcw size={16} />
            Học lại
          </button>
        )}
        <Link
          href={`/study/${deckId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-all"
        >
          <Home size={16} />
          Về hub
        </Link>
      </div>
    </div>
  );
}
