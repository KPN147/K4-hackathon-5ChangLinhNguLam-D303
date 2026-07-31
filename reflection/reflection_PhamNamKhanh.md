# Báo cáo Reflection Cá nhân — Phạm Nam Khánh

* **Họ và tên:** Phạm Nam Khánh
* **Mã số học viên:** 2A202601718
* **Nhóm:** Nhóm 5 Chàng Lính Ngự Lâm · Zone K4 · Track A VLearn
* **Dự án:** VLearn — Tóm tắt slide bài giảng và trích dẫn số trang

---

## 1. Vai trò của tôi trong nhóm
Tôi đảm nhận vai trò **Team Lead (Trưởng nhóm)**, chịu trách nhiệm điều phối chung, đồng thời kiêm nhiệm việc **Viết Spec** (Đặc tả sản phẩm) và **Chuẩn bị kế hoạch validation CP5** của nhóm.

## 2. Phần việc tôi đã thực hiện (Bám sát theo spec của dự án)
* **Quản trị dự án & Phân chia công việc (Vai trò Team Lead):**
  * Trực tiếp đánh giá năng lực và phân chia công việc hợp lý cho các thành viên trong nhóm dựa trên thế mạnh của từng người:
    * **Phạm Gia Bảo** (Mạnh về logic backend và thuật toán): Phân công xây dựng Agent Flow (Map-Reduce Summarization logic & trích xuất JSON).
    * **Nguyễn Ngọc Hiệp** (Mạnh về xử lý dữ liệu và cấu trúc): Phân công thiết kế và xây dựng Dataflow (trích xuất slide, metadata trang, chunking).
    * **Đinh Hồng Đăng** (Mạnh về Prompt Engineering và Testing): Phân công thiết kế Prompt hệ thống + xây dựng bộ Golden Set.
    * **Nguyễn Văn Huy Hoàng** (Mạnh về nghiên cứu khảo sát và xử lý số liệu): Phân công thu thập Evidence (Chuẩn A khảo sát & Chuẩn B mining chatlog).
  * Kết nối các phần việc của thành viên để kiểm soát tiến độ chung và đảm bảo chất lượng đầu ra sản phẩm.
* **Viết tài liệu Spec dự án (`spec.md`):**
  * Xây dựng và đặc tả chi tiết nội dung của tài liệu AI Spec từ §1 đến §9: xác định rõ đối tượng người dùng, Job-to-be-done (Core JTBD), mô tả Problem Statement của sản phẩm.
  * Nghiên cứu so sánh sản phẩm với các giải pháp tương tự trên thị trường (NotebookLM, Khanmigo) để định vị điểm khác biệt (clickable link liên kết cuộn trang tự động).
  * Mô tả lát cắt một câu (User story), Non-goals (những gì không làm), mức prototype nhắm tới và thiết kế theo các nguyên tắc tương tác AI (HAX/PAIR).
  * Phân tích và phân loại các tình huống xử lý lỗi của AI tương ứng với 4 lớp lỗi (Nguồn sự thật, Mơ hồ/Thiếu thông tin, Ngoài phạm vi, Đặc thù domain).
* **Chuẩn bị kế hoạch validation CP5:**
  * Lên kế hoạch kiểm thử thực tế với người dùng ở Checkpoint 5 (CP5).
  * Thiết kế kịch bản thử nghiệm sản phẩm và bộ câu hỏi khảo sát validation chuẩn hóa gồm 3 câu hỏi cốt lõi:
    1. *"Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?"* (Xác định rào cản UI/UX).
    2. *"Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?"* (Đánh giá độ tin cậy thông tin).
    3. *"Bạn có dùng thật không — vì sao / vì sao chưa?"* (Đánh giá ý định sử dụng thực tế).
  * Trực tiếp chuẩn bị tài liệu ghi nhận nhật ký validation và theo dõi quá trình ghi nhận feedback của 5 willing users để tổng hợp và đề xuất changelog nâng cấp sản phẩm cho đội kỹ thuật.

## 3. Cách AI đã hỗ trợ tôi hoàn thành công việc
* **Soạn thảo và tinh chỉnh tài liệu Spec:** AI giúp tôi cấu trúc lại các phần mục trong tài liệu đặc tả `spec.md` một cách mạch lạc, chuyển đổi ngôn từ chuyên nghiệp và dễ hiểu.
* **Brainstorm các nguyên tắc thiết kế tương tác:** AI hỗ trợ phân tích cách áp dụng các nguyên tắc HAX/PAIR vào các điểm chạm trong giao diện (như hiển thị thông tin giới hạn của mô hình, cơ chế định vị trích dẫn rõ ràng).
* **Xử lý dữ liệu Validation:** AI giúp tôi nhanh chóng phân loại các phản hồi thu được từ CSV của người dùng, phân nhóm các lỗi mà họ gặp phải (UI phân trang nhiều, lỗi OCR graph, lỗi lặp RAG) để dễ dàng đề xuất hành động sửa lỗi.

## 4. Bài học xương máu rút ra từ các case fail (Validation Failures)
Là người chịu trách nhiệm viết Spec định hướng và thiết kế kế hoạch validation, tôi rút ra bài học sâu sắc từ các trường hợp kiểm thử bị lỗi của người dùng:
* **Thiết kế Spec phải bao quát các điểm lui an toàn (Graceful Fallback):** Từ lỗi đọc biểu đồ graph của Nguyễn Khánh Toàn (OCR dịch sai) hay slide trống, bài học là spec phải định nghĩa cơ chế xử lý ngoại lệ (conditional automation) để đội kỹ thuật lập trình AI chủ động đề xuất người dùng xem ảnh slide gốc thay vì cố đoán bừa.
* **Định vị chính xác giới hạn của context:** Từ lỗi tóm tắt 1 slide bị sai của Trần Đăng Nguyên, khi viết spec cần phải phân định rõ ràng cách xử lý các ngữ cảnh hẹp để không làm nhiễu dữ liệu.
* **Kiểm soát tốt kỳ vọng của người dùng:** Thiết kế sản phẩm AI cần có cơ chế trích dẫn nguồn rõ ràng (citations) và giải thích trực quan bằng ẩn dụ (analogy) khi cần thiết (từ feedback của Trương Minh Hoàng) để củng cố niềm tin và tính hữu ích thực sự của sản phẩm đối với học viên.
