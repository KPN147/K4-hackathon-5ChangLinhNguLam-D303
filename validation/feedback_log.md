# Feedback Log — Vòng Validation CP5

Tài liệu này ghi nhận toàn bộ các phản hồi chi tiết thu thập từ biểu mẫu khảo sát người dùng thử nghiệm prototype (Willing Users) tại thời điểm Checkpoint 5 (CP5).

---

## 1. Kết quả tổng hợp

* **Số lượng người tham gia validation:** 5 học viên lớp AI Thực Chiến (đạt yêu cầu ≥ 3).
* **Danh sách học viên:**
  1. Lê Văn Tuấn 
  2. Phùng Văn Linh
  3. Nguyễn Khánh Toàn
  4. Trương Minh Hoàng
  5. Trần Đăng Nguyên 

---

## 2. Chi tiết phản hồi từ biểu mẫu

### Học viên 1: Lê Văn Tuấn (Mã: 01016)
* **Thời gian phản hồi:** 31/07/2026 13:59:21
* **Q1 — Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?**
  > *"UI chưa được tối ưu hoàn toàn, phân trang hơi nhiều"*
* **Q2 — Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?**
  > *"Tôi có tin, vì thấy tóm tắt và trích dẫn bao quát được toàn bộ slide"*
* **Q3 — Bạn có dùng thật không — vì sao / vì sao chưa?**
  > *"Tôi chắc chắn sẽ dùng thật, vì hệ thống hoạt động rất ổn định, đặc biệt không thấy hallucination"*

---

### Học viên 2: Phùng Văn Linh (Mã: 01992)
* **Thời gian phản hồi:** 31/07/2026 13:59:37
* **Q1 — Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?**
  > *"giao diện hơi nhiều thông tin gây ảnh hưởng cho"*
* **Q2 — Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?**
  > *"có"*
* **Q3 — Bạn có dùng thật không — vì sao / vì sao chưa?**
  > *"có"*

---

### Học viên 3: Nguyễn Khánh Toàn (Mã: 01738)
* **Thời gian phản hồi:** 31/07/2026 14:10:49
* **Q1 — Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?**
  > *"đôi khi trích xuất ocr dẫn đến trả lời sai"*
* **Q2 — Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?**
  > *"suýt - vì trích dẫn ocr sai, ở các phần về graph, ocr chưa đọc hiểu được graph"*
* **Q3 — Bạn có dùng thật không — vì sao / vì sao chưa?**
  > *"có, rất hữu ích khi ôn tập"*

---

### Học viên 4: Trương Minh Hoàng (Mã: 01262)
* **Thời gian phản hồi:** 31/07/2026 14:13:05
* **Q1 — Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?**
  > *"liên tục rag lại những kiến thức đã được cài đặt sẵn, giải thích thường sử dụng ví dụ so sánh nhưng không trực quan"*
* **Q2 — Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?**
  > *"có, tại toàn rag =))"*
* **Q3 — Bạn có dùng thật không — vì sao / vì sao chưa?**
  > *"có dùng thật vì mình có kiến thức muốn hiểu rõ hơn"*

---

### Học viên 5: Trần Đăng Nguyên (Mã: 01798)
* **Thời gian phản hồi:** 31/07/2026 14:18:26
* **Q1 — Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?**
  > *"Sản phẩm vẫn còn bị bug, trả lời sai khi bảo summarize 1 slide cụ thể"*
* **Q2 — Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?**
  > *"Tạm thời không tin, thông tin trả lời vẫn có tỉ lệ sai nhiều"*
* **Q3 — Bạn có dùng thật không — vì sao / vì sao chưa?**
  > *"Tạm thời chưa dùng, vì sản phẩm cần được cải tiến thêm một vài tiêu chí "*

---

## 3. Nhật ký các thay đổi và cải tiến kỹ thuật tương ứng (Changelog)

Dựa vào 5 phản hồi trên, nhóm đã phân loại thành 3 nhóm vấn đề chính và thực hiện cải tiến:

1. **Về Giao diện và Trải nghiệm (Phản hồi từ Lê Văn Tuấn & Phùng Văn Linh):**
   * *Giải pháp:* Loại bỏ cơ chế phân trang nút bấm chuyển slide đơn lẻ (gây mệt mỏi và rườm rà), thay thế bằng giao diện cuộn liên tục (Continuous Scroll Stack View). Cấu trúc lại giao diện làm việc dạng 2 cột sạch sẽ, ẩn đi các nút phụ không cần thiết để tránh gây quá tải thông tin cho học viên khi ôn tập. Hỗ trợ cuộn tự động (auto-scroll) mượt mà đến đúng trang slide khi bấm vào liên kết trích dẫn `[Slide XX]`.

2. **Về Trích dẫn và OCR Sơ đồ/Graph (Phản hồi từ Nguyễn Khánh Toàn):**
   * *Giải pháp:* OCR thông thường không thể diễn dịch chính xác biểu đồ/graph và dễ gây ảo giác (hallucination) hoặc trích dẫn lệch trang. Nhóm cập nhật logic phát hiện mật độ text và nhãn sơ đồ. Nếu slide chứa hình vẽ/biểu đồ phức tạp, AI sẽ hiển thị cảnh báo hướng dẫn trực tiếp: *"Slide này chủ yếu là hình vẽ sơ đồ. [Bấm để mở ảnh slide gốc]"* thay vì cố gắng dùng OCR dịch nghĩa thô kệch.

3. **Về Logic RAG & Sửa Bug Tóm tắt Đơn Slide (Phản hồi từ Trương Minh Hoàng & Trần Đăng Nguyên):**
   * *Giải pháp 1 (Trương Minh Hoàng):* Khắc phục tình trạng liên tục RAG lại kiến thức cũ bằng cách tối ưu hóa Context Tracking trong lịch sử chat (`priorPages`). AI được hướng dẫn giữ nguyên ngữ cảnh cũ và đi sâu vào chi tiết mới mà không lặp lại danh sách định nghĩa cũ. Bổ sung cấu trúc Prompt 4 bước nghiêm ngặt, bắt buộc AI sinh một ẩn dụ so sánh thực tế thay vì ví dụ chung chung mơ hồ khi được yêu cầu *"dễ hiểu hơn"*.
   * *Giải pháp 2 (Trần Đăng Nguyên):* Sửa lỗi logic phân tách ngữ cảnh khi người dùng yêu cầu tóm tắt/giải thích một slide cụ thể. Tối ưu prompt phân vùng tài liệu để giảm tỉ lệ sai sót khi truy vấn chéo dữ liệu.
