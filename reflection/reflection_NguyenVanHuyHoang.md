# Báo cáo Reflection Cá nhân — Nguyễn Văn Huy Hoàng

- **Họ và tên:** Nguyễn Văn Huy Hoàng
- **Mã số học viên:** 2A202601338
- **Nhóm:** Nhóm 5 Chàng Lính Ngự Lâm · Zone K4 · Track A VLearn
- **Dự án:** VLearn — Tóm tắt slide bài giảng và trích dẫn số trang

---

## 1. Vai trò của tôi trong nhóm

Tôi đảm nhận vai trò **Evidence Owner**, chịu trách nhiệm thu thập, kiểm tra và tổng hợp các bằng chứng chứng minh pain point của người dùng. Phần việc chính của tôi gồm **Evidence Đường A — khảo sát người dùng** và **Evidence Đường B — mining dữ liệu chatlog thực tế**.

Ngoài ra, tôi hỗ trợ đối chiếu kết quả evaluation với Quality Bar của nhóm, kiểm tra xem các kết luận PASS/FAIL đã có đủ evidence hay chưa. Tôi **không phụ trách thiết kế System Prompt hoặc xây dựng Golden Set**; phần Golden Set và runner do thành viên phụ trách Prompt Engineering và Testing thực hiện. Vai trò của tôi là kiểm tra, tổng hợp và trình bày trung thực các bằng chứng liên quan.

## 2. Phần việc tôi đã thực hiện

- **Thu thập và tổng hợp Evidence Đường A — Khảo sát:**
  - Tôi phối hợp chuẩn bị nội dung khảo sát nhằm kiểm tra hai vấn đề: học viên có thực sự gặp khó khăn khi AI Tutor không tóm tắt được toàn bộ slide hay không, và tính năng tóm tắt kèm trích dẫn trang có hữu ích với họ hay không.
  - Kết quả khảo sát gồm 24 người ngoài nhóm:
    - 23/24 người, tương đương 95,8%, xác nhận gặp khó khăn.
    - 23/24 người đánh giá tính năng đề xuất là hữu ích.
    - Câu hỏi khảo sát và từng phản hồi được lưu lại dưới mã ẩn danh R01–R24 trong `validation/survey_log.md`.
  - Tôi đối chiếu kết quả này với chuẩn Evidence Đường A: tối thiểu 20 người ngoài nhóm, ít nhất 50% xác nhận và có log đầy đủ. Kết quả cho thấy nhóm đáp ứng các ngưỡng định lượng của Đường A.

- **Mining chatlog cho Evidence Đường B:**
  - Tôi phụ trách tổng hợp evidence từ bộ dữ liệu gồm 2.522 dòng tin nhắn, 1.261 turn chat, 369 người dùng và 585 hội thoại.
  - Để việc thống kê có thể kiểm tra lại, nhóm định nghĩa các quy tắc nhận diện:
    - Yêu cầu tóm tắt.
    - Yêu cầu tóm tắt ở phạm vi toàn bộ tài liệu hoặc buổi học.
    - Trường hợp AI Tutor thất bại hoặc từ chối.
    - Citation rỗng, downvote và hành vi dừng hội thoại.
  - Kết quả chính:
    - 138 lượt yêu cầu tóm tắt, chiếm 10,9% tổng số turn.
    - 95/369 người dùng từng chủ động yêu cầu tóm tắt.
    - 97 lượt yêu cầu tóm tắt ở cấp tài liệu hoặc buổi học.
    - Tỷ lệ Tutor thất bại với yêu cầu tóm tắt là 54,3%.
    - Tỷ lệ citation rỗng là 64,5%.
    - 8/37 downvote toàn hệ thống liên quan đến câu hỏi tóm tắt.
    - 54% người dùng kết thúc hội thoại ngay sau khi bị từ chối tóm tắt.
  - Tôi lưu phương pháp đếm, số liệu tổng hợp và các câu chat nguyên văn có Turn ID, User ID, số trang và rating trong `validation/evidence-summarization-FULL.md`. Evidence này đáp ứng Đường B vì có số đếm, nhiều hơn 5 ví dụ nguyên văn và phương pháp có thể kiểm tra lại.

- **Hỗ trợ phân tích Impact và lựa chọn ý tưởng:**
  - Từ evidence khảo sát và chatlog, tôi cung cấp số liệu để nhóm so sánh ba ứng viên:
    1. Tóm tắt toàn bộ slide có trích dẫn số trang.
    2. Phát hiện học viên bị stuck để chủ động hỗ trợ.
    3. Gợi ý câu hỏi follow-up sau phiên học.
  - Dữ liệu cho thấy tóm tắt slide có quy mô nhu cầu lớn và rõ ràng nhất: 25,7% người dùng từng yêu cầu tóm tắt, trong khi stuck ảnh hưởng đến 8,67% người dùng và follow-up không có nhu cầu tự phát trong chatlog. Các báo cáo phân tích được lưu trong thư mục `validation/`.

- **Audit evidence chất lượng:**
  - Tôi không xây dựng Golden Set, nhưng tham gia kiểm tra evidence được tạo ra từ Golden Set và runner. Tôi phân biệt rõ:
    - Evidence A/B dùng để chứng minh pain point.
    - Quality Evaluation dùng để đánh giá chất lượng MVP.
  - Khi rà soát báo cáo retest, tôi không chỉ sử dụng tỷ lệ PASS do LLM Judge đưa ra mà kiểm tra lại các case có placeholder, citation không tồn tại hoặc output không có slide context. Lượt tự động ghi nhận 37/44 case PASS, tương đương 84,1%, nhưng manual audit phát hiện nhiều case không đáp ứng điều kiện “0 hallucination”. Vì vậy, tôi ghi nhận kết luận trung thực rằng hệ thống hiện **chưa đạt Quality Bar**, thay vì chỉ dựa vào tỷ lệ tự động để tuyên bố đạt.

## 3. Cách AI đã hỗ trợ tôi hoàn thành công việc

AI hỗ trợ tôi trong việc xây dựng quy trình phân tích dữ liệu, gợi ý các nhóm từ khóa để nhận diện yêu cầu tóm tắt và giúp kiểm tra lại cách tính tỷ lệ. Tuy nhiên, tôi không sử dụng trực tiếp kết quả AI như bằng chứng cuối cùng; các con số vẫn phải truy ngược về chatlog và phương pháp đếm.

AI cũng hỗ trợ tôi:

- Chuẩn hóa cấu trúc báo cáo khảo sát và mining.
- Phân nhóm các yêu cầu tóm tắt theo phạm vi trang, tài liệu và buổi học.
- So sánh các ứng viên tính năng bằng dữ liệu định lượng.
- Phát hiện những điểm chưa đủ evidence trong báo cáo evaluation.
- Tìm các case có `[Slide X]`, citation vượt số trang hoặc output được tạo khi không có context.
- Trình bày báo cáo theo cấu trúc rõ ràng để người khác có thể phúc khảo.

Bài học quan trọng là AI có thể hỗ trợ xử lý và tổ chức dữ liệu, nhưng con người vẫn phải kiểm tra nguồn, công thức và tính hợp lệ của từng kết luận.

## 4. Bài học xương máu từ các case fail

- **Một tỷ lệ PASS cao chưa đủ để kết luận sản phẩm đạt:**
  - Lượt retest tự động ghi nhận 37/44 case PASS, tương đương 84,1%. Nếu chỉ nhìn con số này, nhóm có thể kết luận đã vượt ngưỡng 80%. Tuy nhiên, manual audit phát hiện một số case được Judge PASS dù output dùng `[Slide X]`, tạo citation không tồn tại hoặc giải thích kiến thức khi không được cung cấp slide context.
  - Từ đó tôi nhận ra rằng evidence không chỉ là ghi lại một con số đẹp. Evidence phải trả lời được con số đó được tính như thế nào, có thể kiểm tra lại không và có bỏ sót lỗi nghiêm trọng hay không.

- **LLM Judge không thể thay thế hoàn toàn người đánh giá:**
  - Case GS-037 được Judge đánh PASS vì giữ nguyên thuật ngữ RLHF, nhưng output tự giải thích toàn bộ quy trình RLHF khi runner không truyền slide context và còn sử dụng `[Slide X]`. Theo Quality Bar của nhóm, đây là hallucination và phải FAIL ngay.
  - Bài học của tôi là các điều kiện quan trọng như hallucination, fake citation và trang không tồn tại cần được kiểm tra bằng rule rõ ràng hoặc audit thủ công, không nên giao hoàn toàn cho một LLM Judge.

- **Citation phải có expected source mới đo được độ chính xác:**
  - Golden Set hiện chưa có trường `expected_pages`, nên nhóm chưa thể tính Citation Accuracy một cách hợp lệ. Việc output có chuỗi `[Slide 20]` không đồng nghĩa citation đó đúng.
  - Tương tự, runner không bấm citation trên giao diện nên Navigation Accuracy chưa được đo. Tôi học được rằng khi thiếu dữ liệu để tính một metric, báo cáo đúng phải ghi **Not Measured**, không được tự suy ra tỷ lệ.

- **Evidence cần trung thực kể cả khi sản phẩm chưa đạt:**
  - Vai trò Evidence Owner không phải là cố chứng minh sản phẩm tốt, mà là giúp nhóm và người chấm nhìn thấy trạng thái thật. Việc ghi nhận hệ thống chưa đạt Quality Bar không phải thất bại của phần evidence. Ngược lại, đó là bằng chứng cho thấy nhóm có quy trình đánh giá minh bạch, không che giấu case lỗi và biết chính xác cần cải thiện phần nào.
  - Qua dự án, tôi hiểu rằng evidence tốt phải có nguồn, phương pháp, số liệu và giới hạn. Nếu một kết luận không thể truy vết hoặc tái kiểm tra, kết luận đó chưa đủ giá trị để dùng trong một dự án AI.
