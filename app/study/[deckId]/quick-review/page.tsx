'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { MultipleChoice } from '@/components/MultipleChoice';
import { MatchGame } from '@/components/MatchGame';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 6;

interface QuickReviewState {
  deckCards: Card[];
  chunkIndex: number;
  mode: 'match' | 'mcq';
  mcqQueue: Card[];
  isComplete: boolean;
  totalCorrect: number;
}

export default function QuickReviewPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, addSession } = useStore();

  const [state, setState] = useState<QuickReviewState | null>(null);
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

    const initialMode = Math.random() > 0.5 ? 'match' : 'mcq';
    const firstChunk = deckCards.slice(0, CHUNK_SIZE);

    setState({
      deckCards,
      chunkIndex: 0,
      mode: initialMode,
      mcqQueue: shuffleArray(firstChunk),
      isComplete: false,
      totalCorrect: 0,
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
            <span className="font-bold text-[var(--text)]">{deck.name} — Ôn tập nhanh</span>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={state.deckCards.length}
            correctCount={state.totalCorrect}
            mode="flashcard" // Use a generic mode screen
            deckId={deckId}
          />
        </div>
      </div>
    );
  }

  const currentChunkCards = state.deckCards.slice(state.chunkIndex, state.chunkIndex + CHUNK_SIZE);

  const advanceChunk = (correctInChunk: number) => {
    setState(prev => {
      if (!prev) return prev;
      const nextIndex = prev.chunkIndex + CHUNK_SIZE;
      const newTotalCorrect = prev.totalCorrect + correctInChunk;

      if (nextIndex >= prev.deckCards.length) {
        // Record session when complete
        addSession({
          id: uuidv4(),
          deckId,
          mode: 'learn', // count as a learning session
          startedAt: sessionStart.current,
          completedAt: Date.now(),
          totalCards: prev.deckCards.length,
          correctCount: newTotalCorrect,
        });
        return { ...prev, isComplete: true, totalCorrect: newTotalCorrect };
      }

      const nextMode = Math.random() > 0.5 ? 'match' : 'mcq';
      const nextChunk = prev.deckCards.slice(nextIndex, nextIndex + CHUNK_SIZE);
      return {
        ...prev,
        chunkIndex: nextIndex,
        mode: nextMode,
        mcqQueue: nextMode === 'mcq' ? shuffleArray(nextChunk) : [],
        totalCorrect: newTotalCorrect,
      };
    });
  };

  const handleMatchComplete = (correctCount: number) => {
    // In matching, if they finished, they effectively got all of them right eventually
    advanceChunk(correctCount);
  };

  const handleMcqAnswer = (isCorrect: boolean) => {
    setState(prev => {
      if (!prev) return prev;
      const nextQueue = prev.mcqQueue.slice(1);
      const newTotalCorrect = prev.totalCorrect + (isCorrect ? 1 : 0);

      if (nextQueue.length > 0) {
        return { ...prev, mcqQueue: nextQueue, totalCorrect: newTotalCorrect };
      }
      return { ...prev, mcqQueue: nextQueue, totalCorrect: newTotalCorrect };
    });

    if (state.mcqQueue.length <= 1) {
      // Small timeout so user can see feedback before switching chunk
      setTimeout(() => advanceChunk(isCorrect ? 1 : 0), 10);
    }
  };

  const currentCard = state.mcqQueue[0];
  const progressPct = Math.round((state.chunkIndex / state.deckCards.length) * 100);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href={`/study/${deckId}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[var(--text)] truncate">{deck.name} — Ôn tập nhanh</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Zap size={14} />
            {progressPct}%
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        <ProgressBar
          current={state.chunkIndex}
          total={state.deckCards.length}
          color="var(--primary)"
          label={<span>Đã ôn: <strong>{state.chunkIndex} / {state.deckCards.length}</strong> từ</span>}
        />

        {state.mode === 'match' ? (
          <MatchGame
            key={state.chunkIndex}
            cards={currentChunkCards}
            onComplete={handleMatchComplete}
          />
        ) : (
          currentCard ? (
            <MultipleChoice
              key={currentCard.id + "-" + state.chunkIndex}
              card={currentCard}
              allCards={state.deckCards}
              questionField="definition"
              answerField="term"
              onAnswer={handleMcqAnswer}
            />
          ) : null
        )}
      </main>
    </div>
  );
}
