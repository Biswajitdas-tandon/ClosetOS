import * as React from 'react';

export type FilterChipProps = {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
};

export function FilterChip({ label, active, count, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-editorial ${
        active
          ? 'border-accent bg-accent text-text-onAccent'
          : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' ? (
        <span className={active ? 'text-text-onAccent/70' : 'text-text-muted'}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
