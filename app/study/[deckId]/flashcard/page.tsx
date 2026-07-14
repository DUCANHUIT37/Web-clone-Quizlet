'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shuffle, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { FlashCard, FlashCardNav } from '@/components/FlashCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import { v4 as uuidv4 } from 'uuid';

export default function FlashcardPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, progress, updateProgress, addSession, settings } = useStore();

  const [cardQueue, setCardQueue] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(settings.shuffleCards);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectIds, setIncorrectIds] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [flipDebounce, setFlipDebounce] = useState(false);
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
    setCardQueue(shuffled ? shuffleArray(ids) : [...ids]);
    setCurrentIdx(0);
    setFlipped(false);
    setCorrectCount(0);
    setIncorrectIds(new Set());
    setShowResult(false);
    sessionStart.current = Date.now();
  }, [mounted, deckId, cardsByDeck, shuffled]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showResult) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, flipped, showResult, cardQueue]);

  if (!mounted) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  const currentCardId = cardQueue[currentIdx];
  const currentCard = currentCardId ? cards[currentCardId] : null;

  const handleFlip = () => {
    if (flipDebounce) return;
    setFlipDebounce(true);
    setFlipped((v) => !v);
    setTimeout(() => setFlipDebounce(false), 500);
  };

  const handlePrev = () => {
    if (currentIdx === 0) return;
    setCurrentIdx((i) => i - 1);
    setFlipped(false);
  };

  const handleNext = () => {
    if (currentIdx === cardQueue.length - 1) return;
    setCurrentIdx((i) => i + 1);
    setFlipped(false);
  };

  const handleKnow = (known: boolean) => {
    if (!currentCard) return;
    if (known) {
      setCorrectCount((c) => c + 1);
      updateProgress(currentCard.id, {
        totalAnswers: (progress[currentCard.id]?.totalAnswers ?? 0) + 1,
        correctAnswers: (progress[currentCard.id]?.correctAnswers ?? 0) + 1,
      });
    } else {
      setIncorrectIds((s) => {
        const next = new Set(s);
        next.add(currentCard.id);
        return next;
      });
      updateProgress(currentCard.id, {
        totalAnswers: (progress[currentCard.id]?.totalAnswers ?? 0) + 1,
      });
    }

    if (currentIdx === cardQueue.length - 1) {
      // Last card — show result
      addSession({
        id: uuidv4(),
        deckId,
        mode: 'flashcard',
        startedAt: sessionStart.current,
        completedAt: Date.now(),
        totalCards: cardQueue.length,
        correctCount: known ? correctCount + 1 : correctCount,
      });
      setShowResult(true);
    } else {
      handleNext();
    }
  };

  const handleReset = () => {
    const ids = cardsByDeck[deckId] ?? [];
    setCardQueue(shuffled ? shuffleArray(ids) : [...ids]);
    setCurrentIdx(0);
    setFlipped(false);
    setCorrectCount(0);
    setIncorrectIds(new Set());
    setShowResult(false);
    sessionStart.current = Date.now();
  };

  if (showResult) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
            <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[var(--text)]">{deck.name}</span>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={cardQueue.length}
            correctCount={correctCount}
            mode="flashcard"
            deckId={deckId}
            onRestart={handleReset}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href={`/study/${deckId}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[var(--text)] truncate">{deck.name}</h1>
          </div>
          {/* Shuffle toggle */}
          <button
            onClick={() => setShuffled((v) => !v)}
            aria-label="Xáo trộn thẻ"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
              shuffled
                ? 'bg-[var(--primary)] text-white'
                : 'hover:bg-[var(--bg)] text-[var(--text-muted)]'
            }`}
          >
            <Shuffle size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Progress */}
        <ProgressBar current={currentIdx + 1} total={cardQueue.length} />

        {/* Card */}
        {currentCard && (
          <FlashCard
            card={currentCard}
            flipped={flipped}
            onFlip={handleFlip}
            showSide={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
          />
        )}

        {/* Rating buttons — only after flip */}
        {flipped ? (
          <div className="grid grid-cols-2 gap-3 animate-slide-up">
            <button
              onClick={() => handleKnow(false)}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-950/60 transition-all active:scale-95"
            >
              <ThumbsDown size={20} />
              Chưa nhớ
            </button>
            <button
              onClick={() => handleKnow(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-all active:scale-95"
            >
              <ThumbsUp size={20} />
              Đã nhớ
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center text-sm text-[var(--text-muted)] gap-2 h-16">
            <Eye size={16} />
            Nhấn thẻ để xem đáp án · Phím Space/Enter
          </div>
        )}

        {/* Navigation */}
        <FlashCardNav
          current={currentIdx}
          total={cardQueue.length}
          onPrev={handlePrev}
          onNext={handleNext}
          onReset={handleReset}
        />
      </main>
    </div>
  );
}
