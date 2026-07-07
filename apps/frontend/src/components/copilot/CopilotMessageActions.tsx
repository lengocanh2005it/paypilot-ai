import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  content: string;
}

export function CopilotMessageActions({ content }: Props) {
  const [state, setState] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    void navigator.clipboard.writeText(content);
    setState('copied');
    setTimeout(() => setState('idle'), 1500);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Sao chép"
        >
          {state === 'copied' ? (
            <Check className="size-3.5 text-green-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>Sao chép</TooltipContent>
    </Tooltip>
  );
}
