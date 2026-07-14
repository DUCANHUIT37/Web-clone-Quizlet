'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Volume2 } from 'lucide-react';
import type { Card } from '@/lib/types';

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  showSide?: 'term' | 'definition';
}

export function FlashCard({ card, flipped, onFlip, showSide = 'term' }: FlashCardProps) {
  const frontContent = showSide === 'term' ? card.term : card.definition;
  const backContent = showSide === 'term' ? card.definition : card.term;
  const frontLabel = showSide === 'term' ? 'Từ' : 'Nghĩa';
  const backLabel = showSide === 'term' ? 'Nghĩa' : 'Từ';

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utt);
    }
  };

  return (
    <div
      className="card-container w-full cursor-pointer select-none"
      style={{ height: 'clamp(220px, 40vw, 340px)' }}
      onClick={onFlip}
    >
      <div className={`card-inner w-full h-full ${flipped ? 'flipped' : ''}`}>
        {/* Front */}
        <div className="card-face bg-[var(--card)] border border-[var(--border)] card-shadow flex-col gap-4 p-8">
          <span className="absolute top-4 left-5 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {frontLabel}
          </span>
          <button
            className="absolute top-3 right-4 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            onClick={(e) => { e.stopPropagation(); speak(frontContent); }}
            aria-label="Đọc to"
          >
            <Volume2 size={18} />
          </button>
          <p
            className="text-center font-bold text-[var(--text)] leading-relaxed overflow-auto max-h-full"
            dir="auto"
            style={{
              fontSize: frontContent.length > 80
                ? '1rem'
                : frontContent.length > 40
                ? '1.4rem'
                : '1.875rem',
            }}
          >
            {frontContent}
          </p>
          <span className="absolute bottom-4 text-xs text-[var(--text-muted)]/60">
            Nhấn để lật thẻ
          </span>
        </div>

        {/* Back */}
        <div className="card-face card-back-face bg-gradient-to-br from-indigo-600 to-violet-700 flex-col gap-4 p-8">
          <span className="absolute top-4 left-5 text-xs font-semibold uppercase tracking-widest text-indigo-200">
            {backLabel}
          </span>
          <button
            className="absolute top-3 right-4 text-indigo-200 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); speak(backContent); }}
            aria-label="Đọc to"
          >
            <Volume2 size={18} />
          </button>
          <p
            className="text-center font-bold text-white leading-relaxed overflow-auto max-h-full"
            dir="auto"
            style={{
              fontSize: backContent.length > 80
                ? '1rem'
                : backContent.length > 40
                ? '1.4rem'
                : '1.875rem',
            }}
          >
            {backContent}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation Bar ────────────────────────────────────────────────────────────

interface FlashCardNavProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
  shuffleEnabled?: boolean;
  onToggleShuffle?: () => void;
}

export function FlashCardNav({
  current,
  total,
  onPrev,
  onNext,
  onReset,
}: FlashCardNavProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Thẻ trước"
        className="w-11 h-11 rounded-xl flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-3">
        <span className="font-semibold text-[var(--text)]">
          {current + 1}
          <span className="text-[var(--text-muted)] font-normal">/{total}</span>
        </span>
        {onReset && (
          <button
            onClick={onReset}
            aria-label="Bắt đầu lại"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] transition-all"
          >
            <RotateCcw size={15} />
          </button>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Thẻ tiếp"
        className="w-11 h-11 rounded-xl flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
