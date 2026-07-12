# Giảm cost/latency cho AI Copilot agent loop

**Ngày:** 2026-07-12
**Phạm vi:** `apps/backend/src/modules/ai/copilot-agent.harness.ts`, `apps/backend/src/modules/ai/openai.service.ts`

## Bối cảnh

Copilot chạy agent loop kiểu ReAct (`CopilotAgentHarness.runWithAdapter`, tối đa 5 iteration): gọi LLM →
nếu có `tool_calls` → thực thi từng tool **tuần tự** → đẩy kết quả vào messages → gọi LLM lại. Khi 1 câu hỏi
cần 2-3 tool (VD: vừa hỏi số liệu tháng vừa hỏi review queue), latency cộng dồn theo tổng thời gian từng tool,
dù các tool này độc lập nhau.

Ngoài ra, system prompt của Copilot (`OpenAiService.buildCopilotSystemPrompt`) khá dài và gần như tĩnh
(không nhét dữ liệu tài chính của tenant — chỉ tool trả dữ liệu động), nên về lý thuyết đủ điều kiện hưởng
OpenAI automatic prompt caching (áp dụng tự động cho prompt ≥1024 token, khớp prefix với request gần nhất).
Nhưng 1 dòng ngày/tháng hiện tại (`"tháng này" → tháng X năm Y`) nằm giữa văn bản làm gãy cache mỗi khi qua
ngày mới, khiến phần nội dung tĩnh phía sau dòng đó (~20 dòng) không được hưởng cache trong ngày đó.

Đây là 2 hạng mục **rủi ro thấp** trong 4 hướng đã brainstorm; 2 hướng còn lại (route heuristic bỏ qua LLM,
tóm tắt/paginate tool result lớn) đụng vào logic chọn tool/nghiệp vụ, để lại cho spec sau.

## Mục tiêu

- Giảm latency khi 1 lượt trả lời cần gọi ≥2 tool độc lập, bằng cách chạy chúng song song thay vì tuần tự.
- Tối đa hoá tỷ lệ prompt được OpenAI cache tự động, giảm cost/latency cho phần input token lặp lại giữa các
  request trong cùng ngày.
- Không thay đổi hành vi nghiệp vụ, không đổi thứ tự hiển thị activity card trên UI, không đổi cách xử lý lỗi
  từng tool.

## Thiết kế

### 1. Parallel tool execution (`copilot-agent.harness.ts`)

Vị trí hiện tại: `runWithAdapter`, đoạn thực thi tool trong `for (const call of result.toolCalls)`
(dòng ~121-143).

Thay đổi:

1. **Emit `functionToolCall` cho toàn bộ `result.toolCalls` theo đúng thứ tự mảng gốc, trước khi thực thi bất
   kỳ tool nào.** Lý do: `copilot-stream.service.ts` lắng nghe event này để (a) bắn SSE `activity` event ngay
   lập tức cho UI hiển thị "đang làm gì", (b) build danh sách `calledTools` dùng để dựng activity card cuối
   cùng qua `buildActivities()`. Cả 2 chỗ này phụ thuộc **thứ tự emit**, không phải thứ tự hoàn thành —
   parallel hoá việc thực thi không được làm xáo trộn thứ tự này.
2. **Dedupe trong cùng batch trước khi thực thi.** Với mỗi `call`, tính `cacheKey = name:argsRaw` như code
   hiện tại. Gom các call theo `cacheKey` duy nhất; với mỗi key duy nhất chưa có trong `toolResultCache`, tạo
   1 promise thực thi (giữ nguyên try/catch inline trả `{error: message}` khi lỗi — không để reject lọt ra
   `Promise.all`); các call trùng key trong cùng batch dùng chung kết quả của promise đó.
3. Dùng `Promise.all` chạy các promise thực thi độc lập song song, chờ tất cả xong.
4. Sau khi có kết quả, đẩy tool-result messages vào `messages` theo **đúng thứ tự `result.toolCalls` gốc**
   (không theo thứ tự Promise hoàn thành) — giữ tính xác định (deterministic) của message list gửi cho LLM ở
   iteration kế tiếp.
5. Cache thành công (`toolResultCache.set`) vẫn chỉ áp dụng cho kết quả không lỗi, giữ nguyên logic hiện tại.

An toàn dữ liệu: đã kiểm tra `apps/backend/src/modules/ai/tools/action-tools.ts` — 2 tool có vẻ "ghi"
(`propose_confirm_transaction_classification`, `propose_correct_transaction_classification`) thực chất chỉ
đọc dữ liệu và trả về đề xuất; không ghi DB (user phải bấm nút xác nhận riêng trên UI). Các tool còn lại
(account/report/review/knowledge/billing) đều read-only. Không có tool nào phụ thuộc kết quả của tool khác
trong cùng iteration → an toàn để chạy song song, không có race condition hay thứ tự ngầm cần giữ.

### 2. Dời dòng ngày/tháng xuống cuối system prompt (`openai.service.ts`)

Trong `buildCopilotSystemPrompt()`, dòng:
```
- "tháng này" / "hiện tại" → tháng ${now.getMonth() + 1} năm ${now.getFullYear()}
```
hiện nằm giữa mục `## Quy tắc gọi tool` (dòng 246, trước 2 dòng quy tắc khác và trước toàn bộ mục
`## Định dạng khi trả lời liên hệ CASSO`, `## Định dạng khi trả lời "Copilot làm được gì"`, `## Bảo mật`).

Thay đổi: chuyển dòng này xuống cuối cùng của prompt (sau `## Bảo mật`, hoặc thành 1 dòng phụ lục riêng ngay
trước dòng cuối). Toàn bộ nội dung tĩnh phía trước trở thành 1 prefix liên tục — tối đa hoá phần được OpenAI
cache tự động trong ngày, chỉ dòng ngày/tháng (và phần sau nó, nếu còn) mới đổi mỗi ngày.

Không cần thêm code theo dõi cache hit — SDK OpenAI trả sẵn `usage.prompt_tokens_details.cached_tokens`
trong response nếu sau này muốn quan sát qua log; không bắt buộc trong scope này.

### Không đổi

- Số iteration tối đa (5), cơ chế fallback provider, cơ chế ép trả lời cuối không kèm tool khi chạm giới hạn
  iteration — giữ nguyên toàn bộ.
- `cassoWebRule` (dòng 214-216, chèn ở dòng 245) không đổi vị trí — giá trị chỉ đổi khi config
  `COPILOT_CASSO_SEARCH_ENABLED` được toggle (hiếm, không phải biến động mỗi request/mỗi ngày), không đáng để
  refactor trong scope này.

## Testing

Cập nhật `copilot-agent.harness.spec.ts`:
- 1 LLM response trả về ≥2 `tool_calls` độc lập → assert thứ tự event `functionToolCall` khớp thứ tự gốc
  trong response, assert tool-result messages ở iteration kế tiếp cũng đúng thứ tự gốc.
- 1 trong nhiều tool call ném lỗi → assert tool đó trả `{error: ...}`, các tool khác vẫn có kết quả bình
  thường, loop không bị crash.
- 2 tool_calls trùng `name:args` trong cùng batch → assert `executeTool` chỉ được gọi 1 lần (dùng mock đếm số
  lần gọi).
- Test hiện có cho luồng tuần tự / cache giữa các iteration khác nhau (nếu có) phải vẫn pass không đổi assert.

Không cần test riêng cho phần dời dòng system prompt (chỉ đổi vị trí text, không đổi logic) — verify bằng
cách đọc lại `buildCopilotSystemPrompt()` output sau khi sửa.

## Ngoài phạm vi (để spec sau)

- Route heuristic bỏ qua LLM quyết định tool khi intent rõ ràng — đụng logic chọn tool, rủi ro nghiệp vụ.
- Tóm tắt/paginate tool result lớn (VD `list_review_queue`) trước khi đưa vào context — cần thiết kế riêng
  cho từng tool.
