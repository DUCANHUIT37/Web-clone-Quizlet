'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { MultipleChoice } from '@/components/MultipleChoice';
import { TypeAnswer } from '@/components/TypeAnswer';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 10;

interface LearnState {
  pass: 1 | 2;
  deckIndex: number;
  phase: 'mcq' | 'type';
  batchQueue: Card[];
  wrongQueue: Card[];
  progressCount: number;
  deckCards: Card[];
  isComplete: boolean;
  retryCount: number;
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, updateProgress, addSession, settings, progress } = useStore();

  const [state, setState] = useState<LearnState | null>(null);
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
    const deckCards = shuffleArray(ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c));
    
    if (deckCards.length === 0) return;

    setState({
      pass: 1,
      deckIndex: 0,
      phase: 'mcq',
      batchQueue: shuffleArray(deckCards.slice(0, BATCH_SIZE)),
      wrongQueue: [],
      progressCount: 0,
      deckCards,
      isComplete: false,
      retryCount: 0,
    });
    sessionStart.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, deckId]);

  if (!mounted || !state) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  if (state.isComplete) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
            <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[var(--text)]">{deck.name} — Learn</span>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={state.deckCards.length}
            correctCount={state.deckCards.length}
            mode="learn"
            deckId={deckId}
          />
        </div>
      </div>
    );
  }

  const currentCard = state.batchQueue[0];

  const handleAnswer = (isCorrect: boolean, card: Card) => {
    // Record basic stats to SM-2 structure (totalAnswers, correctAnswers) just for statistics
    const currentProgress = progress[card.id] ?? {
      learnStage: 'unseen', correctStreak: 0, totalAnswers: 0, correctAnswers: 0
    };
    updateProgress(card.id, {
      ...currentProgress,
      totalAnswers: (currentProgress.totalAnswers || 0) + 1,
      correctAnswers: (currentProgress.correctAnswers || 0) + (isCorrect ? 1 : 0),
      lastAnswered: Date.now(),
    });

    setState(prev => {
      if (!prev) return prev;
      let { pass, deckIndex, phase, batchQueue, wrongQueue, progressCount, deckCards, retryCount } = prev;

      const newWrongQueue = isCorrect ? wrongQueue : [...wrongQueue, card];
      const newProgress = isCorrect ? progressCount + 1 : progressCount;
      const nextBatchQueue = batchQueue.slice(1);

      // 1. If still cards in current sub-queue
      if (nextBatchQueue.length > 0) {
        return { ...prev, batchQueue: nextBatchQueue, wrongQueue: newWrongQueue, progressCount: newProgress };
      }

      // 2. End of sub-queue, but there are wrong cards to retry
      if (newWrongQueue.length > 0) {
        return {
          ...prev,
          batchQueue: shuffleArray(newWrongQueue),
          wrongQueue: [],
          progressCount: newProgress,
          retryCount: retryCount + 1,
        };
      }

      // 3. Phase complete (all correct)
      if (phase === 'mcq') {
        // Move to Type phase for the SAME batch
        const originalBatch = deckCards.slice(deckIndex, deckIndex + BATCH_SIZE);
        return {
          ...prev,
          phase: 'type',
          batchQueue: shuffleArray(originalBatch),
          wrongQueue: [],
          progressCount: newProgress,
          retryCount: 0,
        };
      } else {
        // Type phase complete -> move to NEXT batch
        const nextDeckIndex = deckIndex + BATCH_SIZE;
        if (nextDeckIndex < deckCards.length) {
          const nextBatch = deckCards.slice(nextDeckIndex, nextDeckIndex + BATCH_SIZE);
          return {
            ...prev,
            deckIndex: nextDeckIndex,
            phase: 'mcq',
            batchQueue: shuffleArray(nextBatch),
            wrongQueue: [],
            progressCount: newProgress,
            retryCount: 0,
          };
        } else {
          // Pass complete
          if (pass === 1) {
            const reshuffledDeck = shuffleArray(deckCards);
            return {
              ...prev,
              pass: 2,
              deckIndex: 0,
              phase: 'mcq',
              deckCards: reshuffledDeck,
              batchQueue: shuffleArray(reshuffledDeck.slice(0, BATCH_SIZE)),
              wrongQueue: [],
              progressCount: newProgress,
              retryCount: 0,
            };
          } else {
            // Pass 2 complete -> Session complete!
            addSession({
              id: uuidv4(),
              deckId,
              mode: 'learn',
              startedAt: sessionStart.current,
              completedAt: Date.now(),
              totalCards: deckCards.length,
              correctCount: deckCards.length,
            });
            return {
              ...prev,
              isComplete: true,
              batchQueue: [],
              progressCount: newProgress
            };
          }
        }
      }
    });
  };

  const totalPoints = state.deckCards.length * 4;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href={`/study/${deckId}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[var(--text)] truncate">{deck.name} — Learn</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Progress */}
        <ProgressBar
          current={state.progressCount}
          total={totalPoints}
          color="var(--primary)"
          label={<span><strong>{state.pass === 2 ? 'Vòng 2 (Double Check)' : 'Vòng 1'}</strong> — {state.phase === 'mcq' ? 'Trắc nghiệm' : 'Gõ tay'}</span>}
        />

        {/* Mode badge */}
        {currentCard && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                state.phase === 'mcq'
                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
              }`}
            >
              {state.phase === 'mcq' ? '🎯 Trắc nghiệm' : '⌨️ Gõ tay'}
            </span>
          </div>
        )}

        {/* Question */}
        {currentCard ? (
          state.phase === 'mcq' ? (
            <MultipleChoice
              key={currentCard.id + "-" + state.phase + "-" + state.retryCount}
              card={currentCard}
              allCards={state.deckCards}
              questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
              answerField={settings.answerLanguage}
              onAnswer={(isCorrect) => handleAnswer(isCorrect, currentCard)}
            />
          ) : (
            <TypeAnswer
              key={currentCard.id + "-" + state.phase + "-" + state.retryCount}
              card={currentCard}
              questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
              answerField={settings.answerLanguage}
              onAnswer={(isCorrect) => handleAnswer(isCorrect, currentCard)}
            />
          )
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)]">
            Đang tải...
          </div>
        )}
      </main>
    </div>
  );
}
