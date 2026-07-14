# Vocab Master 🧠

> Ứng dụng học từ vựng thông minh — Clone Quizlet với thuật toán SM-2, hoàn toàn miễn phí và chạy 100% client-side.

## 🚀 Chạy nhanh

```bash
# Vào thư mục dự án
cd vocab-master

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở trình duyệt tại **http://localhost:3000**

## 📦 Build & Deploy Vercel

```bash
npm run build
# Sau đó push lên GitHub và connect với Vercel
```

## 📚 Tính năng

| Tính năng | Mô tả |
|---|---|
| **Flashcard** | Lật thẻ 3D, đánh giá tự thân, phím tắt Space/Arrow |
| **Learn Mode** | Trắc nghiệm + Gõ tay, thuật toán SM-2 |
| **Match Game** | Nối từ với nghĩa, đua thời gian |
| **Gravity Game** | Từ rơi xuống, gõ nhanh trước khi chạm đất |
| **Spaced Repetition** | Ôn tập theo lịch với thuật toán SM-2 |
| **Import CSV** | Kéo thả file CSV, tự động xử lý BOM, encoding |
| **Dark Mode** | Chuyển đổi dark/light |
| **Offline** | Dữ liệu lưu trên localStorage |

## 📄 Định dạng CSV

```csv
term,definition
apple,quả táo
book,quyển sách
```

- Cột 1: Từ/Term
- Cột 2: Nghĩa/Definition
- Hỗ trợ: `,` `;` `Tab` làm delimiter
- Hỗ trợ: UTF-8, UTF-8 BOM (Excel), Windows-1252

## 🛠 Tech Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Zustand** (state + localStorage)
- **PapaParse** (CSV parser)
- **Framer Motion** (animations)
- **next-themes** (dark mode)
