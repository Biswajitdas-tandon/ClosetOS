import * as React from 'react';

export type ItemCardProps = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  status?: 'available' | 'lent' | 'given_away' | 'sold';
  onClick?: () => void;
};

const STATUS_DOT: Record<NonNullable<ItemCardProps['status']>, string> = {
  available: 'bg-status-available',
  lent: 'bg-status-lent',
  given_away: 'bg-status-given_away',
  sold: 'bg-status-sold',
};

export function ItemCard({ title, subtitle, imageUrl, badge, status = 'available', onClick }: ItemCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col overflow-hidden rounded-md bg-bg-surface text-left shadow-sm transition-all duration-150 ease-editorial hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-220 ease-editorial group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            <span className="text-sm">No image</span>
          </div>
        )}
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-bg-surface/90 px-2.5 py-1 text-xs font-medium text-text-primary backdrop-blur">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{title}</p>
          {subtitle ? (
            <p className="truncate text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} title={status} />
      </div>
    </button>
  );
}
