# Báo cáo Phân tích Dữ liệu: AI gợi ý câu hỏi follow-up sau mỗi phiên học

**Phạm vi phân tích:** 
- Chatlog: `chat_history_anonymized_for_hackathon.csv` (1,261 turn chat, 2,522 tin nhắn, 369 học viên, 585 cuộc hội thoại).
- Transcript bài giảng sạch: Thư mục `data/vlearn-pack/transcript/` ( Day 1 - Day 5).

---

## 1. Số liệu định lượng từ Chatlog

Qua khảo sát dữ liệu thực tế từ hệ thống VLearn hiện tại, thu được các chỉ số sau:

*   **Tỷ lệ sử dụng tính năng gợi ý follow-up hiện có:** **0/1,261 turn chat (0.00%)**.
    *   *Chi tiết:* Trường dữ liệu `follow_ups` trong toàn bộ chatlog luôn luôn trả về danh sách rỗng (`[]`). Điều này chứng minh tính năng này chưa từng được deploy hoặc đang bị tắt hoàn toàn trên hệ thống.
*   **Nhu cầu chủ động từ học viên:** **0 lượt chat (0.00%)**.
    *   *Chi tiết:* Khi quét toàn bộ nội dung chat của học sinh bằng các từ khóa tìm kiếm (`hỏi gì tiếp`, `gợi ý câu hỏi`, `follow up`, `nên hỏi gì`, `tiếp theo`...), **không có bất kỳ học viên nào chủ động yêu cầu AI đưa ra câu hỏi gợi ý** cho họ. Học viên chỉ tương tác dựa trên nhu cầu giải quyết bài toán/câu hỏi cụ thể của riêng họ.

---

## 2. Dẫn chứng sư phạm từ Transcript bài giảng

Mặc dù học viên không chủ động yêu cầu, việc gợi ý câu hỏi và định hướng luồng tư duy là một phương pháp sư phạm được giảng viên đề cập rất sâu trong quá trình thiết kế sản phẩm:

*   **transcript-03-clean.md (Đoạn [T03-032]):**
    > Giảng viên giải thích nguyên lý thiết kế UI/UX để giới hạn sự lan man của người dùng:
    > *"Các bạn dùng Claude Code hay dùng ChatGPT, hay các bạn dùng code assistant đi — có phải khi con agent có cái gì đấy không rõ, nó sẽ đặt câu hỏi 1, 2, 3 — nó hoàn toàn narrow down cái freedom của các bạn trong cái việc trả lời lung tung luôn. Tức là một: bạn chọn một — ok, hướng đầu tiên nó suggest, nó chạy tiếp hướng thứ nhất. Hoặc bạn chọn số hai, nó chạy số hai... Tức là cái logic nó sẽ đơn giản hơn hẳn nếu các bạn kết hợp cái UI/UX vào trong cái ứng dụng, cái system của các bạn."*

*   **transcript-06-clean.md (Đoạn [T06-045]):**
    > Giảng viên nhấn mạnh tầm quan trọng của việc hiểu phản hồi của AI để đưa ra câu hỏi tiếp theo chuẩn xác:
    > *"ở thời AI, các bạn phải xuất sắc về mặt ngôn từ... ngôn từ nó rất xuất sắc — nếu các bạn không hiểu thì cái next action (hành động tiếp theo) của các bạn [sẽ sai]... cái next prompt của các bạn sẽ có xác suất sai tiếp, đúng không?"*

---

## 3. Kết luận và Lý do không chọn ứng viên tính năng này

Nhóm phát triển quyết định **LOẠI** ứng viên tính năng này vì các lý do sau:

1.  **Không có nhu cầu tự phát thực tế:** Dữ liệu cho thấy học viên hoàn toàn không chủ động yêu cầu tính năng này. Do đó, giá trị mang lại (Value Proposition) cho học viên là cực kỳ thấp.
2.  **Khó đánh giá hiệu quả (Evaluation Difficulty):** Việc gợi ý câu hỏi chất lượng cao yêu cầu hệ thống phải hiểu sâu sắc lộ trình sư phạm của từng bài giảng cụ thể. Một câu hỏi follow-up dở hoặc chung chung sẽ gây phản tác dụng. Trong khuôn khổ 1.5 ngày hackathon, nhóm không đủ thời gian để thiết kế và kiểm chứng (eval) được tính sư phạm của các câu hỏi gợi ý này.
3.  **Lựa chọn thay thế tốt hơn:** Nhóm tập trung nguồn lực vào việc xây dựng tính năng tóm tắt slide đa tầng và liên kết trích dẫn số trang (Map-Reduce Slides Summarizer) — vốn có số liệu chứng minh nhu cầu thực tế cực kỳ cao từ chatlog.
