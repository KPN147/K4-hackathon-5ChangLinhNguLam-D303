/*
 * Hợp đồng dữ liệu giữa Dataflow (trích xuất offline) và UI.
 *
 * Theo spec.md §4: bộ slide Day 1 / Day 2 được NẠP SẴN dưới dạng text + ảnh.
 * Không parse PDF lúc chạy, không cho upload file bất kỳ (non-goal #1).
 */

/* ---------------------------------------------------------------- *
 * 1. Đầu ra của Dataflow — sinh offline, commit vào repo dưới dạng JSON
 * ---------------------------------------------------------------- */

/** Tín hiệu thô của một trang. Giữ nguyên để sau đặt ngưỡng mà không phải trích lại. */
export type SlidePageMeta = {
  /** Số ký tự sau khi lọc watermark. */
  charCount: number;
  /** Số ảnh nhúng trong trang — trang nhiều ảnh ít chữ là ứng viên "thiên sơ đồ". */
  imageCount: number;
  /** charCount / diện tích trang × 1000. Dùng để so mật độ chữ giữa các trang. */
  textDensity: number;
};

/** Một token chữ với toạ độ chuẩn hoá theo kích thước trang PDF (0..1). */
export type SlideTextSpan = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Một trang slide sau khi trích xuất. */
export type SlidePage = {
  /** Số trang VẬT LÝ trong PDF, 1-based. Không dùng số in ở footer slide. */
  page: number;
  /** Text layer đã trích, đã lọc watermark và gộp dòng. */
  text: string;
  /** false = không đủ chữ để tóm tắt → UI đi đường low-confidence (spec §6, HAX G10). */
  hasText: boolean;
  meta: SlidePageMeta;
  /** Text layer dùng để bôi đen đúng vị trí trên ảnh slide. Sinh offline từ PDF gốc. */
  textSpans?: SlideTextSpan[];
};

/**
 * Đơn vị đưa vào bước Map của Map-Reduce.
 * Hiện cấu hình 1 chunk = 1 trang để trích dẫn [Slide XX] chính xác tuyệt đối,
 * nhưng cấu trúc cho phép gộp nhiều trang mà không phải đổi hợp đồng.
 */
export type SlideChunk = {
  chunkId: string;
  /** Các trang nằm trong chunk, 1-based. */
  pages: number[];
  text: string;
};

/** Một bộ slide đã nạp sẵn. */
export type SlideDeck = {
  /** "day01" | "day02" */
  deckId: string;
  /** Tên hiển thị, vd "Day 1 — AI & LLM Foundation". */
  title: string;
  totalPages: number;
  /** Thư mục ảnh trong public/, vd "/slides/day01" → "/slides/day01/p07.png". */
  imageBasePath: string;
  pages: SlidePage[];
  chunks: SlideChunk[];
  extraction: ExtractionInfo;
};

/** Dấu vết của lần trích xuất — để kiểm lại và để giải thích ở CP5. */
export type ExtractionInfo = {
  sourceFile: string;
  extractedAt: string;
  tool: string;
  /** Chuỗi ghép từ các ký tự bị loại, vd "HACKATHON - AI IN ACTION". */
  removedRepeatedText: string;
  removedSlotCount: number;
  chunkStrategy: string;
};

/* ---------------------------------------------------------------- *
 * 2. Đầu ra của Agent flow — JSON mà Gemini trả về sau Map-Reduce
 * ---------------------------------------------------------------- */

/** Một ý trong bản tóm tắt. */
export type SummaryPoint = {
  id: string;
  /** Nội dung một ý, tiếng Việt. Giữ nguyên thuật ngữ tiếng Anh (spec §5, lớp ④). */
  text: string;
  /**
   * Trang nguồn, 1-based. Nhiều trang là hợp lệ — bước Reduce hay gộp ý từ vài trang.
   * Mảng rỗng = không định vị được nguồn → UI đẩy ý này xuống `unclassified`.
   */
  pages: number[];
  confidence: "high" | "low";
};

/** Một mục lớn, tương ứng "Chương 1, Chương 2..." trong spec §8 phương án 2. */
export type SummarySection = {
  id: string;
  heading: string;
  points: SummaryPoint[];
};

/** Bản tóm tắt hoàn chỉnh của một bộ slide. */
export type DeckSummary = {
  deckId: string;
  sections: SummarySection[];
  /** HAX G10 — ý không gắn được vào mục nào, hiện nhãn "Chưa phân loại" kèm link slide. */
  unclassified: SummaryPoint[];
  /** Trang có hasText=false, bị bỏ qua. UI hiện thông báo lớp ① thay vì đoán. */
  skippedPages: number[];
  generatedAt: string;
  /** Model đã gọi, vd "gemini-3-flash". Giữ cho R5 — bằng chứng AI chạy thật. */
  model: string;
};

/* ---------------------------------------------------------------- *
 * 3. Trạng thái UI — mã hoá đúng 4 đường đi trải nghiệm của spec §6
 * ---------------------------------------------------------------- */

export type SummaryState =
  | { status: "idle" }
  | { status: "loading"; stage: string }
  /** Happy path. */
  | { status: "ready"; summary: DeckSummary }
  /** Low-confidence — có kết quả nhưng thiếu trang / độ tin cậy thấp. */
  | { status: "partial"; summary: DeckSummary; note: string }
  /** Failure — lỗi API, không có text, hoặc user đòi ngoài phạm vi (lớp ③). */
  | { status: "error"; reason: "api" | "no-text" | "out-of-scope"; message: string };

/** Correction path (spec §6) — user bấm "Báo lỗi tóm tắt" trên một ý cụ thể. */
export type SummaryFeedback = {
  pointId: string;
  verdict: "wrong-content" | "wrong-page";
  note: string;
  at: string;
};
