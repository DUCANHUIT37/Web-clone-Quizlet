'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, BookOpen, Moon, Sun, Settings, Download, Zap, Brain } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useStore } from '@/lib/store';
import { DeckCard } from '@/components/DeckCard';
import { STRINGS } from '@/lib/strings';

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { decks, cardsByDeck, progress, deleteDeck, resetDeckProgress, settings, updateSettings } =
    useStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const deckList = Object.values(decks).sort((a, b) => b.createdAt - a.createdAt);

  const handleDelete = (deckId: string, name: string) => {
    if (confirm(STRINGS.DELETE_DECK_CONFIRM(name))) {
      deleteDeck(deckId);
    }
  };

  const handleReset = (deckId: string) => {
    if (confirm('Đặt lại toàn bộ tiến độ của bộ từ này?')) {
      resetDeckProgress(deckId);
    }
  };

  // Total stats
  const totalCards = Object.values(decks).reduce((s, d) => s + d.cardCount, 0);
  const masteredCards = Object.values(progress).filter(
    (p) => p.learnStage === 'mastered'
  ).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center text-white">
              <Brain size={20} />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-xl text-gradient leading-tight">
                Vocab Master
              </span>
              {mounted && settings.userName && (
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  Chào, {settings.userName} 👋
                </span>
              )}
            </div>
          </Link>

          {/* Stats */}
          {mounted && deckList.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
              <span className="hidden sm:flex items-center gap-1">
                <BookOpen size={14} />
                {totalCards} thẻ
              </span>
              <span className="flex items-center gap-1 text-[var(--primary)] font-medium">
                <Zap size={14} />
                {masteredCards} đã thuộc
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Chuyển dark/light mode"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            {/* Settings */}
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Cài đặt"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="fixed right-4 top-20 z-50 w-72 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 animate-scale-in">
            <h3 className="font-bold text-[var(--text)] mb-4">Cài đặt</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="userName" className="text-sm font-medium text-[var(--text)]">Tên của bạn</label>
                <input
                  id="userName"
                  type="text"
                  value={settings.userName || ''}
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                  placeholder="Nhập tên..."
                  maxLength={30}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:border-[var(--primary)] outline-none transition-colors"
                />
              </div>
              <hr className="border-[var(--border)]" />
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-[var(--text)]">Xáo trộn thẻ</span>
                <button
                  role="switch"
                  aria-checked={settings.shuffleCards}
                  onClick={() => updateSettings({ shuffleCards: !settings.shuffleCards })}
                  className={`w-11 h-6 rounded-full transition-colors ${settings.shuffleCards ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.shuffleCards ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-[var(--text)]">Hiển thị timer</span>
                <button
                  role="switch"
                  aria-checked={settings.showTimer}
                  onClick={() => updateSettings({ showTimer: !settings.showTimer })}
                  className={`w-11 h-6 rounded-full transition-colors ${settings.showTimer ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.showTimer ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text)]">Hỏi theo</span>
                <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
                  {(['definition', 'term'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => updateSettings({ answerLanguage: lang })}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${settings.answerLanguage === lang ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
                    >
                      {lang === 'definition' ? 'Nghĩa' : 'Từ'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text)]">Mục tiêu/ngày</span>
                <input
                  type="number"
                  value={settings.dailyGoal}
                  onChange={(e) => updateSettings({ dailyGoal: Math.max(1, parseInt(e.target.value) || 1) })}
                  min={1}
                  max={200}
                  className="w-20 px-2 py-1.5 text-sm text-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!mounted ? null : deckList.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-24 gap-8 animate-fade-in">
            <div className="w-28 h-28 gradient-primary rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <BookOpen size={52} />
            </div>
            <div className="text-center max-w-md">
              <h1 className="text-3xl font-bold text-[var(--text)] mb-3">
                Chào mừng đến Vocab Master
              </h1>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed">
                Học từ vựng thông minh với thuật toán SM-2. Import file CSV để bắt đầu!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/import"
                className="flex items-center gap-2 px-6 py-3.5 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
              >
                <Plus size={18} />
                Thêm bộ từ đầu tiên
              </Link>
              <a
                href="/sample.csv"
                download
                className="flex items-center gap-2 px-6 py-3.5 bg-[var(--card)] border border-[var(--border)] text-[var(--text)] font-semibold rounded-xl hover:bg-[var(--bg)] transition-all"
              >
                <Download size={18} />
                Tải file CSV mẫu
              </a>
            </div>
            {/* Feature cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-4">
              {[
                { icon: '📚', title: 'Flashcard', desc: 'Lật thẻ 3D' },
                { icon: '🧠', title: 'Learn', desc: 'MCQ + Gõ tay' },
                { icon: '🎮', title: 'Match', desc: 'Nối từ' },
                { icon: '☄️', title: 'Gravity', desc: 'Từ rơi xuống' },
              ].map((f) => (
                <div key={f.title} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <div className="font-semibold text-sm text-[var(--text)]">{f.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Deck list ───────────────────────────────────────────────── */
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">Bộ từ của bạn</h1>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">
                  {deckList.length} bộ từ · {totalCards} thẻ
                </p>
              </div>
              <Link
                href="/import"
                className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-all shadow-md shadow-indigo-500/25"
              >
                <Plus size={16} />
                Thêm bộ từ
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {deckList.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  progress={progress}
                  cardIds={cardsByDeck[deck.id] ?? []}
                  onDelete={() => handleDelete(deck.id, deck.name)}
                  onReset={() => handleReset(deck.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {mounted && deckList.length > 0 && (
        <Link
          href="/import"
          aria-label="Thêm bộ từ mới"
          className="fixed bottom-6 right-6 w-14 h-14 gradient-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:-translate-y-1 transition-all animate-pulse-ring"
        >
          <Plus size={24} />
        </Link>
      )}
    </div>
  );
}
