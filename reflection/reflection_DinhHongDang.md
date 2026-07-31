# Reflection cá nhân

**Họ và tên:** Đinh Hồng Đăng  
**Mã sinh viên:** 2A202601480  
**Nhóm:** 5 Chang Linh Ngu Lam · Zone K4  
**Prototype:** VLearn — Tóm tắt slide bài giảng và trích dẫn số trang

---

# 1. Vai trò

Trong dự án, tôi đảm nhiệm vai trò **Prompt Engineering** (System Prompt) và xây dựng **Golden Set**. Trách nhiệm của tôi là đảm bảo "bộ não" của AI hoạt động chính xác theo đặc tả yêu cầu (SPEC), đồng thời xây dựng bộ công cụ đánh giá để kiểm chứng tính an toàn của mô hình trong quá trình kiểm thử.

## Trách nhiệm chính

- Xây dựng bộ dữ liệu vàng (Golden Set) bao phủ toàn diện 4 lớp rủi ro theo chuẩn HAX/PAIR.
- Thiết kế **System Prompt** theo hướng **principle-based** thay vì **hardcode** các kịch bản.
- Đảm bảo AI tuân thủ các guardrails về phạm vi tài liệu và hạn chế hallucination.

---

# 2. Phần tôi làm

## 2.1. Xây dựng bộ dữ liệu vàng (Golden Set)

Thay vì tự định nghĩa các kịch bản kiểm thử một cách chủ quan, tôi tiến hành **data mining** trên bộ dữ liệu `chat_history_anonymized.csv`. Tôi sử dụng script tự động để lọc ra **24 test case** đáp ứng các tiêu chí trong Spec §5 và §7.

### Phân loại test case

#### Lớp 1 – Nguồn sự thật (4 case)

- Kiểm tra rủi ro AI tự bịa nội dung khi không đọc được văn bản từ slide.

#### Lớp 2 – Mơ hồ / Thiếu thông tin

- Người dùng hỏi vượt quá số trang của tài liệu (ví dụ: slide 37 hoặc slide 50 trong khi tài liệu chỉ có 29 trang).
- Giả lập lỗi kết nối hoặc lỗi hệ thống.

#### Lớp 3 – Ngoài phạm vi (Out of Scope)

- Yêu cầu AI giải bài tập.
- Xin đáp án quiz.
- Hỏi tài liệu của buổi học khác (Day 5).

#### Lớp 4 – Đặc thù domain

- Thuật ngữ tiếng Anh chuyên ngành.
- Đoạn mã (code/pseudo-code).

#### Happy Path (8 case)

- Kiểm tra khả năng tóm tắt thành công và trích dẫn chính xác nguồn `[Slide XX]`.

Ngoài ra, để tối ưu quá trình **Human Evaluation** trong Hackathon, tôi xây dựng script tự động chuyển đổi Golden Set từ định dạng JSON sang Markdown (`ev.md`), giúp việc chấm điểm thủ công thuận tiện hơn.

---

## 2.2. Thiết kế System Prompt theo nguyên lý (Principle-based)

Dựa trên các kịch bản từ Golden Set, tôi thiết kế **System Prompt** theo hướng **dạy mô hình nguyên lý** thay vì **dạy theo ví dụ**.

Các cải tiến chính gồm:

- Chuyển từ hướng dẫn theo kịch bản sang hướng dẫn theo nguyên lý.
- Bổ sung các quy tắc xử lý linh hoạt như:
  - Scope Protection.
  - Data Gaps Handling.
- Thiết lập ranh giới vai trò rõ ràng để AI có thể từ chối các yêu cầu ngoài mục đích một cách hợp lý và nhất quán.

---

# 3. AI hỗ trợ như thế nào

## Phân tích dữ liệu (Data Mining)

AI hỗ trợ viết các script Python (`build_golden_set.py`, `fix_golden_set.py`) để phân loại hàng nghìn dòng chat log bằng regex, giúp tiết kiệm đáng kể thời gian xử lý thủ công.

## Audit và đối chiếu Spec

Sau khi Golden Set đầu tiên được tạo ra, AI hỗ trợ đối chiếu với `spec.md`, từ đó phát hiện và khắc phục 5 vấn đề quan trọng như phân loại nhầm lớp OOS hoặc trùng lặp test case.

## Phản biện thiết kế Prompt

AI đóng vai trò như một *sounding board*, giúp tôi nhận ra hạn chế của việc hardcode kịch bản trong prompt và chuyển sang phương pháp thiết kế dựa trên nguyên lý.

---

# 4. Bài học từ các case fail

## Phân loại nhầm câu hỏi hợp lệ thành OOS

Trong quá trình xây dựng Golden Set, tôi từng nhầm lẫn khi xếp các câu hỏi yêu cầu giải thích sâu thuật ngữ vào lớp **Ngoài phạm vi**. Bài học rút ra là: nếu nội dung vẫn tồn tại trong slide thì dù câu hỏi ở mức độ khó hay yêu cầu giải thích sâu, đó vẫn là yêu cầu hợp lệ. Việc xác định sai ranh giới sẽ khiến AI từ chối không cần thiết và làm giảm trải nghiệm học tập.

## Nguy cơ học vẹt của mô hình (Overfitting)

Khi chèn quá nhiều câu trả lời mẫu cho các tình huống lỗi vào System Prompt, mô hình có xu hướng phản hồi cứng nhắc và dễ thất bại khi đầu vào thay đổi nhẹ. Điều này cho thấy cần dạy mô hình **cách suy nghĩ** (kiểm tra tính hợp lệ của dữ liệu, nguyên tắc trích dẫn) thay vì **cách trả lời** theo từng kịch bản cụ thể.

## Sự cần thiết của định dạng đánh giá phù hợp

Ban đầu, Golden Set được lưu dưới dạng JSON, thuận tiện cho xử lý tự động nhưng gây khó khăn khi cả nhóm cần đánh giá thủ công trước buổi demo. Việc chuyển đổi sang Markdown (`ev.md`) cho thấy một bài học quan trọng về UI/UX nội bộ: công cụ không chỉ cần đúng về mặt kỹ thuật mà còn phải phù hợp với người sử dụng.

---

# 5. Điều tôi sẽ cải thiện

- **LLM-as-a-Judge:** Tích hợp Promptfoo để tự động đánh giá toàn bộ Golden Set thay vì chấm điểm thủ công.
- **Mở rộng Red Teaming:** Bổ sung các bài kiểm thử jailbreak và prompt injection để đánh giá khả năng chống tấn công của System Prompt.
- **A/B Testing Prompt:** So sánh nhiều phiên bản System Prompt trên cùng một Golden Set để đánh giá định lượng mức độ Faithfulness và lựa chọn kiến trúc tối ưu.