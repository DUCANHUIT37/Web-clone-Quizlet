'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { parseCSVFile } from '@/lib/csv-parser';
import { ImportZone, ParseFeedback, PreviewTable } from '@/components/ImportZone';
import type { ParseResult } from '@/lib/csv-parser';

export default function ImportPage() {
  const router = useRouter();
  const { importDeck } = useStore();

  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [deckName, setDeckName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setIsLoading(true);
    setParseResult(null);

    // Default deck name from filename
    const baseName = f.name.replace(/\.csv$/i, '').trim();
    setDeckName(baseName || 'Bộ từ mới');

    try {
      const result = await parseCSVFile(f);
      setParseResult(result);
    } catch (e) {
      setParseResult({
        cards: [],
        errors: [`Lỗi không xác định: ${e}`],
        warnings: [],
        skippedRows: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = async () => {
    if (!parseResult || parseResult.cards.length === 0 || parseResult.errors.length > 0) return;
    setIsImporting(true);
    try {
      const deckId = importDeck(deckName || 'Bộ từ mới', parseResult.cards);
      setSuccess(true);
      setTimeout(() => router.push(`/study/${deckId}`), 1500);
    } finally {
      setIsImporting(false);
    }
  };

  const canImport =
    parseResult &&
    parseResult.cards.length > 0 &&
    parseResult.errors.length === 0 &&
    !isLoading;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
            <Check size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text)]">Nhập thành công!</h2>
          <p className="text-[var(--text-muted)]">Đang chuyển đến trang học...</p>
        </div>
      </div>
    );
  }

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
          <div>
            <h1 className="font-bold text-[var(--text)]">Nhập bộ từ</h1>
            <p className="text-xs text-[var(--text-muted)]">Import từ file CSV</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Drop zone */}
        <ImportZone onFile={handleFile} isLoading={isLoading} />

        {/* File info */}
        {file && !isLoading && (
          <div className="flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl animate-slide-up">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] flex items-center justify-center">
              <FileText size={20} className="text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[var(--text)] truncate">{file.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {(file.size / 1024).toFixed(1)} KB
                {parseResult && ` · ${parseResult.cards.length} thẻ hợp lệ`}
              </p>
            </div>
          </div>
        )}

        {/* Parse feedback */}
        {parseResult && !isLoading && (
          <ParseFeedback
            warnings={parseResult.warnings}
            errors={parseResult.errors}
            skippedRows={parseResult.skippedRows}
            validCount={parseResult.cards.length}
          />
        )}

        {/* Preview */}
        {parseResult && parseResult.cards.length > 0 && !isLoading && (
          <div className="flex flex-col gap-3 animate-slide-up">
            <h3 className="font-semibold text-[var(--text)] text-sm">
              Xem trước ({Math.min(5, parseResult.cards.length)} dòng đầu)
            </h3>
            <PreviewTable cards={parseResult.cards} />
          </div>
        )}

        {/* Deck name input */}
        {parseResult && parseResult.cards.length > 0 && !isLoading && (
          <div className="flex flex-col gap-2 animate-slide-up">
            <label htmlFor="deck-name" className="text-sm font-semibold text-[var(--text)]">
              Tên bộ từ
            </label>
            <input
              id="deck-name"
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Nhập tên bộ từ..."
              maxLength={100}
              className="px-4 py-3 rounded-xl border-2 border-[var(--border)] focus:border-[var(--primary)] bg-[var(--card)] text-[var(--text)] outline-none transition-all text-sm font-medium"
            />
          </div>
        )}

        {/* Import button */}
        {parseResult && !isLoading && (
          <button
            onClick={handleImport}
            disabled={!canImport || isImporting}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              canImport
                ? 'gradient-primary text-white hover:opacity-90 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 active:scale-95'
                : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          >
            {isImporting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang nhập...
              </span>
            ) : (
              `Nhập ${parseResult.cards.length} thẻ →`
            )}
          </button>
        )}

        {/* Download sample */}
        {!file && (
          <div className="text-center">
            <a
              href="/sample.csv"
              download
              className="text-sm text-[var(--primary)] hover:underline inline-flex items-center gap-1"
            >
              Tải file CSV mẫu để thử
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
