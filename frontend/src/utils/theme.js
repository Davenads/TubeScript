// Theme utilities for dark/light mode toggle

// Check for user preference
const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Check for saved theme or use user preference
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme || (userPrefersDark ? 'dark' : 'light');
};

// Apply theme to document
const applyTheme = (theme) => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  localStorage.setItem('theme', theme);
};

// Initialize theme
export const initTheme = () => {
  const theme = getInitialTheme();
  applyTheme(theme);
  return theme;
};

// Toggle between light and dark
export const toggleTheme = () => {
  const current = localStorage.getItem('theme') || getInitialTheme();
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  return newTheme;
};