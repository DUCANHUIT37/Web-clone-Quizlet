// lib/strings.ts
export const STRINGS = {
  // Import
  IMPORT_DROP_HINT: 'Kéo thả file CSV vào đây, hoặc bấm để chọn file',
  IMPORT_SUCCESS: (count: number) => `Đã nhập ${count} thẻ thành công!`,
  IMPORT_ERROR_EMPTY: 'File CSV rỗng (0 bytes).',
  IMPORT_ERROR_TOO_LARGE: 'File quá lớn. Tối đa 10MB.',
  IMPORT_WARN_BOM: 'Phát hiện UTF-8 BOM — đã tự động xử lý.',
  // Learn
  LEARN_MCQ_HINT: 'Chọn định nghĩa đúng',
  LEARN_TYPE_HINT: 'Gõ định nghĩa vào đây',
  LEARN_ALMOST_CORRECT: 'Gần đúng rồi! Có tính là đúng không?',
  LEARN_CORRECT: 'Chính xác! 🎉',
  LEARN_INCORRECT: 'Chưa đúng. Đáp án là:',
  LEARN_MASTERED: (count: number) => `Bạn đã thuộc ${count} thẻ! 🏆`,
  // Games
  MATCH_TIME: (s: number) => `${s} giây`,
  GRAVITY_LIVES: (n: number) => '❤️'.repeat(n),
  GRAVITY_GAME_OVER: 'Game Over',
  // General
  CONFIRM_LEAVE: 'Bạn có chắc muốn rời đi? Tiến độ phiên học này sẽ mất.',
  DELETE_DECK_CONFIRM: (name: string) => `Xóa bộ từ "${name}"? Hành động này không thể hoàn tác.`,
};
