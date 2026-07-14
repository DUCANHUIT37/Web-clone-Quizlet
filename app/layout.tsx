import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Vocab Master — Học từ vựng thông minh',
  description:
    'Ứng dụng học từ vựng miễn phí với thuật toán spaced repetition SM-2, nhiều chế độ học: flashcard, trắc nghiệm, gõ từ, game matching và gravity.',
  keywords: ['học từ vựng', 'flashcard', 'spaced repetition', 'quizlet', 'anki'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
