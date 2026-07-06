import { BarChart3, BookOpen, ExternalLink, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type CopilotActivityKind = 'internal_data' | 'knowledge' | 'web_search';

export interface CopilotActivity {
  kind: CopilotActivityKind;
  label: string;
  source?: string;
  urls?: string[];
}

interface Props {
  activities: CopilotActivity[];
}

const KIND_ICON: Record<CopilotActivityKind, typeof BarChart3> = {
  internal_data: BarChart3,
  knowledge: BookOpen,
  web_search: Globe,
};

export function CopilotSourceChips({ activities }: Props) {
  if (activities.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="text-xs text-muted-foreground self-center">Nguồn:</span>
      {activities.map((a, i) => {
        const Icon = KIND_ICON[a.kind];
        const isWeb = a.kind === 'web_search' && a.urls?.[0];

        return (
          <Badge
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list, no reorder
            key={i}
            variant={a.kind === 'internal_data' ? 'secondary' : 'outline'}
            className={`gap-1 font-normal text-xs ${
              a.kind === 'web_search'
                ? 'border-amber-500/50 text-amber-800 dark:text-amber-200'
                : ''
            }`}
          >
            <Icon className="size-3 shrink-0" />
            {isWeb ? (
              <a
                href={a.urls![0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:underline"
              >
                {a.source ?? 'Web'}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span>{a.label}</span>
            )}
          </Badge>
        );
      })}
    </div>
  );
}
