import type { ReactNode } from 'react';

type SlideOverProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function SlideOver({ open, title, description, onClose, children }: SlideOverProps) {
  if (!open) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Form</p>
            <h2>{title}</h2>
            {description ? <p className="drawer-description">{description}</p> : null}
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}

