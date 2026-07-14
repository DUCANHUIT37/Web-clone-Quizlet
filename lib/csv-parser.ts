// lib/csv-parser.ts
import Papa from 'papaparse';

export interface ParseResult {
  cards: Array<{ term: string; definition: string }>;
  errors: string[];
  warnings: string[];
  skippedRows: number;
}

export async function parseCSVFile(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let skippedRows = 0;

  // Validation 1: kiểm tra file type
  if (
    !file.name.endsWith('.csv') &&
    file.type !== 'text/csv' &&
    file.type !== 'application/csv'
  ) {
    warnings.push(
      'File không có extension .csv, thử parse nhưng có thể không đúng định dạng.'
    );
  }

  // Validation 2: file size
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size === 0) {
    return {
      cards: [],
      errors: ['File CSV rỗng (0 bytes).'],
      warnings,
      skippedRows,
    };
  }
  if (file.size > MAX_SIZE) {
    errors.push(
      `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.`
    );
    return { cards: [], errors, warnings, skippedRows };
  }

  // Đọc file dưới dạng ArrayBuffer để detect BOM và encoding
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Detect và strip UTF-8 BOM (EF BB BF) — Excel thêm BOM khi export CSV
  let csvText: string;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    // BOM detected — strip it
    csvText = new TextDecoder('utf-8').decode(bytes.slice(3));
    warnings.push(
      'Phát hiện UTF-8 BOM (thường do Excel tạo ra) — đã tự động xử lý.'
    );
  } else {
    try {
      csvText = new TextDecoder('utf-8').decode(bytes);
    } catch {
      // Fallback sang windows-1252 cho file cũ
      csvText = new TextDecoder('windows-1252').decode(bytes);
      warnings.push('File không phải UTF-8, đã fallback sang Windows-1252 encoding.');
    }
  }

  // Normalize line endings (Windows CRLF, old Mac CR → LF)
  csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Detect delimiter: comma hoặc semicolon (Excel ở locale châu Âu dùng semicolon)
  const firstLine = csvText.split('\n')[0] ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const tabCount = (firstLine.match(/\t/g) ?? []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    delimiter = ';';
    warnings.push(
      'Phát hiện file dùng dấu chấm phẩy (;) làm separator — thường gặp ở Excel tiếng Việt/châu Âu.'
    );
  } else if (tabCount > commaCount && tabCount >= semicolonCount) {
    delimiter = '\t';
    warnings.push('Phát hiện file dùng Tab làm separator.');
  }

  // Parse với PapaParse
  const result = Papa.parse<string[]>(csvText, {
    delimiter,
    skipEmptyLines: 'greedy',
    header: false,
    transform: (value: string) => value.trim(),
  });

  if (result.errors.length > 0) {
    result.errors.forEach((e) => {
      warnings.push(`Dòng ${e.row ?? '?'}: ${e.message}`);
    });
  }

  const raw = result.data as string[][];
  if (raw.length === 0) {
    return {
      cards: [],
      errors: ['File không có dữ liệu.'],
      warnings,
      skippedRows,
    };
  }

  // Detect và skip header row
  const headerKeywords = [
    'term',
    'word',
    'front',
    'question',
    'definition',
    'meaning',
    'back',
    'answer',
    'từ',
    'nghĩa',
  ];
  const firstRow = raw[0].map((c) => c.toLowerCase());
  const looksLikeHeader = firstRow.some((cell) =>
    headerKeywords.includes(cell)
  );
  const startIdx = looksLikeHeader ? 1 : 0;
  if (looksLikeHeader) {
    warnings.push('Đã tự động bỏ qua hàng header.');
  }

  const cards: Array<{ term: string; definition: string }> = [];

  for (let i = startIdx; i < raw.length; i++) {
    const row = raw[i];
    const lineNum = i + 1;

    // Skip dòng chỉ có 1 cột trống
    if (!row || row.length === 0 || (row.length === 1 && !row[0])) {
      skippedRows++;
      continue;
    }

    // Check số cột
    if (row.length < 2) {
      warnings.push(
        `Dòng ${lineNum}: chỉ có ${row.length} cột — bỏ qua. (Kiểm tra delimiter)`
      );
      skippedRows++;
      continue;
    }

    if (row.length > 2) {
      warnings.push(`Dòng ${lineNum}: có ${row.length} cột, chỉ dùng 2 cột đầu.`);
    }

    const term = row[0]?.trim() ?? '';
    const definition = row[1]?.trim() ?? '';

    // Skip dòng có term hoặc definition rỗng
    if (!term || !definition) {
      warnings.push(
        `Dòng ${lineNum}: ${!term ? 'term' : 'definition'} bị rỗng — bỏ qua.`
      );
      skippedRows++;
      continue;
    }

    // Giới hạn độ dài
    if (term.length > 500) {
      warnings.push(
        `Dòng ${lineNum}: term quá dài (${term.length} ký tự), cắt tại 500.`
      );
    }
    if (definition.length > 2000) {
      warnings.push(
        `Dòng ${lineNum}: definition quá dài (${definition.length} ký tự), cắt tại 2000.`
      );
    }

    cards.push({
      term: term.slice(0, 500),
      definition: definition.slice(0, 2000),
    });
  }

  if (cards.length === 1) {
    warnings.push(
      'Chỉ có 1 thẻ hợp lệ. Cần ít nhất 2 thẻ để học theo chế độ trắc nghiệm.'
    );
  }

  if (cards.length === 0 && errors.length === 0) {
    errors.push('Không tìm thấy thẻ hợp lệ nào sau khi xử lý file.');
  }

  return { cards, errors, warnings, skippedRows };
}
