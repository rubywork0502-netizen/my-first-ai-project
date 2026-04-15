import { useStore } from "../store/store";
import { ROLE_PERMISSIONS } from "../types/schema";
import type { ID, Permission } from "../types/schema";

// ============================================================
// useHasPermission
// ============================================================
// Returns true when the current user's role includes the
// requested permission code; false if unauthenticated or the
// role does not grant it.
//
// Usage (hide a button for MEMBER):
//
//   const canDelete = useHasPermission("DELETE_PROJECT");
//   if (!canDelete) return null;
//
// Security: these checks gate *UI elements only*.  Every write
// operation must be re-validated server-side using the
// apiTokenRef stored in currentUser.
// ============================================================

export function useHasPermission(permission: Permission): boolean {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return false;
  return ROLE_PERMISSIONS[currentUser.role]?.includes(permission) ?? false;
}

// ============================================================
// useCanDeleteTask
// ============================================================
// ADMIN / PM → can delete any task.
// MEMBER     → can delete only tasks they reported (created).
//
// Usage:
//   const canDelete = useCanDeleteTask(task.reporterId);
//   {canDelete && <DeleteTaskButton taskId={task.id} />}
// ============================================================

export function useCanDeleteTask(taskReporterId: ID): boolean {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return false;
  const perms = ROLE_PERMISSIONS[currentUser.role] ?? [];
  if (perms.includes("DELETE_ANY_TASK")) return true;
  return perms.includes("DELETE_OWN_TASK") && currentUser.id === taskReporterId;
}

// ============================================================
// useCanEditTask
// ============================================================
// ADMIN / PM → can edit any task.
// MEMBER     → can edit only tasks they reported (created).
//
// Usage:
//   const canEdit = useCanEditTask(task.reporterId);
//   <SaveTaskButton disabled={!canEdit} />
// ============================================================

export function useCanEditTask(taskReporterId: ID): boolean {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return false;
  const perms = ROLE_PERMISSIONS[currentUser.role] ?? [];
  if (perms.includes("EDIT_ANY_TASK")) return true;
  return perms.includes("EDIT_OWN_TASK") && currentUser.id === taskReporterId;
}
