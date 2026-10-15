import { ChevronRight, CircleHelp } from "lucide-react";

export function SectionHeading({ title, subtitle, action, onAction }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-action" onClick={onAction}>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <section className="welcome-row">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {subtitle && <p className="welcome-subtitle">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon: Icon = CircleHelp, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={22} />
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

export function ErrorBanner({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss error">
          ×
        </button>
      )}
    </div>
  );
}
