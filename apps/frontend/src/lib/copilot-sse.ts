export interface SseEvent {
  event: string;
  data: string;
}

export function parseSseBlock(block: string): SseEvent | null {
  const lines = block.split('\n');
  let event = 'message';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) event = line.slice(7).trim();
    else if (line.startsWith('data: ')) data = line.slice(6).trim();
  }
  return data ? { event, data } : null;
}

export function feedSseChunk(chunk: string, pending: { buffer: string }): SseEvent[] {
  const text = pending.buffer + chunk;
  const segments = text.split('\n\n');
  const endsWithDelimiter = text.endsWith('\n\n');
  pending.buffer = endsWithDelimiter ? '' : (segments.pop() ?? '');
  const events: SseEvent[] = [];
  for (const block of segments) {
    const parsed = parseSseBlock(block);
    if (parsed) events.push(parsed);
  }
  return events;
}

export function flushSsePending(pending: { buffer: string }): SseEvent[] {
  const block = pending.buffer.trim();
  pending.buffer = '';
  if (!block) return [];
  const parsed = parseSseBlock(block);
  return parsed ? [parsed] : [];
}
