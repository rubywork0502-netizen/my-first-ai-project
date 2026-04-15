/**
 * PMSuite — Auth Middleware
 * Runs synchronously before page render to protect routes.
 */
(function () {
  'use strict';

  const AUTH_KEY   = 'pmsuite-session';
  const LOGIN_PAGE = 'login.html';

  // ── helpers ──────────────────────────────────────────────
  function getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
  }

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  // ── route guard (runs immediately / synchronously) ────────
  const session    = getSession();
  const onLogin    = currentPage() === LOGIN_PAGE;
  const isExpired  = session && new Date(session.expiresAt) < new Date();

  if (isExpired) {
    localStorage.removeItem(AUTH_KEY);
  }

  if ((!session || isExpired) && !onLogin) {
    // Save intended destination so we can redirect back after login
    sessionStorage.setItem('pmsuite-redirect', location.href);
    location.replace(LOGIN_PAGE);
    // Throw to stop the rest of the page script from running
    throw new Error('[PMAuth] Unauthenticated — redirecting to login');
  }

  if (session && !isExpired && onLogin) {
    location.replace('index.html');
    throw new Error('[PMAuth] Already authenticated — redirecting to dashboard');
  }

  // ── public API ────────────────────────────────────────────
  window.PMAuth = {

    getUser() {
      const s = getSession();
      return (s && new Date(s.expiresAt) > new Date()) ? s.user : null;
    },

    login(user, remember = false) {
      const ms = remember
        ? 30 * 24 * 60 * 60 * 1000   // 30 days
        :      24 * 60 * 60 * 1000;  //  1 day
      const data = {
        user,
        token:     'mock-' + Math.random().toString(36).slice(2),
        loginAt:   new Date().toISOString(),
        expiresAt: new Date(Date.now() + ms).toISOString(),
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    },

    logout() {
      localStorage.removeItem(AUTH_KEY);
      location.replace(LOGIN_PAGE);
    },

    /** Populate sidebar user info from current session */
    initSidebar() {
      const user = this.getUser();
      if (!user) return;

      // Name & role
      const nameEl = document.querySelector('.user-name');
      const roleEl = document.querySelector('.user-role');
      if (nameEl) nameEl.textContent = user.name  || '使用者';
      if (roleEl) roleEl.textContent = user.role  || '成員';

      // Avatar — supports .av and .avatar class names
      const avEl = document.querySelector('.av, .avatar');
      if (avEl) {
        if (user.photoURL) {
          avEl.innerHTML = `<img src="${user.photoURL}"
            style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">`;
          avEl.style.background = 'none';
        } else {
          avEl.textContent = (user.name || '?')[0];
          if (user.grad) avEl.style.background = user.grad;
        }
      }

      // Make user row → logout on click
      const row = document.querySelector('.user-row, .sb-footer .user-row');
      if (row) {
        row.style.cursor = 'pointer';
        row.title = '點擊登出';
        row.addEventListener('click', () => {
          if (confirm(`確定要登出 ${user.name} 嗎？`)) PMAuth.logout();
        });
      }
    },
  };

  // Auto-init sidebar after DOM ready (skip on login page itself)
  if (!onLogin) {
    document.addEventListener('DOMContentLoaded', () => PMAuth.initSidebar());
  }
})();
