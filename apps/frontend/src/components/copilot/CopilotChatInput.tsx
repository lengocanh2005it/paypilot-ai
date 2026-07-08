import { Loader2, Send, Square } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface CopilotChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
  canAbort: boolean;
  isWelcome: boolean;
}

export function CopilotChatInput({
  input,
  onInputChange,
  onSend,
  onStop,
  isLoading,
  canAbort,
  isWelcome,
}: CopilotChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  }

  return (
    <div className={cn('px-4 pb-4 pt-2', isWelcome && 'pb-8')}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-background shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 transition-shadow">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Nhắn tin với AI Copilot... (Enter gửi, Shift+Enter xuống dòng)"
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 max-h-[200px] leading-relaxed"
          />
          {isLoading && canAbort ? (
            <button
              type="button"
              onClick={onStop}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Dừng"
            >
              <Square className="size-3.5 fill-current" />
            </button>
          ) : isLoading ? (
            <span
              className="flex size-8 shrink-0 items-center justify-center"
              role="status"
              aria-label="Đang xử lý"
            >
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSend(input)}
              disabled={!input.trim()}
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                input.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
              aria-label="Gửi"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
          AI Copilot có thể mắc lỗi. Kiểm tra thông tin quan trọng trước khi sử dụng.
        </p>
      </div>
    </div>
  );
}
