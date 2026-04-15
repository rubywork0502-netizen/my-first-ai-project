/**
 * 使用範例 — 在任何頁面中開啟 CreateTaskModal
 *
 * 1. 在 layout.tsx 加入 <ToastProvider />（整個 App 只需一個）
 * 2. 在需要的頁面用 useState 控制 open 狀態
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateTaskModal } from "@/components/CreateTaskModal";
import { ToastProvider } from "@/components/ui/useToast";

// ── layout.tsx 範例 ────────────────────────────
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <ToastProvider />   {/* ← 放在最外層，只需一次 */}
      </body>
    </html>
  );
}

// ── 任意頁面 / 組件 ────────────────────────────
export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded text-sm"
        style={{
          background: "linear-gradient(135deg,#c084fc,#7dd3fc)",
          color: "#0a0a0f",
        }}
      >
        <Plus size={15} />
        新增任務
      </button>

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId="current-user-id"           // 換成實際 auth user id
        defaultProjectId="some-project-id" // 選填：預選專案
      />
    </div>
  );
}
