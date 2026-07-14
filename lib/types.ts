// lib/types.ts

export interface Card {
  id: string;           // UUID v4
  term: string;         // Từ / câu hỏi
  definition: string;   // Nghĩa / câu trả lời
  deckId: string;
  createdAt: number;    // timestamp
}

export interface Deck {
  id: string;           // UUID v4
  name: string;         // Tên bộ từ (lấy từ tên file CSV, trim extension)
  description?: string;
  cardCount: number;
  createdAt: number;
  lastStudied?: number;
  color: string;        // Random từ palette khi tạo
}

export interface CardProgress {
  cardId: string;
  deckId: string;
  // SM-2 fields
  easeFactor: number;   // Default 2.5
  interval: number;     // Số ngày (0 = chưa học)
  repetitions: number;  // Số lần đúng liên tiếp
  nextReview: number;   // Timestamp ngày review tiếp theo
  // Learn mode fields
  learnStage: 'unseen' | 'mcq1' | 'type1' | 'mcq2' | 'type2' | 'mastered';
  correctStreak: number;
  lastAnswered?: number;
  // Stats
  totalAnswers: number;
  correctAnswers: number;
}

export interface StudySession {
  id: string;
  deckId: string;
  mode: 'flashcard' | 'learn' | 'match' | 'gravity' | 'review';
  startedAt: number;
  completedAt?: number;
  score?: number;
  totalCards: number;
  correctCount: number;
}

export interface AppState {
  decks: Record<string, Deck>;
  cards: Record<string, Card>;           // cardId -> Card
  cardsByDeck: Record<string, string[]>; // deckId -> cardId[]
  progress: Record<string, CardProgress>; // cardId -> progress
  sessions: StudySession[];
  settings: {
    answerLanguage: 'definition' | 'term'; // Hỏi term → đánh definition, hay ngược lại
    shuffleCards: boolean;
    showTimer: boolean;
    dailyGoal: number; // Số thẻ/ngày
  };
}

export interface Actions {
  importDeck: (name: string, rawCards: Array<{ term: string; definition: string }>) => string;
  updateProgress: (cardId: string, update: Partial<CardProgress>) => void;
  resetDeckProgress: (deckId: string) => void;
  deleteDeck: (deckId: string) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  addSession: (session: StudySession) => void;
}
