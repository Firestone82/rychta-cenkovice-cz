// Applies the stored theme before the first paint; ThemeService takes over once the app runs.
(function () {
  try {
    var path = location.pathname;
    var admin = path.indexOf('/admin') === 0;
    if (path.indexOf('/admin/login') === 0) return;
    var stored = JSON.parse(localStorage.getItem(admin ? 'rc_admin_theme' : 'rc_theme'));
    var dark =
      stored === 'dark' ||
      (admin && stored !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {
    /* no storage: the light theme stays */
  }
})();
