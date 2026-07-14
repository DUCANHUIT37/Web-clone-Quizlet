// lib/store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, Actions, Card, CardProgress, StudySession } from './types';

// CRITICAL: Wrap localStorage access để tránh SSR crash (Next.js)
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null; // Safari private mode, quota exceeded, etc.
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.warn('localStorage quota exceeded:', e);
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

const DECK_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#DB2777', // Pink
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#0891B2', // Cyan
  '#65A30D', // Lime
];

function getDefaultProgress(cardId: string, deckId: string): CardProgress {
  return {
    cardId,
    deckId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: 0,
    learnStage: 'unseen',
    correctStreak: 0,
    totalAnswers: 0,
    correctAnswers: 0,
  };
}

export const useStore = create<AppState & Actions>()(
  persist(
    (set, get) => ({
      decks: {},
      cards: {},
      cardsByDeck: {},
      progress: {},
      sessions: [],
      settings: {
        answerLanguage: 'definition',
        shuffleCards: true,
        showTimer: true,
        dailyGoal: 20,
      },

      // --- ACTIONS ---

      importDeck: (name: string, rawCards: Array<{ term: string; definition: string }>) => {
        const deckId = uuidv4();
        const color = DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)];

        const newCards: Card[] = rawCards.map((rc) => ({
          id: uuidv4(),
          term: rc.term,
          definition: rc.definition,
          deckId,
          createdAt: Date.now(),
        }));

        const cardMap: Record<string, Card> = {};
        const cardIds: string[] = [];
        newCards.forEach((c) => {
          cardMap[c.id] = c;
          cardIds.push(c.id);
        });

        // Sanitize & deduplicate deck name
        const existingNames = Object.values(get().decks).map((d) => d.name);
        let deckName = name.replace(/\.csv$/i, '').trim() || 'Bộ từ không tên';
        if (existingNames.includes(deckName)) {
          let counter = 2;
          while (existingNames.includes(`${deckName} (${counter})`)) counter++;
          deckName = `${deckName} (${counter})`;
        }

        const deck: Deck = {
          id: deckId,
          name: deckName,
          cardCount: newCards.length,
          createdAt: Date.now(),
          color,
        };

        set((state) => ({
          decks: { ...state.decks, [deckId]: deck },
          cards: { ...state.cards, ...cardMap },
          cardsByDeck: { ...state.cardsByDeck, [deckId]: cardIds },
        }));

        return deckId;
      },

      updateProgress: (cardId: string, update: Partial<CardProgress>) => {
        set((state) => ({
          progress: {
            ...state.progress,
            [cardId]: {
              ...getDefaultProgress(cardId, state.cards[cardId]?.deckId ?? ''),
              ...state.progress[cardId],
              ...update,
            },
          },
        }));
      },

      resetDeckProgress: (deckId: string) => {
        const cardIds = get().cardsByDeck[deckId] ?? [];
        set((state) => {
          const newProgress = { ...state.progress };
          cardIds.forEach((id) => {
            delete newProgress[id];
          });
          // Also reset lastStudied
          const newDecks = { ...state.decks };
          if (newDecks[deckId]) {
            newDecks[deckId] = { ...newDecks[deckId], lastStudied: undefined };
          }
          return { progress: newProgress, decks: newDecks };
        });
      },

      deleteDeck: (deckId: string) => {
        const cardIds = get().cardsByDeck[deckId] ?? [];
        set((state) => {
          const newCards = { ...state.cards };
          const newProgress = { ...state.progress };
          const newDecks = { ...state.decks };
          const newByDeck = { ...state.cardsByDeck };

          cardIds.forEach((id) => {
            delete newCards[id];
            delete newProgress[id];
          });
          delete newDecks[deckId];
          delete newByDeck[deckId];

          return {
            decks: newDecks,
            cards: newCards,
            progress: newProgress,
            cardsByDeck: newByDeck,
          };
        });
      },

      updateSettings: (settings: Partial<AppState['settings']>) => {
        set((state) => ({ settings: { ...state.settings, ...settings } }));
      },

      addSession: (session: StudySession) => {
        set((state) => {
          // Update lastStudied
          const newDecks = { ...state.decks };
          if (newDecks[session.deckId]) {
            newDecks[session.deckId] = {
              ...newDecks[session.deckId],
              lastStudied: session.startedAt,
            };
          }
          return {
            sessions: [...state.sessions.slice(-99), session],
            decks: newDecks,
          };
        });
      },
    }),
    {
      name: 'vocab-master-store',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        decks: state.decks,
        cards: state.cards,
        cardsByDeck: state.cardsByDeck,
        progress: state.progress,
        settings: state.settings,
        sessions: state.sessions,
      }),
    }
  )
);

export { getDefaultProgress };
