'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Heart } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { checkTypeAnswer } from '@/lib/algorithms';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const MAX_LIVES = 3;
const BASE_DURATION = 8000; // ms for first card to fall

interface FallingCard {
  card: Card;
  startTime: number;
  duration: number;
}

export default function GravityPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, addSession } = useStore();

  const [queue, setQueue] = useState<Card[]>([]);
  const [current, setCurrent] = useState<FallingCard | null>(null);
  const [input, setInput] = useState('');
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [correctInRow, setCorrectInRow] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [paused, setPaused] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const [fallingPct, setFallingPct] = useState(0); // 0-100

  const inputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);
  const sessionStart = useRef(Date.now());
  const queueRef = useRef<Card[]>([]);

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
    const q = shuffleArray(deckCards);
    queueRef.current = q;
    setQueue(q);
    startNext(q, 0, 0);
    inputRef.current?.focus();
    sessionStart.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, deckId]);

  // Pause on tab hide
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Window resize → reset positions
  useEffect(() => {
    const onResize = () => {
      // Just re-render; CSS handles position
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!current || paused || showResult) return;

    const animate = () => {
      const elapsed = Date.now() - current.startTime;
      const pct = Math.min((elapsed / current.duration) * 100, 100);
      setFallingPct(pct);

      if (pct >= 100) {
        // Card hit ground — lose life
        handleMiss();
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, showResult]);

  const getDuration = (correctStreak: number) => {
    // Speed increases every 5 correct
    const speedFactor = Math.max(0.4, 1 - Math.floor(correctStreak / 5) * 0.1);
    return BASE_DURATION * speedFactor;
  };

  const startNext = useCallback(
    (q: Card[], idx: number, streak: number) => {
      if (q.length === 0) return;
      const card = q[idx % q.length];
      const duration = getDuration(streak);
      setCurrent({ card, startTime: Date.now(), duration });
      setFallingPct(0);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  const handleMiss = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setFeedback({ text: `Đáp án: ${current?.card.term ?? ''}`, correct: false });
    const newLives = lives - 1;
    setLives(newLives);
    setTotalAttempts((t) => t + 1);
    setCorrectInRow(0);

    if (newLives <= 0) {
      // Game over
      addSession({
        id: uuidv4(),
        deckId,
        mode: 'gravity',
        startedAt: sessionStart.current,
        completedAt: Date.now(),
        totalCards: totalAttempts + 1,
        correctCount,
        score,
      });
      setTimeout(() => {
        setFeedback(null);
        setShowResult(true);
      }, 1500);
      return;
    }

    setTimeout(() => {
      setFeedback(null);
      const q = queueRef.current;
      const nextIdx = (q.findIndex((c) => c.id === current?.card.id) + 1) % q.length;
      startNext(q, nextIdx, 0);
    }, 1600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, lives, totalAttempts, correctCount, score]);

  const handleSubmit = () => {
    if (!current || !input.trim()) return;
    cancelAnimationFrame(rafRef.current);

    const { isCorrect } = checkTypeAnswer(input.trim(), current.card.term);
    setTotalAttempts((t) => t + 1);

    if (isCorrect) {
      const newStreak = correctInRow + 1;
      setCorrectInRow(newStreak);
      setCorrectCount((c) => c + 1);
      setScore((s) => s + 10);
      setFeedback({ text: '+10 🎉', correct: true });

      setTimeout(() => {
        setFeedback(null);
        const q = queueRef.current;
        const nextIdx = (q.findIndex((c) => c.id === current.card.id) + 1) % q.length;
        startNext(q, nextIdx, newStreak);
      }, 700);
    } else {
      handleMiss();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!mounted) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  const cardCount = cardsByDeck[deckId]?.length ?? 0;
  if (cardCount < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-sm">
          <div className="text-5xl mb-4">☄️</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Cần ít nhất 2 thẻ</h2>
          <p className="text-[var(--text-muted)] mb-4">Game Gravity cần ít nhất 2 từ.</p>
          <Link href={`/study/${deckId}`} className="text-[var(--primary)] font-semibold hover:underline">
            ← Quay lại
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
            <span className="font-bold text-[var(--text)]">{deck.name} — Gravity</span>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={totalAttempts}
            correctCount={correctCount}
            mode="gravity"
            deckId={deckId}
            onRestart={() => {
              setLives(MAX_LIVES);
              setScore(0);
              setCorrectCount(0);
              setTotalAttempts(0);
              setCorrectInRow(0);
              setShowResult(false);
              const ids = cardsByDeck[deckId] ?? [];
              const deckCards = ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c);
              const q = shuffleArray(deckCards);
              queueRef.current = q;
              setQueue(q);
              startNext(q, 0, 0);
              sessionStart.current = Date.now();
            }}
            score={score}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}
    >
      {/* Header */}
      <header className="relative z-30 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-sm text-white truncate">{deck.name} ☄️ Gravity</h1>
          {/* Lives + Score */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono font-bold text-amber-400">{score}</span>
            <div className="flex gap-0.5" aria-label={`${lives} mạng còn lại`}>
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <Heart
                  key={i}
                  size={16}
                  className={i < lives ? 'text-red-500 fill-red-500' : 'text-white/20'}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Game area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Stars bg */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Paused overlay */}
        {paused && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-white text-2xl font-bold">⏸ Tạm dừng</div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl animate-scale-in ${
              feedback.correct
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Falling definition */}
        {current && !feedback && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-10 max-w-[80%]"
            style={{ top: `${fallingPct}%`, transition: 'none' }}
          >
            <div className="bg-violet-900/80 border border-violet-400/40 backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-2xl shadow-violet-500/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-1">
                Nghĩa / Definition
              </p>
              <p className="text-white font-bold text-lg leading-snug" dir="auto">
                {current.card.definition}
              </p>
            </div>
          </div>
        )}

        {/* Input zone at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 z-10">
          <div className="max-w-md mx-auto flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Gõ từ tiếng Anh và nhấn Enter..."
              aria-label="Nhập từ vựng"
              className="flex-1 px-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-violet-400 focus:bg-white/15 transition-all font-medium backdrop-blur-sm"
            />
            <button
              onClick={handleSubmit}
              className="px-4 py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-colors"
            >
              ↵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
