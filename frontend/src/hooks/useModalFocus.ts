import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

type UseModalFocusOptions = {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusSelector?: string;
};

export function useModalFocus({ open, onClose, containerRef, initialFocusSelector }: UseModalFocusOptions) {
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = containerRef.current;
    if (!container) return;

    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
    }

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.getAttribute('aria-hidden') !== 'true' &&
          element.tabIndex !== -1,
      );

    const initialFocus = initialFocusSelector
      ? container.querySelector<HTMLElement>(initialFocusSelector)
      : null;

    requestAnimationFrame(() => {
      (initialFocus ?? getFocusableElements()[0] ?? container).focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (!container.contains(active) || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!container.contains(active) || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [containerRef, initialFocusSelector, onClose, open]);
}
