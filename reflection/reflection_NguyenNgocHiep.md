# Reflection — Nguyễn Ngọc Hiệp · 2A202601156

Nhóm 5 Chang Linh Ngu Lam · Zone K4 · D303
Đề tài: Tóm tắt slide bài giảng & Trích dẫn số trang (Map-Reduce Slides Summarizer)

---

## 1. Vai trò

**Dataflow** — trích xuất slide, metadata trang, chunking (spec §8).

Phần này nằm ở đầu chuỗi: đầu vào là 2 file PDF bài giảng, đầu ra là dữ liệu nạp sẵn cho
cả hai người phía sau — Gia Bảo dùng để chạy Map-Reduce, Hồng Đăng dùng để dựng golden set.
Tôi xong muộn thì cả hai đứng chờ, nên đây cũng là phần tôi phải làm trước nhất.

## 2. Phần tôi làm

| Sản phẩm                                | Nội dung                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `tools/extract_slides.py`               | Trích text 58 trang từ 2 bộ slide, lọc watermark, sinh metadata + chunk + textSpans |
| `tools/render_slides.py`                | Render 58 trang thành PNG 110 DPI cho viewer                                        |
| `vlearn-web/lib/types.ts`               | Hợp đồng dữ liệu giữa Dataflow và UI                                                |
| `vlearn-web/data/slides-day0{1,2}.json` | 29 trang · 29 chunk · 3.344 + 4.762 textSpans mỗi bộ                                |

Commit: `a68b506`, `84ff188`, `db03221`, `efbbfd0`.

### Ba quyết định tôi phải tự lấy

**Không dùng OCR, dù phân công ghi "OCR & Chunking".**
Tôi đo trước khi làm: cả 58/58 trang đều có sẵn text layer, trang ít chữ nhất vẫn 95 ký tự.
OCR chỉ cần khi trang là ảnh scan. Ở đây dùng OCR sẽ vừa chậm hơn vừa kém chính xác hơn
việc đọc thẳng text layer. Tôi báo lại nhóm và đổi phân công cho khớp thực tế.

**Lọc watermark bằng tính lặp lại, không bằng cỡ chữ.**
Bản slide hackathon in chữ `HACKATHON - AI IN ACTION` chéo qua giữa mọi trang, và trình
trích text đọc nó thành từng ký tự rời chen vào giữa nội dung thật:

```
AI IN ACTION  Day 1
N
O
H            <- watermark, đọc ngược là "...KATHON"
AI & LLM Foundation C
```

Cách hiển nhiên là lọc theo cỡ chữ, nhưng tôi đo ra tiêu đề slide 40,5pt còn watermark
46–49pt — quá gần, lọc kiểu đó sẽ ăn nhầm tiêu đề. Tôi chuyển sang dựa vào **vị trí lặp**:
watermark nằm đúng một toạ độ trên mọi trang, nội dung bài giảng thì không. Quy tắc thành
"loại ký tự xuất hiện ở cùng ô toạ độ trên ≥80% số trang". Kết quả bắt đúng 20 ô ở cả hai
bộ, cộng footer riêng của Day 2, không sót ký tự nào.

**1 chunk = 1 trang.**
Chiều chất lượng số 1 ở spec §7 là Citation Accuracy — mỗi ý tóm tắt phải trỏ đúng trang.
Gộp nhiều trang vào một chunk là mở đường cho đúng lỗi "trích dẫn nhảy trang" mà §3 đã ghi
nhận ở NotebookLM. Đổi lại là nhiều lời gọi API hơn, nhưng free tier ~1.500 request/ngày
nên 29 lần không thành vấn đề.

## 3. AI hỗ trợ thế nào

**Chỗ AI làm tốt:** viết script, dò cấu trúc PDF nhanh hơn tôi đọc tài liệu `pdfplumber`,
và quan trọng nhất là **viết đoạn kiểm chứng sau mỗi lần sửa**. Ví dụ sau khi lọc watermark,
nó tự đếm lại số ký tự rác còn sót, số ký tự icon-font, và đối chiếu độ dài `text` với
`textSpans` — nhờ vậy tôi biết chắc mình đã sạch chứ không phải "nhìn thấy có vẻ ổn".

**Chỗ tôi phải tự quyết:** ba quyết định ở mục 2 đều đến từ việc **đo trước rồi mới chọn**,
không phải từ gợi ý đầu tiên. Lần đầu hướng đi là lọc theo cỡ chữ — đo ra mới thấy sai.

**Một lần AI đề xuất sai và tôi phát hiện nhờ chạy thử:** khi sửa lỗi câu trả lời cụt,
phương án đầu là bắt model xuống dòng bằng `\n` bên trong chuỗi JSON. Chạy thử thì model
xuất ký tự xuống dòng thật vào giữa chuỗi, làm JSON không hợp lệ và server rơi về nhánh dự
phòng — tệ hơn lỗi ban đầu. Phải đổi sang trả bullet thành mảng riêng mới chạy. Bài học:
đề xuất nghe hợp lý vẫn phải chạy thử mới biết.

## 4. Bài học từ một case fail của nhóm

**Case:** cùng một trang slide tồn tại hai phiên bản nội dung khác nhau.

Tôi viết bộ trích có lọc watermark. Song song đó, một bạn khác viết một script riêng để sinh
`textSpans` — lớp chữ vô hình phủ lên ảnh slide để học viên bôi đen chọn được. Script đó dùng
`extract_words()` thô, **không có bước lọc**.

Hậu quả trên trang 1 của Day 1:

|                                    | Số ký tự |
| ---------------------------------- | -------- |
| `text` — bản AI đọc để tóm tắt     | 106      |
| `textSpans` — bản học viên bôi đen | 147      |

Chênh 41 ký tự, đúng bằng phần watermark cộng ký tự icon-font. Tổng cộng **1.088 ô rác**
trên hai bộ.

**Vì sao nó nguy hiểm hơn vẻ ngoài:** watermark in chéo nên các ô rác nằm _xen kẽ giữa các
dòng chữ thật_. Học viên kéo chuột từ dòng này sang dòng kia là quét trúng `K`, `C`, `A`, `H`
rồi gửi lên AI. Tệ hơn, đoạn bôi đen có lẫn rác sẽ không khớp với bất kỳ chunk nào AI đang
có — vì chunk xây từ bản sạch. AI dễ trả lời trớt quớt hoặc bảo không tìm thấy, mà **đó đúng
là cái lỗi cũ của VLearn cả nhóm đang đi sửa**.

Lỗi này không văng ra màn hình đỏ. Không có exception, không có log. Nó chỉ làm chất lượng
câu trả lời tệ đi một cách âm thầm.

**Bài học:** dữ liệu dẫn xuất từ cùng một nguồn thì phải sinh ra từ **một lần xử lý duy nhất**.
Hai script cùng đọc một file PDF nhưng lọc khác nhau thì sớm muộn cũng lệch, và lệch kiểu này
không có gì báo động. Tôi gộp lại: `text`, `textSpans` và `chunks` giờ đều sinh từ cùng một
trang đã lọc trong `tools/extract_slides.py`, xoá script trùng. Sau khi gộp, độ dài hai bản
khớp nhau đúng 106 ↔ 106.

**Bài học phụ về quy trình:** gốc rễ không phải lỗi kỹ thuật mà là **hai người cùng làm một
việc mà không ai biết**. Nếu chốt trước "ai sở hữu file nào" thì đã không có hai bộ trích.
Có lúc tôi ghi đè mất file của bạn khác vì trùng tên mà không kiểm thư mục trước — cũng cùng
một gốc rễ đó.

---

## Nếu có thêm thời gian

- Trang sơ đồ nhiều cột bị lộn thứ tự chữ khi trích (ví dụ trang 3 Day 1). Nội dung không mất
  nhưng trật tự đọc sai, làm bản tóm tắt vài chỗ nghe rời. Cần trích theo cụm bố cục thay vì
  theo luồng đọc mặc định.
- Ngưỡng `hasText` hiện đặt cứng 20 ký tự. Tôi đã xuất sẵn `imageCount` và `textDensity` để
  sau đặt ngưỡng theo mật độ chữ thay vì đếm ký tự thô, nhưng chưa kịp dùng.
