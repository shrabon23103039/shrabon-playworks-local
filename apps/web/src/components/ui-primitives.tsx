"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, Gamepad2, X } from "lucide-react";

export function GameGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="game-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <div className="game-card skeleton-card" key={index} aria-hidden="true">
          <div className="skeleton-media" />
          <div className="game-card-body">
            <div className="skeleton-line short" />
            <div className="skeleton-line title" />
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-busy="true" aria-label="Loading">
      <div className="skeleton-stage" />
      <div className="detail-columns">
        <div className="info-panel skeleton-panel">
          <div className="skeleton-line title" />
          <div className="skeleton-line" />
          <div className="skeleton-line medium" />
        </div>
        <div className="info-panel skeleton-panel">
          <div className="skeleton-line title" />
          <div className="skeleton-line" />
          <div className="skeleton-line medium" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  message,
  action,
  role,
}: {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div className="empty-panel" role={role}>
      <span className="empty-icon" aria-hidden="true">
        {icon ?? <Gamepad2 size={26} />}
      </span>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
        <div className="dialog-header">
          <span className="dialog-icon" aria-hidden="true">
            <AlertTriangle size={20} />
          </span>
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={cancelLabel}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p id={descId} className="dialog-body">{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`button ${danger ? "button-danger" : "button-primary"}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
