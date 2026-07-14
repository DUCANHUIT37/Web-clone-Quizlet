// lib/algorithms.ts
import type { Card, CardProgress } from './types';
import { shuffleArray } from './shuffle';

// ─── Learn Mode ─────────────────────────────────────────────────────────────

export function buildLearnQueue(
  cards: Card[],
  progress: Record<string, CardProgress>
): Card[] {
  const stageOrder: Record<CardProgress['learnStage'], number> = {
    unseen: 0,
    mcq1: 1,
    type1: 2,
    mcq2: 3,
    type2: 4,
    mastered: 5,
  };

  const active = cards.filter((c) => {
    const p = progress[c.id];
    return !p || p.learnStage !== 'mastered';
  });

  return active.sort((a, b) => {
    const sa = stageOrder[progress[a.id]?.learnStage ?? 'unseen'];
    const sb = stageOrder[progress[b.id]?.learnStage ?? 'unseen'];
    return sa - sb;
  });
}

export function getNextLearnStage(
  current: CardProgress['learnStage'],
  isCorrect: boolean
): CardProgress['learnStage'] {
  if (!isCorrect) return 'mcq1'; // Sai → về đầu

  const flow: CardProgress['learnStage'][] = [
    'unseen',
    'mcq1',
    'type1',
    'mcq2',
    'type2',
    'mastered',
  ];
  const idx = flow.indexOf(current);
  return flow[Math.min(idx + 1, flow.length - 1)];
}

// ─── SM-2 Spaced Repetition ──────────────────────────────────────────────────

export function sm2Update(
  progress: CardProgress,
  quality: 0 | 1 | 2 | 3 | 4 | 5 // 0-2 = fail, 3-5 = pass
): CardProgress {
  let { easeFactor, interval, repetitions } = progress;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);

    repetitions += 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;

  return { ...progress, easeFactor, interval, repetitions, nextReview };
}

// ─── Distractor Generation ───────────────────────────────────────────────────

export function generateDistractors(
  correctCard: Card,
  allCards: Card[],
  count: number = 3,
  answerField: 'term' | 'definition' = 'definition'
): string[] {
  const correctAnswer = correctCard[answerField];

  // Lọc pool — không dùng correctCard, không dùng thẻ có cùng answer
  const pool = allCards
    .filter(
      (c) => c.id !== correctCard.id && c[answerField] !== correctAnswer
    )
    .map((c) => c[answerField]);

  // Nếu pool < count → trả về tất cả (không crash)
  if (pool.length <= count) return shuffleArray(pool);

  // Shuffle và lấy count items
  return shuffleArray(pool).slice(0, count);
}

// ─── Type Answer Comparison ──────────────────────────────────────────────────

export function checkTypeAnswer(
  userInput: string,
  correctAnswer: string,
  strictMode: boolean = false
): { isCorrect: boolean; similarity: number } {
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:"'()\[\]{}/\\]/g, '') // bỏ punctuation
      .replace(/\s+/g, ' '); // normalize spaces

  const input = normalize(userInput);
  const correct = normalize(correctAnswer);

  if (input === correct) return { isCorrect: true, similarity: 1 };

  // Levenshtein distance cho phép sai 1-2 ký tự (typo tolerance)
  const distance = levenshteinDistance(input, correct);
  const maxLen = Math.max(input.length, correct.length);
  const similarity = maxLen === 0 ? 1 : 1 - distance / maxLen;

  // Cho phép sai tối đa 10% độ dài chuỗi nếu không strictMode
  const threshold = strictMode ? 0 : Math.max(1, Math.floor(correct.length * 0.1));
  const isCorrect = distance <= threshold;

  return { isCorrect, similarity };
}

// Levenshtein distance — iterative, không dùng đệ quy
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Spaced Repetition ───────────────────────────────────────────────────────

export function getDueCards(
  cards: Card[],
  progress: Record<string, CardProgress>
): Card[] {
  const now = Date.now();
  return cards.filter((c) => {
    const p = progress[c.id];
    if (!p || p.learnStage !== 'mastered') return false; // Chỉ ôn thẻ đã mastered
    if (p.nextReview === 0) return true; // Chưa từng ôn
    return p.nextReview <= now;
  });
}
