"use client";

import { lockBodyScroll, unlockBodyScroll } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export function BookingModal({
  open,
  onClose,
  title,
  children,
  footer,
  panelClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl outline-none",
          panelClassName,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-neutral-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function BookingBarButton({
  children,
  onClick,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "flex h-12 min-h-12 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-[#104c97] shadow-sm transition-colors hover:border-[#104c97]/40 hover:bg-neutral-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StepperRow({
  label,
  value,
  onDecrement,
  onIncrement,
  min,
  max,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <div className="flex items-center gap-3">
        <StepperButton
          label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={onDecrement}
        >
          −
        </StepperButton>
        <span className="w-6 text-center text-base font-semibold tabular-nums text-neutral-900">
          {value}
        </span>
        <StepperButton
          label={`Increase ${label}`}
          disabled={value >= max}
          onClick={onIncrement}
        >
          +
        </StepperButton>
      </div>
    </div>
  );
}

function StepperButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none transition-colors",
        disabled
          ? "cursor-not-allowed border-neutral-200 text-neutral-300"
          : "border-[#104c97] text-[#104c97] hover:bg-[#104c97]/5",
      )}
    >
      {children}
    </button>
  );
}
