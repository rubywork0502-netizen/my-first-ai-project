// ============================================================
// CORE SYSTEM — Shared Primitives
// ============================================================

export type ID = string; // UUID v4
export type ISODateString = string; // "2026-04-07T10:00:00Z"
export type MarkdownContent = string;

export type Color =
  | "slate" | "red" | "orange" | "amber" | "green"
  | "teal" | "blue" | "violet" | "pink" | "rose";

// ============================================================
// MODULE 1: WORKSPACE
// ============================================================

export interface Workspace {
  id: ID;
  name: string;
  slug: string;                  // URL-friendly identifier, e.g. "my-team"
  iconEmoji?: string;
  color: Color;
  ownerId: ID;                   // → User.id
  memberIds: ID[];               // → User.id[]
  settings: WorkspaceSettings;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface WorkspaceSettings {
  defaultSprintDuration: number; // days, e.g. 14
  workingHoursPerDay: number;    // for velocity tracking
  pomodoroWorkMinutes: number;   // default 25
  pomodoroBreakMinutes: number;  // default 5
  pomodoroLongBreakMinutes: number; // default 15
  pomodoroSessionsUntilLongBreak: number; // default 4
}

// ============================================================
// MODULE 2: USER
// ============================================================

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: ISODateString;
}

export type UserRole = "owner" | "admin" | "member" | "viewer";

// ============================================================
// MODULE: RBAC — Role-Based Access Control
// ============================================================

/** App-level roles for access control (distinct from workspace UserRole). */
export type Role = "ADMIN" | "PM" | "MEMBER";

/**
 * Fine-grained permission codes.
 * The canonical mapping of which role grants which codes lives in ROLE_PERMISSIONS.
 */
export type Permission =
  | "DELETE_PROJECT"         // Delete a project (cascades tasks & sprints)
  | "EDIT_PROJECT_SETTINGS"  // Rename, change phase / dates / type of a project
  | "MANAGE_MEMBERS"         // Add or remove project members
  | "ADD_TASK"               // Create new tasks in any project
  | "EDIT_ANY_TASK"          // Update tasks regardless of who created them
  | "EDIT_OWN_TASK"          // Update only tasks the current user reported
  | "DELETE_ANY_TASK"        // Remove tasks regardless of who created them
  | "DELETE_OWN_TASK";       // Remove only tasks the current user reported

/** Role → Permission[] source of truth; consumed by useHasPermission. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "DELETE_PROJECT",
    "EDIT_PROJECT_SETTINGS",
    "MANAGE_MEMBERS",
    "ADD_TASK",
    "EDIT_ANY_TASK",
    "EDIT_OWN_TASK",
    "DELETE_ANY_TASK",
    "DELETE_OWN_TASK",
  ],
  PM: [
    "DELETE_PROJECT",
    "EDIT_PROJECT_SETTINGS",
    "ADD_TASK",
    "EDIT_ANY_TASK",
    "EDIT_OWN_TASK",
    "DELETE_ANY_TASK",
    "DELETE_OWN_TASK",
  ],
  MEMBER: [
    "ADD_TASK",
    "EDIT_OWN_TASK",
    "DELETE_OWN_TASK",
  ],
};

/**
 * The authenticated user stored in the Zustand store.
 *
 * Security note: all permission decisions derived from `role` are *frontend hints*
 * for hiding / disabling UI elements.  Every write operation MUST be re-validated
 * server-side via `apiTokenRef` — never trust the client-side `role` field alone.
 */
export interface CurrentUser {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  /**
   * Opaque JWT / session token forwarded in the Authorization header on every
   * mutating API call.  The backend re-derives role claims from this token.
   * Placeholder for future server-side RBAC validation.
   */
  apiTokenRef?: string;
}

// ============================================================
// MODULE 3: PROJECT
// ============================================================

export interface Project {
  id: ID;
  workspaceId: ID;               // → Workspace.id
  name: string;
  description?: MarkdownContent;
  color: Color;
  iconEmoji?: string;
  status: ProjectStatus;
  phase: ProjectPhase;           // delivery stage label
  type: ProjectType;             // project category
  priority: Priority;
  ownerId: ID;                   // → User.id
  memberIds: ID[];               // → User.id[]
  frontendLeadId?: ID;           // → User.id
  backendLeadId?: ID;            // → User.id
  lastEditorId?: ID;             // → User.id
  lastEditedAt?: ISODateString;
  sprintIds: ID[];               // → Sprint.id[]
  taskIds: ID[];                 // → Task.id[] (directly associated)
  documentIds: ID[];             // → Document.id[]
  // Links
  dataCollectionUrl?: string;
  prodUrl?: string;
  stagingUrl?: string;
  // Document attachments (display names / file refs)
  relatedDocs: string[];
  designAgreementDocs: string[];
  trainingDocs: string[];
  // Progress (0–100)
  progress: number;
  startDate?: ISODateString;
  endDate?: ISODateString;       // planned end
  actualClosedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";

export type ProjectPhase =
  | "規劃中"
  | "交付中"
  | "已完成"
  | "暫停";

export type ProjectType =
  | "功能開發"
  | "新專案"
  | "整合"
  | "維護"
  | "其他";

// ============================================================
// MODULE 4: SPRINT
// ============================================================

export interface Sprint {
  id: ID;
  projectId: ID;                 // → Project.id
  name: string;                  // e.g. "Sprint 12"
  goal?: string;                 // Sprint goal statement
  status: SprintStatus;
  startDate: ISODateString;
  endDate: ISODateString;
  taskIds: ID[];                 // → Task.id[] (tasks assigned to this sprint)
  velocity?: number;             // Story points completed
  plannedVelocity?: number;      // Story points planned
  review?: SprintReview;
  retrospective?: SprintRetrospective;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type SprintStatus =
  | "draft"       // Not started, still being planned
  | "active"      // Currently running
  | "completed"   // Sprint ended, review done
  | "cancelled";  // Abandoned mid-sprint

export interface SprintReview {
  conductedAt?: ISODateString;
  conductedBy?: ID;              // → User.id (Scrum Master / facilitator)
  attendeeIds: ID[];             // → User.id[]
  demoNotes?: MarkdownContent;   // What was demonstrated
  stakeholderFeedback?: MarkdownContent;
  completedTaskIds: ID[];        // → Task.id[] (tasks actually completed)
  incompleteTaskIds: ID[];       // → Task.id[] (carried over)
  completedPoints: number;
  plannedPoints: number;
  rating?: 1 | 2 | 3 | 4 | 5;  // Team satisfaction score
}

export interface SprintRetrospective {
  conductedAt?: ISODateString;
  wentWell: string[];            // Bullet list: what went well
  toImprove: string[];           // Bullet list: what to improve
  actionItems: RetroActionItem[];
  mood: "great" | "good" | "neutral" | "poor" | "terrible";
}

export interface RetroActionItem {
  id: ID;
  description: string;
  assigneeId?: ID;               // → User.id
  dueDate?: ISODateString;
  resolved: boolean;
}

// ============================================================
// MODULE 5: TASK (Core unit of work)
// ============================================================

export interface Task {
  id: ID;
  projectId: ID;                 // → Project.id
  sprintId?: ID;                 // → Sprint.id (null = backlog)
  parentTaskId?: ID;             // → Task.id (null = top-level task)
  title: string;
  description?: MarkdownContent;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: ID;               // → User.id
  reporterId: ID;                // → User.id
  labelIds: ID[];                // → Label.id[]
  subTaskIds: ID[];              // → Task.id[] (child tasks)
  todoItems: TodoItem[];         // Inline checklist items
  pomodoroSessionIds: ID[];      // → PomodoroSession.id[]
  estimatedMinutes?: number;
  loggedMinutes: number;         // Aggregated from PomodoroSession + manual logs
  storyPoints?: number;          // For sprint planning
  documentIds: ID[];             // → Document.id[] (linked docs)
  dueDate?: ISODateString;
  completedAt?: ISODateString;
  position: number;              // Ordering within sprint/backlog
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type TaskType =
  | "story"       // User story
  | "bug"         // Bug report
  | "task"        // Generic task
  | "epic"        // Large feature (parent of stories)
  | "chore";      // Maintenance / tech debt

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"
  | "cancelled";

export type Priority = "urgent" | "high" | "medium" | "low" | "none";

// ============================================================
// MODULE 6: TODO ITEM (Inline checklist within a Task)
// ============================================================

export interface TodoItem {
  id: ID;
  taskId: ID;                    // → Task.id (parent)
  text: string;
  completed: boolean;
  assigneeId?: ID;               // → User.id
  dueDate?: ISODateString;
  position: number;              // Ordering within the checklist
  createdAt: ISODateString;
}

// ============================================================
// MODULE 7: LABEL
// ============================================================

export interface Label {
  id: ID;
  workspaceId: ID;               // → Workspace.id
  name: string;
  color: Color;
}

// ============================================================
// MODULE 8: DOCUMENT
// ============================================================

export interface Document {
  id: ID;
  workspaceId: ID;               // → Workspace.id
  projectId?: ID;                // → Project.id (null = workspace-level doc)
  parentDocumentId?: ID;         // → Document.id (nested docs support)
  title: string;
  content: MarkdownContent;
  authorId: ID;                  // → User.id
  collaboratorIds: ID[];         // → User.id[]
  linkedTaskIds: ID[];           // → Task.id[] (bi-directional with Task.documentIds)
  tags: string[];
  isPublished: boolean;
  version: number;               // Incremented on each save
  history: DocumentVersion[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DocumentVersion {
  version: number;
  content: MarkdownContent;
  editedBy: ID;                  // → User.id
  editedAt: ISODateString;
  changeNote?: string;
}

// ============================================================
// MODULE 9: POMODORO SESSION
// ============================================================

export interface PomodoroSession {
  id: ID;
  taskId: ID;                    // → Task.id (which task this pomodoro belongs to)
  userId: ID;                    // → User.id (who ran the timer)
  type: PomodoroType;
  status: PomodoroStatus;
  plannedDurationMinutes: number;  // Usually from WorkspaceSettings
  actualDurationMinutes?: number;  // Set on completion (may differ if interrupted)
  startedAt: ISODateString;
  completedAt?: ISODateString;
  interruptedAt?: ISODateString;
  interruptionNote?: string;
  note?: string;                   // Quick note about what was done in this session
  sessionNumber: number;           // e.g. 1st, 2nd pomodoro of the day
}

export type PomodoroType = "work" | "short_break" | "long_break";

export type PomodoroStatus =
  | "running"     // Timer is active
  | "paused"      // Timer paused
  | "completed"   // Finished naturally
  | "interrupted" // Stopped early
  | "skipped";    // Break skipped

// ============================================================
// MODULE 10: TIME LOG (Manual work logging, complements Pomodoro)
// ============================================================

export interface TimeLog {
  id: ID;
  taskId: ID;                    // → Task.id
  userId: ID;                    // → User.id
  minutes: number;
  description?: string;
  loggedAt: ISODateString;       // When the work was done (not when logged)
  createdAt: ISODateString;
}

// ============================================================
// AGGREGATE: TASK WORK SUMMARY
// ============================================================
// Computed at read-time — not stored directly

export interface TaskWorkSummary {
  taskId: ID;
  estimatedMinutes: number;
  pomodoroMinutes: number;       // Sum of PomodoroSession.actualDurationMinutes (work only)
  manualLogMinutes: number;      // Sum of TimeLog.minutes
  totalLoggedMinutes: number;    // pomodoroMinutes + manualLogMinutes
  completedPomodoros: number;
  remainingEstimatedMinutes: number; // estimatedMinutes - totalLoggedMinutes
}

// ============================================================
// RELATIONSHIP MAP (summary)
// ============================================================
//
//  Workspace (1) ──────── has many ──► Project (N)
//  Workspace (1) ──────── has many ──► Label (N)
//  Workspace (1) ──────── has many ──► User (N) [via memberIds]
//  Workspace (1) ──────── has many ──► Document (N) [workspace-level]
//
//  Project (1) ─────────── has many ──► Sprint (N)
//  Project (1) ─────────── has many ──► Task (N)
//  Project (1) ─────────── has many ──► Document (N)
//
//  Sprint (1) ──────────── has many ──► Task (N) [via taskIds]
//  Sprint (1) ──────────── has one  ──► SprintReview
//  Sprint (1) ──────────── has one  ──► SprintRetrospective
//
//  Task (1) ────────────── belongs to ─► Project
//  Task (1) ────────────── belongs to ─► Sprint (optional)
//  Task (1) ────────────── belongs to ─► Task (parentTaskId, optional sub-task)
//  Task (1) ────────────── has many ──► Task (subTaskIds, sub-tasks)
//  Task (1) ────────────── has many ──► TodoItem (inline checklist)
//  Task (1) ────────────── has many ──► PomodoroSession
//  Task (1) ────────────── has many ──► TimeLog
//  Task (1) ────────────── has many ──► Document (linked docs)
//
//  PomodoroSession (1) ──► belongs to ─► Task
//  PomodoroSession (1) ──► belongs to ─► User
//
//  Document (1) ──────────── bi-directional ──► Task (via linkedTaskIds)
