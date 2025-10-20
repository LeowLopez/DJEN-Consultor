const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

let isArtifactEnv = false;
try {
    localStorage.setItem('__test__', '__test__');
    localStorage.removeItem('__test__');
} catch (e) {
    isArtifactEnv = true;
}

let currentTheme = 'light';

function loadTheme() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isArtifactEnv) {
        currentTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
        const savedTheme = localStorage.getItem('theme');
        currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    }
    setTheme(currentTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    htmlElement.setAttribute('data-theme', theme);

    const icon = themeToggle.querySelector('i');
    if (icon) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    if (!isArtifactEnv) {
        localStorage.setItem('theme', theme);
    }
}

themeToggle.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!isArtifactEnv && !localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});

document.addEventListener('DOMContentLoaded', loadTheme);
