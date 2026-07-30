
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type Screen = "course" | "library" | "upload" | "pipeline" | "slideReview" | "summaryReview" | "workspace";
type ItemKind = "document" | "summary";
type PipelineStatus = "processing" | "review" | "approved" | "error";

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

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
};

const DAY_COUNT = 6;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function createDays(): Day[] {
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return { id: "day-" + number, label: "Day" + number, documents: [], expanded: index === 0 };
  });
}

function createId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatBytes(bytes: number) {
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

function retrieveChunks(chunks: string[], query: string) {
  const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
  return chunks.map((chunk, index) => ({
    index,
    score: terms.reduce((score, term) => score + (chunk.toLowerCase().includes(term) ? 1 : 0), 0),
  })).filter((item) => item.score > 0).sort((left, right) => right.score - left.score).slice(0, 3);
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
  if (document.status === "processing") return document.stage;
  if (document.status === "approved") return "Đã lưu";
  if (document.status === "error") return "Cần kiểm tra";
  return "Chờ review";
}

function MainHeader({ screen, onNavigate, darkMode, onToggleDark }: { screen: Screen; onNavigate: (screen: Screen) => void; darkMode: boolean; onToggleDark: () => void }) {
  return (
    <header className="main-topbar">
      <button className="brand" onClick={() => onNavigate("course")} aria-label="Về khóa học của tôi">
        <span className="brand-mark"><BookOpen size={19} weight="bold" /></span><span>VLearn</span>
      </button>
      <nav className="main-nav" aria-label="Điều hướng chính">
        <button className={cn("main-nav-item", screen === "course" && "is-active")} onClick={() => onNavigate("course")}><BookOpen size={18} weight="bold" /> Khóa học của tôi</button>
        <button className={cn("main-nav-item", ["library", "upload", "pipeline", "slideReview", "summaryReview"].includes(screen) && "is-active")} onClick={() => onNavigate("library")}><Rows size={18} weight="bold" /> Thư viện</button>
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
        <div className="reading-progress"><CheckCircle size={18} weight="fill" /><span>Đã đọc {populatedDays}/{DAY_COUNT} day</span><i /><strong>{populatedDays ? "—" : "0%"}</strong></div>
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
      {day.expanded && <div className="course-day-content">{day.documents.length === 0 ? <div className="day-empty"><CloudArrowUp size={23} /><span>Day này chưa có tài liệu</span><small>Tài liệu được thêm và xử lý trong Thư viện.</small></div> : day.documents.map((document) => <div className="course-doc-row" key={document.id}><button onClick={() => onOpen({ dayId: day.id, docId: document.id, kind: "document" })}><FileKindIcon fileName={document.fileName} /><span><strong>{document.fileName}</strong><small>{formatBytes(document.fileSize)} · {statusLabel(document)}</small></span><ArrowRight size={18} /></button><button className="course-summary-link" onClick={() => onOpen({ dayId: day.id, docId: document.id, kind: "summary" })}><Sparkle size={16} weight="fill" /><span><strong>Summary</strong><small>{document.summaryApproved ? "Đã lưu" : "Mở Summary"}</small></span><ArrowRight size={16} /></button></div>)}</div>}
    </section>
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
function PdfAllPagesPreview({ file, onPageCount, onTextSelect, pageRefs }: { file?: File; onPageCount?: (count: number) => void; onTextSelect?: (text: string) => void; pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>> }) {
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
        setPages(numPages);
        onPageCount?.(numPages);
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";
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
          canvasContainer.appendChild(canvas);
          /* Text layer for selection */
          try {
            const textContent = await pdfPage.getTextContent();
            const textLayerDiv = window.document.createElement("div");
            textLayerDiv.className = "pdf-text-layer";
            textLayerDiv.style.width = viewport.width + "px";
            textLayerDiv.style.height = viewport.height + "px";
            for (const item of textContent.items) {
              if (!("str" in item) || !item.str) continue;
              const tx = item.transform;
              const span = window.document.createElement("span");
              span.textContent = item.str;
              const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
              span.style.fontSize = fontSize + "px";
              span.style.fontFamily = "sans-serif";
              span.style.position = "absolute";
              span.style.left = tx[4] + "px";
              span.style.top = (viewport.height - tx[5] - fontSize) + "px";
              span.style.transformOrigin = "0% 0%";
              if (item.width) span.style.width = item.width + "px";
              span.style.height = fontSize * 1.2 + "px";
              textLayerDiv.appendChild(span);
            }
            canvasContainer.appendChild(textLayerDiv);
          } catch { /* text layer optional */ }
          pageWrapper.appendChild(canvasContainer);
          container.appendChild(pageWrapper);
        }
        if (active) setStatus("idle");
      } catch {
        if (active) setStatus("error");
      }
    }
    void renderAllPages();
    return () => {
      active = false;
      if (loadingTask) void loadingTask.destroy();
    };
  }, [file, onPageCount, pageRefs]);

  /* Listen for text selection */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onTextSelect) return;
    function handleMouseUp() {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 0) onTextSelect!(text);
    }
    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [onTextSelect]);

  if (!file || !/\.pdf$/i.test(file.name)) return <div className="file-preview-empty"><FileKindIcon fileName={file?.name ?? ""} size={54} /><strong>{file?.name ?? "Chưa có tài liệu"}</strong><p>{file ? "Preview PPTX sẽ dùng slide artifact từ document pipeline." : "Chọn tài liệu ở cột Học liệu để xem nội dung."}</p></div>;
  return <div className="pdf-all-pages-shell">{status === "loading" && <div className="pdf-loading"><CircleNotch size={22} className="spin" /> Đang render tất cả trang...</div>}{status === "error" && <div className="file-preview-empty"><FilePdf size={54} /><strong>Không render được PDF</strong><p>Hãy kiểm tra lại file hoặc parser artifact.</p></div>}<div className="pdf-all-pages-content" ref={containerRef} /></div>;
}

/* Selection tooltip that appears near selected text */
function SelectionTooltip({ text, onAskTutor, onDismiss }: { text: string; onAskTutor: (text: string) => void; onDismiss: () => void }) {
  if (!text) return null;
  return <div className="selection-tooltip-overlay" onClick={onDismiss}><div className="selection-tooltip" onClick={(e) => e.stopPropagation()}><div className="selection-tooltip-preview"><span>"{text.length > 80 ? text.slice(0, 80) + "…" : text}"</span></div><button className="selection-tooltip-action" onClick={() => onAskTutor(text)}><ChatText size={16} weight="bold" /> Hỏi Tutor</button></div></div>;
}

function SummarySurface({ document, onOpenReview }: { document: DocumentRecord; onOpenReview: () => void }) {
  return <div className="summary-surface"><div className="summary-surface-head"><div><p className="eyebrow">SUMMARY</p><h2>{document.fileName}</h2></div><span className={cn("status-badge", document.summaryApproved && "is-approved")}>{document.summaryApproved ? "Đã lưu" : "Draft"}</span></div><div className="summary-source"><Info size={17} /><span>{document.summaryDraft || "Summary chưa được sinh từ text layer."}</span></div><div className="summary-read-copy">{document.summaryNote || "Mở màn Review summary để chỉnh sửa và validate nội dung trước khi upsert."}</div><button className="secondary-button" onClick={onOpenReview}><Sparkle size={17} weight="fill" /> Mở Review summary</button></div>;
}

function DocumentSurface({ document, summarySelected, onOpenReview, page, totalPages, onPageCount, onTextSelect, pageRefs }: { document: DocumentRecord | null; summarySelected: boolean; onOpenReview: () => void; page: number; totalPages: number; onPageCount?: (count: number) => void; onTextSelect?: (text: string) => void; pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>> }) {
  if (!document) return <div className="workspace-empty"><BookOpen size={42} /><h2>Chọn một học liệu</h2><p>Chọn Day, tài liệu hoặc Summary ở bên trái để bắt đầu.</p></div>;
  return summarySelected ? <SummarySurface document={document} onOpenReview={onOpenReview} /> : <div className="document-page document-page-all"><div className="document-page-meta"><span>{totalPages ? `${totalPages} trang` : "Đang tải..."}</span><span>{document.fileName}</span></div><PdfAllPagesPreview file={document.file} onPageCount={onPageCount} onTextSelect={onTextSelect} pageRefs={pageRefs} /></div>;
}

function TutorPanel({ document, onCollapse, prefillQuestion, onClearPrefill }: { document: DocumentRecord | null; onCollapse: () => void; prefillQuestion?: string; onClearPrefill?: () => void }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  /* Prefill from text selection */
  useEffect(() => {
    if (prefillQuestion) {
      setQuestion(prefillQuestion);
      onClearPrefill?.();
    }
  }, [prefillQuestion, onClearPrefill]);
  /* Auto-scroll chat */
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !document) return;
    const matches = retrieveChunks(document.chunks, trimmed);
    const response = matches.length ? "Đã truy xuất " + matches.length + " chunk liên quan từ text layer. Đây là retrieval proof, chưa phải câu trả lời LLM." : "Chưa tìm thấy text layer phù hợp. PDF/PPTX cần parser/OCR trước khi Tutor trả lời theo nội dung thật.";
    setMessages((current) => [...current, { role: "user", text: trimmed }, { role: "assistant", text: response, sources: matches.map((match) => "Chunk " + String(match.index + 1).padStart(2, "0")) }]);
    setQuestion("");
  }
  return <aside className="tutor-panel"><div className="tutor-panel-head"><span className="tutor-avatar"><Robot size={20} weight="duotone" /></span><div><strong>VLearn Tutor</strong><small>Hỏi về học liệu đang mở</small></div><span className="tutor-live"><i /> Sẵn sàng</span><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn VLearn Tutor"><CaretRight size={17} /></button></div><div className="chat-messages">{messages.length === 0 ? <div className="chat-empty"><Robot size={26} /><p>Hỏi một câu về tài liệu.</p><small>Nguồn trả về sẽ hiển thị theo thứ tự retrieval.</small></div> : messages.map((message, index) => <div className={cn("chat-message", message.role)} key={message.role + "-" + index}><p>{message.text}</p>{message.sources && <div className="chat-sources">{message.sources.map((source) => <button key={source}>{source}<ArrowRight size={13} /></button>)}</div>}</div>)}<div ref={chatEndRef} /></div><form className="chat-form" onSubmit={submitQuestion}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Nhập câu hỏi về tài liệu..." disabled={!document} /><button type="submit" aria-label="Gửi"><ArrowRight size={18} weight="bold" /></button></form></aside>;
}

function TutorCollapsedRail({ onExpand }: { onExpand: () => void }) {
  return <aside className="tutor-panel tutor-collapsed"><button className="collapsed-rail-button" onClick={onExpand} aria-label="Mở VLearn Tutor"><Robot size={17} /><CaretLeft size={18} /></button></aside>;
}

function ViewerToolbar({ label, page, totalPages, onPrevious, onNext, onCollapse }: { label: string; page: number; totalPages: number; onPrevious: () => void; onNext: () => void; onCollapse: () => void }) {
  return <div className="viewer-toolbar"><div className="viewer-tools"><button className="tool-button is-active"><BookOpen size={16} /> {label}</button><button className="tool-button"><Pen size={16} /> Bút</button><button className="tool-button"><Highlighter size={16} /> Highlight</button><button className="tool-button icon-only"><DotsThree size={19} weight="bold" /></button></div><span className="toolbar-divider" /><span className="page-note">{totalPages ? `Trang ${page} / ${totalPages}` : "Đang xác định số trang"}</span><div className="zoom-tools"><button className="mini-tool">−</button><strong>100%</strong><button className="mini-tool">＋</button><button className="mini-tool"><DownloadSimple size={17} /></button><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn vùng xem"><CaretLeft size={17} /></button></div></div>;
}

function ViewerFooter({ page, totalPages, onPrevious, onNext }: { page: number; totalPages: number; onPrevious: () => void; onNext: () => void }) {
  return <div className="viewer-footer"><button className="mini-tool" onClick={onPrevious} disabled={page <= 1}><CaretLeft size={18} /></button><span>Trang <strong>{page}</strong>{totalPages ? ` / ${totalPages}` : ""}</span><button className="mini-tool" onClick={onNext} disabled={!totalPages || page >= totalPages}><CaretRight size={18} /></button></div>;
}

function SummaryPane({ document, onOpenReview, onCollapse }: { document: DocumentRecord | null; onOpenReview: () => void; onCollapse: () => void }) {
  return <section className="content-pane summary-pane"><div className="summary-pane-head"><div><span className="summary-pane-kicker"><Sparkle size={15} weight="fill" /> Summary</span><small>{document?.summaryApproved ? "Đã approve và lưu" : "Draft cần review"}</small></div><button className="panel-collapse-button" onClick={onCollapse} aria-label="Thu gọn Summary"><CaretRight size={17} /></button></div><div className="summary-pane-scroll">{document ? <SummarySurface document={document} onOpenReview={onOpenReview} /> : <div className="workspace-empty"><Sparkle size={32} /><h2>Chưa có Summary</h2><p>Chọn tài liệu ở cột Học liệu để xem Summary.</p></div>}</div></section>;
}

function WorkspaceScreen({ days, selection, onBack, onToggleDay, onSelect, onOpenSummaryReview }: { days: Day[]; selection: Selection | null; onBack: () => void; onToggleDay: (dayId: string) => void; onSelect: (selection: Selection) => void; onOpenSummaryReview: () => void }) {
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
  const [selectedText, setSelectedText] = useState("");
  const [prefillQuestion, setPrefillQuestion] = useState("");
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const dragState = useRef<{ target: "materials" | "tutor" | "summary"; x: number; value: number; width: number } | null>(null);
  const document = useMemo(() => days.flatMap((day) => day.documents).find((item) => item.id === selection?.docId) ?? null, [days, selection?.docId]);
  const handlePageCount = useCallback((count: number) => setTotalPages(count), []);
  useEffect(() => { setPage(1); setTotalPages(0); setSummaryCollapsed(false); setSelectedText(""); }, [document?.id]);
  useEffect(() => {
    const target = pageRefs.current.get(page);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, totalPages, pageRefs]);
  function startResize(target: "materials" | "tutor" | "summary", event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const width = event.currentTarget.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
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
  function previousPage() {
    const prev = Math.max(1, page - 1);
    scrollToPage(prev);
  }
  function nextPage() {
    const next = Math.min(totalPages || page, page + 1);
    scrollToPage(next);
  }
  /* Text selection → Tooltip */
  function handleTextSelect(text: string) {
    setSelectedText(text);
  }
  function handleAskTutor(text: string) {
    setPrefillQuestion(text);
    setSelectedText("");
    setTutorCollapsed(false);
  }
  const pageProps = { page, totalPages, onPageCount: handlePageCount };
  const summarySelected = selection?.kind === "summary";
  return <main className="workspace-layout"><div className="workspace-toolbar"><div className="workspace-breadcrumb"><span>Học liệu môn học</span><CaretRight size={15} /><strong>{splitMode ? "Slide + Summary" : summarySelected ? "Summary" : "Tài liệu"}</strong></div><div className="workspace-view-actions"><button className={cn("view-mode-button", splitMode && "is-active")} onClick={() => { setSplitMode(true); setViewerCollapsed(false); }}><Rows size={16} /> Màn đôi</button><button className={cn("view-mode-button", !splitMode && "is-active")} onClick={() => { setSplitMode(false); setViewerCollapsed(false); }}><ArrowsOutSimple size={16} /> Màn đơn</button></div></div><div className={cn("workspace-grid", materialsCollapsed && "materials-is-collapsed", viewerCollapsed && "viewer-is-collapsed", tutorCollapsed && "tutor-is-collapsed")} style={{ "--materials-width": (materialsCollapsed ? 48 : materialsWidth) + "px", "--tutor-width": (tutorCollapsed ? 48 : tutorWidth) + "px" } as CSSProperties}><MaterialsSidebar days={days} selection={selection} onToggleDay={onToggleDay} onSelect={onSelect} collapsed={materialsCollapsed} onCollapse={() => setMaterialsCollapsed((current) => !current)} />{viewerCollapsed ? <button className="viewer-collapsed-rail" onClick={() => setViewerCollapsed(false)} aria-label="Mở vùng xem"><CaretRight size={18} /><BookOpen size={17} /><span>Viewer</span></button> : <section className={cn("workspace-content", splitMode && "is-split")}>{splitMode ? <div className={cn("content-split", summaryCollapsed && "summary-is-collapsed")} style={{ "--slide-basis": slideRatio * 100 + "%" } as CSSProperties}><section className="content-pane slide-pane"><ViewerToolbar label="Slide" {...pageProps} onPrevious={previousPage} onNext={nextPage} onCollapse={() => setViewerCollapsed(true)} /><div className="document-scroll"><DocumentSurface document={document} summarySelected={false} onOpenReview={onOpenSummaryReview} {...pageProps} onTextSelect={handleTextSelect} pageRefs={pageRefs} /></div><ViewerFooter page={page} totalPages={totalPages} onPrevious={previousPage} onNext={nextPage} /></section>{!summaryCollapsed && <button className="split-handle inner-split-handle" onPointerDown={(event) => startResize("summary", event)} onPointerMove={resize} onPointerUp={endResize} aria-label="Kéo để chỉnh kích thước Slide và Summary"><DotsThree size={17} /></button>}{summaryCollapsed ? <button className="summary-collapsed-rail" onClick={() => setSummaryCollapsed(false)} aria-label="Mở Summary"><CaretLeft size={18} /><Sparkle size={16} weight="fill" /><span>Summary</span></button> : <SummaryPane document={document} onOpenReview={onOpenSummaryReview} onCollapse={() => setSummaryCollapsed(true)} />}</div> : <section className="content-pane single-pane"><ViewerToolbar label={summarySelected ? "Summary" : "Slide"} {...pageProps} onPrevious={previousPage} onNext={nextPage} onCollapse={() => setViewerCollapsed(true)} /><div className="document-scroll"><DocumentSurface document={document} summarySelected={summarySelected} onOpenReview={onOpenSummaryReview} {...pageProps} onTextSelect={handleTextSelect} pageRefs={pageRefs} /></div>{!summarySelected && <ViewerFooter page={page} totalPages={totalPages} onPrevious={previousPage} onNext={nextPage} />}</section>}</section>}<button className="split-handle outer-split-handle" onPointerDown={(event) => startResize("tutor", event)} onPointerMove={resize} onPointerUp={endResize} aria-label="Kéo để chỉnh kích thước Tutor"><DotsThree size={17} /></button>{tutorCollapsed ? <TutorCollapsedRail onExpand={() => setTutorCollapsed(false)} /> : <TutorPanel document={document} onCollapse={() => setTutorCollapsed(true)} prefillQuestion={prefillQuestion} onClearPrefill={() => setPrefillQuestion("")} />}</div>{selectedText && <SelectionTooltip text={selectedText} onAskTutor={handleAskTutor} onDismiss={() => setSelectedText("")} />}<button className="workspace-back-fab" onClick={onBack}><ArrowLeft size={16} /> Về khóa học</button></main>;
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDayId, setUploadDayId] = useState("day-01");
  const [uploadError, setUploadError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  function toggleDark() { setDarkMode((current) => !current); }

  const selectedDocument = useMemo(() => days.flatMap((day) => day.documents).find((document) => document.id === selection?.docId) ?? null, [days, selection?.docId]);

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

  function openUpload() {
    setUploadError("");
    setScreen("upload");
  }

  function startPipeline(docId: string, file: File) {
    void (async () => {
      const stages = [{ progress: 22, stage: "Đang đọc metadata" }, { progress: 42, stage: "Đang parse/OCR" }, { progress: 62, stage: "Đang chia chunk" }, { progress: 82, stage: "Đang tạo index" }, { progress: 94, stage: "Đang tạo Summary draft" }];
      for (const stage of stages) {
        updateDocument(docId, stage);
        await wait(450);
      }
      try {
        const extractedText = await readTextLayer(file);
        const chunks = chunkText(extractedText);
        updateDocument(docId, { status: "review", progress: 100, stage: "Chờ review slide và summary", extractedText, chunks, summaryDraft: chunks.length ? "Đã tạo draft từ " + chunks.length + " chunk text. Cần review trước khi upsert." : "Chưa có text layer để sinh Summary tự động." });
      } catch {
        updateDocument(docId, { status: "error", progress: 100, stage: "Không đọc được file" });
      }
    })();
  }

  function submitUpload() {
    if (!uploadFile) { setUploadError("Hãy chọn file trước khi chạy pipeline."); return; }
    const docId = createId("document");
    const document: DocumentRecord = { id: docId, fileName: uploadFile.name, fileSize: uploadFile.size, fileType: uploadFile.type || uploadFile.name.split(".").pop()?.toUpperCase() || "FILE", file: uploadFile, status: "processing", stage: "Đang đưa vào pipeline", progress: 8, chunks: [], extractedText: "", summaryDraft: "", summaryNote: "", slideReviewNote: "", slideChecked: false, summaryApproved: false };
    setDays((current) => current.map((day) => day.id === uploadDayId ? { ...day, expanded: true, documents: [...day.documents, document] } : day));
    setSelection({ dayId: uploadDayId, docId, kind: "document" });
    setUploadFile(null);
    setScreen("pipeline");
    startPipeline(docId, uploadFile);
  }

  function openPipeline(document: DocumentRecord) {
    const day = days.find((item) => item.documents.some((entry) => entry.id === document.id));
    if (day) setSelection({ dayId: day.id, docId: document.id, kind: "document" });
    setScreen("pipeline");
  }

  function openSlideReview(document: DocumentRecord) {
    const day = days.find((item) => item.documents.some((entry) => entry.id === document.id));
    if (day) setSelection({ dayId: day.id, docId: document.id, kind: "document" });
    setScreen("slideReview");
  }

  function openSummaryReview(document: DocumentRecord) {
    const day = days.find((item) => item.documents.some((entry) => entry.id === document.id));
    if (day) setSelection({ dayId: day.id, docId: document.id, kind: "summary" });
    setScreen("summaryReview");
  }

  function saveSlideReview(note: string) {
    if (selectedDocument) updateDocument(selectedDocument.id, { slideReviewNote: note, slideChecked: true });
    setScreen("library");
  }

  function saveSummaryReview(note: string) {
    if (selectedDocument) updateDocument(selectedDocument.id, { summaryNote: note, summaryApproved: true, status: "approved", stage: "Đã approve và upsert" });
    setScreen("library");
  }

  const topScreen = ["course", "library", "upload", "pipeline", "slideReview", "summaryReview"].includes(screen) ? screen : screen === "workspace" ? "course" : screen;
  return <div className={cn("app-shell", darkMode && "dark")}>{screen !== "workspace" ? <MainHeader screen={topScreen as Screen} onNavigate={setScreen} darkMode={darkMode} onToggleDark={toggleDark} /> : <WorkspaceHeader document={selectedDocument} onBack={() => setScreen("course")} darkMode={darkMode} onToggleDark={toggleDark} />}{screen === "course" && <CourseScreen days={days} onToggleDay={toggleDay} onOpen={openWorkspace} />}{screen === "library" && <LibraryScreen days={days} onToggleDay={toggleDay} onUpload={openUpload} onOpenPipeline={openPipeline} onOpenSlideReview={openSlideReview} onOpenSummaryReview={openSummaryReview} onOpenWorkspace={openWorkspace} />}{screen === "upload" && <UploadPipelineScreen days={days} file={uploadFile} dayId={uploadDayId} error={uploadError} onBack={() => setScreen("library")} onFile={setUploadFile} onDayChange={setUploadDayId} onSubmit={submitUpload} />}{screen === "pipeline" && selectedDocument && <PipelineScreen document={selectedDocument} onBack={() => setScreen("library")} onReviewSlide={() => setScreen("slideReview")} onReviewSummary={() => setScreen("summaryReview")} />}{screen === "slideReview" && selectedDocument && <SlideReviewScreen document={selectedDocument} onBack={() => setScreen("library")} onSave={saveSlideReview} />}{screen === "summaryReview" && selectedDocument && <SummaryReviewScreen document={selectedDocument} onBack={() => setScreen("library")} onSave={saveSummaryReview} />}{screen === "workspace" && <WorkspaceScreen days={days} selection={selection} onBack={() => setScreen("course")} onToggleDay={toggleDay} onSelect={openWorkspace} onOpenSummaryReview={() => selectedDocument && openSummaryReview(selectedDocument)} />}</div>;
}
