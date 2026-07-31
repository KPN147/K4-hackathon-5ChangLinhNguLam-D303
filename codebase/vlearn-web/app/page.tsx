
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent, PointerEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowsOutSimple,
  BookOpen,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  CircleNotch,
  CloudArrowUp,
  DownloadSimple,
  DotsThree,
  FilePdf,
  FilePpt,
  FileText,
  Highlighter,
  Info,
  ListChecks,
  Moon,
  NotePencil,
  Pen,
  ChatText,
  Plus,
  Robot,
  Rows,
  Sparkle,
  Sun,
  UploadSimple,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import type { DeckSummary, SlideDeck, SummaryState } from "../lib/types";
import { PRELOADED_DECKS } from "../lib/preloaded-decks";

type Screen = "course" | "workspace";
type ItemKind = "document" | "summary";
type PipelineStatus = "ready" | "processing" | "review" | "approved" | "error";
type SummaryMode = "balanced" | "deep" | "review";
type SummaryRequest = (mode: SummaryMode, regenerate?: boolean) => void;

const SUMMARY_MODES: Array<{ value: SummaryMode; label: string; description: string }> = [
  { value: "balanced", label: "Cân bằng", description: "Ý chính + giải thích vừa đủ" },
  { value: "deep", label: "Hiểu sâu", description: "Cơ chế, ví dụ và giới hạn" },
  { value: "review", label: "Ôn tập", description: "Định nghĩa, phân biệt và điểm nhớ" },
];

type DocumentRecord = {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  file?: File;
  status: PipelineStatus;
  stage: string;
  progress: number;
  chunks: string[];
  extractedText: string;
  summaryDraft: string;
  summaryNote: string;
  slideReviewNote: string;
  slideChecked: boolean;
  summaryApproved: boolean;
  deck: SlideDeck;
  summary: DeckSummary | null;
  summaryState: SummaryState;
  retrievalChunks: Array<{ id: string; text: string; slideFrom: number; slideTo?: number }>;
};

type Day = {
  id: string;
  label: string;
  documents: DocumentRecord[];
  expanded: boolean;
};

type Selection = {
  dayId: string;
  docId: string;
  kind: ItemKind;
};

type TextSelectionContext = {
  text: string;
  slideFrom: number;
  slideTo?: number;
  rect: { top: number; left: number; width: number; height: number };
};

function cleanSelectedSpanText(tokens: string[], watermark: string) {
  const markers = [watermark, "NOHTAKCAH-NOITCANIIA"].filter(Boolean).map((marker) => Array.from(marker));
  let remaining = tokens.map((token) => token.trim()).filter(Boolean);
  for (const marker of markers) {
    for (let index = 0; index <= remaining.length - marker.length; index += 1) {
      if (remaining.slice(index, index + marker.length).join("") === marker.join("")) {
        remaining.splice(index, marker.length);
        index -= 1;
      }
    }
  }
  return remaining.join(" ")
    .replace(/\s+([,.;:!?%)\]}])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type ChatSource = {
  label: string;
  slideFrom?: number;
  slideTo?: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: ChatSource[];
};

const DAY_COUNT = 2;
const PRELOADED_DECK_LIST = Object.values(PRELOADED_DECKS);

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createDays(): Day[] {
  return PRELOADED_DECK_LIST.map((deck, index) => {
    const dayNumber = String(index + 1).padStart(2, "0");
    const document: DocumentRecord = {
      id: deck.deckId,
      fileName: deck.extraction.sourceFile,
      fileSize: 0,
      fileType: "Slide được nạp sẵn",
      status: "ready",
      stage: "Sẵn sàng học",
      progress: 100,
      chunks: deck.chunks.map((chunk) => chunk.text),
      extractedText: deck.pages.map((page) => page.text).join("\n\n"),
      summaryDraft: "",
      summaryNote: "",
      slideReviewNote: "",
      slideChecked: false,
      summaryApproved: false,
      deck,
      summary: null,
      summaryState: { status: "idle" },
      retrievalChunks: deck.chunks.flatMap((chunk) => chunk.pages.map((page) => ({ id: chunk.chunkId + "-" + page, text: chunk.text, slideFrom: page }))),
    };
    return { id: "day-" + dayNumber, label: "Day" + dayNumber, documents: [document], expanded: index === 0 };
  });
}

function createId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatBytes(bytes: number) {
  if (!bytes) return "N\u1ea1p s\u1eb5n";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function chunkText(source: string) {
  const paragraphs = source.split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    for (let offset = 0; offset < paragraph.length; offset += 700) chunks.push(paragraph.slice(offset, offset + 700));
  }
  return chunks;
}

async function readTextLayer(file: File) {
  if (!/\.(txt|md)$/i.test(file.name)) return "";
  return (await file.text()).slice(0, 100_000);
}

function FileKindIcon({ fileName, size = 21 }: { fileName: string; size?: number }) {
  if (/\.pdf$/i.test(fileName)) return <FilePdf size={size} weight="duotone" />;
  if (/\.pptx?$/i.test(fileName)) return <FilePpt size={size} weight="duotone" />;
  return <FileText size={size} weight="duotone" />;
}

function statusLabel(document: DocumentRecord) {
  if (document.status === "ready") return "S\u1eb5n s\u00e0ng";
  if (document.status === "processing") return document.stage;
  if (document.status === "approved") return "Đã lưu";
  if (document.status === "error") return "Cần kiểm tra";
  return "Chờ review";
}

function MainHeader({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
  return (
    <header className="main-topbar">
      <span className="brand" aria-label="VLearn">
        <span className="brand-mark"><BookOpen size={19} weight="bold" /></span><span>VLearn</span>
      </span>
      <nav className="main-nav" aria-label="Điều hướng chính">
        <span className="main-nav-item is-active"><BookOpen size={18} weight="bold" /> Khóa học của tôi</span>
      </nav>
      <div className="main-topbar-actions">
        <span className="locale-button">VI</span><button className="icon-button" onClick={onToggleDark} aria-label={darkMode ? "Chế độ sáng" : "Chế độ tối"}>{darkMode ? <Sun size={19} weight="bold" /> : <Moon size={19} />}</button><span className="avatar"><UserCircle size={22} weight="fill" /></span>
      </div>
    </header>
  );
}

function CourseScreen({ days, onToggleDay, onOpen }: { days: Day[]; onToggleDay: (dayId: string) => void; onOpen: (selection: Selection) => void }) {
  const populatedDays = days.filter((day) => day.documents.length > 0).length;
  return (
    <main className="course-page">
      <section className="course-heading">
        <div><p className="eyebrow">VLEARN · KHÓA HỌC CỦA TÔI</p><h1>Khóa học của tôi</h1><p>Chọn một Day để mở học liệu và học cùng Tutor.</p></div>
        <div className="reading-progress"><CheckCircle size={18} weight="fill" /><span>Đã đọc {populatedDays}/{DAY_COUNT} day</span><i /><strong>{populatedDays ? "100%" : "0%"}</strong></div>
      </section>
      <section className="course-days">
        <div className="section-intro"><div><p className="eyebrow">LỘ TRÌNH HỌC TẬP</p><h2>Chọn Day để bắt đầu</h2></div><span className="quiet-count">{DAY_COUNT} Day</span></div>
        <div className="day-list">{days.map((day) => <CourseDay key={day.id} day={day} onToggle={() => onToggleDay(day.id)} onOpen={onOpen} />)}</div>
      </section>
    </main>
  );
}

function CourseDay({ day, onToggle, onOpen }: { day: Day; onToggle: () => void; onOpen: (selection: Selection) => void }) {
  return (
    <section className={cn("course-day", day.expanded && "is-expanded")}>
      <button className="course-day-head" onClick={onToggle} aria-expanded={day.expanded}>
        <span className="day-number"><small>DAY</small><strong>{day.label.slice(-2)}</strong></span>
        <span className="day-heading-copy"><strong>{day.label}</strong><small>{day.documents.length ? day.documents.length + " tài liệu" : "Chưa có tài liệu"}</small></span>
        <CaretDown className="day-caret" size={20} />
      </button>
      {day.expanded && <div className="course-day-content">{day.documents.map((document) => <div className="course-doc-row" key={document.id}><button className="course-summary-link" onClick={() => onOpen({ dayId: day.id, docId: document.id, kind: "summary" })}><Sparkle size={16} weight="fill" /><span><strong>Học với Summary</strong><small>{document.summaryState.status === "ready" ? "Bản tóm tắt đã sẵn sàng" : "Tóm tắt có citation slide"}</small></span><ArrowRight size={16} /></button><button onClick={() => onOpen({ dayId: day.id, docId: document.id, kind: "document" })}><FileKindIcon fileName={document.fileName} /><span><strong>Xem toàn bộ slide</strong><small>{document.deck.totalPages} slides · {statusLabel(document)}</small></span><ArrowRight size={18} /></button></div>)}</div>}
    </section>
  );
}

const PRELOADED_COPY = {
  library: "Th\u01b0 vi\u1ec7n",
  kicker: "VLEARN \u00b7 H\u1eccC LI\u1ec6U N\u1ea0P S\u1eb4N",
  title: "B\u00e0i gi\u1ea3ng Day 1 & Day 2",
  description: "Ch\u1ecdn m\u1ed9t Day \u0111\u1ec3 xem slide, t\u00f3m t\u1eaft v\u00e0 h\u1ecfi Tutor.",
  loaded: "D\u1eef li\u1ec7u \u0111\u00e3 \u0111\u01b0\u1ee3c n\u1ea1p s\u1eb5n cho demo",
  open: "M\u1edf h\u1ecdc li\u1ec7u",
  summary: "T\u00f3m t\u1eaft",
};
const UNCLASSIFIED_COPY = "Ch\u01b0a ph\u00e2n lo\u1ea1i";
const SKIPPED_COPY = "Kh\u00f4ng c\u00f3 text \u0111\u1ecdc \u0111\u01b0\u1ee3c \u1edf: ";
const CLIENT_FALLBACK_MESSAGE = "Hi\u1ec7n t\u1ea1i ch\u1ee9c n\u0103ng h\u1ecfi \u0111\u00e1p \u0111ang g\u1eb7p s\u1ef1 c\u1ed1, mong b\u1ea1n th\u1eed l\u1ea1i sau .";
const SUMMARY_CACHE_VERSION = "v2";

type CachedSummary = { summary: DeckSummary; partial: boolean };

function summaryCacheKey(deckId: string, mode: SummaryMode) {
  return `vlearn:summary:${SUMMARY_CACHE_VERSION}:${mode}:${deckId}`;
}

function readCachedSummary(deckId: string, mode: SummaryMode): CachedSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(summaryCacheKey(deckId, mode)) || "null") as Partial<CachedSummary> | null;
    return parsed?.summary?.deckId === deckId && Array.isArray(parsed.summary.sections) ? { summary: parsed.summary as DeckSummary, partial: parsed.partial === true } : null;
  } catch {
    return null;
  }
}

function writeCachedSummary(deckId: string, mode: SummaryMode, value: CachedSummary) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(summaryCacheKey(deckId, mode), JSON.stringify(value)); } catch { /* Storage may be unavailable in private mode. */ }
}

function summaryStateFromCache(cache: CachedSummary): SummaryState {
  return cache.partial ? { status: "partial", summary: cache.summary, note: "Một số slide có độ tin cậy thấp." } : { status: "ready", summary: cache.summary };
}

function dispatchSummaryRequest(documentId: string, mode: SummaryMode, regenerate = false) {
  window.dispatchEvent(new CustomEvent("vlearn-generate-summary", { detail: { documentId, mode, regenerate } }));
}

function PreloadedLibraryScreen({ days, onToggleDay, onOpenWorkspace }: { days: Day[]; onToggleDay: (dayId: string) => void; onOpenWorkspace: (selection: Selection) => void }) {
  const documentCount = days.reduce((total, day) => total + day.documents.length, 0);
  return (
    <main className="library-page">
      <section className="library-hero">
        <div><p className="eyebrow">{PRELOADED_COPY.kicker}</p><h1>{PRELOADED_COPY.library}</h1><p>{PRELOADED_COPY.description}</p></div>
        <span className="status-badge is-approved">{PRELOADED_COPY.loaded}</span>
      </section>
      <section className="library-body">
        <div className="library-toolbar"><div><p className="eyebrow">L\u1ed8 TR\u00ccNH H\u1eccC T\u1eacP</p><h2>{documentCount} t\u00e0i li\u1ec7u \u0111\u00e3 n\u1ea1p</h2></div><span className="library-summary-meta">Ch\u1ec9 hi\u1ec3n th\u1ecb Day 1 v\u00e0 Day 2</span></div>
        <div className="library-day-list">
          {days.map((day) => (
            <section className={cn("library-day", day.expanded && "is-expanded")} key={day.id}>
              <button className="library-day-head" onClick={() => onToggleDay(day.id)} aria-expanded={day.expanded}>
                <span className="day-number"><small>DAY</small><strong>{day.label.slice(-2)}</strong></span>
                <span><strong>{day.label}</strong><small>{day.documents.length} t\u00e0i li\u1ec7u</small></span><CaretDown className="day-caret" size={20} />
              </button>
              {day.expanded && <div className="library-day-content">{day.documents.map((document) => <div className="library-document" key={document.id}>
                <button className="library-document-main" onClick={() => onOpenWorkspace({ dayId: day.id, docId: document.id, kind: "document" })}><span className="file-icon"><FileKindIcon fileName={document.fileName} /></span><span><strong>{document.fileName}</strong><small>{document.deck.totalPages} slides \u00b7 {PRELOADED_COPY.loaded}</small></span><ArrowRight size={18} /></button>
                <div className="library-document-actions"><button className="library-document-primary" onClick={() => onOpenWorkspace({ dayId: day.id, docId: document.id, kind: "document" })}>{PRELOADED_COPY.open}</button><button className="library-document-primary" onClick={() => onOpenWorkspace({ dayId: day.id, docId: document.id, kind: "summary" })}>{PRELOADED_COPY.summary}</button></div>
              </div>)}</div>}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

function LibraryScreen({ days, onToggleDay, onUpload, onOpenPipeline, onOpenSlideReview, onOpenSummaryReview, onOpenWorkspace }: {
  days: Day[];
  onToggleDay: (dayId: string) => void;
  onUpload: () => void;
  onOpenPipeline: (document: DocumentRecord) => void;
  onOpenSlideReview: (document: DocumentRecord) => void;
  onOpenSummaryReview: (document: DocumentRecord) => void;
  onOpenWorkspace: (selection: Selection) => void;
}) {
  return <PreloadedLibraryScreen days={days} onToggleDay={onToggleDay} onOpenWorkspace={onOpenWorkspace} />;
  const documentCount = days.reduce((total, day) => total + day.documents.length, 0);
  const reviewCount = days.reduce((total, day) => total + day.documents.filter((document) => document.status === "review").length, 0);
  const populatedDays = days.filter((day) => day.documents.length > 0);
  const emptyDayCount = days.length - populatedDays.length;
  return (
    <main className="library-page">
      <section className="library-hero"><div><p className="eyebrow">VLEARN · QUẢN LÝ HỌC LIỆU</p><h1>Thư viện</h1><p>Tải tài liệu lên, theo dõi pipeline và hoàn tất review trước khi đưa Summary vào học tập.</p></div><button className="primary-button" onClick={onUpload}><Plus size={18} weight="bold" /> Thêm tài liệu</button></section>
      <section className="library-body">
        <div className="library-toolbar"><div><p className="eyebrow">TÀI LIỆU THEO DAY</p><h2>{documentCount ? documentCount + " tài liệu đã thêm" : "Chưa có tài liệu"}</h2></div><div className="library-summary-meta"><span>{reviewCount} cần review</span><span>{populatedDays.length}/{days.length} Day có tài liệu</span></div></div>
        {populatedDays.length > 0 ? <div className="library-day-list">{populatedDays.map((day) => <LibraryDay key={day.id} day={day} onToggle={() => onToggleDay(day.id)} onOpenPipeline={onOpenPipeline} onOpenSlideReview={onOpenSlideReview} onOpenSummaryReview={onOpenSummaryReview} onOpenWorkspace={onOpenWorkspace} />)}</div> : <div className="library-empty-state"><CloudArrowUp size={26} /><strong>Chưa có tài liệu trong thư viện</strong><span>Chọn một Day và tải tài liệu lên để bắt đầu pipeline.</span><button className="secondary-button" onClick={onUpload}><Plus size={16} /> Thêm tài liệu</button></div>}
        {emptyDayCount > 0 && populatedDays.length > 0 && <div className="library-empty-days"><span><strong>{emptyDayCount} Day</strong> chưa có tài liệu</span><small>Day trống được ẩn để thư viện tập trung vào nội dung đang xử lý.</small></div>}
      </section>
    </main>
  );
}

function LibraryDay({ day, onToggle, onOpenPipeline, onOpenSlideReview, onOpenSummaryReview, onOpenWorkspace }: { day: Day; onToggle: () => void; onOpenPipeline: (document: DocumentRecord) => void; onOpenSlideReview: (document: DocumentRecord) => void; onOpenSummaryReview: (document: DocumentRecord) => void; onOpenWorkspace: (selection: Selection) => void }) {
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  return (
    <section className={cn("library-day", day.expanded && "is-expanded")}>
      <button className="library-day-head" onClick={onToggle} aria-expanded={day.expanded}><span className="day-number"><small>DAY</small><strong>{day.label.slice(-2)}</strong></span><span><strong>{day.label}</strong><small>{day.documents.length ? day.documents.length + " tài liệu" : "Chưa có tài liệu"}</small></span><CaretDown className="day-caret" size={20} /></button>
      {day.expanded && <div className="library-day-content">{day.documents.map((document) => <div className="library-document" key={document.id}><button className="library-document-main" onClick={() => onOpenPipeline(document)}><span className="file-icon"><FileKindIcon fileName={document.fileName} /></span><span><strong>{document.fileName}</strong><small>{formatBytes(document.fileSize)} · {document.fileType || "Tài liệu"}</small></span><span className={cn("document-status", "status-" + document.status)}>{statusLabel(document)}</span><ArrowRight size={18} /></button><div className="library-document-actions"><button className="library-document-primary" onClick={() => document.status === "processing" ? onOpenPipeline(document) : document.status === "review" ? onOpenSummaryReview(document) : onOpenWorkspace({ dayId: day.id, docId: document.id, kind: "document" })}>{document.status === "processing" ? "Xem pipeline" : document.status === "review" ? "Review" : "Mở học"}</button><button className="library-menu-button" onClick={() => setOpenDocumentId((current) => current === document.id ? null : document.id)} aria-label="Mở thêm thao tác"><DotsThree size={18} weight="bold" /></button>{openDocumentId === document.id && <div className="library-document-menu"><button onClick={() => onOpenWorkspace({ dayId: day.id, docId: document.id, kind: "document" })}><BookOpen size={15} /> Mở học</button><button onClick={() => onOpenSlideReview(document)}><FileText size={15} /> Review slide</button><button onClick={() => onOpenSummaryReview(document)}><Sparkle size={15} weight="fill" /> Review summary</button><button onClick={() => onOpenPipeline(document)}><ListChecks size={15} /> Xem pipeline</button></div>}</div></div>)}</div>}
    </section>
  );
}

function UploadPipelineScreen({ days, file, dayId, error, onBack, onFile, onDayChange, onSubmit }: { days: Day[]; file: File | null; dayId: string; error: string; onBack: () => void; onFile: (file: File | null) => void; onDayChange: (dayId: string) => void; onSubmit: () => void }) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    onFile(event.target.files?.[0] ?? null);
  }
  return (
    <main className="flow-page"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Thư viện</button><section className="flow-heading"><div><p className="eyebrow">THƯ VIỆN · DOCUMENT PIPELINE</p><h1>Thêm tài liệu</h1><p>Chọn Day, tải file lên và theo dõi toàn bộ pipeline trước khi review.</p></div><span className="flow-step">01 · Upload & pipeline</span></section><section className="upload-flow-grid"><div className="panel upload-form-panel"><div className="panel-kicker"><CloudArrowUp size={20} /> File đầu vào</div><label className="field-label" htmlFor="day-select">Day chứa tài liệu</label><select id="day-select" className="select-input" value={dayId} onChange={(event) => onDayChange(event.target.value)}>{days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select><label className={cn("file-dropzone", file && "has-file")} htmlFor="upload-file-input" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFile(event.dataTransfer.files?.[0] ?? null); }}><CloudArrowUp size={38} weight="duotone" />{file ? <><strong>{file.name}</strong><small>{formatBytes(file.size)} · sẵn sàng chạy pipeline</small></> : <><strong>Kéo file vào đây hoặc chọn file</strong><small>PDF, PPTX · TXT/MD dùng để test retrieval proof</small></>}<input id="upload-file-input" className="sr-only" type="file" accept=".pdf,.pptx,.txt,.md" onChange={handleFile} /></label>{error && <p className="inline-error"><Info size={16} /> {error}</p>}<div className="flow-actions"><button className="quiet-button" onClick={onBack}>Hủy</button><button className="primary-button" onClick={onSubmit} disabled={!file}><UploadSimple size={18} /> Chạy pipeline</button></div></div><PipelinePreview file={file} /></section></main>
  );
}

function PipelinePreview({ file }: { file: File | null }) {
  return <aside className="panel pipeline-preview"><div className="panel-kicker"><ListChecks size={20} /> Các bước xử lý</div><div className="pipeline-preview-list">{["Parse", "OCR", "Chunk", "Index", "Summary draft", "Human review"].map((step, index) => <div className="pipeline-preview-step" key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{file ? "Sẵn sàng" : "Chờ file"}</small></div>)}</div><div className="pipeline-note"><Info size={17} /> Pipeline chỉ tạo draft. Summary chưa được upsert trước khi review.</div></aside>;
}

function PipelineScreen({ document, onBack, onReviewSlide, onReviewSummary }: { document: DocumentRecord; onBack: () => void; onReviewSlide: () => void; onReviewSummary: () => void }) {
  const steps = [{ label: "Parse", threshold: 22 }, { label: "OCR", threshold: 42 }, { label: "Chunk", threshold: 62 }, { label: "Index", threshold: 82 }, { label: "Summary draft", threshold: 100 }];
  return (
    <main className="flow-page"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Thư viện</button><section className="flow-heading"><div><p className="eyebrow">DOCUMENT PIPELINE</p><h1>{document.fileName}</h1><p>Pipeline chạy nền theo Day đã chọn. Bạn có thể mở review sau khi hoàn tất.</p></div><span className={cn("status-badge", document.status === "approved" && "is-approved")}>{statusLabel(document)}</span></section><section className="pipeline-main panel"><div className="pipeline-progress-head"><div><span>Tiến trình xử lý</span><strong>{document.progress}%</strong></div><div className="progress-track"><i style={{ width: document.progress + "%" }} /></div><p><CircleNotch size={16} className={document.status === "processing" ? "spin" : ""} /> {document.stage}</p></div><div className="pipeline-steps">{steps.map((step) => <div className={cn("pipeline-step", document.progress >= step.threshold && "is-done")} key={step.label}><span>{document.progress >= step.threshold ? <Check size={16} weight="bold" /> : step.label.slice(0, 1)}</span><strong>{step.label}</strong></div>)}</div><div className="pipeline-result"><div><p className="eyebrow">NEXT ACTION</p><h2>{document.status === "processing" ? "Bạn có thể rời màn hình này" : "Hoàn tất Human review"}</h2><p>{document.status === "processing" ? "Pipeline vẫn tiếp tục ở trạng thái nền. Quay lại Thư viện để theo dõi." : "Kiểm tra slide và Summary trước khi lưu vào học liệu."}</p></div><div className="flow-actions"><button className="secondary-button" onClick={onReviewSlide} disabled={document.status === "processing"}><FileText size={17} /> Review slide</button><button className="primary-button" onClick={onReviewSummary} disabled={document.status === "processing"}><Sparkle size={17} weight="fill" /> Review summary</button></div></div></section></main>
  );
}

function WorkspaceHeader({ document, onBack, darkMode, onToggleDark }: { document: DocumentRecord | null; onBack: () => void; darkMode: boolean; onToggleDark: () => void }) {
  return <header className="workspace-header"><button className="back-button" onClick={onBack} aria-label="Về khóa học"><ArrowLeft size={19} /></button><button className="workspace-brand" onClick={onBack}><span className="brand-mark"><BookOpen size={18} weight="bold" /></span><strong>VLearn</strong></button><span className="header-divider" /><span className="workspace-file-icon"><FileKindIcon fileName={document?.fileName ?? ""} /></span><div className="workspace-file-copy"><strong>{document?.fileName ?? "Chưa chọn tài liệu"}</strong><small>{document ? formatBytes(document.fileSize) + " · Tài liệu trong Day hiện tại" : "Chọn tài liệu bên trái để bắt đầu"}</small></div><div className="workspace-header-actions"><span className="locale-button">VI</span><button className="icon-button" onClick={onToggleDark} aria-label={darkMode ? "Chế độ sáng" : "Chế độ tối"}>{darkMode ? <Sun size={19} weight="bold" /> : <Moon size={19} />}</button></div></header>;
}

function MaterialsSidebar({ days, selection, onToggleDay, onSelect, collapsed, onCollapse }: { days: Day[]; selection: Selection | null; onToggleDay: (dayId: string) => void; onSelect: (selection: Selection) => void; collapsed: boolean; onCollapse: () => void }) {
  if (collapsed) return <aside className="materials-sidebar materials-collapsed"><button className="collapsed-rail-button" onClick={onCollapse} aria-label="Mở Học liệu môn học"><CaretRight size={18} /><BookOpen size={17} /></button></aside>;
  return <aside className="materials-sidebar"><div className="materials-head"><span className="materials-icon"><BookOpen size={19} /></span><div><strong>Học liệu môn học</strong><small>Chương, slide và tài liệu đã upload</small></div><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn Học liệu"><CaretLeft size={17} /></button></div><div className="materials-list">{days.map((day) => <section className={cn("material-day", day.expanded && "is-expanded")} key={day.id}><button className="material-day-head" onClick={() => onToggleDay(day.id)}><span className="material-day-icon"><CaretRight size={15} /></span><span><strong>{day.label}</strong><small>{day.documents.length ? day.documents.length + " tài liệu" : "Chưa có tài liệu"}</small></span><CaretDown className="material-day-caret" size={16} /></button>{day.expanded && day.documents.length > 0 && <div className="material-items">{day.documents.map((document) => <div className="material-document-block" key={document.id}><button className={cn("material-item", selection?.docId === document.id && selection.kind === "document" && "is-selected")} onClick={() => onSelect({ dayId: day.id, docId: document.id, kind: "document" })}><span className="material-item-icon"><FileKindIcon fileName={document.fileName} size={18} /></span><span><strong>{document.fileName}</strong><small>{formatBytes(document.fileSize)}</small></span><CheckCircle size={15} weight="fill" className="material-check" /></button><button className={cn("material-item", "material-summary-item", selection?.docId === document.id && selection.kind === "summary" && "is-selected")} onClick={() => onSelect({ dayId: day.id, docId: document.id, kind: "summary" })}><span className="material-item-icon"><Sparkle size={16} weight="fill" /></span><span><strong>Summary</strong><small>{document.summaryApproved ? "Đã lưu" : "Chờ review"}</small></span><ArrowRight size={14} /></button></div>)}</div>}</section>)}</div></aside>;
}

function PdfCanvasPreview({ file, page, onPageCount }: { file?: File; page: number; onPageCount?: (count: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  useEffect(() => {
    let active = true;
    let loadingTask: { destroy: () => Promise<void>; promise: Promise<any> } | null = null;
    async function renderPage() {
      if (!file || !/\.pdf$/i.test(file.name)) { setStatus("idle"); return; }
      setStatus("loading");
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const pdf = await loadingTask.promise;
        if (!active) return;
        onPageCount?.(pdf.numPages);
        const safePage = Math.min(Math.max(1, page), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        if (!canvas || !active) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        const deviceScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * deviceScale);
        canvas.height = Math.floor(viewport.height * deviceScale);
        canvas.style.width = viewport.width + "px";
        canvas.style.height = viewport.height + "px";
        context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
        if (active) setStatus("idle");
      } catch {
        if (active) setStatus("error");
      }
    }
    void renderPage();
    return () => {
      active = false;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [file, page, onPageCount]);
  if (!file || !/\.pdf$/i.test(file.name)) return <div className="file-preview-empty"><FileKindIcon fileName={file?.name ?? ""} size={54} /><strong>{file?.name ?? "Chưa có tài liệu"}</strong><p>{file ? "Preview PPTX sẽ dùng slide artifact từ document pipeline." : "Chọn tài liệu ở cột Học liệu để xem nội dung."}</p></div>;
  return <div className="pdf-canvas-shell">{status === "loading" && <div className="pdf-loading"><CircleNotch size={22} className="spin" /> Đang render trang {page}</div>}{status === "error" && <div className="file-preview-empty"><FilePdf size={54} /><strong>Không render được PDF</strong><p>Hãy kiểm tra lại file hoặc parser artifact.</p></div>}<canvas ref={canvasRef} className={cn("pdf-canvas", status !== "idle" && "is-loading")} aria-label={`Trang ${page} của ${file.name}`} /></div>;
}

function PdfPreview({ file, page = 1, onPageCount }: { file?: File; page?: number; onPageCount?: (count: number) => void }) {
  return <PdfCanvasPreview file={file} page={page} onPageCount={onPageCount} />;
}

/* All-pages scrollable PDF with text layer for selection */
function PdfAllPagesPreview({ file, onPageCount, onTextSelect, pageRefs, activeSlide }: { file?: File; onPageCount?: (count: number) => void; onTextSelect?: (selection: TextSelectionContext) => void; pageRefs: React.MutableRefObject<Map<number, HTMLElement>>; activeSlide?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [pages, setPages] = useState<number>(0);

  useEffect(() => {
    let active = true;
    let loadingTask: { destroy: () => Promise<void>; promise: Promise<any> } | null = null;
    async function renderAllPages() {
      if (!file || !/\.pdf$/i.test(file.name)) { setStatus("idle"); setPages(0); return; }
      setStatus("loading");
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        const pdf = await loadingTask.promise;
        if (!active) return;
        const numPages = pdf.numPages;
        onPageCount?.(numPages);
        const container = containerRef.current;
        if (!container) return;
        container.replaceChildren();
        pageRefs.current.clear();
        const deviceScale = window.devicePixelRatio || 1;
        for (let i = 1; i <= numPages; i++) {
          if (!active) return;
          const pdfPage = await pdf.getPage(i);
          const viewport = pdfPage.getViewport({ scale: 1.2 });
          /* Page wrapper */
          const pageWrapper = window.document.createElement("div");
          pageWrapper.className = "pdf-all-page-wrapper";
          pageWrapper.setAttribute("data-page", String(i));
          pageRefs.current.set(i, pageWrapper);
          /* Page label */
          const pageLabel = window.document.createElement("div");
          pageLabel.className = "pdf-page-label";
          pageLabel.textContent = "Trang " + i;
          pageWrapper.appendChild(pageLabel);
          /* Canvas + text layer container */
          const canvasContainer = window.document.createElement("div");
          canvasContainer.className = "pdf-page-canvas-container";
          canvasContainer.style.width = viewport.width + "px";
          canvasContainer.style.height = viewport.height + "px";
          canvasContainer.style.position = "relative";
          /* Canvas */
          const canvas = window.document.createElement("canvas");
          canvas.className = "pdf-canvas";
          canvas.width = Math.floor(viewport.width * deviceScale);
          canvas.height = Math.floor(viewport.height * deviceScale);
          canvas.style.width = viewport.width + "px";
          canvas.style.height = viewport.height + "px";
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
            await pdfPage.render({ canvas, canvasContext: ctx, viewport }).promise;
          }
          if (!active) return;
          canvasContainer.appendChild(canvas);
          /* Text layer for selection */
          try {
            const textContent = await pdfPage.getTextContent();
            const textLayerDiv = window.document.createElement("div");
            textLayerDiv.className = "pdf-text-layer";
            textLayerDiv.style.width = viewport.width + "px";
            textLayerDiv.style.height = viewport.height + "px";
            const textLayer = new pdfjs.TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport });
            await textLayer.render();
            if (!active) return;
            canvasContainer.appendChild(textLayerDiv);
          } catch { /* text layer optional */ }
          if (!active) return;
          pageWrapper.appendChild(canvasContainer);
          container.appendChild(pageWrapper);
        }
        if (active) { setPages(numPages); setStatus("idle"); }
      } catch {
        if (active) setStatus("error");
      }
    }
    void renderAllPages();
    return () => {
      active = false;
      containerRef.current?.replaceChildren();
      pageRefs.current.clear();
      if (loadingTask) void loadingTask.destroy();
    };
  }, [file, onPageCount, pageRefs]);

  useEffect(() => {
    for (const [page, element] of pageRefs.current) element.classList.toggle("is-selection-target", page === activeSlide);
  }, [activeSlide, pages, pageRefs]);

  /* Listen for text selection and resolve the actual page from the selection range. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onTextSelect) return;
    function handleMouseUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!sel || !text || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const pageFromNode = (node: Node | null) => {
        const element = node instanceof Element ? node : node?.parentElement;
        const page = element?.closest<HTMLElement>("[data-page]")?.dataset.page;
        return page ? Number(page) : 0;
      };
      const startPage = pageFromNode(range.startContainer);
      const endPage = pageFromNode(range.endContainer);
      if (!startPage || !endPage) return;
      const rect = range.getBoundingClientRect();
      onTextSelect!({
        text,
        slideFrom: Math.min(startPage, endPage),
        slideTo: startPage === endPage ? undefined : Math.max(startPage, endPage),
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      });
    }
    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [onTextSelect]);

  if (!file || !/\.pdf$/i.test(file.name)) return <div className="file-preview-empty"><FileKindIcon fileName={file?.name ?? ""} size={54} /><strong>{file?.name ?? "Chưa có tài liệu"}</strong><p>{file ? "Preview PPTX sẽ dùng slide artifact từ document pipeline." : "Chọn tài liệu ở cột Học liệu để xem nội dung."}</p></div>;
  return <div className="pdf-all-pages-shell">{status === "loading" && <div className="pdf-loading"><CircleNotch size={22} className="spin" /> Đang render tất cả trang...</div>}{status === "error" && <div className="file-preview-empty"><FilePdf size={54} /><strong>Không render được PDF</strong><p>Hãy kiểm tra lại file hoặc parser artifact.</p></div>}<div className="pdf-all-pages-content" ref={containerRef} /></div>;
}

/* Selection tooltip that appears near selected text */
function SelectionTooltip({ selection, onAskTutor }: { selection: TextSelectionContext; onAskTutor: (selection: TextSelectionContext) => void }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const gap = 10;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.min(Math.max(12, selection.rect.left), Math.max(12, viewportWidth - width - 12));
    const above = selection.rect.top - height - gap;
    const below = selection.rect.top + selection.rect.height + gap;
    const top = above >= 12 ? above : Math.min(Math.max(12, below), Math.max(12, viewportHeight - height - 12));
    setPosition({ left, top });
  }, [selection, viewportHeight, viewportWidth]);
  if (!selection.text) return null;
  const label = selection.slideTo ? `Slide ${selection.slideFrom}-${selection.slideTo}` : `Slide ${selection.slideFrom}`;
  return <div className="selection-tooltip-overlay"><div ref={tooltipRef} className="selection-tooltip" style={position} onClick={(event) => event.stopPropagation()}><div className="selection-tooltip-preview"><span className="selection-tooltip-slide">{label}</span><span>"{selection.text.length > 80 ? selection.text.slice(0, 80) + "…" : selection.text}"</span></div><button className="selection-tooltip-action" onClick={() => onAskTutor(selection)}><ChatText size={16} weight="bold" /> Hỏi Tutor</button></div></div>;
}

function FixedSlideDeckPreview({ deck, onPageCount, onTextSelect, pageRefs, activeSlide }: { deck: SlideDeck; onPageCount?: (count: number) => void; onTextSelect?: (selection: TextSelectionContext) => void; pageRefs: React.MutableRefObject<Map<number, HTMLElement>>; activeSlide?: number }) {
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const stackRef = useRef<HTMLDivElement>(null);
  useEffect(() => { onPageCount?.(deck.totalPages); }, [deck.totalPages, onPageCount]);
  function clearHighlightedSpans() {
    stackRef.current?.querySelectorAll(".fixed-slide-select-span.is-text-selected").forEach((span) => span.classList.remove("is-text-selected"));
  }
  useEffect(() => {
    function syncHighlightedSpans() {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || !stackRef.current?.contains(range.commonAncestorContainer)) {
        clearHighlightedSpans();
        return;
      }
      stackRef.current.querySelectorAll<HTMLElement>(".fixed-slide-select-span").forEach((span) => span.classList.toggle("is-text-selected", range.intersectsNode(span)));
    }
    document.addEventListener("selectionchange", syncHighlightedSpans);
    return () => document.removeEventListener("selectionchange", syncHighlightedSpans);
  }, []);
  function handleMouseUp() {
    if (!onTextSelect) return;
    const selection = window.getSelection();
    const rawText = selection?.toString().trim();
    if (!selection || !rawText || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const pageFromNode = (node: Node | null) => {
      const element = node instanceof Element ? node : node?.parentElement;
      const page = element?.closest<HTMLElement>("[data-page]")?.dataset.page;
      return page ? Number(page) : 0;
    };
    const startPage = pageFromNode(range.startContainer);
    const endPage = pageFromNode(range.endContainer);
    if (!startPage || !endPage) return;
    const selectedSpans = Array.from(stackRef.current?.querySelectorAll<HTMLElement>(".fixed-slide-select-span") ?? [])
      .filter((span) => range.intersectsNode(span));
    const text = selectedSpans.length
      ? cleanSelectedSpanText(selectedSpans.map((span) => span.textContent ?? ""), deck.extraction.removedRepeatedText)
      : rawText;
    if (!text) return;
    const spanRects = selectedSpans.map((span) => span.getBoundingClientRect());
    const rect = spanRects.length ? {
      left: Math.min(...spanRects.map((item) => item.left)),
      top: Math.min(...spanRects.map((item) => item.top)),
      right: Math.max(...spanRects.map((item) => item.right)),
      bottom: Math.max(...spanRects.map((item) => item.bottom)),
      get width() { return this.right - this.left; },
      get height() { return this.bottom - this.top; },
    } : range.getBoundingClientRect();
    onTextSelect({ text, slideFrom: Math.min(startPage, endPage), slideTo: startPage === endPage ? undefined : Math.max(startPage, endPage), rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } });
  }
  function imagePath(page: number) {
    return `${deck.imageBasePath}/p${String(page).padStart(2, "0")}.png`;
  }
  return <div className="fixed-slide-stack" ref={stackRef} onMouseUp={handleMouseUp}>{deck.pages.map((page) => {
    return <article className={cn("fixed-slide-page", page.page === activeSlide && "is-selection-target")} data-page={page.page} key={page.page} ref={(element) => { if (element) pageRefs.current.set(page.page, element); else pageRefs.current.delete(page.page); }}>
      <div className="fixed-slide-label"><span>Slide {String(page.page).padStart(2, "0")}</span><span>{deck.title}</span></div>
      <div className="fixed-slide-canvas">
        {!failedImages[page.page] && <img className="fixed-slide-image" src={imagePath(page.page)} alt={`Slide ${page.page} - ${deck.title}`} onError={() => setFailedImages((current) => ({ ...current, [page.page]: true }))} />}
        {failedImages[page.page] ? <div className="fixed-slide-text">{page.text.split("\n").map((line, index) => <p key={index}>{line || "\u00a0"}</p>)}</div> : <div className="fixed-slide-select-layer" aria-label={`Text layer của slide ${page.page}`}>{page.textSpans?.map((span, index) => <span className="fixed-slide-select-span" key={`${span.text}-${index}`} style={{ left: `${span.x * 100}%`, top: `${span.y * 100}%`, width: `${span.width * 100}%`, height: `${span.height * 100}%` }}>{span.text}</span>)}</div>}
      </div>
    </article>;
  })}</div>;
}

const SUMMARY_COPY = {
  idleTitle: "T\u00f3m t\u1eaft to\u00e0n b\u1ed9",
  idleText: "Gemini s\u1ebd ch\u1ea1y Map \u2192 Reduce tr\u00ean text slide v\u00e0 tr\u1ea3 v\u1ec1 citation c\u00f3 th\u1ec3 b\u1ea5m.",
  idleButton: "T\u00f3m t\u1eaft to\u00e0n b\u1ed9",
  loading: "\u0110ang t\u1ea1o t\u00f3m t\u1eaft",
  loadingText: "\u0110ang x\u1eed l\u00fd t\u1eebng nh\u00f3m slide, vui l\u00f2ng ch\u1edd trong gi\u00e2y l\u00e1t.",
  error: "Kh\u00f4ng th\u1ec3 t\u1ea1o t\u00f3m t\u1eaft",
  retry: "Th\u1eed l\u1ea1i",
  partial: "Một số slide ít text; hãy mở citation để đối chiếu slide gốc.",
};

function SummaryModePicker({ mode, onChange }: { mode: SummaryMode; onChange: (mode: SummaryMode) => void }) {
  return <label className="summary-mode-control"><span>Tiêu chí</span><select className="select-input" value={mode} onChange={(event) => onChange(event.target.value as SummaryMode)} aria-label="Tiêu chí Summary">{SUMMARY_MODES.map((item) => <option key={item.value} value={item.value}>{item.label} · {item.description}</option>)}</select></label>;
}

function FixedSummarySurface({ document, onGenerateSummary, onJumpToSlide }: { document: DocumentRecord; onGenerateSummary: SummaryRequest; onJumpToSlide?: (slide: number) => void }) {
  const state = document.summaryState;
  const [mode, setMode] = useState<SummaryMode>("balanced");
  if (state.status === "idle") return <div className="fixed-summary-empty"><Sparkle size={34} weight="fill" /><h2>{SUMMARY_COPY.idleTitle} {document.deck.title}</h2><p>{SUMMARY_COPY.idleText}</p><SummaryModePicker mode={mode} onChange={setMode} /><button className="primary-button" onClick={() => onGenerateSummary(mode)}><Sparkle size={17} weight="fill" /> {SUMMARY_COPY.idleButton}</button></div>;
  if (state.status === "loading") return <div className="fixed-summary-empty"><CircleNotch size={28} className="spin" /><h2>{SUMMARY_COPY.loading}</h2><p>{SUMMARY_COPY.loadingText}</p></div>;
  if (state.status === "error") return <div className="fixed-summary-empty"><Info size={32} /><h2>{SUMMARY_COPY.error}</h2><p>{state.message}</p><SummaryModePicker mode={mode} onChange={setMode} /><button className="secondary-button" onClick={() => onGenerateSummary(mode, true)}>{SUMMARY_COPY.retry}</button></div>;

  const summary = state.summary;
  const jumpToSlide = onJumpToSlide ?? ((page: number) => window.dispatchEvent(new CustomEvent("vlearn-jump-slide", { detail: page })));
  const citation = (page: number) => <button className="summary-citation" onClick={() => jumpToSlide(page)}>[Slide {String(page).padStart(2, "0")}]</button>;
  return <div className="fixed-summary"><div className="fixed-summary-head"><div><p className="eyebrow">SUMMARY · {document.deck.deckId.toUpperCase()}</p><h2>{document.deck.title}</h2></div><div className="fixed-summary-head-actions"><SummaryModePicker mode={mode} onChange={setMode} /><button className="secondary-button" onClick={() => onGenerateSummary(mode, true)}><Sparkle size={16} weight="fill" /> Tóm tắt lại</button><span className={cn("status-badge", state.status === "partial" && "status-review")}>{state.status === "partial" ? "Low-confidence" : "Gemini ready"}</span></div></div>{summary.sections.map((section) => <section className="fixed-summary-section" key={section.id}><h3>{section.heading}</h3>{section.points.map((point) => <div className="fixed-summary-point" key={point.id}><p>{point.text}</p><div className="summary-citations">{point.pages.map((page) => <span key={page}>{citation(page)}</span>)}{point.confidence === "low" && <span className="summary-low-label">Low confidence</span>}</div></div>)}</section>)}{summary.unclassified.length > 0 && <section className="fixed-summary-section"><h3>{UNCLASSIFIED_COPY}</h3>{summary.unclassified.map((point) => <div className="fixed-summary-point" key={point.id}><p>{point.text}</p><div className="summary-citations">{point.pages.map((page) => <span key={page}>{citation(page)}</span>)}</div></div>)}</section>}<p className="summary-disclaimer"><Info size={15} /> Bản tóm tắt được trích xuất tự động từ text của slide. Đối với slide chứa hình ảnh hoặc code phức tạp, tôi khuyến nghị bạn click vào link để xem slide gốc.</p><small className="summary-generated">Model: {summary.model} · {new Date(summary.generatedAt).toLocaleString("vi-VN")}</small></div>;
}

function LegacyFixedSummarySurface({ document, onGenerateSummary, onJumpToSlide }: { document: DocumentRecord; onGenerateSummary: () => void; onJumpToSlide?: (slide: number) => void }) {
  const state = document.summaryState;
  if (state.status === "idle") return <div className="fixed-summary-empty"><Sparkle size={34} weight="fill" /><h2>T\u00f3m t\u1eaft to\u00e0n b\u1ed9 {document.deck.title}</h2><p>Gemini s\u1ebd ch\u1ea1y Map \u2192 Reduce tr\u00ean text slide v\u00e0 tr\u1ea3 v\u1ec1 citation c\u00f3 th\u1ec3 b\u1ea5m.</p><button className="primary-button" onClick={onGenerateSummary}><Sparkle size={17} weight="fill" /> T\u00f3m t\u1eaft to\u00e0n b\u1ed9</button></div>;
  if (state.status === "loading") return <div className="fixed-summary-empty"><CircleNotch size={28} className="spin" /><h2>{state.stage}</h2><p>\u0110ang x\u1eed l\u00fd t\u1eebng nh\u00f3m slide, vui l\u00f2ng ch\u1edd trong gi\u00e2y l\u00e1t.</p></div>;
  if (state.status === "error") return <div className="fixed-summary-empty"><Info size={32} /><h2>Kh\u00f4ng th\u1ec3 t\u1ea1o t\u00f3m t\u1eaft</h2><p>{state.message}</p><button className="secondary-button" onClick={onGenerateSummary}>Th\u1eed l\u1ea1i</button></div>;

  const summary = state.summary;
  const jumpToSlide = onJumpToSlide ?? ((page: number) => window.dispatchEvent(new CustomEvent("vlearn-jump-slide", { detail: page })));
  const citation = (page: number) => <button className="summary-citation" onClick={() => jumpToSlide(page)}>[Slide {String(page).padStart(2, "0")}]</button>;
  return <div className="fixed-summary"><div className="fixed-summary-head"><div><p className="eyebrow">SUMMARY · {document.deck.deckId.toUpperCase()}</p><h2>{document.deck.title}</h2></div><span className={cn("status-badge", state.status === "partial" && "status-review")}>{state.status === "partial" ? "Low-confidence" : "Gemini ready"}</span></div>{state.status === "partial" && <div className="fixed-summary-alert"><Info size={17} /> Một số slide ít text; hãy mở citation để đối chiếu slide gốc.</div>}{summary.sections.map((section) => <section className="fixed-summary-section" key={section.id}><h3>{section.heading}</h3>{section.points.map((point) => <div className="fixed-summary-point" key={point.id}><p>{point.text}</p><div className="summary-citations">{point.pages.map((page) => <span key={page}>{citation(page)}</span>)}{point.confidence === "low" && <span className="summary-low-label">Low confidence</span>}</div></div>)}</section>)}{summary.unclassified.length > 0 && <section className="fixed-summary-section"><h3>{UNCLASSIFIED_COPY}</h3>{summary.unclassified.map((point) => <div className="fixed-summary-point" key={point.id}><p>{point.text}</p><div className="summary-citations">{point.pages.map((page) => <span key={page}>{citation(page)}</span>)}</div></div>)}</section>}{summary.skippedPages.length > 0 && <div className="fixed-summary-alert"><Info size={17} /> {SKIPPED_COPY}{summary.skippedPages.map((page) => citation(page))}</div>}<small className="summary-generated">Model: {summary.model} · {new Date(summary.generatedAt).toLocaleString("vi-VN")}</small></div>;
}

function SummarySurface({ document, onOpenReview }: { document: DocumentRecord; onOpenReview: () => void }) {
  return <div className="summary-surface"><div className="summary-surface-head"><div><p className="eyebrow">SUMMARY</p><h2>{document.fileName}</h2></div><span className={cn("status-badge", document.summaryApproved && "is-approved")}>{document.summaryApproved ? "Đã lưu" : "Draft"}</span></div><div className="summary-source"><Info size={17} /><span>{document.summaryDraft || "Summary chưa được sinh từ text layer."}</span></div><div className="summary-read-copy">{document.summaryNote || "Mở màn Review summary để chỉnh sửa và validate nội dung trước khi upsert."}</div><button className="secondary-button" onClick={onOpenReview}><Sparkle size={17} weight="fill" /> Mở Review summary</button></div>;
}

function DocumentSurface({ document, summarySelected, onOpenReview, onGenerateSummary, onJumpToSlide, page, totalPages, onPageCount, onTextSelect, pageRefs, activeSlide }: { document: DocumentRecord | null; summarySelected: boolean; onOpenReview: () => void; onGenerateSummary?: SummaryRequest; onJumpToSlide?: (slide: number) => void; page: number; totalPages: number; onPageCount?: (count: number) => void; onTextSelect?: (selection: TextSelectionContext) => void; pageRefs: React.MutableRefObject<Map<number, HTMLElement>>; activeSlide?: number }) {
  if (!document) return <div className="workspace-empty"><BookOpen size={42} /><h2>Chọn một học liệu</h2><p>Chọn Day, tài liệu hoặc Summary ở bên trái để bắt đầu.</p></div>;
  const requestSummary: SummaryRequest = onGenerateSummary ?? ((mode, regenerate) => dispatchSummaryRequest(document.id, mode, regenerate));
  return summarySelected ? <FixedSummarySurface document={document} onGenerateSummary={requestSummary} onJumpToSlide={onJumpToSlide} /> : <div className="document-page document-page-all"><div className="document-page-meta"><span>{totalPages ? `${totalPages} slides` : "Loading slides..."}</span><span>{document.fileName}</span></div><FixedSlideDeckPreview deck={document.deck} onPageCount={onPageCount} onTextSelect={onTextSelect} pageRefs={pageRefs} activeSlide={activeSlide} /></div>;
}

function TutorAnswer({ text }: { text: string }) {
  const displayText = text
    .replace(/\[\s*slide\s+\d+(?:\s*[-\u2013]\s*\d+)?\s*\]/gi, "")
    .replace(/\*\*/g, "")
    .replace(/(^|\n)\s*[*-]\s+/g, "$1• ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return <p className="chat-answer">{displayText}</p>;
}

function LegacyTutorPanel({ document, onCollapse, slideContext, onClearSlideContext, onJumpToSlide }: { document: DocumentRecord | null; onCollapse: () => void; slideContext?: TextSelectionContext; onClearSlideContext: () => void; onJumpToSlide: (slide: number) => void }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  /* Auto-scroll chat */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim() || (slideContext ? "Hãy giải thích nội dung được chọn." : "");
    if (!trimmed || !document) return;
    const context = slideContext ? { slideFrom: slideContext.slideFrom, slideTo: slideContext.slideTo, selectedText: slideContext.text } : undefined;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    try {
      const history = messages.slice(-4).map((message) => ({ role: message.role, text: message.text.slice(0, 1800), sources: message.sources }));
      const response = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId: document.id, question: trimmed, context, history }) });
      const data = await response.json().catch(() => null) as { answer?: string; sources?: ChatSource[] } | null;
      setMessages((current) => [...current, { role: "assistant", text: data?.answer || "Hiện tại chức năng hỏi đáp đang gặp sự cố, mong bạn thử lại sau .", sources: data?.sources || [] }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: "Hiện tại chức năng hỏi đáp đang gặp sự cố, mong bạn thử lại sau ." }]);
    } finally {
      onClearSlideContext();
      setLoading(false);
    }
  }
  return <aside className="tutor-panel"><div className="tutor-panel-head"><span className="tutor-avatar"><Robot size={20} weight="duotone" /></span><div><strong>VLearn Tutor</strong><small>Hỏi về học liệu đang mở</small></div><span className="tutor-live"><i /> {loading ? "Đang xử lý" : "Sẵn sàng"}</span><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn VLearn Tutor"><CaretRight size={17} /></button></div>{slideContext && <div className="tutor-context-chip"><span><strong>{slideContext.slideTo ? `Slide ${slideContext.slideFrom}–${slideContext.slideTo}` : `Slide ${slideContext.slideFrom}`}</strong> · {slideContext.text.slice(0, 90)}{slideContext.text.length > 90 ? "…" : ""}</span><button type="button" onClick={onClearSlideContext} aria-label="Bỏ slide context"><X size={14} /></button></div>}<div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><Robot size={26} /><p>Hỏi một câu về tài liệu.</p><small>Nguồn trả về sẽ hiển thị theo thứ tự retrieval.</small></div> : messages.map((message, index) => <div className={cn("chat-message", message.role)} key={message.role + "-" + index}><p>{message.text}</p>{message.sources && message.sources.length > 0 && <div className="chat-sources">{message.sources.map((source) => <button key={source.label} onClick={() => source.slideFrom && onJumpToSlide(source.slideFrom)} disabled={!source.slideFrom}>{source.label}<ArrowRight size={13} /></button>)}</div>}</div>)}{loading && <div className="chat-message assistant"><p>Đang tìm trong học liệu và hỏi Tutor…</p></div>}<div ref={chatEndRef} /></div><form className="chat-form" onSubmit={submitQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={slideContext ? "Nhập câu hỏi cho đoạn slide đã chọn..." : "Nhập câu hỏi về tài liệu..."} disabled={!document || loading} /><button type="submit" aria-label="Gửi" disabled={!document || loading}><ArrowRight size={18} weight="bold" /></button></form></aside>;
}

function TutorPanel({ document, onCollapse, slideContext, onClearSlideContext, onJumpToSlide }: { document: DocumentRecord | null; onCollapse: () => void; slideContext?: TextSelectionContext; onClearSlideContext: () => void; onJumpToSlide: (slide: number) => void }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim() || (slideContext ? "Hãy giải thích nội dung được chọn." : "");
    if (!trimmed || !document) return;
    const context = slideContext ? { slideFrom: slideContext.slideFrom, slideTo: slideContext.slideTo, selectedText: slideContext.text } : undefined;
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    try {
      const history = messages.slice(-4).map((message) => ({ role: message.role, text: message.text.slice(0, 1800), sources: message.sources }));
      const response = await fetch("/api/tutor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documentId: document.id, question: trimmed, context, history }) });
      const data = await response.json().catch(() => null) as { answer?: string; sources?: ChatSource[] } | null;
      setMessages((current) => [...current, { role: "assistant", text: data?.answer || CLIENT_FALLBACK_MESSAGE, sources: data?.sources || [] }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: CLIENT_FALLBACK_MESSAGE }]);
    } finally {
      onClearSlideContext();
      setLoading(false);
    }
  }

  return <aside className="tutor-panel"><div className="tutor-panel-head"><span className="tutor-avatar"><Robot size={20} weight="duotone" /></span><div><strong>VLearn Tutor</strong><small>Hỏi về học liệu đang mở</small></div><span className="tutor-live"><i /> {loading ? "Đang xử lý" : "Sẵn sàng"}</span><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn VLearn Tutor"><CaretRight size={17} /></button></div><div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><Robot size={26} /><p>Tôi là AI hỗ trợ học tập</p><small>Tôi có thể tóm tắt nhanh nội dung chính của cả bộ slide Day 1/Day 2 này và trích dẫn số trang đi kèm.</small></div> : messages.map((message, index) => <div className={cn("chat-message", message.role)} key={message.role + "-" + index}><TutorAnswer text={message.text} />{message.sources && message.sources.length > 0 && <div className="chat-sources"><span className="chat-sources-label">Slides liên quan</span>{message.sources.map((source) => <button type="button" key={source.label} onClick={() => source.slideFrom && onJumpToSlide(source.slideFrom)} disabled={!source.slideFrom}>{source.label}<ArrowRight size={13} /></button>)}</div>}</div>)}{loading && <div className="chat-message assistant"><p>Đang tìm trong học liệu và hỏi Tutor…</p></div>}<div ref={chatEndRef} /></div>{slideContext && <div className="tutor-context-chip"><span><strong>{slideContext.slideTo ? `Slide ${slideContext.slideFrom}–${slideContext.slideTo}` : `Slide ${slideContext.slideFrom}`}</strong> · {slideContext.text.slice(0, 90)}{slideContext.text.length > 90 ? "…" : ""}</span><button type="button" onClick={onClearSlideContext} aria-label="Bỏ slide context"><X size={14} /></button></div>}<form className="chat-form" onSubmit={submitQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={slideContext ? "Nhập câu hỏi cho đoạn slide đã chọn..." : "Nhập câu hỏi về tài liệu..."} disabled={!document || loading} /><button type="submit" aria-label="Gửi" disabled={!document || loading}><ArrowRight size={18} weight="bold" /></button></form></aside>;
}

function TutorCollapsedRail({ onExpand }: { onExpand: () => void }) {
  return <aside className="tutor-panel tutor-collapsed"><button className="collapsed-rail-button" onClick={onExpand} aria-label="Mở VLearn Tutor"><Robot size={17} /><CaretLeft size={18} /></button></aside>;
}

function ViewerToolbar({ label, page, totalPages, onPrevious, onNext, onCollapse }: { label: string; page: number; totalPages: number; onPrevious: () => void; onNext: () => void; onCollapse: () => void }) {
  const [notice, setNotice] = useState("");
  const unavailable = () => setNotice("Chức năng này chưa nằm trong phạm vi demo.");
  return <div className="viewer-toolbar"><div className="viewer-tools"><button className="tool-button is-active"><BookOpen size={16} /> {label}</button><button className="tool-button" onClick={unavailable}><Pen size={16} /> Bút</button><button className="tool-button" onClick={unavailable}><Highlighter size={16} /> Highlight</button><button className="tool-button icon-only" onClick={unavailable} aria-label="Thao tác khác"><DotsThree size={19} weight="bold" /></button></div><span className="toolbar-divider" /><span className="page-note">{totalPages ? `Trang ${page} / ${totalPages}` : "Đang xác định số trang"}</span>{notice && <span className="toolbar-status" role="status" aria-live="polite">{notice}</span>}<div className="zoom-tools"><button className="mini-tool" onClick={unavailable}>−</button><strong>100%</strong><button className="mini-tool" onClick={unavailable}>＋</button><button className="mini-tool" onClick={unavailable} aria-label="Tải xuống"><DownloadSimple size={17} /></button><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn vùng xem"><CaretLeft size={17} /></button></div></div>;
}

function ViewerFooter({ page, totalPages, onPrevious, onNext }: { page: number; totalPages: number; onPrevious: () => void; onNext: () => void }) {
  return <div className="viewer-footer"><button className="mini-tool" onClick={onPrevious} disabled={page <= 1}><CaretLeft size={18} /></button><span>Trang <strong>{page}</strong>{totalPages ? ` / ${totalPages}` : ""}</span><button className="mini-tool" onClick={onNext} disabled={!totalPages || page >= totalPages}><CaretRight size={18} /></button></div>;
}

function SummaryPane({ document, onOpenReview: _onOpenReview, onGenerateSummary, onJumpToSlide, onCollapse }: { document: DocumentRecord | null; onOpenReview: () => void; onGenerateSummary?: SummaryRequest; onJumpToSlide?: (slide: number) => void; onCollapse: () => void }) {
  const requestSummary: SummaryRequest | undefined = document ? onGenerateSummary ?? ((mode, regenerate) => dispatchSummaryRequest(document.id, mode, regenerate)) : undefined;
  return <section className="content-pane summary-pane"><div className="summary-pane-head"><div><span className="summary-pane-kicker"><Sparkle size={15} weight="fill" /> Summary</span><small>{document?.summaryState.status === "ready" ? "Gemini ready" : "Cần tạo summary"}</small></div><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn Summary"><CaretRight size={17} /></button></div><div className="summary-pane-scroll">{document && requestSummary ? <FixedSummarySurface document={document} onGenerateSummary={requestSummary} onJumpToSlide={onJumpToSlide} /> : <div className="workspace-empty"><Sparkle size={32} /><h2>Chưa có Summary</h2><p>Chọn tài liệu ở cột Học liệu để xem Summary.</p></div>}</div></section>;
}

function WorkspaceScreen({ days, selection, onBack, onToggleDay, onSelect, onOpenSummaryReview: _onOpenSummaryReview, onGenerateSummary }: { days: Day[]; selection: Selection | null; onBack: () => void; onToggleDay: (dayId: string) => void; onSelect: (selection: Selection) => void; onOpenSummaryReview: () => void; onGenerateSummary?: (documentId: string, mode?: SummaryMode, regenerate?: boolean) => void }) {
  const [splitMode, setSplitMode] = useState(false);
  const [materialsCollapsed, setMaterialsCollapsed] = useState(false);
  const [viewerCollapsed, setViewerCollapsed] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [tutorCollapsed, setTutorCollapsed] = useState(false);
  const [materialsWidth, setMaterialsWidth] = useState(300);
  const [tutorWidth, setTutorWidth] = useState(365);
  const [slideRatio, setSlideRatio] = useState(.56);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedContext, setSelectedContext] = useState<TextSelectionContext | null>(null);
  const [attachedContext, setAttachedContext] = useState<TextSelectionContext | null>(null);
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());
  const dragState = useRef<{ target: "materials" | "tutor" | "summary"; x: number; value: number; width: number } | null>(null);
  const document = useMemo(() => days.flatMap((day) => day.documents).find((item) => item.id === selection?.docId) ?? null, [days, selection?.docId]);
  const requestSummary: SummaryRequest | undefined = document && onGenerateSummary ? (mode, regenerate) => onGenerateSummary(document.id, mode, regenerate) : undefined;
  const onOpenSummaryReview = () => { if (document) { if (requestSummary) requestSummary("balanced"); else dispatchSummaryRequest(document.id, "balanced"); } };
  const handlePageCount = useCallback((count: number) => setTotalPages(count), []);
  useEffect(() => { setPage(1); setTotalPages(0); setSummaryCollapsed(false); setSelectedContext(null); setAttachedContext(null); }, [document?.id]);
  useEffect(() => {
    const firstPage = pageRefs.current.get(1);
    const root = firstPage?.closest<HTMLElement>(".document-scroll");
    if (!root || !totalPages) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const nextPage = Number((visible?.target as HTMLElement | undefined)?.dataset.page);
      if (nextPage) setPage(nextPage);
    }, { root, threshold: [0.25, 0.5, 0.75] });
    for (const target of pageRefs.current.values()) observer.observe(target);
    return () => observer.disconnect();
  }, [document?.id, totalPages]);
  function startResize(target: "materials" | "tutor" | "summary", event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = target === "summary" ? event.currentTarget.parentElement?.getBoundingClientRect().width ?? window.innerWidth : 1;
    dragState.current = { target, x: event.clientX, value: target === "materials" ? materialsWidth : target === "tutor" ? tutorWidth : slideRatio, width };
  }
  function resize(event: PointerEvent<HTMLButtonElement>) {
    if (!dragState.current) return;
    const drag = dragState.current;
    const delta = event.clientX - drag.x;
    if (drag.target === "materials") {
      const next = drag.value + delta;
      if (next < 180) { setMaterialsCollapsed(true); dragState.current = null; return; }
      setMaterialsWidth(Math.min(420, Math.max(220, next)));
    } else if (drag.target === "tutor") {
      const next = drag.value - delta;
      if (next < 260) { setTutorCollapsed(true); dragState.current = null; return; }
      setTutorWidth(Math.min(520, Math.max(300, next)));
    } else {
      const next = drag.value + delta / drag.width;
      if (next > .84) { setSummaryCollapsed(true); dragState.current = null; return; }
      setSlideRatio(Math.min(.72, Math.max(.28, next)));
    }
  }
  function endResize() { dragState.current = null; }
  /* Scroll-to-page navigation */
  function scrollToPage(targetPage: number) {
    const el = pageRefs.current.get(targetPage);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setPage(targetPage);
  }
  useEffect(() => {
    function handleSummaryJump(event: Event) {
      const targetPage = Number((event as CustomEvent<number>).detail);
      if (Number.isInteger(targetPage) && targetPage > 0) {
        setSplitMode(true);
        setViewerCollapsed(false);
        setSummaryCollapsed(false);
        window.setTimeout(() => scrollToPage(targetPage), 0);
      }
    }
    window.addEventListener("vlearn-jump-slide", handleSummaryJump);
    return () => window.removeEventListener("vlearn-jump-slide", handleSummaryJump);
  }, [totalPages]);
  useEffect(() => {
    if (!selectedContext) return;
    function dismissSelection(event: Event) {
      const target = event.target;
      if (target instanceof Element && target.closest(".selection-tooltip")) return;
      window.getSelection()?.removeAllRanges();
      setSelectedContext(null);
    }
    function dismissOnScroll() {
      window.getSelection()?.removeAllRanges();
      setSelectedContext(null);
    }
    window.addEventListener("pointerdown", dismissSelection, true);
    window.addEventListener("scroll", dismissOnScroll, true);
    return () => {
      window.removeEventListener("pointerdown", dismissSelection, true);
      window.removeEventListener("scroll", dismissOnScroll, true);
    };
  }, [selectedContext]);
  function previousPage() {
    const prev = Math.max(1, page - 1);
    scrollToPage(prev);
  }
  function nextPage() {
    const next = Math.min(totalPages || page, page + 1);
    scrollToPage(next);
  }
  /* Text selection → Tooltip */
  function handleTextSelect(context: TextSelectionContext) {
    setSelectedContext(context);
  }
  function handleAskTutor(context: TextSelectionContext) {
    window.getSelection()?.removeAllRanges();
    setAttachedContext(context);
    setSelectedContext(null);
    setTutorCollapsed(false);
  }
  function clearAttachedContext() { setAttachedContext(null); }
  const pageProps = { page, totalPages, onPageCount: handlePageCount };
  const activeSlide = attachedContext?.slideFrom ?? selectedContext?.slideFrom;
  const summarySelected = selection?.kind === "summary";
  return <main className="workspace-layout"><div className="workspace-toolbar"><div className="workspace-breadcrumb"><span>Học liệu môn học</span><CaretRight size={15} /><strong>{splitMode ? "Slide + Summary" : summarySelected ? "Summary" : "Tài liệu"}</strong></div><div className="workspace-view-actions"><button className={cn("view-mode-button", splitMode && "is-active")} onClick={() => { setSplitMode(true); setViewerCollapsed(false); }}><Rows size={16} /> Màn đôi</button><button className={cn("view-mode-button", !splitMode && "is-active")} onClick={() => { setSplitMode(false); setViewerCollapsed(false); }}><ArrowsOutSimple size={16} /> Màn đơn</button></div></div><div className={cn("workspace-grid", materialsCollapsed && "materials-is-collapsed", viewerCollapsed && "viewer-is-collapsed", tutorCollapsed && "tutor-is-collapsed")} style={{ "--materials-width": (materialsCollapsed ? 48 : materialsWidth) + "px", "--tutor-width": (tutorCollapsed ? 48 : tutorWidth) + "px" } as CSSProperties}><MaterialsSidebar days={days} selection={selection} onToggleDay={onToggleDay} onSelect={onSelect} collapsed={materialsCollapsed} onCollapse={() => setMaterialsCollapsed((current) => !current)} />{viewerCollapsed ? <button className="viewer-collapsed-rail" onClick={() => setViewerCollapsed(false)} aria-label="Mở vùng xem"><CaretRight size={18} /><BookOpen size={17} /><span>Viewer</span></button> : <section className={cn("workspace-content", splitMode && "is-split")}>{splitMode ? <div className={cn("content-split", summaryCollapsed && "summary-is-collapsed")} style={{ "--slide-basis": slideRatio * 100 + "%" } as CSSProperties}><section className="content-pane slide-pane"><ViewerToolbar label="Slide" {...pageProps} onPrevious={previousPage} onNext={nextPage} onCollapse={() => setViewerCollapsed(true)} /><div className="document-scroll"><DocumentSurface document={document} summarySelected={false} onOpenReview={onOpenSummaryReview} {...pageProps} onTextSelect={handleTextSelect} pageRefs={pageRefs} activeSlide={activeSlide} /></div><ViewerFooter page={page} totalPages={totalPages} onPrevious={previousPage} onNext={nextPage} /></section>{!summaryCollapsed && <button className="split-handle inner-split-handle" onPointerDown={(event) => startResize("summary", event)} onPointerMove={resize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} aria-label="Kéo để chỉnh kích thước Slide và Summary"><DotsThree size={17} /></button>}{summaryCollapsed ? <button className="summary-collapsed-rail" onClick={() => setSummaryCollapsed(false)} aria-label="Mở Summary"><CaretLeft size={18} /><Sparkle size={16} weight="fill" /><span>Summary</span></button> : <SummaryPane document={document} onOpenReview={onOpenSummaryReview} onCollapse={() => setSummaryCollapsed(true)} />}</div> : <section className="content-pane single-pane"><ViewerToolbar label={summarySelected ? "Summary" : "Slide"} {...pageProps} onPrevious={previousPage} onNext={nextPage} onCollapse={() => setViewerCollapsed(true)} /><div className="document-scroll"><DocumentSurface document={document} summarySelected={summarySelected} onOpenReview={onOpenSummaryReview} {...pageProps} onTextSelect={handleTextSelect} pageRefs={pageRefs} activeSlide={activeSlide} /></div>{!summarySelected && <ViewerFooter page={page} totalPages={totalPages} onPrevious={previousPage} onNext={nextPage} />}</section>}</section>}<button className="split-handle outer-split-handle" onPointerDown={(event) => startResize("tutor", event)} onPointerMove={resize} onPointerUp={endResize} onPointerCancel={endResize} onLostPointerCapture={endResize} aria-label="Kéo để chỉnh kích thước Tutor"><DotsThree size={17} /></button>{tutorCollapsed ? <TutorCollapsedRail onExpand={() => setTutorCollapsed(false)} /> : <TutorPanel document={document} onCollapse={() => setTutorCollapsed(true)} slideContext={attachedContext ?? undefined} onClearSlideContext={clearAttachedContext} onJumpToSlide={scrollToPage} />}</div>{selectedContext && <SelectionTooltip selection={selectedContext} onAskTutor={handleAskTutor} />}<button className="workspace-back-fab" onClick={onBack}><ArrowLeft size={16} /> Về khóa học</button></main>;
}

function SlideReviewScreen({ document, onBack, onSave }: { document: DocumentRecord; onBack: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState(document.slideReviewNote);
  const [checked, setChecked] = useState(document.slideChecked);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const handlePageCount = useCallback((count: number) => setTotalPages(count), []);
  const pageNumbers = Array.from({ length: totalPages || 1 }, (_, index) => index + 1);
  return <main className="review-page"><div className="review-top"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Thư viện</button><div><p className="eyebrow">HUMAN IN THE LOOP · REVIEW SLIDE</p><h1>{document.fileName}</h1></div><span className="status-badge">{checked ? "Đã review" : "Chờ review"}</span></div><div className="slide-review-grid"><aside className="review-slide-list"><div className="panel-kicker"><FileText size={19} /> {totalPages ? `${totalPages} slides` : "Slides"}</div><div className="review-slide-items">{pageNumbers.map((slide) => <button className={cn("review-slide-item", page === slide && "is-active")} key={slide} onClick={() => setPage(slide)}><span>{String(slide).padStart(2, "0")}</span><span><strong>Trang {slide}</strong><small>{document.file ? "Sẵn sàng xem" : "Chưa có preview"}</small></span><CaretRight size={16} /></button>)}</div><p className="review-hint">Danh sách trang lấy từ số trang thật của PDF. PPTX sẽ dùng slide artifact từ pipeline.</p></aside><section className="review-preview panel"><div className="review-preview-head"><span>{totalPages ? `Trang ${page} / ${totalPages}` : `Trang ${page} / đang tải`}</span><span>{document.fileName}</span></div><PdfPreview file={document.file} page={page} onPageCount={handlePageCount} /><div className="review-page-controls"><button className="mini-tool" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}><CaretLeft size={18} /></button><span>Trang {page}{totalPages ? ` / ${totalPages}` : ""}</span><button className="mini-tool" onClick={() => setPage((current) => Math.min(totalPages || current, current + 1))} disabled={!totalPages || page >= totalPages}><CaretRight size={18} /></button></div></section><aside className="slide-review-panel panel"><div className="panel-kicker"><NotePencil size={19} /> Kiểm tra slide</div><p className="review-panel-copy">Review này dùng để xác nhận text/citation trước khi Summary được lưu.</p><label className="field-label" htmlFor="slide-note">OCR text / ghi chú review</label><textarea id="slide-note" className="review-textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Parser/OCR sẽ đưa text slide vào đây." /><label className="check-line"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span><strong>Đã kiểm tra slide</strong><small>Không đánh dấu khi chưa đối chiếu file gốc.</small></span></label><button className="primary-button full-width" onClick={() => { setChecked(true); onSave(note); }}><Check size={18} /> Lưu review slide</button></aside></div></main>;
}

function SummaryReviewScreen({ document, onBack, onSave }: { document: DocumentRecord; onBack: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState(document.summaryNote);
  const [checks, setChecks] = useState([false, false, false]);
  const allChecked = checks.every(Boolean);
  const labels = ["Đã đối chiếu nội dung với file gốc", "Citation/nguồn đã được kiểm tra", "Summary có thể đưa vào học liệu"];
  return <main className="review-page"><div className="review-top"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Thư viện</button><div><p className="eyebrow">HUMAN IN THE LOOP · REVIEW SUMMARY</p><h1>Review summary</h1><p className="review-subtitle">{document.fileName}</p></div><span className={cn("status-badge", document.summaryApproved && "is-approved")}>{document.summaryApproved ? "Đã lưu" : "Chờ approve"}</span></div><div className="summary-review-grid"><section className="summary-review-editor panel"><div className="panel-kicker"><Sparkle size={19} weight="fill" /> Summary draft</div><div className="summary-draft-box">{document.summaryDraft || "Chưa có summary draft. Pipeline cần text layer hoặc LLM để sinh nội dung."}</div><label className="field-label" htmlFor="summary-review-note">Nội dung chỉnh sửa trước khi upsert</label><textarea id="summary-review-note" className="review-textarea tall" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Chỉnh sửa Summary tại đây..." /></section><aside className="summary-review-check panel"><div className="panel-kicker"><ListChecks size={19} /> Validation checklist</div><p className="review-panel-copy">Summary chỉ được upsert sau khi hoàn tất checklist.</p><div className="validation-list">{labels.map((label, index) => <label className="check-line" key={label}><input type="checkbox" checked={checks[index]} onChange={() => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} /><span><strong>{label}</strong><small>{index === 0 ? "Claim không được vượt quá dữ liệu đã đọc." : index === 1 ? "Nguồn phải trỏ về tài liệu/slide tương ứng." : "Nội dung sẵn sàng cho người học."}</small></span></label>)}</div><div className="review-source"><Info size={17} /><span>{document.chunks.length ? document.chunks.length + " chunk đã được index từ text layer." : "Chưa có text layer; cần parser/OCR trước khi có citation thật."}</span></div><button className="primary-button full-width" onClick={() => onSave(note)} disabled={!allChecked || document.summaryApproved}><Check size={18} /> {document.summaryApproved ? "Summary đã được lưu" : "Approve & upsert"}</button></aside></div></main>;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("course");
  const [days, setDays] = useState<Day[]>(createDays);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  function toggleDark() { setDarkMode((current) => !current); }

  const selectedDocument = useMemo(() => days.flatMap((day) => day.documents).find((document) => document.id === selection?.docId) ?? null, [days, selection?.docId]);

  async function generateSummary(documentId: string, mode: SummaryMode = "balanced", regenerate = false) {
    const target = days.flatMap((day) => day.documents).find((document) => document.id === documentId);
    if (!target) return;
    const cached = !regenerate && readCachedSummary(target.deck.deckId, mode);
    if (cached) {
      updateDocument(documentId, { summary: cached.summary, summaryState: summaryStateFromCache(cached) });
      return;
    }
    if (target.summaryState.status === "loading") return;
    updateDocument(documentId, { summaryState: { status: "loading", stage: "Đang chạy Map stage..." } });
    try {
      const response = await fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deckId: target.deck.deckId, mode }) });
      const data = await response.json().catch(() => null) as { summary?: DeckSummary; partial?: boolean; error?: string } | null;
      if (!response.ok || !data?.summary) {
        const message = data?.error === "no-text" ? "Không có text đủ tin cậy để tóm tắt slide này." : "Hiện tại chức năng tóm tắt đang gặp sự cố, mong bạn thử lại sau.";
        updateDocument(documentId, { summaryState: { status: "error", reason: data?.error === "no-text" ? "no-text" : "api", message } });
        return;
      }
      const partial = data.partial === true;
      writeCachedSummary(target.deck.deckId, mode, { summary: data.summary, partial });
      updateDocument(documentId, { summary: data.summary, summaryState: partial ? { status: "partial", summary: data.summary, note: "Một số slide có độ tin cậy thấp." } : { status: "ready", summary: data.summary } });
    } catch {
      updateDocument(documentId, { summaryState: { status: "error", reason: "api", message: "Hiện tại chức năng tóm tắt đang gặp sự cố, mong bạn thử lại sau." } });
    }
  }

  useEffect(() => {
    let changed = false;
    const hydrated = days.map((day) => ({
      ...day,
      documents: day.documents.map((document) => {
        if (document.summaryState.status !== "idle") return document;
        const cached = readCachedSummary(document.deck.deckId, "balanced");
        if (!cached) return document;
        changed = true;
        return { ...document, summary: cached.summary, summaryState: summaryStateFromCache(cached) };
      }),
    }));
    if (changed) setDays(hydrated);
  }, []);

  useEffect(() => {
    function handleSummaryRequest(event: Event) {
      const detail = (event as CustomEvent<string | { documentId?: unknown; mode?: unknown; regenerate?: unknown }>).detail;
      const documentId = typeof detail === "string" ? detail : String(detail?.documentId || "");
      const mode = detail && typeof detail === "object" && (detail.mode === "deep" || detail.mode === "review") ? detail.mode : "balanced";
      const regenerate = typeof detail === "object" && detail?.regenerate === true;
      if (documentId) void generateSummary(documentId, mode, regenerate);
    }
    window.addEventListener("vlearn-generate-summary", handleSummaryRequest);
    return () => window.removeEventListener("vlearn-generate-summary", handleSummaryRequest);
  }, [days]);

  function updateDocument(docId: string, patch: Partial<DocumentRecord>) {
    setDays((current) => current.map((day) => ({ ...day, documents: day.documents.map((document) => document.id === docId ? { ...document, ...patch } : document) })));
  }

  function toggleDay(dayId: string) {
    setDays((current) => current.map((day) => day.id === dayId ? { ...day, expanded: !day.expanded } : day));
  }

  function openWorkspace(nextSelection: Selection) {
    setSelection(nextSelection);
    setDays((current) => current.map((day) => day.id === nextSelection.dayId ? { ...day, expanded: true } : day));
    setScreen("workspace");
  }

  return <div className={cn("app-shell", darkMode && "dark")}>{screen !== "workspace" ? <MainHeader darkMode={darkMode} onToggleDark={toggleDark} /> : <WorkspaceHeader document={selectedDocument} onBack={() => setScreen("course")} darkMode={darkMode} onToggleDark={toggleDark} />}{screen === "course" && <CourseScreen days={days} onToggleDay={toggleDay} onOpen={openWorkspace} />}{screen === "workspace" && <WorkspaceScreen days={days} selection={selection} onBack={() => setScreen("course")} onToggleDay={toggleDay} onSelect={openWorkspace} onOpenSummaryReview={() => undefined} onGenerateSummary={generateSummary} />}</div>;
}
