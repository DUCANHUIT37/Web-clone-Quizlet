'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, X, HelpCircle } from 'lucide-react';
import { checkTypeAnswer } from '@/lib/algorithms';
import type { Card } from '@/lib/types';

interface TypeAnswerProps {
  card: Card;
  questionField: 'term' | 'definition';
  answerField: 'term' | 'definition';
  onAnswer: (isCorrect: boolean) => void;
}

export function TypeAnswer({
  card,
  questionField,
  answerField,
  onAnswer,
}: TypeAnswerProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    isCorrect: boolean;
    similarity: number;
    submitted: boolean;
  } | null>(null);
  const [shaking, setShaking] = useState(false);
  const [nearCorrectPending, setNearCorrectPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const correctAnswer = card[answerField];

  // Reset and focus on card change
  useEffect(() => {
    setInput('');
    setResult(null);
    setShaking(false);
    setNearCorrectPending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [card.id]);

  const handleSubmit = () => {
    if (!input.trim()) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    if (result?.submitted) return;

    const { isCorrect, similarity } = checkTypeAnswer(input, correctAnswer);

    // Near correct: similarity between 0.8 and 0.99 and not exact match
    const normalized = input.trim().toLowerCase();
    const normCorrect = correctAnswer.trim().toLowerCase();
    const isNearCorrect = !isCorrect && similarity >= 0.8 && normalized !== normCorrect;

    if (isNearCorrect) {
      setResult({ isCorrect: false, similarity, submitted: true });
      setNearCorrectPending(true);
      return;
    }

    setResult({ isCorrect, similarity, submitted: true });
    const delay = isCorrect ? 1500 : 2500;
    setTimeout(() => onAnswer(isCorrect), delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const acceptNearCorrect = (accept: boolean) => {
    setNearCorrectPending(false);
    const delay = accept ? 1000 : 2000;
    setTimeout(() => onAnswer(accept), delay);
  };

  // Diff highlight: show which characters are wrong
  const renderDiff = (user: string, correct: string) => {
    const userChars = user.split('');
    const correctChars = correct.split('');
    return (
      <span>
        {correctChars.map((ch, i) => {
          const isWrong = userChars[i] !== ch;
          return (
            <span
              key={i}
              className={isWrong ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded px-0.5' : ''}
            >
              {ch}
            </span>
          );
        })}
      </span>
    );
  };

  const submitted = !!result?.submitted;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Question */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center card-shadow">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          {questionField === 'term' ? 'Từ' : 'Nghĩa'} — Gõ đáp án
        </p>
        <p
          className="font-bold text-[var(--text)] leading-relaxed"
          dir="auto"
          style={{ fontSize: card[questionField].length > 60 ? '1.1rem' : '1.5rem' }}
        >
          {card[questionField]}
        </p>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-3">
        <div className={`relative ${shaking ? 'animate-shake' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => !submitted && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitted}
            placeholder="Gõ đáp án vào đây..."
            aria-label="Nhập đáp án"
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-medium bg-[var(--card)] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 ${
              !submitted
                ? 'border-[var(--border)] focus:border-[var(--primary)]'
                : result?.isCorrect
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-red-400 bg-red-50 dark:bg-red-950/30'
            }`}
          />
        </div>

        {!submitted && (
          <button
            onClick={handleSubmit}
            className="gradient-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            Kiểm tra — Enter ↵
          </button>
        )}
      </div>

      {/* Near Correct Prompt */}
      {nearCorrectPending && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 animate-slide-up">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm mb-2">
            <HelpCircle size={16} />
            Gần đúng rồi! Có tính là đúng không?
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-300 mb-3">
            Câu trả lời của bạn: <strong>{input}</strong>
            <br />
            Đáp án đúng: <strong>{correctAnswer}</strong>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => acceptNearCorrect(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
            >
              <Check size={14} /> Tính là đúng
            </button>
            <button
              onClick={() => acceptNearCorrect(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              <X size={14} /> Tính là sai
            </button>
          </div>
        </div>
      )}

      {/* Result feedback */}
      {submitted && !nearCorrectPending && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex flex-col gap-1.5 animate-slide-up ${
            result?.isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
          aria-live="polite"
        >
          {result?.isCorrect ? (
            <span className="flex items-center gap-2">
              <Check size={16} /> Chính xác! 🎉
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <X size={16} /> Chưa đúng. Đáp án là:
              </span>
              <div className="font-mono text-base bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                {renderDiff(input.trim().toLowerCase(), correctAnswer.toLowerCase())}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
