'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getDueCards, sm2Update } from '@/lib/algorithms';
import { FlashCard } from '@/components/FlashCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card, CardProgress } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultProgress } from '@/lib/store';

const QUALITY_MAP = {
  forget: 0,
  hard: 3,
  ok: 4,
  easy: 5,
} as const;

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, progress, updateProgress, addSession } = useStore();

  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const sessionStart = useRef(Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !decks[deckId]) router.replace('/');
  }, [mounted, deckId, decks, router]);

  useEffect(() => {
    if (!mounted) return;
    const ids = cardsByDeck[deckId] ?? [];
    const deckCards = ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c);
    const due = getDueCards(deckCards, progress);
    setQueue(due);
    setCurrentIdx(0);
    setFlipped(false);
    setCorrectCount(0);
    setShowResult(false);
    sessionStart.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, deckId]);

  if (!mounted) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  const currentCard = queue[currentIdx];

  const handleFlip = () => setFlipped(true);

  const handleRate = (quality: keyof typeof QUALITY_MAP) => {
    if (!currentCard) return;
    const q = QUALITY_MAP[quality];
    const prog = progress[currentCard.id] ?? getDefaultProgress(currentCard.id, deckId);
    const updated = sm2Update(prog, q as 0 | 1 | 2 | 3 | 4 | 5);
    updateProgress(currentCard.id, updated);

    if (q >= 3) setCorrectCount((c) => c + 1);

    if (currentIdx === queue.length - 1) {
      addSession({
        id: uuidv4(),
        deckId,
        mode: 'review',
        startedAt: sessionStart.current,
        completedAt: Date.now(),
        totalCards: queue.length,
        correctCount: q >= 3 ? correctCount + 1 : correctCount,
      });
      setShowResult(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
            <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Không có thẻ cần ôn hôm nay!</h2>
          <p className="text-[var(--text-muted)] mb-6">
            Tuyệt vời! Bạn đã hoàn thành lịch ôn tập hôm nay.
          </p>
          <Link href={`/study/${deckId}`} className="text-[var(--primary)] font-semibold hover:underline">
            ← Về hub học tập
          </Link>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
            <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[var(--text)]">Ôn tập theo lịch</span>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={queue.length}
            correctCount={correctCount}
            mode="review"
            deckId={deckId}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-sm text-[var(--text)] flex items-center gap-2">
              <Calendar size={14} className="text-amber-500" />
              Ôn tập theo lịch — {deck.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <ProgressBar current={currentIdx} total={queue.length} />

        {currentCard && (
          <FlashCard
            card={currentCard}
            flipped={flipped}
            onFlip={handleFlip}
            showSide="term"
          />
        )}

        {/* Rating buttons — only after flip */}
        {flipped ? (
          <div className="grid grid-cols-4 gap-2 animate-slide-up">
            {(
              [
                { key: 'forget', label: 'Không nhớ', color: 'bg-red-500', emoji: '😰' },
                { key: 'hard', label: 'Khó', color: 'bg-orange-500', emoji: '😅' },
                { key: 'ok', label: 'Ổn', color: 'bg-blue-500', emoji: '😊' },
                { key: 'easy', label: 'Dễ', color: 'bg-emerald-500', emoji: '😄' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleRate(btn.key)}
                className={`${btn.color} text-white rounded-xl py-3 text-center font-semibold text-xs hover:opacity-90 active:scale-95 transition-all flex flex-col items-center gap-1`}
              >
                <span className="text-lg">{btn.emoji}</span>
                {btn.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-[var(--text-muted)]">
            Nhấn thẻ để xem nghĩa, rồi tự đánh giá
          </div>
        )}
      </main>
    </div>
  );
}
