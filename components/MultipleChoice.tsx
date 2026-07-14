'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { shuffleArray } from '@/lib/shuffle';
import { generateDistractors } from '@/lib/algorithms';
import type { Card } from '@/lib/types';

interface MultipleChoiceProps {
  card: Card;
  allCards: Card[];
  questionField: 'term' | 'definition';
  answerField: 'term' | 'definition';
  onAnswer: (isCorrect: boolean) => void;
}

export function MultipleChoice({
  card,
  allCards,
  questionField,
  answerField,
  onAnswer,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const correctAnswer = card[answerField];

  // Generate options once per card (memoized)
  const options = useMemo(() => {
    const distractors = generateDistractors(card, allCards, 3, answerField);
    return shuffleArray([correctAnswer, ...distractors]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id, allCards, answerField]);

  // Reset on card change
  useEffect(() => {
    setSelected(null);
    setAnswered(false);
  }, [card.id]);

  // Keyboard shortcuts 1-4
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (answered) return;
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < options.length) {
        handleSelect(options[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, options]);

  const handleSelect = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const isCorrect = option === correctAnswer;

    // Auto-advance
    const delay = isCorrect ? 1500 : 2500;
    setTimeout(() => onAnswer(isCorrect), delay);
  };

  const getOptionStyle = (option: string) => {
    if (!answered) {
      return 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)] cursor-pointer';
    }
    if (option === correctAnswer) {
      return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300';
    }
    if (option === selected && option !== correctAnswer) {
      return 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300';
    }
    return 'border-[var(--border)] opacity-50';
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Question */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center card-shadow">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          {questionField === 'term' ? 'Từ' : 'Nghĩa'} — Chọn đáp án đúng
        </p>
        <p
          className="font-bold text-[var(--text)] leading-relaxed"
          dir="auto"
          style={{
            fontSize: card[questionField].length > 60 ? '1.1rem' : '1.5rem',
          }}
        >
          {card[questionField]}
        </p>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option, i) => (
          <button
            key={option + i}
            onClick={() => handleSelect(option)}
            disabled={answered}
            className={`relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${getOptionStyle(option)}`}
          >
            <span className="w-7 h-7 flex-shrink-0 rounded-lg bg-[var(--bg)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
              {i + 1}
            </span>
            <span className="text-sm font-medium leading-snug" dir="auto">
              {option}
            </span>
            {answered && option === correctAnswer && (
              <Check size={16} className="ml-auto flex-shrink-0 text-emerald-600" />
            )}
            {answered && option === selected && option !== correctAnswer && (
              <X size={16} className="ml-auto flex-shrink-0 text-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answered && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 animate-slide-up ${
            selected === correctAnswer
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
          aria-live="polite"
        >
          {selected === correctAnswer ? (
            <>
              <Check size={16} />
              Chính xác! 🎉
            </>
          ) : (
            <>
              <X size={16} />
              Chưa đúng. Đáp án là: <strong>{correctAnswer}</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}
