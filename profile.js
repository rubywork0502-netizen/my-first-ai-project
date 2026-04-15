/**
 * PMSuite — Profile & Workspace Global State (profile.js)
 * Extends PMAuth with user-profile overrides and workspace RBAC management.
 * Must be loaded AFTER auth.js.
 */
(function () {
  'use strict';

  const PROFILE_KEY   = 'pmsuite-profile';
  const WORKSPACE_KEY = 'pmsuite-workspace';
  const AUTH_KEY      = 'pmsuite-session';

  // Default workspace mirrors login.html MOCK_USERS
  const DEFAULT_WORKSPACE = [
    { id:'u1', name:'王小明', role:'Project Manager', permissions:'ADMIN',
      email:'admin@pmsuite.io',    grad:'linear-gradient(135deg,#c084fc,#38bdf8)', photoURL:null, status:'active' },
    { id:'u2', name:'李大華', role:'後端工程師',       permissions:'MEMBER',
      email:'dev@pmsuite.io',      grad:'linear-gradient(135deg,#38bdf8,#2dd4bf)', photoURL:null, status:'active' },
    { id:'u3', name:'陳美玲', role:'設計師',           permissions:'PM',
      email:'designer@pmsuite.io', grad:'linear-gradient(135deg,#f472b6,#fb923c)', photoURL:null, status:'active' },
  ];

  // ── storage helpers ──────────────────────────────────────────────
  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; }
  }
  function saveProfile(data) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); }

  function loadWorkspace() {
    try {
      const s = JSON.parse(localStorage.getItem(WORKSPACE_KEY));
      return Array.isArray(s) ? s : JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
    } catch { return JSON.parse(JSON.stringify(DEFAULT_WORKSPACE)); }
  }
  function saveWorkspace(data) { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data)); }

  // ── public API ───────────────────────────────────────────────────
  window.PMProfile = {

    /** Current user = session merged with any profile overrides */
    getCurrentUser() {
      const session = window.PMAuth?.getUser();
      if (!session) return null;
      const overrides = loadProfile()[session.id] || {};
      return { ...session, ...overrides };
    },

    /** All workspace members */
    getWorkspace: loadWorkspace,

    /** Single member by id */
    getMember(uid) { return loadWorkspace().find(m => m.id === uid) || null; },

    /**
     * Persist profile changes for userId.
     * Syncs to active session if it belongs to that user.
     */
    updateProfile(userId, changes) {
      const profile = loadProfile();
      profile[userId] = { ...(profile[userId] || {}), ...changes };
      saveProfile(profile);

      try {
        const sd = JSON.parse(localStorage.getItem(AUTH_KEY));
        if (sd?.user?.id === userId) {
          sd.user = { ...sd.user, ...changes };
          localStorage.setItem(AUTH_KEY, JSON.stringify(sd));
        }
      } catch {}

      window.PMAuth?.initSidebar?.();
    },

    /**
     * Invite a new user to the workspace.
     * Returns { ok:true, member } or { ok:false, error }.
     */
    inviteUser({ email, name, role, permissions }) {
      const ws = loadWorkspace();
      if (ws.find(m => m.email === email))
        return { ok: false, error: '此 Email 已在工作區中' };

      const GRADS = [
        'linear-gradient(135deg,#c084fc,#f472b6)',
        'linear-gradient(135deg,#fb923c,#fbbf24)',
        'linear-gradient(135deg,#4ade80,#38bdf8)',
        'linear-gradient(135deg,#f472b6,#38bdf8)',
        'linear-gradient(135deg,#2dd4bf,#4ade80)',
      ];
      const member = {
        id: 'u' + Date.now(),
        name: name || email.split('@')[0],
        role,
        permissions,
        email,
        grad: GRADS[ws.length % GRADS.length],
        photoURL: null,
        status: 'invited',
        invitedAt: new Date().toISOString(),
      };
      ws.push(member);
      saveWorkspace(ws);
      return { ok: true, member };
    },

    /** Remove a member from workspace */
    removeUser(uid) { saveWorkspace(loadWorkspace().filter(m => m.id !== uid)); },

    /**
     * Returns an editor stamp for tagging task / project saves.
     * { uid, name, initial, grad, photoURL, at }
     */
    getEditorStamp() {
      const u = this.getCurrentUser();
      if (!u) return null;
      return {
        uid:      u.id,
        name:     u.name,
        initial:  (u.name || '?')[0],
        grad:     u.grad     || 'linear-gradient(135deg,#c084fc,#38bdf8)',
        photoURL: u.photoURL || null,
        at:       new Date().toISOString(),
      };
    },
  };

  // ── Sidebar override ─────────────────────────────────────────────
  // After auth.js wires up the user-row as "logout", we replace it with
  // "go to profile.html" and add a dedicated logout icon button.
  document.addEventListener('DOMContentLoaded', () => {
    const currentPage = (location.pathname.split('/').pop() || 'index.html');
    if (currentPage === 'login.html') return;

    // Inject sidebar augmentation styles once
    if (!document.getElementById('_pmProfileSidebarStyle')) {
      const s = document.createElement('style');
      s.id = '_pmProfileSidebarStyle';
      s.textContent = `
        .sb-footer{position:relative;display:flex;align-items:center;
          justify-content:space-between;gap:0;padding:10px;border-top:1px solid var(--b1)}
        .sb-footer .user-row{flex:1;min-width:0;border-radius:var(--r-sm)}
        .sb-logout-btn{flex-shrink:0;width:28px;height:28px;border-radius:6px;
          background:transparent;border:1px solid transparent;color:var(--t3);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          transition:background .15s,color .15s,border-color .15s;margin-left:4px}
        .sb-logout-btn:hover{background:var(--red-d);color:var(--red);border-color:rgba(248,113,113,.3)}
      `;
      document.head.appendChild(s);
    }

    // Replace user-row click handler
    const row = document.querySelector('.sb-footer .user-row, .user-row');
    if (!row) return;

    const fresh = row.cloneNode(true);  // removes auth.js listener
    row.parentNode.replaceChild(fresh, row);
    fresh.style.cursor = 'pointer';
    fresh.title = '個人設定';
    if (currentPage !== 'profile.html') {
      fresh.addEventListener('click', () => { location.href = 'profile.html'; });
    }

    // Add logout button
    const footer = fresh.closest('.sb-footer');
    if (footer && !footer.querySelector('.sb-logout-btn')) {
      const btn = document.createElement('button');
      btn.className = 'sb-logout-btn';
      btn.title = '登出';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const u = window.PMProfile.getCurrentUser();
        if (confirm(`確定要登出 ${u?.name || ''} 嗎？`)) window.PMAuth.logout();
      });
      footer.appendChild(btn);
    }
  });
})();
