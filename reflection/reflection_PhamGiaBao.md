# Reflection cá nhân

**Họ và tên:** Phạm Gia Bảo  
**Mã sinh viên:** 2A202601506
**Nhóm:** 5 Chang Linh Ngu Lam · Zone K4  
**Prototype:** VLearn — Tóm tắt slide bài giảng và trích dẫn số trang

## 1. Vai trò

Trong dự án, tôi phụ trách tích hợp và hoàn thiện prototype VLearn Web, tập trung vào luồng AI và khả năng đưa sản phẩm vào demo. Công việc của tôi nằm ở giao điểm giữa giao diện, API, prompt, kiểm thử và triển khai:

- kết nối luồng Summary với provider Vilao và luồng Tutor với Gemini;
- hoàn thiện Summary dạng Map-Reduce, các chế độ `balanced`, `deep`, `review`, cache và retry;
- cải thiện prompt để bản tóm tắt giữ được kiến thức chính thay vì chỉ liệt kê tiêu đề;
- xử lý các tình huống chọn nhầm nội dung, slide không có text và yêu cầu ngoài phạm vi Day 1/Day 2;
- kiểm tra lỗi quota, lỗi API, biến môi trường và cấu hình deploy Vercel/Cloudflare;
- đưa prototype vào `codebase/vlearn-web` theo cấu trúc repo của hackathon.

Tôi xem vai trò của mình không chỉ là viết code, mà còn là kiểm tra xem hành vi thực tế của hệ thống có đúng với problem statement, SPEC và rubric hay không.

## 2. Phần tôi làm

### Tích hợp sản phẩm

Tôi hoàn thiện giao diện học slide với hai luồng chính: Summary để xem nhanh toàn bộ bài và Tutor để hỏi đáp theo ngữ cảnh slide. Summary có thể chọn ba mục tiêu khác nhau:

- `balanced`: giữ ý chính và giải thích vừa đủ;
- `deep`: ưu tiên cơ chế, quan hệ nhân quả, ví dụ và giới hạn;
- `review`: ưu tiên định nghĩa, thuật ngữ, quy tắc và các ý cần nhớ.

Tóm tắt được cache theo từng chế độ, có nút “Tóm tắt lại” để chủ động tạo kết quả mới. Các thông báo lỗi được hiển thị trong giao diện thay vì dùng alert của trình duyệt, giúp trải nghiệm demo không bị gián đoạn.

### Provider, prompt và độ tin cậy

Tôi tách provider theo đúng mục tiêu của sản phẩm: Summary gọi Vilao, còn Tutor gọi Gemini. API key chỉ đọc từ biến môi trường server và không đưa vào mã nguồn. Prompt được bổ sung các nguyên tắc:

- chỉ trả lời dựa trên text slide được cung cấp;
- giữ thuật ngữ chuyên ngành tiếng Anh và giải thích ngắn bằng tiếng Việt;
- trích dẫn đúng số slide;
- nói rõ khi thông tin không có trong tài liệu;
- không đoán nội dung slide không có text;
- từ chối yêu cầu vượt ngoài Day 1, Day 2 hoặc vượt quá 29 slide.

## 3. AI hỗ trợ thế nào

AI hỗ trợ tôi ở bốn phần chính:

1. **Đọc và rà soát codebase:** AI giúp tìm các route, prompt, provider, cache, cấu hình môi trường và điểm giao nhau giữa UI với API.
2. **Phân tích lỗi:** AI giúp đối chiếu triệu chứng với log và response thực tế, từ đó phân biệt lỗi quota `429`, lỗi timeout, fallback logic và lỗi cấu trúc dữ liệu.
3. **Cải thiện prompt và test case:** AI giúp chuyển các lỗi trong golden set thành quy tắc cụ thể, ví dụ nhận diện `Ngày 04/05`, `Trang 35+` và selected text chỉ là câu lệnh “tóm tắt slide này”.
4. **Hỗ trợ thao tác triển khai:** AI hướng dẫn cấu hình Vercel, Cloudflare, environment variables và kiểm tra build.

Tuy nhiên, tôi không xem kết quả do AI sinh ra là bằng chứng cuối cùng. Tôi vẫn kiểm tra diff, chạy `typecheck`/`build`, gọi API thật, xem HTTP status và kiểm tra các file nhạy cảm trước khi commit. Các key thật chỉ nằm trong environment local hoặc dashboard deploy; không đưa vào prompt, log hay repository.

## 4. Bài học từ các case fail

### Case selected text không phải là nội dung slide

Một selected text như “tóm tắt slide này” chỉ là yêu cầu thao tác, không phải kiến thức. Nếu đưa thẳng nó vào model, model dễ hỏi lại người dùng hoặc tự suy diễn. Bài học là phải phân biệt **nội dung được chọn** với **câu lệnh của người dùng**, đồng thời hiển thị rõ hướng dẫn mở slide gốc khi không có text đọc được.

### Case vượt phạm vi tài liệu

Các yêu cầu như Day 4, Day 5, Trang 35 hoặc Trang 81 không nên được đưa tiếp vào retrieval và chờ model tự đoán. Tôi bổ sung guard deterministic cho Day 1/Day 2 và Slides 1–29 trước khi gọi model. Đây là ví dụ cho thấy những ràng buộc an toàn quan trọng nên được xử lý ở code, không chỉ giao cho prompt.

### Case quota và fallback

Khi Gemini trả `429`, route hiện tại retry các key rồi trả fallback thân thiện. Điều này tốt cho trải nghiệm người dùng nhưng có thể làm mất nguyên nhân kỹ thuật nếu không có logging/observability phù hợp. Bài học là cần phân biệt rõ lỗi hiển thị cho người dùng và thông tin chẩn đoán dành cho developer.

### Case model trả 200 nhưng vẫn chưa phù hợp

`occ/claude-opus-5` trả HTTP 200 không đồng nghĩa với việc phù hợp cho toàn bộ pipeline. Request ngắn sinh JSON tốt, nhưng Map-Reduce dài có latency cao và có thể vượt thời gian chờ. Vì vậy cần đánh giá cả chất lượng, format, latency và chi phí; không chỉ kiểm tra status code.

### Case deploy và secret

Một prototype chạy local chưa chắc đã chạy giống trên Vercel hoặc Cloudflare. Root Directory, environment variables, provider model và build config đều ảnh hưởng kết quả. Tôi rút ra quy trình: kiểm tra local → kiểm tra build → kiểm tra environment → deploy preview/production → thử lại luồng chính. Đồng thời phải giữ `.env.local`, `.dev.vars`, `.vercel`, `.wrangler`, `.open-next`, `node_modules` và dữ liệu render ngoài commit.

### Điều tôi sẽ cải thiện

Nếu có thêm thời gian, tôi sẽ:

- thêm observability cho số lần retry, status provider và latency từng stage;
- chạy lại golden set sau khi quota Gemini được bổ sung;
- đo riêng citation accuracy, faithfulness và thời gian Map-Reduce;
- hợp nhất bản prototype trong `codebase/vlearn-web` với cấu hình deploy sau khi xác nhận Root Directory mới trên Vercel;
- bổ sung validation log từ ít nhất ba người dùng willing-user theo đúng câu hỏi trong SPEC.

Reflection này ghi nhận cả phần làm được và phần chưa đạt; các kết quả đo được giữ nguyên, không chỉnh sửa để làm đẹp báo cáo.
