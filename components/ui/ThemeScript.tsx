const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem('eloquence-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : null;
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // Runs before paint to avoid a flash of the wrong theme.
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
