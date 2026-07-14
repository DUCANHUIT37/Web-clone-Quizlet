'use client';
import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ImportZoneProps {
  onFile: (file: File) => void;
  isLoading?: boolean;
}

export function ImportZone({ onFile, isLoading }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="Khu vực kéo thả file CSV"
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
        ${isDragging
          ? 'border-[var(--primary)] bg-[var(--primary-light)] scale-[1.01]'
          : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)]/50'
        }
        ${isLoading ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,application/csv"
        className="hidden"
        onChange={handleChange}
        id="csv-upload"
      />
      <div className={`w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
        <Upload size={28} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-[var(--text)]">
          Kéo thả file CSV vào đây
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          hoặc bấm để chọn file · Tối đa 10MB
        </p>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-[var(--primary)] text-sm font-medium">
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          Đang phân tích...
        </div>
      )}
    </div>
  );
}

// ─── WarningsAccordion ────────────────────────────────────────────────────────

interface WarningsProps {
  warnings: string[];
  errors: string[];
  skippedRows: number;
  validCount: number;
}

export function ParseFeedback({ warnings, errors, skippedRows, validCount }: WarningsProps) {
  const [showWarnings, setShowWarnings] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle size={14} />
          {validCount} thẻ hợp lệ
        </span>
        {skippedRows > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
            <AlertCircle size={14} />
            {skippedRows} dòng bị bỏ qua
          </span>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm mb-2">
            <AlertCircle size={16} />
            Lỗi — Không thể nhập
          </div>
          <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
            {errors.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowWarnings((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-amber-700 dark:text-amber-400 font-medium text-sm hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              {warnings.length} cảnh báo
            </div>
            {showWarnings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showWarnings && (
            <ul className="px-4 pb-3 text-xs text-amber-600 dark:text-amber-300 space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Preview Table ────────────────────────────────────────────────────────────

interface PreviewTableProps {
  cards: Array<{ term: string; definition: string }>;
}

export function PreviewTable({ cards }: PreviewTableProps) {
  const preview = cards.slice(0, 5);
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <div className="grid grid-cols-2 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
          <FileText size={12} />
          Từ (Term)
        </div>
        <div className="px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide border-l border-[var(--border)]">
          Nghĩa (Definition)
        </div>
      </div>
      {preview.map((card, i) => (
        <div
          key={i}
          className="grid grid-cols-2 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)]/50 transition-colors"
        >
          <div className="px-4 py-3 text-sm font-medium">{card.term}</div>
          <div className="px-4 py-3 text-sm text-[var(--text-muted)] border-l border-[var(--border)]">
            {card.definition}
          </div>
        </div>
      ))}
      {cards.length > 5 && (
        <div className="px-4 py-2.5 text-xs text-[var(--text-muted)] text-center bg-[var(--bg)]/50">
          ... và {cards.length - 5} thẻ nữa
        </div>
      )}
    </div>
  );
}
