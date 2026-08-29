import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, actions, filters, eyebrow }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-header-description">{description}</p> : null}
      </div>

      <div className="page-header-meta">
        {filters ? <div className="page-header-filters">{filters}</div> : null}
        {actions ? <div className="page-header-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

