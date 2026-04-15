import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { v4 as uuidv4 } from "uuid";
import type {
  ID,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  TaskType,
  Priority,
  TodoItem,
  Sprint,
  SprintStatus,
  SprintReview,
  SprintRetrospective,
  PomodoroSession,
  PomodoroType,
  Color,
  Role,
  CurrentUser,
} from "../types/schema";

// ============================================================
// Helper
// ============================================================

const now = () => new Date().toISOString();

// ============================================================
// Slice types
// ============================================================

// ---------- Project ----------
interface ProjectSlice {
  projects: Record<ID, Project>;
  addProject: (payload: AddProjectPayload) => Project;
  updateProject: (id: ID, patch: Partial<Omit<Project, "id" | "workspaceId" | "createdAt">>) => void;
  deleteProject: (id: ID) => void;
  getProject: (id: ID) => Project | undefined;
  getProjects: () => Project[];
}

export interface AddProjectPayload {
  workspaceId: ID;
  name: string;
  description?: string;
  color?: Color;
  iconEmoji?: string;
  startDate?: string;
  endDate?: string;
  ownerId: ID;
}

// ---------- Task ----------
interface TaskSlice {
  tasks: Record<ID, Task>;
  addTask: (payload: AddTaskPayload) => Task;
  updateTask: (id: ID, patch: Partial<Omit<Task, "id" | "projectId" | "createdAt">>) => void;
  deleteTask: (id: ID) => void;
  moveTask: (id: ID, sprintId: ID | undefined) => void;
  reorderTask: (id: ID, newPosition: number) => void;
  addTodo: (taskId: ID, text: string) => TodoItem;
  updateTodo: (taskId: ID, todoId: ID, patch: Partial<Omit<TodoItem, "id" | "taskId">>) => void;
  deleteTodo: (taskId: ID, todoId: ID) => void;
  getTask: (id: ID) => Task | undefined;
  getTasksByProject: (projectId: ID) => Task[];
  getTasksBySprint: (sprintId: ID) => Task[];
  getBacklogTasks: (projectId: ID) => Task[];
}

export interface AddTaskPayload {
  projectId: ID;
  sprintId?: ID;
  parentTaskId?: ID;
  title: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: ID;
  reporterId: ID;
  storyPoints?: number;
  estimatedMinutes?: number;
  dueDate?: string;
}

// ---------- Sprint ----------
interface SprintSlice {
  sprints: Record<ID, Sprint>;
  addSprint: (payload: AddSprintPayload) => Sprint;
  updateSprint: (id: ID, patch: Partial<Omit<Sprint, "id" | "projectId" | "createdAt">>) => void;
  deleteSprint: (id: ID) => void;
  startSprint: (id: ID) => void;
  completeSprint: (id: ID) => void;
  addTaskToSprint: (sprintId: ID, taskId: ID) => void;
  removeTaskFromSprint: (sprintId: ID, taskId: ID) => void;
  setSprintReview: (sprintId: ID, review: SprintReview) => void;
  setSprintRetrospective: (sprintId: ID, retro: SprintRetrospective) => void;
  getSprint: (id: ID) => Sprint | undefined;
  getSprintsByProject: (projectId: ID) => Sprint[];
  getActiveSprint: (projectId: ID) => Sprint | undefined;
}

export interface AddSprintPayload {
  projectId: ID;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
}

// ---------- Pomodoro ----------
interface PomodoroSlice {
  sessions: Record<ID, PomodoroSession>;
  activeSessionId: ID | null;
  startPomodoro: (taskId: ID, userId: ID, type?: PomodoroType) => PomodoroSession;
  pausePomodoro: (sessionId: ID) => void;
  resumePomodoro: (sessionId: ID) => void;
  completePomodoro: (sessionId: ID, actualMinutes: number) => void;
  interruptPomodoro: (sessionId: ID, note?: string) => void;
  getSessionsByTask: (taskId: ID) => PomodoroSession[];
  getTotalWorkedMinutes: (taskId: ID) => number;
}

// ---------- UI ----------
interface UISlice {
  selectedProjectId: ID | null;
  selectedSprintId: ID | null;
  selectedTaskId: ID | null;
  sidebarOpen: boolean;
  setSelectedProject: (id: ID | null) => void;
  setSelectedSprint: (id: ID | null) => void;
  setSelectedTask: (id: ID | null) => void;
  toggleSidebar: () => void;
}

// ---------- User (auth / RBAC) ----------
interface UserSlice {
  currentUser: CurrentUser | null;
  /** Initialise or replace the authenticated user (called after login). */
  setCurrentUser: (user: CurrentUser) => void;
  /** Elevate / downgrade role without replacing the whole user object. */
  setCurrentUserRole: (role: Role) => void;
  /** Clear user on logout. */
  clearCurrentUser: () => void;
}

// ============================================================
// Combined store type
// ============================================================

type StoreState = ProjectSlice & TaskSlice & SprintSlice & PomodoroSlice & UISlice & UserSlice;

// ============================================================
// Store implementation
// ============================================================

export const useStore = create<StoreState>()(
  persist(
    immer((set, get) => ({

      // ──────────────────────────────────────────────────────
      // PROJECT SLICE
      // ──────────────────────────────────────────────────────

      projects: {},

      addProject: (payload) => {
        const project: Project = {
          id: uuidv4(),
          workspaceId: payload.workspaceId,
          name: payload.name,
          description: payload.description,
          color: payload.color ?? "blue",
          iconEmoji: payload.iconEmoji,
          status: "active" as ProjectStatus,
          ownerId: payload.ownerId,
          memberIds: [payload.ownerId],
          sprintIds: [],
          documentIds: [],
          startDate: payload.startDate,
          endDate: payload.endDate,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => { s.projects[project.id] = project; });
        return project;
      },

      updateProject: (id, patch) => {
        set((s) => {
          if (!s.projects[id]) return;
          Object.assign(s.projects[id], patch, { updatedAt: now() });
        });
      },

      deleteProject: (id) => {
        set((s) => {
          // cascade: remove tasks & sprints belonging to this project
          Object.keys(s.tasks).forEach((tid) => {
            if (s.tasks[tid].projectId === id) delete s.tasks[tid];
          });
          Object.keys(s.sprints).forEach((sid) => {
            if (s.sprints[sid].projectId === id) delete s.sprints[sid];
          });
          delete s.projects[id];
        });
      },

      getProject: (id) => get().projects[id],

      getProjects: () => Object.values(get().projects),

      // ──────────────────────────────────────────────────────
      // TASK SLICE
      // ──────────────────────────────────────────────────────

      tasks: {},

      addTask: (payload) => {
        const sibling = Object.values(get().tasks).filter(
          (t) => t.projectId === payload.projectId && t.sprintId === payload.sprintId
        );
        const position = sibling.length;

        const task: Task = {
          id: uuidv4(),
          projectId: payload.projectId,
          sprintId: payload.sprintId,
          parentTaskId: payload.parentTaskId,
          title: payload.title,
          description: payload.description,
          type: payload.type ?? "task",
          status: payload.status ?? "backlog",
          priority: payload.priority ?? "medium",
          assigneeId: payload.assigneeId,
          reporterId: payload.reporterId,
          labelIds: [],
          subTaskIds: [],
          todoItems: [],
          pomodoroSessionIds: [],
          documentIds: [],
          estimatedMinutes: payload.estimatedMinutes,
          loggedMinutes: 0,
          storyPoints: payload.storyPoints,
          dueDate: payload.dueDate,
          completedAt: undefined,
          position,
          createdAt: now(),
          updatedAt: now(),
        };

        set((s) => {
          s.tasks[task.id] = task;

          // link to parent sub-task list
          if (payload.parentTaskId && s.tasks[payload.parentTaskId]) {
            s.tasks[payload.parentTaskId].subTaskIds.push(task.id);
          }

          // link to sprint
          if (payload.sprintId && s.sprints[payload.sprintId]) {
            s.sprints[payload.sprintId].taskIds.push(task.id);
          }
        });

        return task;
      },

      updateTask: (id, patch) => {
        set((s) => {
          if (!s.tasks[id]) return;
          const task = s.tasks[id];

          // auto-set completedAt
          if (patch.status === "done" && task.status !== "done") {
            patch = { ...patch, completedAt: now() };
          } else if (patch.status && patch.status !== "done") {
            patch = { ...patch, completedAt: undefined };
          }

          Object.assign(task, patch, { updatedAt: now() });
        });
      },

      deleteTask: (id) => {
        set((s) => {
          const task = s.tasks[id];
          if (!task) return;

          // remove from parent's subTaskIds
          if (task.parentTaskId && s.tasks[task.parentTaskId]) {
            s.tasks[task.parentTaskId].subTaskIds = s.tasks[
              task.parentTaskId
            ].subTaskIds.filter((sid) => sid !== id);
          }

          // remove from sprint's taskIds
          if (task.sprintId && s.sprints[task.sprintId]) {
            s.sprints[task.sprintId].taskIds = s.sprints[
              task.sprintId
            ].taskIds.filter((tid) => tid !== id);
          }

          // cascade: delete child sub-tasks
          task.subTaskIds.forEach((childId) => {
            delete s.tasks[childId];
          });

          delete s.tasks[id];
        });
      },

      moveTask: (id, sprintId) => {
        set((s) => {
          const task = s.tasks[id];
          if (!task) return;

          // remove from old sprint
          if (task.sprintId && s.sprints[task.sprintId]) {
            s.sprints[task.sprintId].taskIds = s.sprints[
              task.sprintId
            ].taskIds.filter((tid) => tid !== id);
          }

          // add to new sprint
          if (sprintId && s.sprints[sprintId]) {
            if (!s.sprints[sprintId].taskIds.includes(id)) {
              s.sprints[sprintId].taskIds.push(id);
            }
          }

          task.sprintId = sprintId;
          task.updatedAt = now();
        });
      },

      reorderTask: (id, newPosition) => {
        set((s) => {
          if (!s.tasks[id]) return;
          s.tasks[id].position = newPosition;
          s.tasks[id].updatedAt = now();
        });
      },

      // -- Todo Item CRUD --

      addTodo: (taskId, text) => {
        const todo: TodoItem = {
          id: uuidv4(),
          taskId,
          text,
          completed: false,
          position: get().tasks[taskId]?.todoItems.length ?? 0,
          createdAt: now(),
        };
        set((s) => {
          if (!s.tasks[taskId]) return;
          s.tasks[taskId].todoItems.push(todo);
          s.tasks[taskId].updatedAt = now();
        });
        return todo;
      },

      updateTodo: (taskId, todoId, patch) => {
        set((s) => {
          const task = s.tasks[taskId];
          if (!task) return;
          const idx = task.todoItems.findIndex((t) => t.id === todoId);
          if (idx === -1) return;
          Object.assign(task.todoItems[idx], patch);
          task.updatedAt = now();
        });
      },

      deleteTodo: (taskId, todoId) => {
        set((s) => {
          const task = s.tasks[taskId];
          if (!task) return;
          task.todoItems = task.todoItems.filter((t) => t.id !== todoId);
          task.updatedAt = now();
        });
      },

      // -- Task selectors --

      getTask: (id) => get().tasks[id],

      getTasksByProject: (projectId) =>
        Object.values(get().tasks)
          .filter((t) => t.projectId === projectId)
          .sort((a, b) => a.position - b.position),

      getTasksBySprint: (sprintId) =>
        Object.values(get().tasks)
          .filter((t) => t.sprintId === sprintId)
          .sort((a, b) => a.position - b.position),

      getBacklogTasks: (projectId) =>
        Object.values(get().tasks)
          .filter((t) => t.projectId === projectId && !t.sprintId)
          .sort((a, b) => a.position - b.position),

      // ──────────────────────────────────────────────────────
      // SPRINT SLICE
      // ──────────────────────────────────────────────────────

      sprints: {},

      addSprint: (payload) => {
        const sprint: Sprint = {
          id: uuidv4(),
          projectId: payload.projectId,
          name: payload.name,
          goal: payload.goal,
          status: "draft" as SprintStatus,
          startDate: payload.startDate,
          endDate: payload.endDate,
          taskIds: [],
          velocity: undefined,
          plannedVelocity: undefined,
          review: undefined,
          retrospective: undefined,
          createdAt: now(),
          updatedAt: now(),
        };

        set((s) => {
          s.sprints[sprint.id] = sprint;
          if (s.projects[payload.projectId]) {
            s.projects[payload.projectId].sprintIds.push(sprint.id);
          }
        });

        return sprint;
      },

      updateSprint: (id, patch) => {
        set((s) => {
          if (!s.sprints[id]) return;
          Object.assign(s.sprints[id], patch, { updatedAt: now() });
        });
      },

      deleteSprint: (id) => {
        set((s) => {
          const sprint = s.sprints[id];
          if (!sprint) return;

          // move tasks back to backlog
          sprint.taskIds.forEach((tid) => {
            if (s.tasks[tid]) {
              s.tasks[tid].sprintId = undefined;
              s.tasks[tid].updatedAt = now();
            }
          });

          // remove from project
          if (s.projects[sprint.projectId]) {
            s.projects[sprint.projectId].sprintIds = s.projects[
              sprint.projectId
            ].sprintIds.filter((sid) => sid !== id);
          }

          delete s.sprints[id];
        });
      },

      startSprint: (id) => {
        set((s) => {
          if (!s.sprints[id]) return;
          s.sprints[id].status = "active";
          s.sprints[id].updatedAt = now();
        });
      },

      completeSprint: (id) => {
        set((s) => {
          if (!s.sprints[id]) return;
          const sprint = s.sprints[id];
          sprint.status = "completed";

          // calculate actual velocity
          const completed = sprint.taskIds.filter(
            (tid) => s.tasks[tid]?.status === "done"
          );
          sprint.velocity = completed.reduce(
            (sum, tid) => sum + (s.tasks[tid]?.storyPoints ?? 0),
            0
          );

          sprint.updatedAt = now();
        });
      },

      addTaskToSprint: (sprintId, taskId) => {
        get().moveTask(taskId, sprintId);
      },

      removeTaskFromSprint: (sprintId, taskId) => {
        get().moveTask(taskId, undefined);
      },

      setSprintReview: (sprintId, review) => {
        set((s) => {
          if (!s.sprints[sprintId]) return;
          s.sprints[sprintId].review = review;
          s.sprints[sprintId].updatedAt = now();
        });
      },

      setSprintRetrospective: (sprintId, retro) => {
        set((s) => {
          if (!s.sprints[sprintId]) return;
          s.sprints[sprintId].retrospective = retro;
          s.sprints[sprintId].updatedAt = now();
        });
      },

      getSprint: (id) => get().sprints[id],

      getSprintsByProject: (projectId) =>
        Object.values(get().sprints)
          .filter((s) => s.projectId === projectId)
          .sort(
            (a, b) =>
              new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          ),

      getActiveSprint: (projectId) =>
        Object.values(get().sprints).find(
          (s) => s.projectId === projectId && s.status === "active"
        ),

      // ──────────────────────────────────────────────────────
      // POMODORO SLICE
      // ──────────────────────────────────────────────────────

      sessions: {},
      activeSessionId: null,

      startPomodoro: (taskId, userId, type = "work") => {
        // interrupt any running session first
        const { activeSessionId, sessions } = get();
        if (activeSessionId && sessions[activeSessionId]?.status === "running") {
          get().interruptPomodoro(activeSessionId, "新番茄鐘已開始");
        }

        const task = get().tasks[taskId];
        if (!task) throw new Error(`Task ${taskId} not found`);

        // count today's sessions for this user
        const today = new Date().toDateString();
        const todayCount = Object.values(get().sessions).filter(
          (s) =>
            s.userId === userId &&
            new Date(s.startedAt).toDateString() === today
        ).length;

        const session: PomodoroSession = {
          id: uuidv4(),
          taskId,
          userId,
          type,
          status: "running",
          plannedDurationMinutes: 25, // consumer can override via WorkspaceSettings
          actualDurationMinutes: undefined,
          startedAt: now(),
          completedAt: undefined,
          interruptedAt: undefined,
          interruptionNote: undefined,
          note: undefined,
          sessionNumber: todayCount + 1,
        };

        set((s) => {
          s.sessions[session.id] = session;
          s.activeSessionId = session.id;
          if (s.tasks[taskId]) {
            s.tasks[taskId].pomodoroSessionIds.push(session.id);
          }
        });

        return session;
      },

      pausePomodoro: (sessionId) => {
        set((s) => {
          if (s.sessions[sessionId]?.status === "running") {
            s.sessions[sessionId].status = "paused";
          }
        });
      },

      resumePomodoro: (sessionId) => {
        set((s) => {
          if (s.sessions[sessionId]?.status === "paused") {
            s.sessions[sessionId].status = "running";
          }
        });
      },

      completePomodoro: (sessionId, actualMinutes) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return;

          session.status = "completed";
          session.actualDurationMinutes = actualMinutes;
          session.completedAt = now();
          s.activeSessionId = null;

          // accumulate logged minutes on task (work sessions only)
          if (session.type === "work" && s.tasks[session.taskId]) {
            s.tasks[session.taskId].loggedMinutes += actualMinutes;
            s.tasks[session.taskId].updatedAt = now();
          }
        });
      },

      interruptPomodoro: (sessionId, note) => {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return;
          session.status = "interrupted";
          session.interruptedAt = now();
          session.interruptionNote = note;
          if (s.activeSessionId === sessionId) s.activeSessionId = null;
        });
      },

      getSessionsByTask: (taskId) =>
        Object.values(get().sessions).filter((s) => s.taskId === taskId),

      getTotalWorkedMinutes: (taskId) =>
        Object.values(get().sessions)
          .filter(
            (s) =>
              s.taskId === taskId &&
              s.type === "work" &&
              s.status === "completed" &&
              s.actualDurationMinutes != null
          )
          .reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0),

      // ──────────────────────────────────────────────────────
      // UI SLICE  (not persisted — see partialize below)
      // ──────────────────────────────────────────────────────

      selectedProjectId: null,
      selectedSprintId: null,
      selectedTaskId: null,
      sidebarOpen: true,

      setSelectedProject: (id) => set((s) => { s.selectedProjectId = id; }),
      setSelectedSprint:  (id) => set((s) => { s.selectedSprintId  = id; }),
      setSelectedTask:    (id) => set((s) => { s.selectedTaskId    = id; }),
      toggleSidebar: () => set((s) => { s.sidebarOpen = !s.sidebarOpen; }),

      // ──────────────────────────────────────────────────────
      // USER SLICE  (auth / RBAC)
      // ──────────────────────────────────────────────────────

      currentUser: null,

      setCurrentUser: (user) => set((s) => { s.currentUser = user; }),

      setCurrentUserRole: (role) =>
        set((s) => {
          if (s.currentUser) s.currentUser.role = role;
        }),

      clearCurrentUser: () => set((s) => { s.currentUser = null; }),
    })),

    // ── Persist config ──────────────────────────────────────
    {
      name: "projectos-store",          // localStorage key
      storage: createJSONStorage(() => localStorage),

      // Only persist data — skip ephemeral UI state
      partialize: (state) => ({
        projects:    state.projects,
        tasks:       state.tasks,
        sprints:     state.sprints,
        sessions:    state.sessions,
        currentUser: state.currentUser,
      }),

      version: 1,

      // Migration hook for future schema changes
      migrate: (persistedState, version) => {
        // Example: if (version === 0) { ...migrate v0 → v1... }
        return persistedState as StoreState;
      },
    }
  )
);

// ============================================================
// Selector hooks  (avoid re-render storms with fine-grained subs)
// ============================================================

export const useProjects      = () => useStore((s) => s.projects);
export const useTasks         = () => useStore((s) => s.tasks);
export const useSprints       = () => useStore((s) => s.sprints);
export const useActiveSession = () =>
  useStore((s) =>
    s.activeSessionId ? s.sessions[s.activeSessionId] : null
  );
export const useSelectedProject = () =>
  useStore((s) =>
    s.selectedProjectId ? s.projects[s.selectedProjectId] : null
  );
export const useActiveSprint = (projectId: ID) =>
  useStore((s) =>
    Object.values(s.sprints).find(
      (sp) => sp.projectId === projectId && sp.status === "active"
    ) ?? null
  );
export const useCurrentUser = () => useStore((s) => s.currentUser);
