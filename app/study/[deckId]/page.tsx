'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Brain, Gamepad2, Zap, Calendar, AlertCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getDueCards } from '@/lib/algorithms';
import { ProgressBar } from '@/components/ProgressBar';

export default function StudyHubPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.deckId as string;
  const [mounted, setMounted] = useState(false);

  const { decks, cards, cardsByDeck, progress } = useStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !decks[deckId]) {
      router.replace('/');
    }
  }, [mounted, deckId, decks, router]);

  if (!mounted) return null;

  const deck = decks[deckId];
  if (!deck) return null;

  const cardIds = cardsByDeck[deckId] ?? [];
  const deckCards = cardIds.map((id) => cards[id]).filter((c): c is NonNullable<typeof c> => !!c);
  const masteredCount = cardIds.filter(
    (id) => progress[id]?.learnStage === 'mastered'
  ).length;
  const dueCards = getDueCards(deckCards, progress);

  const modes = [
    {
      id: 'flashcard',
      icon: '📚',
      title: 'Flashcard',
      description: 'Lật thẻ, tự đánh giá bản thân',
      href: `/study/${deckId}/flashcard`,
      gradient: 'from-blue-500 to-indigo-600',
      disabled: false,
    },
    {
      id: 'learn',
      icon: '🧠',
      title: 'Learn',
      description: 'Trắc nghiệm + gõ tay · thuật toán SM-2',
      href: `/study/${deckId}/learn`,
      gradient: 'from-violet-500 to-purple-700',
      disabled: false,
    },
    {
      id: 'quick-review',
      icon: '⚡',
      title: 'Ôn tập nhanh',
      description: 'Trắc nghiệm & Nối từ ngẫu nhiên',
      href: `/study/${deckId}/quick-review`,
      gradient: 'from-amber-400 to-orange-500',
      disabled: false,
    },
    {
      id: 'match',
      icon: '🎮',
      title: 'Match',
      description: 'Nối từ với nghĩa theo thời gian',
      href: `/study/${deckId}/games/match`,
      gradient: 'from-emerald-500 to-teal-600',
      disabled: deck.cardCount < 3,
      disabledMsg: 'Cần ít nhất 3 thẻ',
    },
    {
      id: 'gravity',
      icon: '☄️',
      title: 'Gravity',
      description: 'Từ rơi xuống, gõ nhanh trước khi chạm đất',
      href: `/study/${deckId}/games/gravity`,
      gradient: 'from-orange-500 to-red-600',
      disabled: deck.cardCount < 2,
      disabledMsg: 'Cần ít nhất 2 thẻ',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[var(--text)] truncate">{deck.name}</h1>
            <p className="text-xs text-[var(--text-muted)]">{deck.cardCount} thẻ</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Progress overview */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 card-shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--text)]">Tiến độ tổng thể</h2>
            <span className="text-sm font-bold" style={{ color: deck.color }}>
              {masteredCount}/{deck.cardCount} đã thuộc
            </span>
          </div>
          <ProgressBar
            current={masteredCount}
            total={deck.cardCount}
            color={deck.color}
            showLabel={false}
          />
        </div>

        {/* Mode cards */}
        <div>
          <h2 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Gamepad2 size={16} />
            Chọn chế độ học
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modes.map((mode) => (
              <div key={mode.id} className="relative">
                {mode.disabled ? (
                  <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 opacity-50 cursor-not-allowed">
                    <div className="text-3xl mb-3">{mode.icon}</div>
                    <h3 className="font-bold text-[var(--text)] text-lg">{mode.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{mode.description}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle size={12} />
                      {mode.disabledMsg}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={mode.href}
                    className="block bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group card-shadow"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform duration-200`}
                    >
                      {mode.icon}
                    </div>
                    <h3 className="font-bold text-[var(--text)] text-lg">{mode.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1 leading-snug">
                      {mode.description}
                    </p>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Spaced repetition review */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden card-shadow">
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
                <Calendar size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)]">Ôn tập theo lịch</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {dueCards.length > 0
                    ? `${dueCards.length} thẻ cần ôn hôm nay`
                    : masteredCount === 0
                    ? 'Chưa có thẻ đã thuộc'
                    : 'Không có thẻ cần ôn hôm nay 🎉'}
                </p>
              </div>
            </div>
            {dueCards.length > 0 ? (
              <Link
                href={`/review/${deckId}`}
                className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-indigo-500/25"
              >
                Ôn ngay
              </Link>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-[var(--bg)] text-[var(--text-muted)] text-xs font-medium">
                {masteredCount === 0 ? 'Chưa sẵn sàng' : 'Hoàn thành ✓'}
              </span>
            )}
          </div>
          {masteredCount > 0 && (
            <div className="px-5 pb-4 text-xs text-[var(--text-muted)]">
              <Zap size={12} className="inline mr-1 text-amber-500" />
              Ôn đúng lịch giúp nhớ lâu hơn 5x theo nghiên cứu về spaced repetition
            </div>
          )}
        </div>

        {/* Card list preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-[var(--text)] flex items-center gap-2">
              <BookOpen size={16} />
              Danh sách thẻ
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{deckCards.length} thẻ</span>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {deckCards.slice(0, 10).map((card, i) => {
              const p = progress[card.id];
              const stage = p?.learnStage ?? 'unseen';
              return (
                <div
                  key={card.id}
                  className="grid grid-cols-2 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)]/50 transition-colors"
                >
                  <div className="px-4 py-3 text-sm font-medium truncate">{card.term}</div>
                  <div className="px-4 py-3 text-sm text-[var(--text-muted)] border-l border-[var(--border)] flex items-center justify-between gap-2">
                    <span className="truncate">{card.definition}</span>
                    {stage === 'mastered' && (
                      <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {deckCards.length > 10 && (
              <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center bg-[var(--bg)]/30">
                ... và {deckCards.length - 10} thẻ nữa
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
