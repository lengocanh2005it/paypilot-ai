# Route heuristic bỏ qua lượt LLM quyết định tool — pilot get_review_queue_count

**Ngày:** 2026-07-12
**Phạm vi:** `apps/backend/src/modules/ai/copilot-agent.harness.ts`,
`apps/backend/src/modules/ai/copilot-agent-factory.service.ts`, module mới
`apps/backend/src/modules/ai/copilot-intent-heuristic.ts`

## Bối cảnh

Đây là hạng mục (3) đã defer từ spec
[`2026-07-12-copilot-latency-cost-design.md`](./2026-07-12-copilot-latency-cost-design.md) vì đụng vào logic
nghiệp vụ chọn tool — hiện toàn bộ nằm trong system prompt (`openai.service.ts`, mục "## Quy tắc gọi tool"),
nơi LLM tự suy luận cả câu hỏi diễn đạt khác đi vẫn map đúng tool.

Mỗi lượt hỏi hiện tại luôn cần tối thiểu 1 lượt gọi LLM để quyết định gọi tool nào
(`copilot-agent.harness.ts`, `runWithAdapter`, iteration 0), sau đó thêm 1 lượt nữa để LLM đọc kết quả tool và
trả lời (iteration 1). Với câu hỏi có ý định rất rõ ràng và tool đích không cần suy luận tham số phức tạp
(0 tham số bắt buộc), lượt "quyết định gọi tool nào" là chi phí có thể tránh được nếu match được chắc chắn
bằng heuristic.

Pilot đợt này chỉ nhắm 1 tool duy nhất: `get_review_queue_count` (đếm giao dịch chờ duyệt) —
`apps/backend/src/modules/classification/classification.service.ts:243`
(`getCopilotReviewQueueCount(tenantId, year?, month?)`), 0 tham số bắt buộc, ý định câu hỏi khó nhầm với tool
khác (khác `list_review_queue` vốn dùng khi user muốn xem "danh sách/chi tiết").

## Mục tiêu

- Với câu hỏi khớp chính xác 1 trong các mẫu câu đã duyệt, bỏ qua lượt LLM "quyết định gọi tool", tiết kiệm 1
  round-trip (latency + token của lượt quyết định).
- Không thay đổi hành vi khi heuristic không match — toàn bộ câu hỏi khác đi qua luồng LLM quyết định tool như
  cũ, không đổi gì.
- Không có khả năng "kẹt cứng" nếu heuristic match nhầm hoặc dữ liệu tool không đủ trả lời — LLM vẫn có thể tự
  gọi thêm tool khác ở các iteration sau như luồng bình thường.
- Không đổi hành vi UI (activity card của `get_review_queue_count` vẫn hiển thị đúng như khi LLM tự gọi).

## Thiết kế

### 1. Module heuristic mới: `copilot-intent-heuristic.ts`

Tạo `apps/backend/src/modules/ai/copilot-intent-heuristic.ts`, export hàm thuần:

```typescript
const REVIEW_QUEUE_COUNT_PHRASES = new Set([
  'có bao nhiêu giao dịch đang chờ duyệt',
  'có bao nhiêu giao dịch chờ duyệt',
  'giao dịch chờ duyệt có bao nhiêu',
  'số giao dịch chờ duyệt',
  'còn bao nhiêu giao dịch chờ duyệt',
  'bao nhiêu giao dịch cần duyệt',
]);

export function matchReviewQueueCountIntent(message: string): boolean {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[?!.,]+$/g, '')
    .trim();
  return REVIEW_QUEUE_COUNT_PHRASES.has(normalized);
}
```

Chuẩn hoá: lowercase, trim, bỏ dấu câu kết thúc (`?`, `!`, `.`, `,` ở cuối câu). So khớp **toàn bộ câu** với
tập mẫu cứng — không dùng `includes`/keyword-contains, để tránh bắt nhầm câu hỏi có ý khác nhưng chứa cụm từ
tương tự.

### 2. Seed tool exchange vào harness — `copilot-agent.harness.ts`

Thêm tham số tuỳ chọn cuối cùng vào constructor `CopilotAgentHarness`:

```typescript
constructor(
  private readonly adapters: LlmAdapter[],
  systemPrompt: string,
  history: LlmMessage[],
  userMessage: string,
  private readonly tools: LlmTool[],
  private readonly executeTool: ToolExecutor,
  private readonly maxIterations = 5,
  private readonly seededToolCall?: { name: string; args: Record<string, unknown> },
) { ... }
```

Trong `run()` (dòng 79 hiện tại), **trước** vòng lặp fallback qua các adapter, chạy đúng 1 lần (không lặp lại
khi fallback sang adapter phụ vì `messages` được truyền chung, chỉ seed 1 lần):

```typescript
private async run(messages: LlmMessage[]): Promise<string> {
  if (this.seededToolCall) {
    await this.applySeededToolCall(messages);
  }

  let lastError: unknown;
  for (let i = 0; i < this.adapters.length; i++) {
    // ... không đổi
  }
}

private async applySeededToolCall(messages: LlmMessage[]): Promise<void> {
  const { name, args } = this.seededToolCall!;
  this.emit('functionToolCall', { name });

  const toolCallId = 'seeded_call_0';
  const cacheKey = `${name}:${JSON.stringify(args)}`;
  let output: unknown;
  try {
    output = await this.executeTool(name, args);
    this.toolResultCache.set(cacheKey, output);
  } catch (err) {
    output = { error: err instanceof Error ? err.message : String(err) };
  }

  messages.push({
    role: 'assistant',
    content: null,
    tool_calls: [
      { id: toolCallId, type: 'function', function: { name, arguments: JSON.stringify(args) } },
    ],
  });
  messages.push({ role: 'tool', tool_call_id: toolCallId, content: JSON.stringify(output) });
}
```

`runWithAdapter()` (loop LLM chính) **không đổi gì** — lượt gọi LLM đầu tiên của iteration 0 đã thấy sẵn kết
quả tool trong `messages`, thường trả lời trực tiếp (`result.toolCalls.length === 0` → return). Nếu model vẫn
muốn gọi thêm tool khác (heuristic match nhầm hoặc câu hỏi phức tạp hơn dự đoán), vòng lặp xử lý bình thường
— không có nhánh lỗi mới, không giảm `maxIterations` khả dụng.

**An toàn timing sự kiện `functionToolCall`:** `this.executeTool(...)` gọi Prisma thật (I/O thật), nên
`await` nhường control về caller trước khi `emit` chạy — đúng pattern đã có sẵn trong `runWithAdapter` (dòng
101-106 hiện tại), nơi `copilot-stream.service.ts` gắn `.on('functionToolCall', ...)` ngay sau khi tạo
harness và luôn kịp trước khi event đầu tiên bắn. Không cần đổi gì ở `copilot-stream.service.ts`.

### 3. Gọi heuristic trước khi tạo harness — `copilot-agent-factory.service.ts`

Trong `createCopilotRunner()` (dòng 44 hiện tại), trước khi `return new CopilotAgentHarness(...)`:

```typescript
const seededToolCall = matchReviewQueueCountIntent(message)
  ? { name: 'get_review_queue_count', args: {} }
  : undefined;
```

Truyền `seededToolCall` làm tham số cuối cùng khi construct harness. Import
`matchReviewQueueCountIntent` từ `./copilot-intent-heuristic`.

### Vì sao an toàn

- `resultsCapture` (dùng bởi `buildActivities()` để dựng activity card cuối) vẫn được set đúng, vì
  `applySeededToolCall` gọi `this.executeTool(...)` — chính là `executeToolFn` wrapper trong
  `copilot-agent-factory.service.ts` đã có sẵn logic `resultsCapture?.set(name, result)` — không cần thêm
  code riêng cho luồng seed.
- `toolResultCache` được set cho seeded call, nên nếu LLM (vì lý do nào đó) tự quyết định gọi lại
  `get_review_queue_count` với cùng tham số ở iteration sau, sẽ hit cache thay vì gọi lại — không lãng phí.
- `copilot-stream.service.ts` (cả 2 nơi gọi `createCopilotRunner`) không cần đổi — vẫn dùng
  `runner.on('functionToolCall', ...)` như cũ, seed hay không seed đều emit qua đúng event này.
- Câu hỏi không khớp mẫu nào → `seededToolCall = undefined` → hành vi 100% như cũ, không có nhánh code mới
  nào được chạy.

## Testing

**`copilot-intent-heuristic.spec.ts`** (file mới):
- Từng câu trong `REVIEW_QUEUE_COUNT_PHRASES` (dù viết hoa/thường, có/không dấu `?` cuối) → match `true`.
- Câu gần giống nhưng khác ý (VD "Doanh thu tháng này bao nhiêu?", "Danh sách giao dịch chờ duyệt" — ý khác,
  thuộc `list_review_queue`) → match `false`.
- Câu rỗng hoặc chỉ có khoảng trắng → match `false`.

**`copilot-agent.harness.spec.ts`** (bổ sung test cho `seededToolCall`):
- Có `seededToolCall`, LLM lượt đầu trả lời ngay không kèm `tool_calls` → `finalContent()` trả đúng nội dung,
  `functionToolCall` event bắn đúng 1 lần với tên tool đã seed, `executeTool` được gọi đúng 1 lần với tham số
  đã seed, adapter chỉ được gọi **1 lần** (không phải 2 như luồng không-seed, vì đã bỏ qua lượt quyết định
  tool) — đây là bằng chứng số round-trip giảm.
- Có `seededToolCall` nhưng LLM lượt đầu vẫn quyết định gọi thêm tool khác → loop tiếp tục bình thường, tool
  thứ 2 vẫn được gọi, `maxIterations` không bị ảnh hưởng.
- Có `seededToolCall` nhưng `executeTool` throw lỗi khi thực thi tool đã seed → tool message trả
  `{error: ...}`, không throw ra ngoài, LLM lượt đầu vẫn nhận được message và có thể trả lời/gọi tool khác
  bình thường.
- Không có `seededToolCall` (mặc định `undefined`) → toàn bộ test hiện có trong file phải vẫn pass không đổi
  assert (regression guard).

**`copilot-agent-factory.service.spec.ts`** (nếu chưa có file test cho service này, tạo mới; nếu đã dùng
pattern test khác cho factory, theo pattern hiện có):
- `message` khớp 1 mẫu trong `REVIEW_QUEUE_COUNT_PHRASES` → harness được tạo với `seededToolCall` đúng
  `{ name: 'get_review_queue_count', args: {} }`.
- `message` không khớp → harness được tạo với `seededToolCall = undefined`.

## Ngoài phạm vi

- Các tool khác (`get_banking_status`, ...) — để lại cho đợt sau nếu pilot này hiệu quả, dùng lại đúng cơ chế
  `seededToolCall` đã có sẵn trong harness (chỉ cần thêm entry vào bảng match trong
  `copilot-intent-heuristic.ts`, không cần sửa lại harness).
- Mở rộng heuristic sang keyword-contains hoặc fuzzy match — ngoài phạm vi pilot exact-match này.
- Đo lường thực tế mức tiết kiệm latency/cost sau khi merge (VD qua `usage.prompt_tokens_details` hoặc log số
  round-trip trung bình) — không bắt buộc trong scope code, có thể làm riêng sau khi có dữ liệu production.
