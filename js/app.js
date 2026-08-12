import { els } from './dom.js';
import { loadChapters, renderChapters, toggleChapter } from './chapters.js';
import { exportSelectedToPDF } from './export.js';
import {
    exitSession,
    handleAction,
    handleInputKey,
    prevWord,
    restartSession,
    startSession
} from './practice.js';
import { loadSettings } from './state.js';
import {
    applySettings,
    setDisplayType,
    toggleFooter,
    toggleQuizMode,
    toggleRandom,
    toggleTheme
} from './settings.js';

function bindEvents() {
    els.searchBar.addEventListener('input', renderChapters);
    els.chapterList.addEventListener('click', (event) => {
        const item = event.target.closest('.chapter-item');
        if (item) toggleChapter(item.dataset.id);
    });

    els.modeBtn.addEventListener('click', toggleQuizMode);
    els.themeSwitch.addEventListener('click', toggleTheme);
    els.footerToggle.addEventListener('click', toggleFooter);
    els.randomBtn.addEventListener('click', toggleRandom);
    els.startBtn.addEventListener('click', () => startSession(false));
    els.showAllBtn.addEventListener('click', () => startSession(true));
    els.exportPdfBtn.addEventListener('click', exportSelectedToPDF);

    els.viewTypeInputs.forEach((input) => {
        input.addEventListener('change', () => setDisplayType(input.value));
    });

    els.trainingCard.addEventListener('click', (event) => {
        if (event.target.closest('button, input')) return;
        handleAction();
    });
    els.userInput.addEventListener('focus', handleInputFocus);
    els.userInput.addEventListener('blur', handleInputBlur);
    els.userInput.addEventListener('keydown', handleInputKey);
    els.prevBtn.addEventListener('click', prevWord);
    els.actionBtn.addEventListener('click', handleAction);
    els.exitBtn.addEventListener('click', exitSession);
    els.previewBackBtn.addEventListener('click', exitSession);

    document.addEventListener('click', (event) => {
        if (event.target.id === 'restart-session-btn') restartSession();
        if (event.target.id === 'return-selection-btn') exitSession();
    });
}

function syncVisibleViewport() {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const offsetTop = viewport?.offsetTop || 0;
    const keyboardInset = Math.max(0, window.innerHeight - height - offsetTop);

    els.html.style.setProperty('--visible-h', `${height}px`);
    els.html.style.setProperty('--keyboard-inset', `${keyboardInset}px`);
}

function handleInputFocus() {
    els.html.classList.add('input-focused');
    syncVisibleViewport();
    requestAnimationFrame(() => {
        els.trainingCard.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
    });
}

function handleInputBlur() {
    els.html.classList.remove('input-focused');
    els.html.style.setProperty('--keyboard-inset', '0px');
}

function bindViewportEvents() {
    syncVisibleViewport();
    window.addEventListener('resize', syncVisibleViewport);
    window.visualViewport?.addEventListener('resize', syncVisibleViewport);
    window.visualViewport?.addEventListener('scroll', syncVisibleViewport);
}

async function init() {
    const theme = loadSettings();
    applySettings(theme);
    bindViewportEvents();
    bindEvents();
    await loadChapters();
}

init();
