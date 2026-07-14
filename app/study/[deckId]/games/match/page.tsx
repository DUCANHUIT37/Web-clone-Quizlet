'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Timer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { shuffleArray } from '@/lib/shuffle';
import { ResultScreen } from '@/components/ResultScreen';
import type { Card } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const MAX_CARDS = 10;

interface MatchItem {
  id: string;       // unique item id (term or def)
  cardId: string;
  text: string;
  type: 'term' | 'definition';
  matched: boolean;
  shaking: boolean;
}

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, addSession } = useStore();

  const [items, setItems] = useState<MatchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'term' | 'definition' | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStart = useRef(Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !decks[deckId]) router.replace('/');
  }, [mounted, deckId, decks, router]);

  const initGame = () => {
    if (!mounted) return;
    const ids = cardsByDeck[deckId] ?? [];
    const picked: Card[] = shuffleArray(ids.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c)).slice(
      0,
      MAX_CARDS
    );

    const newItems: MatchItem[] = [];
    picked.forEach((c) => {
      newItems.push({ id: `t-${c.id}`, cardId: c.id, text: c.term, type: 'term', matched: false, shaking: false });
      newItems.push({ id: `d-${c.id}`, cardId: c.id, text: c.definition, type: 'definition', matched: false, shaking: false });
    });

    // Shuffle both columns separately
    const terms = shuffleArray(newItems.filter((i) => i.type === 'term'));
    const defs = shuffleArray(newItems.filter((i) => i.type === 'definition'));
    setItems([...terms, ...defs]);
    setSelectedId(null);
    setSelectedType(null);
    setMatchedCount(0);
    setCorrectCount(0);
    setTotalAttempts(0);
    setShowResult(false);
    setElapsedSecs(0);
    sessionStart.current = Date.now();

    // Start timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
  };

  useEffect(() => {
    if (mounted) initGame();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, deckId]);

  if (!mounted) return null;
  const deck = decks[deckId];
  if (!deck) return null;

  const cardCount = cardsByDeck[deckId]?.length ?? 0;
  if (cardCount < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-sm">
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-xl font-bold text-[var(--text)] mb-2">Cần ít nhất 3 thẻ</h2>
          <p className="text-[var(--text-muted)] mb-4">Game Match cần ít nhất 3 cặp từ để chơi.</p>
          <Link href={`/study/${deckId}`} className="text-[var(--primary)] font-semibold hover:underline">
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const handleSelect = (item: MatchItem) => {
    if (item.matched) return;

    // Same item → deselect
    if (selectedId === item.id) {
      setSelectedId(null);
      setSelectedType(null);
      return;
    }

    // No selection yet
    if (!selectedId) {
      setSelectedId(item.id);
      setSelectedType(item.type);
      return;
    }

    // Same type clicked — switch selection
    if (selectedType === item.type) {
      setSelectedId(item.id);
      return;
    }

    // Different type — attempt match
    const prevItem = items.find((i) => i.id === selectedId);
    if (!prevItem) return;

    setTotalAttempts((t) => t + 1);

    const isMatch = prevItem.cardId === item.cardId;
    if (isMatch) {
      setCorrectCount((c) => c + 1);
      const newItems = items.map((i) =>
        i.id === selectedId || i.id === item.id ? { ...i, matched: true } : i
      );
      setItems(newItems);
      const newMatched = matchedCount + 1;
      setMatchedCount(newMatched);
      setSelectedId(null);
      setSelectedType(null);

      if (newMatched === newItems.filter((i) => i.type === 'term').length) {
        if (timerRef.current) clearInterval(timerRef.current);
        addSession({
          id: uuidv4(),
          deckId,
          mode: 'match',
          startedAt: sessionStart.current,
          completedAt: Date.now(),
          totalCards: newMatched,
          correctCount: correctCount + 1,
        });
        setTimeout(() => setShowResult(true), 500);
      }
    } else {
      // Shake both wrong items
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedId || i.id === item.id ? { ...i, shaking: true } : i
        )
      );
      setTimeout(() => {
        setItems((prev) => prev.map((i) => ({ ...i, shaking: false })));
      }, 500);
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  const getItemStyle = (item: MatchItem) => {
    if (item.matched) return 'opacity-30 cursor-default';
    if (item.id === selectedId)
      return 'border-[var(--primary)] bg-[var(--primary-light)] shadow-md';
    return 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)]/40 cursor-pointer';
  };

  if (showResult) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
            <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <span className="font-bold text-[var(--text)]">{deck.name} — Match</span>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <ResultScreen
            totalCards={matchedCount}
            correctCount={correctCount}
            mode="match"
            deckId={deckId}
            onRestart={initGame}
            timeSeconds={elapsedSecs}
          />
        </div>
      </div>
    );
  }

  const termItems = items.filter((i) => i.type === 'term');
  const defItems = items.filter((i) => i.type === 'definition');

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href={`/study/${deckId}`} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-sm text-[var(--text)] truncate">{deck.name} — Match</h1>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono font-semibold text-[var(--text-muted)]">
            <Timer size={15} />
            {elapsedSecs}s
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-sm text-[var(--text-muted)] text-center mb-4">
          Chọn một từ rồi chọn nghĩa tương ứng · {matchedCount}/{termItems.length} cặp
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Terms column */}
          <div className="flex flex-col gap-2">
            {termItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                disabled={item.matched}
                className={`px-4 py-3.5 rounded-xl border-2 text-sm font-medium text-left transition-all duration-200 bg-[var(--card)] ${getItemStyle(item)} ${item.shaking ? 'animate-shake border-red-400 bg-red-50 dark:bg-red-950/30' : ''}`}
                dir="auto"
              >
                {item.text}
              </button>
            ))}
          </div>
          {/* Definitions column */}
          <div className="flex flex-col gap-2">
            {defItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                disabled={item.matched}
                className={`px-4 py-3.5 rounded-xl border-2 text-sm text-left transition-all duration-200 bg-[var(--card)] ${getItemStyle(item)} ${item.shaking ? 'animate-shake border-red-400 bg-red-50 dark:bg-red-950/30' : ''}`}
                dir="auto"
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
