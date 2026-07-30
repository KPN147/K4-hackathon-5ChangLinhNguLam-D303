# Worksheet B1 — Chân dung user & Jobs To Be Done

**Nhóm:** 5 Chang Linh Ngu Lam · **Hướng:** [x] A — VLearn [ ] B — Trợ lý Học viên [ ] C — Làn mở

**Tên dự án:** Tóm tắt slide bài giảng & Trích dẫn số trang (Map-Reduce Slides Summarizer)

> Quy tắc xuyên suốt: **không rõ job thì đừng bàn feature.**

---

## 1. Chọn job executor
*   **Job executor của nhóm:** Học viên lớp AI Thực Chiến đang tự ôn tập kiến thức sau buổi học hoặc chuẩn bị làm bài quiz năng lực cuối buổi.
*   **Vì sao là người này:** Đây là đối tượng trực tiếp tiêu thụ tài liệu slide bài giảng, chịu áp lực thời gian lớn (thường chỉ có 10–15 phút trước giờ làm quiz hoặc muốn lướt nhanh bài cũ trước khi làm bài tập). Họ cần nắm được bức tranh toàn cảnh một cách nhanh nhất.

---

## 2. Vẽ workflow thật của họ
*Hành trình của học viên xoay quanh một buổi học:*

| Chặng | Họ đang cố làm gì? | Hôm nay họ dùng gì? | Kẹt ở đâu? | Mức đau |
|---|---|---|---|---|
| **Trước buổi** | Chuẩn bị bài mới, xem lướt slide để nắm sơ qua nội dung bài học. | Tự mở Vlearn đọc lướt slide thủ công. | Tài liệu dài (30-50 trang), khó tự lọc ra đâu là kiến thức trọng tâm cần chuẩn bị trước. | Medium |
| **Trong buổi** | Theo dõi bài giảng và đối chiếu slide của giảng viên. | Nghe giảng, xem slide trên VLearn. | Giảng viên nói nhanh hoặc lướt slide nhanh, học viên không kịp ghi chú hay lưu lại vị trí slide chứa ví dụ quan trọng. | Medium |
| **Ngay sau buổi (Trước Quiz)** | Hệ thống nhanh toàn bộ kiến thức của ngày học để chuẩn bị làm quiz lấy điểm. | Dùng AI Tutor VLearn hiện tại để hỏi tóm tắt toàn bộ bài. | AI Tutor chỉ tóm tắt được trang hiện tại rời rạc; khi hỏi tài liệu dài thì **54.3% bị gãy/báo lỗi** hoặc **64.5% trả về không kèm trích dẫn số trang**. Học viên phải lội lại slide thủ công. | **High** |
| **Khi ôn lại** | Tìm lại chính xác phần giảng viên giải thích hoặc code mẫu để làm bài tập/hackathon. | Lướt thủ công từng trang slide hoặc tua video buổi học. | Tốn nhiều thời gian (10-15 phút/lần tìm kiếm), dễ nản lòng hoặc bỏ sót thuật ngữ chuyên môn quan trọng. | **High** |

*   **Hai chỗ đau nhất trong workflow:**
    1.  Không có cách nào tóm tắt nhanh bức tranh toàn cảnh của cả bộ slide đa trang cùng một lúc ngay sau buổi học để chuẩn bị làm quiz.
    2.  AI trả lời tóm tắt không trích dẫn chính xác ý nằm ở slide gốc số mấy, khiến học viên mất dấu và tốn thời gian lội lại thủ công.
*   **Bằng chứng ban đầu cho 2 chỗ này:** Mining dữ liệu chatlog thực tế (`evidence-summarization-FULL.md`) cho thấy: yêu cầu tóm tắt chiếm **10.9%** tổng số lượt chat nhưng tỷ lệ **tutor gãy lên đến 54.3%**; tỷ lệ **citations rỗng lên tới 64.5%** khiến học viên cụt hứng và **54% học viên bỏ cuộc ngay lập tức (churn)** sau khi bị từ chối.

---

## 3. Viết core JTBD
*   *Core JTBD bản nháp:* Dùng AI để tóm tắt nhanh file slide bài giảng VLearn và click nhảy đến slide gốc để làm học kĩ hơn.
*   *Từ solution lỡ nhét vào (gạch bỏ):* ~~AI~~, ~~VLearn~~, ~~click nhảy~~, ~~file slide~~.
*   **Core JTBD bản chốt:** Định vị nhanh các phần kiến thức trọng tâm và tóm tắt nội dung chính của một bộ tài liệu giảng dạy nhiều trang để ôn tập hiệu quả trước khi làm bài kiểm tra. *(Tuyệt đối không chứa tên sản phẩm hoặc chữ AI)*

---

## 4. Ba job stories

| # | When (Trigger) | I want to (Motivation) | So I can (Outcome) | Story này cho thấy gì |
|---|---|---|---|---|
| **JS1** | Khi chuẩn bị làm bài quiz năng lực cuối buổi học, | nhanh chóng nắm được tất cả các chủ đề chính có trong bộ slide bài giảng hôm nay, | hệ thống lại kiến thức và đạt điểm tốt mà không phải lướt thủ công từng trang. | Nhu cầu tóm tắt bao quát toàn cục dưới áp lực thời gian của quiz. |
| **JS2** | Khi làm bài tập và nhớ mang máng giảng viên dạy về thuật toán X nhưng không rõ chi tiết ở đâu, | tìm thấy ngay số slide gốc chính xác chứa định nghĩa thuật toán đó, | mở ngay slide đó ra đối chiếu để làm bài tập chính xác. | Nhu cầu định vị chính xác vị trí kiến thức (citations/grounding). |
| **JS3** | Khi ôn tập lại bài cũ có quá nhiều trang slide (trên 40 trang), | đọc một bản tóm tắt được gom nhóm theo chủ đề lớn kèm số trang rõ ràng, | tập trung ôn luyện những phần mình còn yếu mà không bị ngập tràn trong lượng thông tin quá lớn. | Nhu cầu lọc nhiễu thông tin (information filter) của tài liệu dài. |

---

## 5. Current alternatives

| Alternative | Làm tốt gì? | Fail ở đâu? | Vì sao user chưa bỏ nó? |
|---|---|---|---|
| **Lướt slide thủ công** | Đảm bảo tính chính xác 100% của kiến thức, không sợ bị ảo giác. | Cực kỳ tốn thời gian (lướt slide mất 10-15 phút), dễ gây mệt mỏi và bỏ sót. | Không có công cụ nào hỗ trợ định vị tự động chính xác hơn. |
| **Dùng AI Tutor mặc định của VLearn** | Tiện lợi, tích hợp sẵn ngay bên cạnh slide đang học. | Không tóm tắt được toàn bộ slide (chỉ xử lý trang hiện tại), tỷ lệ gãy cao (54.3%), không trích dẫn chính xác số trang (64.5% citations rỗng). | Vẫn là công cụ tiện nhất và không có giải pháp thay thế tốt hơn tại VLearn. |

*   **Nếu sản phẩm nhóm không ra đời, user sẽ tiếp tục:** Chấp nhận tốn thời gian lướt slide thủ công, hoặc từ bỏ việc hỏi AI để tự ôn tập bằng các phương pháp truyền thống kém hiệu quả.

---

## 6. AI leverage point
*   **AI nên vào bước nào của workflow, vai trò gì:** AI bước vào giai đoạn **Confirm & Execute (Xử lý & Định vị)**: Tự động hóa khâu đọc hiểu text, phân tích cấu trúc, gom nhóm chủ đề chính và trích xuất đúng slide ID từ tập hợp slide đầu vào bằng thuật toán Map-Reduce.
*   **Vì sao không phải bước khác:** Vì khâu "Đọc - Tổng hợp - Liên kết số trang" của bộ tài liệu dài là khâu tốn tài nguyên nhận thức và thời gian của con người nhất, đồng thời cũng là khâu hệ thống cũ đang fail (gây lỗi tràn token).
*   **Product hypothesis:**
    > *Nếu giúp **học viên lớp AI Thực Chiến** làm **ôn tập bài giảng** tốt hơn ở **giai đoạn ngay sau buổi học hoặc khi ôn tập lại**, bằng **AI tóm tắt slide đa tầng Map-Reduce và tự động trích dẫn số slide nguồn**, họ sẽ chuyển từ **lội slide thủ công hoặc dùng AI Tutor bị lỗi hiện tại** sang **giải pháp Map-Reduce Slides Summarizer của nhóm**, vì **nó giúp tiết kiệm 10-15 phút lội bài giảng và định vị chính xác slide nguồn để học**.*
*   **Assumption nguy hiểm nhất nếu nhóm đang sai:** Học viên không tin tưởng vào kết quả tóm tắt của AI vì sợ gặp lỗi ảo giác (hallucination) hoặc AI trích dẫn sai số trang slide gốc.
