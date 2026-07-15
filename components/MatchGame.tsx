'use client';
import { useEffect, useRef, useState } from 'react';
import { shuffleArray } from '@/lib/shuffle';
import type { Card } from '@/lib/types';
import { Timer } from 'lucide-react';

interface MatchItem {
  id: string;
  cardId: string;
  text: string;
  type: 'term' | 'definition';
  matched: boolean;
  shaking: boolean;
}

interface MatchGameProps {
  cards: Card[];
  onComplete: (correctCount: number, elapsedSecs: number) => void;
}

export function MatchGame({ cards, onComplete }: MatchGameProps) {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'term' | 'definition' | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const newItems: MatchItem[] = [];
    cards.forEach((c) => {
      newItems.push({ id: `t-${c.id}`, cardId: c.id, text: c.term, type: 'term', matched: false, shaking: false });
      newItems.push({ id: `d-${c.id}`, cardId: c.id, text: c.definition, type: 'definition', matched: false, shaking: false });
    });

    const terms = shuffleArray(newItems.filter((i) => i.type === 'term'));
    const defs = shuffleArray(newItems.filter((i) => i.type === 'definition'));
    setItems([...terms, ...defs]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cards]);

  const handleSelect = (item: MatchItem) => {
    if (item.matched) return;
    if (selectedId === item.id) {
      setSelectedId(null);
      setSelectedType(null);
      return;
    }
    if (!selectedId) {
      setSelectedId(item.id);
      setSelectedType(item.type);
      return;
    }
    if (selectedType === item.type) {
      setSelectedId(item.id);
      return;
    }

    const prevItem = items.find((i) => i.id === selectedId);
    if (!prevItem) return;

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

      if (newMatched === cards.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => onComplete(correctCount + 1, elapsedSecs), 500);
      }
    } else {
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

  const termItems = items.filter((i) => i.type === 'term');
  const defItems = items.filter((i) => i.type === 'definition');

  return (
    <div className="flex-1 w-full flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between text-[var(--text-muted)] text-sm px-2 mb-2">
        <span>Đã ghép: {matchedCount}/{cards.length}</span>
        <div className="flex items-center gap-1.5 font-mono font-semibold">
          <Timer size={15} /> {elapsedSecs}s
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col gap-3">
          {termItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={item.matched}
              className={`px-4 py-4 sm:py-5 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base font-medium text-left transition-all duration-200 bg-[var(--card)] ${getItemStyle(item)} ${item.shaking ? 'animate-shake border-red-400 bg-red-50 dark:bg-red-950/30' : ''}`}
            >
              {item.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {defItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              disabled={item.matched}
              className={`px-4 py-4 sm:py-5 rounded-xl sm:rounded-2xl border-2 text-sm sm:text-base text-left transition-all duration-200 bg-[var(--card)] ${getItemStyle(item)} ${item.shaking ? 'animate-shake border-red-400 bg-red-50 dark:bg-red-950/30' : ''}`}
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
