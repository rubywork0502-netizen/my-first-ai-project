"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X } from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ToastVariant = "success" | "error";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

// ──────────────────────────────────────────────
// Singleton state (shared across the app)
// ──────────────────────────────────────────────

type Listener = (toasts: ToastItem[]) => void;
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(message: string, variant: ToastVariant = "success") {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, variant }];
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3500);
}

// ──────────────────────────────────────────────
// Toast hook (internal subscription)
// ──────────────────────────────────────────────

function useToastState() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const fn: Listener = (t) => setItems(t);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { items, dismiss };
}

// ──────────────────────────────────────────────
// ToastProvider — mount once in layout.tsx
// ──────────────────────────────────────────────

export function ToastProvider() {
  const { items, dismiss } = useToastState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {items.map((t) => (
        <ToastBanner key={t.id} item={t} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
}

// ──────────────────────────────────────────────
// Individual banner
// ──────────────────────────────────────────────

function ToastBanner({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Slide-in on mount
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate(
      [
        { opacity: 0, transform: "translateX(24px) scale(0.96)" },
        { opacity: 1, transform: "translateX(0)   scale(1)" },
      ],
      { duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)", fill: "forwards" }
    );
  }, []);

  const isSuccess = item.variant === "success";

  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-3 shadow-xl min-w-[280px] max-w-sm"
      style={{
        background: "#111118",
        borderColor: isSuccess ? "rgba(110,231,183,.25)" : "rgba(252,165,165,.25)",
      }}
    >
      {isSuccess ? (
        <CheckCircle2 size={16} className="shrink-0" style={{ color: "#6ee7b7" }} />
      ) : (
        <XCircle size={16} className="shrink-0" style={{ color: "#fca5a5" }} />
      )}
      <span className="text-sm flex-1" style={{ color: "#e2e2f0" }}>
        {item.message}
      </span>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 opacity-40 hover:opacity-80 transition-opacity"
      >
        <X size={13} style={{ color: "#e2e2f0" }} />
      </button>
    </div>
  );
}
