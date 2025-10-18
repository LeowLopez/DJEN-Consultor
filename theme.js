// Theme management
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

// Check if we're in the artifacts environment (no localStorage support)
const isArtifactEnv = !window.localStorage;
let currentTheme = 'light';

// Load saved theme or use system preference
function loadTheme() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isArtifactEnv) {
        // Use system preference only
        currentTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
        // Try saved theme first, fallback to system preference
        const savedTheme = localStorage.getItem('theme');
        currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    }
    setTheme(currentTheme);
}

// Set theme
function setTheme(theme) {
    currentTheme = theme;
    htmlElement.setAttribute('data-theme', theme);

    // Update icon
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    }

    // Save to localStorage if available
    if (!isArtifactEnv) {
        localStorage.setItem('theme', theme);
    }
}

// Toggle theme
themeToggle.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!isArtifactEnv && !localStorage.getItem('theme')) {
        // Apply system preference when user hasn't set a preference
        const systemPrefersDark = e.matches;
        const newTheme = systemPrefersDark ? 'dark' : 'light';
        setTheme(newTheme);
    }
});