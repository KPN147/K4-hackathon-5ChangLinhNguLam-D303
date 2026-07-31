# AI SPEC — Tóm tắt slide bài giảng & Trích dẫn số trang (Map-Reduce Slides Summarizer) · Nhóm 5 Chang Linh Ngu Lam · Zone K4
Hướng: [x] A — VLearn  [ ] B — Trợ lý Học viên  [ ] C — Làn mở  
Loại: [x] Tính năng mới  [ ] Tối ưu tính năng có sẵn  

---

## §1. User & Job
*   **Job executor + workflow:**
    *   **Học viên lớp AI Thực Chiến** đang tự ôn tập kiến thức sau buổi học hoặc chuẩn bị làm bài quiz kiểm tra năng lực cuối buổi.
    *   Worksheet JTBD — đính kèm: [validation/worksheet_jtbd.md](./validation/worksheet_jtbd.md)
*   **Core JTBD:** Nắm bắt tổng quan nội dung và định vị nhanh các phần kiến thức trọng tâm trong một bộ tài liệu giảng dạy nhiều trang để ôn tập hiệu quả. *(Không chứa chữ AI hay sản phẩm)*
*   **Problem statement:** Học viên khi ôn tập bài giảng vướng tình trạng phải đọc lần lượt từng trang slide rời rạc, không nắm được cấu trúc tổng thể và khó định vị chính xác vị trí kiến thức cần ôn tập, dẫn đến tốn thời gian lội lại thủ công hoặc bỏ sót kiến thức quan trọng. *(Không chứa chữ AI)*
*   **Evidence (log đầy đủ trong repo):**

    ### Chuẩn A — Khảo sát
    - Số người khảo sát: **24 người ngoài nhóm** (đạt chuẩn ≥20) · Ngày 30/07/2026
    - Q1 — Tỷ lệ xác nhận gặp khó khăn: **23/24 = 95.8%** (đạt chuẩn ≥50%)
    - Q2 — Tỷ lệ thấy tính năng hữu dụng: **23/24 = 95.8%**
    - Log đầy đủ (câu hỏi nguyên văn + từng câu trả lời ẩn danh): [validation/survey_log.md](./validation/survey_log.md)


    ### Chuẩn B — Mining dữ liệu chatlog
    Nguồn: `chat_history_anonymized_for_hackathon.csv` · 2.522 dòng · 1.261 turn · 369 user · 585 hội thoại · 22–29/07/2026

    **Phương pháp đếm (kiểm lại được):**
    - `is_sum` = câu học viên gõ khớp: `tóm tắt|tóm gọn|tóm lược|tổng hợp|tổng kết|khái quát|sơ lược|điểm lại|liệt kê.{0,15}(nội dung|chủ đề|ý chính)|nội dung chính|ý chính|học (được )?(những )?gì|có những gì`
    - `is_doc` = đồng thời khớp phạm vi cấp tài liệu/buổi: `toàn bộ|tất cả|cả (slide|bài|buổi|file|tài liệu)|slide này|bài giảng|tài liệu|file|pdf|day\s*\d|ngày (hôm nay|học)|buổi (này|học|hôm nay)|hôm nay|chương`
    - `is_fail` = câu trả lời tutor chứa: `không tìm thấy | không thể tìm | chưa tìm thấy | không thể truy cập | không tìm được | Rất tiếc | ^Xin lỗi`

    **Số đếm:**

    | Nhóm | n | % tổng | Tutor gãy (fail) | Citations rỗng | Downvote |
    |---|---:|---:|---:|---:|---:|
    | Mọi yêu cầu tóm tắt | 138 | 10.9% | **54.3%** | 64.5% | 8 |
    | ↳ cấp TÀI LIỆU/BUỔI | 97 | 7.7% | **49.5%** | 61.9% | 5 |
    | ↳ cấp trang/đoạn | 41 | 3.3% | **65.9%** | 70.7% | 3 |
    | Phần còn lại (không phải tóm tắt) | 1123 | 89.1% | **16.3%** | 43.9% | 29 |

    - Số user khác nhau từng hỏi tóm tắt: **95/369 = 25.7%**
    - Số user hỏi tóm tắt cấp tài liệu/buổi: **73 user**
    - Số hội thoại có ít nhất 1 câu tóm tắt: **117/585**
    - Trong 37 downvote toàn hệ: **8 là câu tóm tắt (22%)**
    - **Chênh lệch:** tóm tắt cấp tài liệu gãy 49.5% vs 16.3% ở phần còn lại = **cao gấp 3.0 lần**
    - **Hành vi sau bị từ chối:** 26/48 lần học viên bỏ hội thoại ngay sau khi bị từ chối tóm tắt **(54% churn rate)**
    - **Nhu cầu tự phát:** 88 cách diễn đạt khác nhau trong 97 lượt — không phải do nút bấm gợi ý, đây là nhu cầu thực sự tự phát của học viên

    **≥5 quote/ví dụ nguyên văn từ chatlog thật (nguồn: [`evidence-summarization-FULL.md`](./validation/evidence-summarization-FULL.md)):**

    1. *"tóm tắt các chủ đề chính của slide day05-lecture-slides-batch03.pdf này"* → Tutor từ chối: *"Rất tiếc, tôi không thể tìm thấy tệp tin... Bạn có thể cung cấp thêm thông tin..."* (`T0408` · `U0168` · rating=**down**)

    2. *"tóm tắt slide này"* → Tutor từ chối: *"Rất tiếc là tôi đã tra cứu trong tài liệu nhưng chưa tìm thấy nội dung cụ thể của Trang 33..."* (`T1258` · `U0056` · rating=**down**)

    3. *"tóm tắt tất cả nội dung cần note lại đầy đủ"* → Tutor từ chối: *"Rất tiếc, hiện tại tôi không thể truy cập nội dung cụ thể từ slide của ngày hôm nay..."* (`T0938` · `U0081` · rating=**down**)

    4. *"tóm tắt toàn bộ slide"* → Tutor từ chối: *"Rất tiếc, hiện tại hệ thống tìm kiếm không trả về tóm tắt tổng quát cho toàn bộ slide..."* (`T0443` · `U0141` · rating=**down**)

    5. *"Tóm tắt bài học và kiến thức cần nắm vững trong Day 4. Sau đó viết ra thành danh sách cho tôi"* → Tutor từ chối: *"Rất tiếc, hiện tại nội dung slide của ngày hôm nay không chứa trang số 98 hay phần tổng kết cuối bài..."* (`T1180` · `U0301`)

    6. *"hôm nay học gì z"* → Học viên phản ứng: *"bạn có thể làm được gì"* — cho thấy frustration sau khi bị từ chối (`T0563` · `C0098`)

    7. *"Tóm tắt slide này"* → Học viên phản ứng: *"ngu thế"* — phản ứng tiêu cực trực tiếp (`T0523` · `C0064`)

---

## §2. Impact & quyết định chọn
*   **Bảng impact so sánh ≥3 ứng viên:**

| Ứng viên tính năng | Đối tượng ảnh hưởng | Tần suất gặp | Tổn thất mỗi lần (Cost) | Khả thi build prototype | Chọn? |
|---|---|---|---|---|---|
| **1. Tóm tắt slide toàn bộ có trích dẫn số trang** | 95/369 user đã hỏi tóm tắt (25.7%); 73 user hỏi cấp tài liệu | 7.7% lượt chat mỗi ngày, liên tục 8 ngày (22–29/07) | 54.3% bị từ chối → học viên phải đọc thủ công; 22% downvote là câu tóm tắt; 54% churn ngay sau từ chối | **Cao** — dữ liệu chatlog sẵn có, slide pack đã có trong repo | **CHỌN** |
| **2. AI tự động phát hiện học viên bị stuck và chủ động hỗ trợ** | 32/369 user (8.67% tổng user) | 3.09% tổng số turn chat (35/585 cuộc hội thoại) | **51.43%** học viên bỏ cuộc (churn) ngay sau khi bị stuck | **Thấp** — khó định nghĩa hành vi "stuck" tự động trong 1.5 ngày | Loại |
| **3. AI gợi ý câu hỏi follow-up sau mỗi phiên học** | 0% user (0/369 user) | 0% lượt chat (trường `follow_ups` luôn = `[]` trong dữ liệu) | Thấp — học viên chưa có thói quen chủ động yêu cầu câu hỏi gợi ý | **Trung bình** — cần xây dựng hệ thống gợi ý khớp tiến trình sư phạm | Loại |

*   **Ứng viên ĐÃ LOẠI + vì sao:**
    - *Ứng viên 2 (AI phát hiện học viên bị stuck):* Bị loại vì quy mô ảnh hưởng nhỏ (**5.98% hội thoại** so với **25.7%** của tính năng tóm tắt slide). Mặc dù tỷ lệ churn sau kẹt rất cao (**51.43%**), việc tự động nhận diện "stuck" rất mơ hồ và dễ gây phiền hà cho học sinh nếu AI can thiệp không đúng lúc. Xem chi tiết báo cáo: [validation/evidence-stuck-detection-analysis.md](./validation/evidence-stuck-detection-analysis.md).
    - *Ứng viên 3 (AI gợi ý câu hỏi follow-up):* Bị loại vì dữ liệu chatlog cho thấy **0%** học viên có nhu cầu tự phát đòi hỏi tính năng này. Việc thiết kế câu hỏi follow-up chất lượng yêu cầu cấu trúc chặt chẽ theo từng bài giảng học thuật, khó kiểm chứng chất lượng trong thời gian ngắn. Xem chi tiết báo cáo: [validation/evidence-followups-analysis.md](./validation/evidence-followups-analysis.md).
*   **Ứng viên CHỌN + vì sao (bằng số):** Chọn ứng viên 1 vì có bằng chứng định lượng rõ ràng nhất: **25.7%** tổng user đã chủ động hỏi tóm tắt, tỷ lệ AI fail lên tới **54.3%** (gấp 3 lần các câu hỏi thường), **8/37 downvote (22%)** toàn hệ là câu hỏi tóm tắt, và **54% học viên bỏ cuộc** ngay sau khi bị từ chối. Tính năng này giải quyết được pain point lớn nhất, khả thi nhất để đo lường và hoàn thiện trong hackathon.

---

## §3. Giải pháp tương tự đã nghiên cứu
*   **[NotebookLM (Google)]:**
    *   *Flow:* User upload tài liệu/slide PDF lên. AI tự động sinh tóm tắt tổng quan (Study Guide), FAQ, và cho phép chat hỏi đáp có kèm số trang nguồn để trích dẫn.
    *   *Đáng học:* Tóm tắt toàn cục rất tốt, giao diện hiển thị số trang trích dẫn chính xác giúp tăng độ tin cậy của thông tin.
    *   *Đáng né:* Giao diện dạng chat độc lập bên ngoài, không tích hợp trực tiếp vào màn hình xem tài liệu động của học sinh; đôi khi trích dẫn nhảy trang nếu tài liệu có số trang vật lý khác logic.
    *   *Mình khác gì:* Tích hợp trực tiếp bên cạnh Slide Viewer của VLearn. Cung cấp "clickable link" để học viên click vào slide ID trên bản tóm tắt là Slide Viewer tự động cuộn đến đúng trang đó, không cần chuyển tab hay lội trang thủ công.
*   **[Khanmigo (Khan Academy)]:**
    *   *Flow:* Khung chat AI đồng hành bên phải màn hình học. AI gợi ý câu hỏi để học sinh tự suy nghĩ và giải bài tập (phương pháp Socratic), không trả lời ngay.
    *   *Đáng học:* Kích thích tư duy chủ động, hướng dẫn học viên từng bước rất thông minh.
    *   *Đáng né:* Hoạt động trong ngữ cảnh hẹp của bài học hoặc trang hiện tại, không có tính năng tóm tắt toàn bộ tài liệu giảng dạy đa trang để ôn tập nhanh trước quiz.
    *   *Mình khác gì:* Tập trung giải quyết bài toán tóm tắt đa tầng (Map-Reduce) và trích xuất chỉ số slide để ôn tập nhanh trước quiz/ôn thi, thay vì chỉ tương tác chat gợi mở.

---

## §4. Thiết kế
*   **Lát cắt MỘT CÂU:** 1 học viên sau buổi học mở file slide 50 trang, AI sẽ tóm tắt nội dung chính của bộ slide và trả về các slide chứa nội dung đó giúp học viên bấm vào là mở ngay đúng slide gốc để nắm chắc bài.
*   **Non-goals (≥3 thứ KHÔNG build):**
    1. Không build hệ thống quản lý/upload file slide mới cho giảng viên (chỉ xử lý slide có sẵn trong bài học).
    2. Không sinh câu hỏi trắc nghiệm tự động (Quiz generator) từ bản tóm tắt.
    3. Không build tính năng giải thích chi tiết từng dòng chữ trên slide.
*   **Mức prototype nhắm tới:** `[ ] Sketch  [x] Mock  [ ] Working`
    - **Phần chạy thật (AI thật ở lõi):** Prompt và cuộc gọi Gemini API (sử dụng API key thật) thực hiện tóm tắt (Map-Reduce Summarization) dựa trên dữ liệu text slide đầu vào và trích xuất cấu trúc JSON có định danh số trang.
    - **Phần giả lập (Mock):** Giao diện Slide Viewer hiển thị bài học của VLearn và cơ chế click chuyển trang slide gốc. Hệ thống không cho phép tải file PDF bất kỳ mà chỉ nạp sẵn text và ảnh của bộ slide bài giảng Day 1 & Day 2 để demo.
*   **Automation:** `[x] conditional` — AI tự động xử lý slide có đủ text; chuyển sang thông báo thủ công khi gặp slide hình ảnh/không có text.
*   **Lý do theo cost-of-error:** Nếu AI bịa nội dung hoặc trích dẫn sai số trang, học viên sẽ học sai kiến thức — đây là lỗi loại ④ đặc thù domain, chi phí sai rất cao. Do đó chọn conditional thay vì automate hoàn toàn.
*   **§4b. Nguyên tắc đã áp dụng (≥4 — HAX/PAIR):**

| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **G1 — Làm rõ hệ thống làm được gì** | Giao diện chào mừng trong khung chat AI bên phải ghi rõ: *"Tôi là AI hỗ trợ học tập, tôi có thể tóm tắt nhanh nội dung chính của cả bộ slide Day 1/Day 2 này và trích dẫn số trang đi kèm."* |
| **G2 — Làm rõ nó làm tốt đến đâu** | Dưới bản tóm tắt, hiển thị thông báo nhỏ: *"Bản tóm tắt được trích xuất tự động từ text của slide. Đối với slide chứa hình ảnh hoặc code phức tạp, tôi khuyến nghị bạn click vào link để xem slide gốc."* |
| **G10 — Thu hẹp phạm vi khi nghi ngờ** | Khi AI không chắc chắn về chủ đề của một slide cụ thể, nó sẽ để nhãn *"Chưa phân loại"* kèm link slide để học viên tự kiểm tra, thay vì tự ý bịa nội dung. |
| **G11 — Giải thích vì sao** | Cạnh mỗi mục tóm tắt kiến thức đều có ký hiệu `[Slide XX]`. Khi học viên click vào, Slide Viewer bên trái sẽ tự động cuộn đến đúng trang slide tương ứng để học viên đối chiếu nguồn gốc thông tin. |

---

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản (≥8) [bảng theo guide §2.5]

*(Các kịch bản dưới đây được xây dựng dựa trên dữ liệu slide nạp sẵn và log lỗi thực tế từ [evidence-summarization-FULL.md](./validation/evidence-summarization-FULL.md))*

| Tình huống cụ thể | Lớp | Hành vi mong muốn (nói gì, hiện gì, làm gì tiếp) | Nguyên tắc áp |
|---|---|---|---|
| Học viên yêu cầu *"tóm tắt toàn bộ slide"* nhưng một trang slide trong bộ nạp sẵn không có text layer (chỉ có ảnh). | **① Nguồn sự thật** | Hiển thị rõ: *"Slide [X] không chứa văn bản đọc được. Hãy mở trực tiếp slide gốc để xem hình ảnh/sơ đồ."* — không cố đoán hay bịa. | G10 |
| AI tóm tắt nhưng đưa ra khái niệm không có trong slide (hallucination). | **① Nguồn sự thật** | Bắt buộc grounding: mọi câu tóm tắt phải trace được về text slide nguồn. Nếu không có trong slide thì ghi rõ *"Thông tin này không có trong tài liệu slide."* | PAIR (Explainability) |
| Học viên yêu cầu tóm tắt nhưng hệ thống gặp lỗi kết nối hoặc mất dấu cấu trúc bộ slide nạp sẵn. | **② Mơ hồ / Thiếu thông tin** | Hiển thị thông báo lỗi tường minh: *"Không thể đọc cấu trúc bộ slide mẫu hiện tại. Vui lòng tải lại trang để thử lại."* | PAIR (Graceful Failure) |
| Học viên yêu cầu tóm tắt đến slide số 44 trong khi bộ slide Day 1 & Day 2 nạp sẵn chỉ có 29 trang. | **② Mơ hồ / Thiếu thông tin** | Thông báo: *"Tài liệu này chỉ có 29 trang. Tôi sẽ thực hiện tóm tắt toàn bộ 29 trang có sẵn."* | G2 |
| Học viên hỏi các câu hỏi ngoài phạm vi nội dung slide nạp sẵn (ví dụ: *"cho mình xin đáp án quiz"*). | **③ Ngoài phạm vi** | Từ chối rõ ràng nhưng hữu ích: *"Tôi chỉ hỗ trợ tóm tắt nội dung slide bài giảng này. Để chuẩn bị cho quiz, bạn nên ôn tập các nội dung ở [Slide 15] và [Slide 22]."* | G10 |
| Học viên yêu cầu tóm tắt bộ slide Day 5 (hệ thống mock chưa nạp sẵn dữ liệu này). | **③ Ngoài phạm vi** | Thông báo: *"Bản mock hiện tại chỉ hỗ trợ dữ liệu slide Day 1 và Day 2. Các tài liệu khác vui lòng thử lại ở bản chính thức."* | G1 |
| Bộ slide mẫu chứa các thuật ngữ chuyên ngành (ví dụ: *Golden Set, Chain-of-Thought*), AI dịch thô sang tiếng Việt gây khó hiểu. | **④ Đặc thù domain** | Giữ nguyên thuật ngữ tiếng Anh gốc và đặt chú giải ngắn trong ngoặc — không tự ý dịch nghĩa thô kệch. | PAIR (Mental Models) |
| Slide chứa đoạn code Python/pseudo-code minh họa thuật toán. AI cố diễn giải thành văn xuôi tiếng Việt. | **④ Đặc thù domain** | Giữ nguyên block code mẫu, chỉ ghi tóm tắt: *"Đoạn code tại [Slide 22] minh họa thuật toán. Vui lòng xem slide gốc để học đúng cú pháp."* | G11 |

---

## §6. Bốn đường đi của trải nghiệm
*   **Happy path:** Học viên mở bộ slide mẫu → Bấm "Tóm tắt toàn bộ" → AI xử lý thành công qua API thật → Trả về bản tóm tắt phân mục kèm link `[Slide XX]` clickable → Học viên click → Giao diện mock cuộn đúng trang slide.
*   **Low-confidence (②):** Trang slide mẫu có ít chữ hoặc hình ảnh → AI hiển thị: *"Slide [X] chủ yếu là sơ đồ/hình ảnh. [Bấm để mở slide gốc]"*
*   **Failure/không căn cứ (①):** Lỗi API hoặc không đọc được text slide → AI thông báo rõ nguyên nhân trực tiếp thay vì im lặng hoặc trả lời vòng vo.
*   **Correction (user sửa):** Học viên phát hiện tóm tắt sai → Nhấp nút "Báo lỗi tóm tắt" trên giao diện mock → Hệ thống ghi nhận phản hồi để cập nhật context.
*   **Khi bị đòi ngoài phạm vi (③):** AI từ chối rõ ràng + định hướng học viên quay lại ôn tập các slide mẫu có sẵn.
*   **Case đặc thù domain (④):** Gặp slide chứa code/công thức → AI giữ nguyên format Markdown code block và chèn link slide gốc, không cố dịch nghĩa.

---

## §7. Kiểm thử
*   **Chiều chất lượng + định nghĩa kiểm chứng được:**
    1. **Citation Accuracy:** Mỗi mục tóm tắt phải có `[Slide X]` khớp chính xác với trang chứa nội dung đó. Đạt/Không đạt — người ngoài nhóm chấm được.
    2. **Faithfulness (không bịa):** Nội dung tóm tắt chỉ đến từ text trong slide nạp sẵn, không chứa thông tin ngoài. Thang 1–5: (1=bịa nhiều, 5=100% grounded).
    3. **Fail Handling:** Với các case lỗi (slide trống, ngoài phạm vi) — hệ thống hiển thị thông báo xử lý lỗi tường minh. Đạt/Không đạt.
*   **Golden set (≥20 case — lưu tại `eval/`):**
    - Đánh giá trực tiếp trên các kịch bản tóm tắt và câu hỏi liên quan đến bộ slide Day 1 & Day 2 nạp sẵn.
    - Cơ cấu: 4 case lớp ①, 4 case lớp ②, 4 case lớp ③, 4 case lớp ④, và 8 case yêu cầu tóm tắt thông thường.
    - Trong đó có ít nhất 10 case lấy từ 97 câu hỏi tóm tắt thật trong chatlog.
*   **Quality bar (Chốt từ 23:59 N1 — KHÔNG thay đổi sau đó):**
    - "Đạt khi ≥ **80%** số case qua bộ Golden Set, và không có case nào thuộc lớp ① bị bịa nội dung không có trong slide."
*   **Kết quả các lượt chạy (cập nhật đến trước CP6):**

| Lượt chạy | Thời điểm | % Pass Citation | Điểm Faithfulness TB | Đạt/Không đạt Quality Bar | Action tiếp theo |
|---|---|---|---|---|---|
| Lượt 1 | *(CP3 — 10:30 N2)* | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật |
| Lượt 2 | *(Trước CP6)* | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật | ⚠️ Chờ cập nhật |

---

## §8. Phân công & kế hoạch
*   **Phân công có tên:**
    *   **Phạm Gia Bảo** — 2A202601506: Xây dựng Agent Flow (Map-Reduce Summarization logic & trích xuất JSON).
    *   **Đinh Hồng Đăng** — 2A202601480: Thiết kế Prompt hệ thống + xây dựng bộ Golden Set trong `eval/`.
    *   **Nguyễn Ngọc Hiệp** — 2A202601156: Thiết kế và xây dựng Dataflow (trích xuất slide, metadata trang, chunking).
    *   **Nguyễn Văn Huy Hoàng** — 2A202601338: Thu thập và hoàn thiện toàn bộ Evidence (Chuẩn A khảo sát & Chuẩn B mining chatlog).
    *   **Phạm Nam Khánh** — 2A202601718: Viết Spec + Chuẩn bị kế hoạch validation CP5.
*   **Willing users (≥3 tên) + kế hoạch vòng validation CP5:**
    *   *Danh sách:* Lê Văn Tuấn, Phùng Văn Linh, Nguyễn Khánh Toàn, Trương Minh Hoàng, Trần Đăng Nguyên 
    *   *Kế hoạch validation (3 câu hỏi, theo guide §4.2):*
        1. *"Điều gì khó hiểu hoặc khó chịu nhất khi dùng thử?"*
        2. *"Kết quả tóm tắt và trích dẫn này bạn có tin không — vì sao?"*
        3. *"Bạn có dùng thật không — vì sao / vì sao chưa?"*
    *   *Người log:* Phạm Nam Khánh — lưu tại [validation/feedback_log.md](./validation/feedback_log.md)
*   **Multi-prototype:**
    - *Phương án 1 (Giao diện Mindmap):* Hiển thị tóm tắt dưới dạng cây sơ đồ tư duy (mindmap) tương tác. Ưu: Rất trực quan. Nhược: Khó hiển thị mượt mà trên khung chat AI hẹp của VLearn, lập trình phức tạp trong thời gian ngắn.
    - *Phương án 2 (Giao diện Bullet Points kèm Clickable Links):* Tóm tắt dạng danh sách phân mục lớn (Chương 1, Chương 2...) kèm link `[Slide XX]` để click cuộn trang. Ưu: Khả thi cao, hiển thị rõ ràng, tối ưu cho không gian hẹp.
    - *Quyết định chọn:* Chọn **Phương án 2** vì tính khả thi cao trong 1.5 ngày hackathon và tương thích tốt nhất với khung chat AI hiện tại của VLearn.

---

## §9. Changelog

| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|---|---|---|
| **CP5 - Sau Validation** | Tái cấu trúc UI xem slide sang dạng cuộn liên tục (Continuous Scroll Stack) và auto-scroll nhảy trực tiếp khi click citation link. | Giải quyết phản hồi của **Lê Văn Tuấn (01016)** về việc UI chưa tối ưu và phân trang quá nhiều. |
| **CP5 - Sau Validation** | Thiết kế lại giao diện 2 cột tinh giản, ẩn bớt các nút bấm phụ và thông tin không cốt lõi để giảm cognitive load. | Khắc phục phản hồi của **Phùng Văn Linh (01992)** về việc giao diện quá nhiều thông tin gây ảnh hưởng tập trung. |
| **CP5 - Sau Validation** | Thêm cơ chế phát hiện slide chứa sơ đồ/graph, hiển thị đề xuất học viên mở ảnh gốc thay vì ép OCR phân tích thô. | Khắc phục lỗi OCR đọc sai hình vẽ/biểu đồ dẫn đến trích dẫn sai của **Nguyễn Khánh Toàn (01738)**. |
| **CP5 - Sau Validation** | Nâng cấp Context Tracking giữ ngữ cảnh hội thoại; bổ sung prompt cấu trúc giải thích 4 bước kèm ví dụ so sánh ẩn dụ thực tế. | Khắc phục phản hồi của **Trương Minh Hoàng (01262)** về việc liên tục RAG lại kiến thức sẵn có và ví dụ giải thích chưa trực quan. |
| **CP5 - Sau Validation** | Sửa bug tách context và logic phân mảnh khi tóm tắt một slide cụ thể, tối ưu prompt giảm thiểu tỷ lệ sai sót. | Khắc phục bug tóm tắt 1 slide cụ thể bị sai lệch của **Trần Đăng Nguyên (01798)**. |
