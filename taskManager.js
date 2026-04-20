// ══════════════════════════════════════════════════════
//  PMSuite TaskManager — shared cross-page localStorage store
//  Tasks key:   pms-tasks-v2
//  Pomo key:    pms-pomo-v1
// ══════════════════════════════════════════════════════
(function(w) {
  const TASKS_KEY = 'pms-tasks-v2';
  const POMO_KEY  = 'pms-pomo-v1';

  const SEED = [
    { id:'pt0', title:'完成登入頁面設計',   project:'使用者系統', status:'done',   priority:'high',   due:'',      done:true  },
    { id:'pt1', title:'實作 API 端點',       project:'後端開發',   status:'todo',   priority:'urgent', due:'04/10', done:false },
    { id:'pt2', title:'撰寫測試案例',        project:'品質保證',   status:'todo',   priority:'medium', due:'04/12', done:false },
    { id:'pt3', title:'優化資料庫查詢',      project:'效能優化',   status:'todo',   priority:'low',    due:'04/14', done:false },
    { id:'pt4', title:'設計通知系統架構',    project:'系統設計',   status:'todo',   priority:'high',   due:'',      done:false },
    { id:'pt5', title:'更新 CI/CD 流程',     project:'DevOps',     status:'todo',   priority:'medium', due:'04/13', done:false },
  ];

  // ── Read ──────────────────────────────────────────
  function getTasks() {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (!raw) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(SEED));
        return SEED.map(t => ({ ...t }));
      }
      return JSON.parse(raw);
    } catch(e) { return SEED.map(t => ({ ...t })); }
  }

  // ── Write ─────────────────────────────────────────
  function _save(tasks) {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch(e) {}
    try { w.dispatchEvent(new CustomEvent('pms-tasks-changed', { detail: tasks })); } catch(e) {}
  }

  function addTask(task) {
    const tasks = getTasks();
    const t = {
      id:        'pt-' + Date.now(),
      title:     String(task.title   || '新任務').trim(),
      project:   String(task.project || ''),
      status:    task.status   || 'todo',
      priority:  task.priority || 'medium',
      due:       task.due      || '',
      done:      false,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(t);
    _save(tasks);
    return t;
  }

  function updateTask(id, changes) {
    const tasks = getTasks();
    const i = tasks.findIndex(t => t.id === id);
    if (i < 0) return null;
    tasks[i] = { ...tasks[i], ...changes };
    _save(tasks);
    return tasks[i];
  }

  function deleteTask(id) {
    _save(getTasks().filter(t => t.id !== id));
  }

  // ── Pomodoro Focus Points ─────────────────────────
  function _getPomo() {
    try { return JSON.parse(localStorage.getItem(POMO_KEY)) || {}; } catch(e) { return {}; }
  }

  function addFocusPoint(taskTitle) {
    const d = _getPomo();
    d.focusPoints      = (d.focusPoints    || 0) + 1;
    d.totalPomodoros   = (d.totalPomodoros || 0) + 1;
    d.lastTask         = taskTitle || '';
    d.celebratePending = true;
    d.lastCompleted    = new Date().toISOString();
    localStorage.setItem(POMO_KEY, JSON.stringify(d));
  }

  // Returns {focusPoints, lastTask} if there's a pending celebration, otherwise null.
  // Clears the flag on read so the toast shows only once per completion.
  function checkAndClearCelebration() {
    const d = _getPomo();
    if (!d.celebratePending) return null;
    d.celebratePending = false;
    localStorage.setItem(POMO_KEY, JSON.stringify(d));
    return { focusPoints: d.focusPoints || 0, lastTask: d.lastTask || '' };
  }

  function getFocusPoints() {
    return _getPomo().focusPoints || 0;
  }

  w.TaskManager = {
    getTasks, addTask, updateTask, deleteTask,
    addFocusPoint, checkAndClearCelebration, getFocusPoints,
  };
})(window);
