import * as React from 'react';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-text-muted">{icon}</div> : null}
      <h3 className="mb-2 font-display text-2xl text-text-primary">{title}</h3>
      {description ? (
        <p className="mb-6 text-sm leading-relaxed text-text-secondary">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
