import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  external?: boolean;
  className?: string;
};

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled,
  href,
  external,
  className = '',
}: ButtonProps) {
  const classes = `btn btn-${variant} ${className}`.trim();
  if (href) {
    if (external) {
      return (
        <a className={classes} href={href} rel="noreferrer noopener">
          {children}
        </a>
      );
    }
    return (
      <Link className={classes} to={href}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement;
};

export function Field({ label, hint, error, children }: FieldProps) {
  const fieldId = useId();
  const control = isValidElement(children) ? (children as ReactElement<any>) : null;
  const controlId = control?.props.id ?? fieldId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const enhancedControl = control
    ? cloneElement(control, {
        id: controlId,
        'aria-describedby':
          [control.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : control.props['aria-invalid'],
        'aria-required': control.props.required ? true : control.props['aria-required'],
      } as Partial<any>)
    : children;

  return (
    <div className="field">
      <label className="field-label" htmlFor={controlId}>
        {label}
      </label>
      {enhancedControl}
      {hint ? (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function Panel({ title, eyebrow, actions, children, className = '' }: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orb" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = 'Loading Hupkeep' }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}
