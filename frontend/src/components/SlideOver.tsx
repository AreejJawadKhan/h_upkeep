import { useId, useRef, type ReactNode } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';

type SlideOverProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function SlideOver({ open, title, description, onClose, children }: SlideOverProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalFocus({ open, onClose, containerRef: panelRef, initialFocusSelector: '.drawer-close' });

  if (!open) return null;

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Form</p>
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <p className="drawer-description" id={descriptionId}>
                {description}
              </p>
            ) : null}
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
