'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { buildLearnQueue, getNextLearnStage } from '@/lib/algorithms';
import { shuffleArray } from '@/lib/shuffle';
import { MultipleChoice } from '@/components/MultipleChoice';
import { TypeAnswer } from '@/components/TypeAnswer';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card, CardProgress } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getDefaultProgress } from '@/lib/store';

const BATCH_SIZE = 10;

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, progress, updateProgress, addSession, settings } = useStore();

  const [queue, setQueue] = useState<Card[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const sessionStart = useRef(Date.now());
  const localProgress = useRef<Record<string, CardProgress>>({});

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

    // Clone progress locally for the session
    localProgress.current = {};
    ids.forEach((id) => {
      localProgress.current[id] = progress[id]
        ? { ...progress[id] }
        : getDefaultProgress(id, deckId);
    });

    const q = buildLearnQueue(deckCards, localProgress.current);
    // Batch: first BATCH_SIZE
    const batch = q.slice(0, BATCH_SIZE);
    setQueue(shuffleArray(batch));
    setQueueIdx(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setShowResult(false);
    sessionStart.current = Date.now();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, deckId]);

  if (!mounted) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  const currentCard = queue[queueIdx];

  const getMode = (card: Card): 'mcq' | 'type' => {
    const stage = localProgress.current[card.id]?.learnStage ?? 'unseen';
    // unseen/mcq1/mcq2 → mcq, type1/type2 → type
    // If only 1 card in deck → always type
    const ids = cardsByDeck[deckId] ?? [];
    if (ids.length <= 1) return 'type';
    return stage === 'type1' || stage === 'type2' ? 'type' : 'mcq';
  };

  const handleAnswer = (isCorrect: boolean, card: Card) => {
    const currentStage = localProgress.current[card.id]?.learnStage ?? 'unseen';
    const nextStage = getNextLearnStage(currentStage, isCorrect);

    // Update local progress
    const prev = localProgress.current[card.id] ?? getDefaultProgress(card.id, deckId);
    localProgress.current[card.id] = {
      ...prev,
      learnStage: nextStage,
      correctStreak: isCorrect ? (prev.correctStreak ?? 0) + 1 : 0,
      totalAnswers: (prev.totalAnswers ?? 0) + 1,
      correctAnswers: isCorrect ? (prev.correctAnswers ?? 0) + 1 : prev.correctAnswers ?? 0,
      lastAnswered: Date.now(),
    };

    // Persist to store
    updateProgress(card.id, localProgress.current[card.id]);

    setTotalAnswered((t) => t + 1);
    if (isCorrect) setCorrectCount((c) => c + 1);

    // Rebuild remaining queue
    const ids = cardsByDeck[deckId] ?? [];
    const deckCards = ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c);
    const remaining = buildLearnQueue(deckCards, localProgress.current);

    if (remaining.length === 0) {
      // All mastered!
      addSession({
        id: uuidv4(),
        deckId,
        mode: 'learn',
        startedAt: sessionStart.current,
        completedAt: Date.now(),
        totalCards: totalAnswered + 1,
        correctCount: isCorrect ? correctCount + 1 : correctCount,
      });
      setShowResult(true);
      return;
    }

    // If wrong → put card back in queue early
    const nextQueue = isCorrect
      ? queue.slice(queueIdx + 1)
      : [...queue.slice(queueIdx + 1), card];

    // If current batch exhausted but still remaining cards
    if (nextQueue.length === 0 && remaining.length > 0) {
      const nextBatch = remaining.slice(0, BATCH_SIZE);
      setQueue(shuffleArray(nextBatch));
      setQueueIdx(0);
      return;
    }

    setQueue(nextQueue);
    setQueueIdx(0);
  };

  const ids = cardsByDeck[deckId] ?? [];
  const deckCards = ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c);

  const allCardCount = ids.length;
  const masteredCount = deckCards.filter(
    (c) => localProgress.current[c.id]?.learnStage === 'mastered'
  ).length;

  const stagePoints: Record<string, number> = { unseen: 0, mcq1: 1, type1: 2, mcq2: 3, type2: 4, mastered: 5 };
  const currentPoints = deckCards.reduce((sum, c) => {
    const stage = localProgress.current[c.id]?.learnStage || 'unseen';
    return sum + (stagePoints[stage] || 0);
  }, 0);
  const totalPoints = allCardCount * 5;

  if (showResult) {
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
            totalCards={totalAnswered}
            correctCount={correctCount}
            mode="learn"
            deckId={deckId}
          />
        </div>
      </div>
    );
  }

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
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {masteredCount}/{allCardCount} thuộc
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col gap-8">
        {/* Progress */}
        <ProgressBar
          current={currentPoints}
          total={totalPoints}
          color="var(--primary)"
          label={<span><strong>{masteredCount} / {allCardCount}</strong> thuộc</span>}
        />

        {/* Mode badge */}
        {currentCard && (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                getMode(currentCard) === 'mcq'
                  ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                  : 'bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
              }`}
            >
              {getMode(currentCard) === 'mcq' ? '🎯 Trắc nghiệm' : '⌨️ Gõ tay'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              Stage:{' '}
              <span className="font-mono">
                {localProgress.current[currentCard.id]?.learnStage ?? 'unseen'}
              </span>
            </span>
          </div>
        )}

        {/* Question */}
        {currentCard ? (
          getMode(currentCard) === 'mcq' ? (
            <MultipleChoice
              key={currentCard.id + (localProgress.current[currentCard.id]?.learnStage ?? 'unseen')}
              card={currentCard}
              allCards={(cardsByDeck[deckId] ?? []).map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c)}
              questionField={settings.answerLanguage === 'definition' ? 'term' : 'definition'}
              answerField={settings.answerLanguage}
              onAnswer={(isCorrect) => handleAnswer(isCorrect, currentCard)}
            />
          ) : (
            <TypeAnswer
              key={currentCard.id + (localProgress.current[currentCard.id]?.learnStage ?? 'unseen')}
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
