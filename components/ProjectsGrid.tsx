import React, { useState, useMemo } from "react";
import {
  Folder, Plus, Search, Filter,
  Users, Calendar, CheckSquare, ArrowUpRight,
  AlertCircle, ArrowUp, Minus, ArrowDown,
  Trash2, Settings,
} from "lucide-react";
import { Project, ProjectPhase, ProjectType, Priority } from "../types/schema";
import { useProjects, useStore } from "../store/store";
import { useHasPermission } from "../hooks/useHasPermission";
import CreateProjectModal from "./CreateProjectModal";

// ── Helper maps ──────────────────────────────────────────────
const PHASE_CONFIG: Record<ProjectPhase, { label: string; emoji: string; color: string; bg: string }> = {
  "規劃中": { label: "規劃中", emoji: "📋", color: "text-amber-400",  bg: "bg-amber-400/10" },
  "交付中": { label: "交付中", emoji: "🚀", color: "text-purple-400", bg: "bg-purple-400/10" },
  "已完成": { label: "已完成", emoji: "✅", color: "text-teal-400",   bg: "bg-teal-400/10"  },
  "暫停":   { label: "暫停",   emoji: "⏸",  color: "text-orange-400", bg: "bg-orange-400/10"},
};

const PRIORITY_CONFIG: Record<Priority, { border: string; dot: string; label: string }> = {
  urgent: { border: "border-l-red-500",    dot: "bg-red-500",    label: "緊急" },
  high:   { border: "border-l-orange-400", dot: "bg-orange-400", label: "高"   },
  medium: { border: "border-l-cyan-400",   dot: "bg-cyan-400",   label: "中"   },
  low:    { border: "border-l-green-400",  dot: "bg-green-400",  label: "低"   },
};

const TYPE_CONFIG: Record<ProjectType, { color: string; bg: string }> = {
  "功能開發": { color: "text-cyan-400",   bg: "bg-cyan-400/10"   },
  "新專案":   { color: "text-purple-400", bg: "bg-purple-400/10" },
  "整合":     { color: "text-teal-400",   bg: "bg-teal-400/10"   },
  "維護":     { color: "text-amber-400",  bg: "bg-amber-400/10"  },
  "其他":     { color: "text-[#9490b0]",  bg: "bg-white/5"       },
};

// ── Avatar helpers ────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-purple-500", "bg-cyan-500", "bg-teal-500",
  "bg-orange-400", "bg-pink-500", "bg-green-500",
];

function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const initials = name.charAt(0);
  return (
    <div
      className={`w-7 h-7 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]}
        flex items-center justify-center text-white text-xs font-bold
        ring-2 ring-[#0e0d14] -ml-1.5 first:ml-0`}
    >
      {initials}
    </div>
  );
}

// ── Filter tabs ───────────────────────────────────────────────
type Tab = "all" | "active" | "completed" | "on_hold";
const TABS: { key: Tab; label: string; status?: Project["status"] }[] = [
  { key: "all",       label: "全部" },
  { key: "active",    label: "進行中", status: "active" },
  { key: "completed", label: "已完成", status: "completed" },
  { key: "on_hold",   label: "暫停",   status: "on_hold" },
];

// ── Project Card ─────────────────────────────────────────────
interface ProjectCardProps {
  project: Project;
  users: Record<string, { name: string }>;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
  onEditSettings?: (id: string) => void;
}

function ProjectCard({ project, users, onClick, onDelete, onEditSettings }: ProjectCardProps) {
  const phase  = PHASE_CONFIG[project.phase];
  const pri    = PRIORITY_CONFIG[project.priority];
  const typeC  = TYPE_CONFIG[project.type];
  const fe     = project.frontendLeadId ? users[project.frontendLeadId]?.name ?? "?" : null;
  const be     = project.backendLeadId  ? users[project.backendLeadId]?.name  ?? "?" : null;

  // RBAC: only ADMIN / PM can delete or change settings
  const canDelete   = useHasPermission("DELETE_PROJECT");
  const canSettings = useHasPermission("EDIT_PROJECT_SETTINGS");

  return (
    <div
      onClick={() => onClick(project.id)}
      className={`group relative bg-[#0e0d14] border border-[#1e1c2e] rounded-[10px]
        border-l-[3px] ${pri.border} cursor-pointer overflow-hidden
        transition-all duration-200 hover:-translate-y-1
        hover:border-[#2a2840] hover:shadow-[0_8px_32px_rgba(0,0,0,.4)]`}
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeC.bg} ${typeC.color}`}>
            {project.type}
          </span>
          <div className={`w-2 h-2 rounded-full ${pri.dot} shadow-[0_0_6px_currentColor]`} title={pri.label} />
        </div>

        {/* Project name */}
        <h3 className="font-['Barlow_Condensed'] font-bold text-[20px] text-[#f0edfb] leading-tight mb-1 tracking-tight">
          {project.name}
        </h3>

        {/* Description */}
        {project.description ? (
          <p className="text-[12px] text-[#58547a] line-clamp-2 mb-3 leading-relaxed">
            {project.description}
          </p>
        ) : (
          <p className="text-[12px] text-[#35324a] italic mb-3">尚無描述</p>
        )}

        {/* Phase badge */}
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-4 ${phase.bg} ${phase.color}`}>
          {phase.emoji} {phase.label}
        </span>

        {/* Progress bar */}
        <div className="mb-1.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#58547a]">完成進度</span>
            <span className="font-['Fira_Code'] text-[11px] text-[#f0edfb] font-medium">
              {project.progress}%
            </span>
          </div>
          <div className="h-1.5 bg-[#1c1a2a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${project.progress}%`,
                background: project.progress === 100
                  ? "linear-gradient(90deg,#4ade80,#2dd4bf)"
                  : "linear-gradient(90deg,#c084fc,#38bdf8)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1e1c2e] flex items-center justify-between bg-[#0a0918]">
        {/* Avatars */}
        <div className="flex items-center">
          {fe && <Avatar name={fe} index={0} />}
          {be && <Avatar name={be} index={1} />}
          {!fe && !be && <span className="text-[11px] text-[#35324a]">未指派</span>}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-[#58547a]">
            <CheckSquare size={11} />
            {project.taskIds.length}
          </span>
          {project.endDate && (
            <span className="flex items-center gap-1 font-['Fira_Code'] text-[10px] text-[#58547a]">
              <Calendar size={10} />
              {project.endDate.slice(0, 10).replace(/-/g, "/")}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions (ADMIN / PM only) + navigate arrow */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {canSettings && onEditSettings && (
          <button
            onClick={(e) => { e.stopPropagation(); onEditSettings(project.id); }}
            title="修改專案設定"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#58547a]
              hover:text-[#c084fc] hover:bg-[#c084fc]/10 transition-all"
          >
            <Settings size={13} />
          </button>
        )}
        {canDelete && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
            title="刪除專案"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#58547a]
              hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        )}
        <ArrowUpRight size={14} className="text-[#58547a] ml-0.5" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-[#0e0d14] border border-[#1e1c2e] flex items-center justify-center">
        <Folder size={28} className="text-[#35324a]" />
      </div>
      <div className="text-center">
        <p className="text-[#9490b0] font-semibold mb-1">尚無專案</p>
        <p className="text-[12px] text-[#58547a]">點擊「新增專案」建立你的第一個專案</p>
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold text-white
          bg-gradient-to-r from-purple-500 to-cyan-400
          hover:shadow-[0_0_20px_rgba(192,132,252,.4)] transition-all"
      >
        <Plus size={14} /> 新增第一個專案
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
interface ProjectsGridProps {
  users?: Record<string, { name: string }>;
  onProjectClick?: (id: string) => void;
}

export default function ProjectsGrid({ users = {}, onProjectClick }: ProjectsGridProps) {
  const projects      = useProjects();
  const deleteProject = useStore((s) => s.deleteProject);

  const [activeTab,      setActiveTab]      = useState<Tab>("all");
  const [search,         setSearch]         = useState("");
  const [showModal,      setShowModal]      = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filtered list
  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab);
    return projects.filter(p => {
      const matchTab = activeTab === "all" || p.status === tab?.status;
      const matchSearch = search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [projects, activeTab, search]);

  // Tab counts
  const counts: Record<Tab, number> = {
    all:       projects.length,
    active:    projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
    on_hold:   projects.filter(p => p.status === "on_hold").length,
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#08080f]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-7 py-4 border-b border-[#1e1c2e]">
        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all
                ${activeTab === tab.key
                  ? "text-[#f0edfb] bg-[#1c1a2a]"
                  : "text-[#58547a] hover:text-[#9490b0] hover:bg-[#141320]"
                }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 text-[10px] font-['Fira_Code'] px-1.5 py-0.5 rounded-full
                  ${activeTab === tab.key ? "bg-[#252336] text-[#9490b0]" : "bg-[#141320] text-[#35324a]"}`}>
                  {counts[tab.key]}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-purple-400 to-cyan-400" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0e0d14] border border-[#1e1c2e] rounded-lg px-3 py-2 w-52
          focus-within:border-purple-400/50 focus-within:shadow-[0_0_0_2px_rgba(192,132,252,.08)] transition-all">
          <Search size={13} className="text-[#35324a] flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜尋專案…"
            className="flex-1 bg-transparent text-[13px] text-[#f0edfb] placeholder:text-[#35324a]"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        {filtered.length === 0 ? (
          <div className="grid grid-cols-3 gap-4">
            <EmptyState onAdd={() => setShowModal(true)} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                users={users}
                onClick={id => onProjectClick?.(id)}
                onDelete={setConfirmDeleteId}
                onEditSettings={(id) => onProjectClick?.(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}

      {/* Delete-project confirmation (ADMIN / PM only — button is hidden for MEMBER) */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[#1e1c2e] bg-[#0e0d14] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#f0edfb]">刪除專案</p>
                <p className="text-[12px] text-[#58547a]">此操作無法復原，關聯任務與 Sprint 也會一併刪除</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded-lg text-[#58547a] hover:text-[#9490b0] hover:bg-white/5 transition-all"
              >
                取消
              </button>
              <button
                onClick={() => { deleteProject(confirmDeleteId); setConfirmDeleteId(null); }}
                className="px-4 py-2 text-sm rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
