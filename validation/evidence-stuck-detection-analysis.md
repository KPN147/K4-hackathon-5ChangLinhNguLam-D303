# Báo cáo Phân tích Dữ liệu: AI tự động phát hiện học viên bị stuck và chủ động hỗ trợ

**Phạm vi phân tích:** 
- Chatlog: `chat_history_anonymized_for_hackathon.csv` (1,261 turn chat, 2,522 tin nhắn, 369 học viên, 585 cuộc hội thoại).
- Transcript bài giảng sạch: Thư mục `data/vlearn-pack/transcript/` ( Day 1 - Day 5).

---

## 1. Số liệu định lượng từ Chatlog

Qua khảo sát dữ liệu bằng các mẫu từ khóa thể hiện sự bế tắc, kẹt lỗi hoặc không hiểu (`không hiểu`, `chưa hiểu`, `bị lỗi`, `tại sao`, `không chạy`, `stuck`, `kẹt`...), thu được các chỉ số sau:

*   **Tỷ lệ hội thoại có học viên bị stuck:** **35/585 cuộc hội thoại (5.98%)** xuất hiện ít nhất một lần học viên gặp bế tắc.
*   **Tỷ lệ turn chat bị stuck:** **39/1,261 turn chat (3.09%)**.
*   **Số lượng học viên bị stuck:** **32/369 học viên (8.67%)**.
*   **Tỷ lệ bỏ cuộc (Churn rate) sau khi bị stuck:** **18/35 cuộc hội thoại (51.43%)** kết thúc ngay lập tức sau turn chat mà học viên thể hiện trạng thái stuck.
*   **Tỷ lệ đánh giá tiêu cực (Downvote):** Chỉ ghi nhận **1 trường hợp downvote** trực tiếp tại các turn bị stuck (do tỷ lệ rating chung toàn hệ thống rất thấp, chỉ khoảng ~2.8%).

### Các từ khóa hàng đầu xuất hiện khi học viên bị stuck:
1.  **"tại sao"**: 16 lần (Học viên hỏi tại sao hệ thống chạy sai hoặc tại sao không ra kết quả).
2.  **"lỗi"**: 11 lần (Nhắc đến lỗi cú pháp, lỗi load trang, lỗi kết nối).
3.  **"không hiểu" / "chưa hiểu"**: 9 lần (Mơ hồ về mặt kiến thức).
4.  **"không được"**: 4 lần (Làm theo hướng dẫn nhưng không ra kết quả).

---

## 2. Các tình huống kẹt thực tế (Quotes từ Chatlog)

Dưới đây là một số trường hợp học viên bị stuck điển hình trích xuất từ dữ liệu:

*   **Tình huống 1: Lỗi hệ thống không tải được slide bài giảng**
    > **Học viên U0244 (Turn T0998):** *"Tại sao của tôi không load được trang slide"*
    > **Tutor phản hồi:** *"Rất tiếc... mình không có quyền truy cập trực tiếp vào hệ thống kỹ thuật... bạn có thể thử F5, kiểm tra mạng, thử trình duyệt khác..."*
    > *(Học viên không được giải quyết triệt để và dừng hội thoại ngay sau đó)*

*   **Tình huống 2: AI Tutor trích dẫn số trang không tồn tại khiến học viên đi tìm và bị kẹt**
    > **Học viên U0100 (Turn T0154):** *"tại sao có lưu ý như trang 25"*
    > **Tutor phản hồi:** *"Rất tiếc, mình đã kiểm tra lại các tài liệu của bài học hôm nay nhưng không thấy trang 25 đề cập đến lưu ý nào như bạn mô tả..."*

*   **Tình huống 3: AI Tutor từ chối trả lời do lỗi dữ liệu / mất ngữ cảnh**
    > **Học viên U0091 (Turn T0531 - Rating: DOWN):** *"tại sao chưa xử lí được"*
    > **Tutor phản hồi:** *"Rất tiếc hiện tại mình không tìm thấy nội dung chi tiết về các hạn chế xử lý của ReAct Agent tại trang 8 trong tài liệu được cung cấp..."*

---

## 3. Dẫn chứng từ Transcript bài giảng

Trong các buổi giảng dạy thực tế, vấn đề học viên bị kẹt (stuck) và cách giải quyết cũng được đề cập rõ nét:

*   **transcript-03-clean.md (Đoạn [T03-039]):** 
    > Giảng viên chia sẻ: *"Khi dự án chạy được vài tuần, các bạn mới chia sẻ với mình, hỏi chỗ này bị stuck. Mình nói luôn: chỗ đấy stuck chắc rồi. Tại vì cái problem đấy không thể giải quyết được bằng LLM, hoặc cái thứ các bạn làm còn chưa clear được cái delivery item nữa."*
*   **transcript-03-clean.md (Đoạn [T03-040]):**
    > Giảng viên nhấn mạnh vai trò chủ động: *"Nếu cả hai bên nói chuyện mà thấy dự án stuck rồi — đừng làm, chọn cái khác... Quan trọng nhất là các bạn có được kỹ năng, hiểu được, và có cái mindset làm việc..."*

---

## 4. Kết luận và Lý do không chọn ứng viên tính năng này

Mặc dù tỷ lệ bỏ cuộc (churn rate) sau khi bị stuck là rất cao (**51.43%**), nhóm phát triển quyết định **LOẠI** ứng viên tính năng này vì các lý do sau:

1.  **Quy mô ảnh hưởng nhỏ:** Tỷ lệ học viên bị stuck trong dữ liệu chatlog thực tế khá thấp (**5.98% hội thoại**), chưa đủ lớn để ưu tiên hàng đầu so với pain point tóm tắt tài liệu giảng dạy (ảnh hưởng đến **25.7%** tổng số người dùng).
2.  **Độ khả thi kỹ thuật thấp:** Việc định nghĩa thế nào là "bị stuck" của học viên rất mơ hồ. Hệ thống dễ rơi vào trạng thái "chủ động làm phiền" (spam thông báo gợi ý) nếu thuật toán phát hiện stuck có tỷ lệ dương tính giả cao. Việc xây dựng một bộ trigger chuẩn xác trong khung thời gian 1.5 ngày hackathon là không khả thi.
