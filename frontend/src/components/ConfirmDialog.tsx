import { useId, useRef, type ReactNode } from 'react';
import { Button } from './UI';
import { useModalFocus } from '../hooks/useModalFocus';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useModalFocus({ open, onClose, containerRef: panelRef, initialFocusSelector: '.dialog-actions .btn-secondary' });

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-body">
          <p className="eyebrow">Confirm</p>
          <h2 id={titleId}>{title}</h2>
          <div className="dialog-copy" id={descriptionId}>
            {description}
          </div>
        </div>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </aside>
    </div>
  );
}
