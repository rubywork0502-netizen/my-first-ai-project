"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Plus, Flame, ArrowUp, Minus, ArrowDown, Circle,
  Folder, ChevronDown, Timer,
} from "lucide-react";
import { useStore } from "@/store/store";
import { toast } from "@/components/ui/useToast";
import { useHasPermission } from "@/hooks/useHasPermission";
import type { Priority } from "@/types/schema";

// ─────────────────────────────────────────────────────
// Priority config
// ─────────────────────────────────────────────────────

interface PriorityOption {
  value: Priority;
  label: string;
  icon: React.ElementType;
  tw: string;        // active Tailwind classes
  twRing: string;    // ring color for focus-visible
}

const PRIORITIES: PriorityOption[] = [
  { value: "urgent", label: "緊急", icon: Flame,     tw: "bg-red-500/10 text-red-400 border-red-500/30",    twRing: "ring-red-500/40" },
  { value: "high",   label: "高",   icon: ArrowUp,   tw: "bg-orange-500/10 text-orange-400 border-orange-500/30", twRing: "ring-orange-500/40" },
  { value: "medium", label: "中",   icon: Minus,     tw: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",  twRing: "ring-cyan-500/40" },
  { value: "low",    label: "低",   icon: ArrowDown, tw: "bg-green-500/10 text-green-400 border-green-500/30", twRing: "ring-green-500/40" },
  { value: "none",   label: "無",   icon: Circle,    tw: "bg-gray-500/10 text-gray-500 border-gray-500/20",  twRing: "ring-gray-500/30" },
];

const INACTIVE_P =
  "border border-[#2a2840] text-[#58547a] hover:border-[#3a3852] hover:text-[#9490b0] transition-all";

// ─────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────

interface Form {
  title: string;
  projectId: string;
  priority: Priority;
  pomodoros: number;     // estimated number of pomodoro sessions
}

interface Errors {
  title?: string;
  projectId?: string;
}

const EMPTY: Form = {
  title: "",
  projectId: "",
  priority: "medium",
  pomodoros: 1,
};

// ─────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────

export interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected project id */
  defaultProjectId?: string;
  /** Current logged-in user id */
  userId: string;
}

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────

export function CreateTaskModal({
  open,
  onClose,
  defaultProjectId,
  userId,
}: CreateTaskModalProps) {
  const titleRef   = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const projects   = useStore((s) => Object.values(s.projects));
  const addTask    = useStore((s) => s.addTask);
  const canAddTask = useHasPermission("ADD_TASK");

  const [form,   setForm]   = useState<Form>({ ...EMPTY, projectId: defaultProjectId ?? "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [touched, setTouched] = useState<Set<keyof Form>>(new Set());

  // SSR guard
  useEffect(() => setMounted(true), []);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, projectId: defaultProjectId ?? (projects.length === 1 ? projects[0].id : "") });
      setErrors({});
      setTouched(new Set());
      setSaving(false);
      setTimeout(() => titleRef.current?.focus(), 80);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Field helpers ────────────────────────────────

  const patch = useCallback(<K extends keyof Form>(key: K, val: Form[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setTouched((t) => new Set(t).add(key));
    // clear error on edit
    if (errors[key as keyof Errors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }, [errors]);

  function validate(): boolean {
    const e: Errors = {};
    if (!form.title.trim())   e.title     = "任務名稱不能為空";
    if (form.title.trim().length > 0 && form.title.trim().length < 2)
                               e.title     = "名稱至少需要 2 個字元";
    if (!form.projectId)      e.projectId = "請選擇所屬專案";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Submit ───────────────────────────────────────

  async function handleSave() {
    // Permission guard — MEMBER has ADD_TASK but cannot spoof a different reporterId;
    // the reporterId is always locked to the userId prop passed by the parent.
    if (!canAddTask) {
      toast("您沒有新增任務的權限", "error");
      return;
    }

    // Mark all as touched so errors show
    setTouched(new Set(["title", "projectId", "priority", "pomodoros"]));
    if (!validate()) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 320)); // micro-delay for UX

    addTask({
      projectId:        form.projectId,
      title:            form.title.trim(),
      priority:         form.priority,
      estimatedMinutes: form.pomodoros * 25,  // 1 pomodoro = 25 minutes
      reporterId:       userId,
    });

    toast(`任務「${form.title.trim()}」已建立 🍅×${form.pomodoros}`, "success");
    handleClose();
  }

  function handleClose() {
    setForm({ ...EMPTY, projectId: defaultProjectId ?? "" });
    setErrors({});
    setTouched(new Set());
    setSaving(false);
    onClose();
  }

  // ─── Render ───────────────────────────────────────

  if (!mounted || !open) return null;

  const activePriority = PRIORITIES.find((p) => p.value === form.priority)!;
  const estimatedMin   = form.pomodoros * 25;

  return createPortal(
    // Overlay
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="新增任務"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-[480px] rounded-xl border border-[#1e1c2e] bg-[#0e0d14] shadow-2xl overflow-hidden"
        style={{ animation: "modalIn .22s cubic-bezier(.16,1,.3,1) both" }}
      >
        {/* ── Rainbow top bar ── */}
        <div className="h-px w-full bg-gradient-to-r from-[#c084fc] via-[#38bdf8] to-[#2dd4bf]" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1c2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#c084fc] to-[#38bdf8] flex items-center justify-center">
              <Plus size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-bold tracking-wide text-[#f0edfb]"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase" }}>
              新增任務
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#58547a] hover:text-[#f0edfb] hover:bg-white/5 transition-all"
            aria-label="關閉"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Form body ── */}
        <div className="px-6 py-5 flex flex-col gap-5">

          {/* Task title */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[.1em] text-[#58547a] font-semibold flex items-center gap-1.5">
              任務名稱
              <span className="text-[#f97316]">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              onBlur={() => setTouched((t) => new Set(t).add("title"))}
              placeholder="簡短描述這個任務…"
              className={[
                "w-full bg-[#141320] rounded-lg px-3.5 py-2.5 text-sm text-[#f0edfb] placeholder-[#35324a]",
                "border transition-all outline-none",
                errors.title
                  ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-[#1e1c2e] focus:border-[#c084fc] focus:ring-2 focus:ring-[#c084fc]/20",
              ].join(" ")}
            />
            {errors.title && touched.has("title") && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <span>⚠</span> {errors.title}
              </p>
            )}
          </div>

          {/* Project select */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[.1em] text-[#58547a] font-semibold flex items-center gap-1.5">
              <Folder size={11} className="text-[#58547a]" />
              所屬專案
              <span className="text-[#f97316]">*</span>
            </label>
            <div className="relative">
              <select
                value={form.projectId}
                onChange={(e) => patch("projectId", e.target.value)}
                onBlur={() => setTouched((t) => new Set(t).add("projectId"))}
                className={[
                  "w-full appearance-none bg-[#141320] rounded-lg px-3.5 py-2.5 pr-9",
                  "text-sm text-[#f0edfb] cursor-pointer transition-all outline-none",
                  "border",
                  errors.projectId
                    ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    : "border-[#1e1c2e] focus:border-[#c084fc] focus:ring-2 focus:ring-[#c084fc]/20",
                ].join(" ")}
              >
                <option value="" className="bg-[#141320]">選擇專案…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#141320]">
                    {p.iconEmoji ? `${p.iconEmoji} ` : ""}{p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#58547a]"
              />
            </div>
            {errors.projectId && touched.has("projectId") && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <span>⚠</span> {errors.projectId}
              </p>
            )}
            {projects.length === 0 && (
              <p className="text-[11px] text-[#58547a]">尚無專案，請先建立一個專案</p>
            )}
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[.1em] text-[#58547a] font-semibold">
              優先級
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => {
                const Icon = p.icon;
                const active = form.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => patch("priority", p.value)}
                    className={[
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                      "border transition-all",
                      active ? `${p.tw} ring-2 ${p.twRing}` : INACTIVE_P,
                    ].join(" ")}
                  >
                    <Icon size={11} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Estimated Pomodoros */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[.1em] text-[#58547a] font-semibold flex items-center gap-1.5">
              <Timer size={11} className="text-[#58547a]" />
              預計番茄鐘數
            </label>
            <div className="flex items-center gap-4 bg-[#141320] border border-[#1e1c2e] rounded-lg px-4 py-3">
              {/* Stepper */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => patch("pomodoros", Math.max(0, form.pomodoros - 1))}
                  className="w-7 h-7 rounded-md border border-[#2a2840] text-[#9490b0] flex items-center justify-center hover:border-[#c084fc] hover:text-[#c084fc] transition-all text-base leading-none"
                >
                  −
                </button>
                <span className="font-bold text-[#f0edfb] text-base w-6 text-center"
                      style={{ fontFamily: "'Fira Code', monospace" }}>
                  {form.pomodoros}
                </span>
                <button
                  type="button"
                  onClick={() => patch("pomodoros", Math.min(20, form.pomodoros + 1))}
                  className="w-7 h-7 rounded-md border border-[#2a2840] text-[#9490b0] flex items-center justify-center hover:border-[#c084fc] hover:text-[#c084fc] transition-all text-base leading-none"
                >
                  +
                </button>
              </div>

              {/* Tomato visual */}
              <div className="flex flex-wrap gap-1 flex-1 min-h-[24px] items-center">
                {form.pomodoros === 0 ? (
                  <span className="text-[11px] text-[#35324a]">尚未設定預估</span>
                ) : (
                  <>
                    {Array.from({ length: Math.min(form.pomodoros, 8) }).map((_, i) => (
                      <span key={i} className="text-sm leading-none">🍅</span>
                    ))}
                    {form.pomodoros > 8 && (
                      <span className="text-[11px] text-[#9490b0]" style={{ fontFamily: "'Fira Code', monospace" }}>
                        +{form.pomodoros - 8}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Converted minutes */}
              {form.pomodoros > 0 && (
                <span className="text-[11px] text-[#58547a] shrink-0" style={{ fontFamily: "'Fira Code', monospace" }}>
                  ≈ {estimatedMin}m
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#35324a]">
              每個番茄鐘 = 25 分鐘；預計工時將自動換算並存入任務
            </p>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e1c2e] bg-[#0a091000]">
          {/* Summary badge */}
          {form.title.trim() && form.projectId ? (
            <div className="flex items-center gap-2 text-[11px] text-[#58547a]">
              <div className={`w-1.5 h-1.5 rounded-full ${activePriority.tw.split(" ").find(c => c.startsWith("text-"))?.replace("text-", "bg-") ?? "bg-gray-500"}`} />
              {activePriority.label}優先
              {form.pomodoros > 0 && ` · 🍅×${form.pomodoros}`}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg text-[#58547a] hover:text-[#9490b0] hover:bg-white/5 transition-all"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canAddTask}
              title={!canAddTask ? "您沒有新增任務的權限" : undefined}
              className={[
                "flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-bold transition-all",
                "text-white",
                saving || !canAddTask
                  ? "opacity-60 cursor-not-allowed bg-gradient-to-r from-[#c084fc]/50 to-[#38bdf8]/50"
                  : "bg-gradient-to-r from-[#c084fc] to-[#38bdf8] hover:shadow-[0_0_20px_rgba(192,132,252,.4)] hover:-translate-y-px",
              ].join(" ")}
            >
              {saving ? (
                <>
                  <Spinner />
                  建立中…
                </>
              ) : (
                <>
                  <Plus size={14} strokeWidth={2.5} />
                  建立任務
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe */}
      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:scale(.96) translateY(8px); }
          to   { opacity:1; transform:scale(1)   translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="13" height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
