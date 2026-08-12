import { els } from './dom.js';
import { saveSettings, state } from './state.js';
import { updateChapterActions } from './chapters.js';
import { renderCard, renderPreviewList, updateModeStatus } from './practice.js';

export function applySettings(theme) {
    setTheme(theme);
    syncModeButton();
    syncRandomButton();
    syncDisplayInputs();
}

export function toggleTheme() {
    const current = els.html.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
    saveSettings(current === 'dark' ? 'light' : 'dark');
}

export function setTheme(theme) {
    els.html.setAttribute('data-theme', theme);
    els.themeSwitch.setAttribute('aria-pressed', String(theme === 'dark'));
    els.themeSwitch.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
    els.themeSwitch.classList.toggle('active', theme === 'dark');
}

export function toggleQuizMode() {
    state.quizMode = state.quizMode === 'qa' ? 'flashcard' : 'qa';
    syncModeButton();
    updateModeStatus();
    refreshActiveSession();
    saveSettings(els.html.getAttribute('data-theme') || 'light');
}

export function setDisplayType(type) {
    state.displayType = type === 'sentence' ? 'sentence' : 'word';
    syncDisplayInputs();
    updateModeStatus();
    refreshActiveSession();
    saveSettings(els.html.getAttribute('data-theme') || 'light');
}

export function toggleRandom() {
    state.isRandom = !state.isRandom;
    syncRandomButton();
    saveSettings(els.html.getAttribute('data-theme') || 'light');
}

export function toggleFooter() {
    const active = els.selectionFooter.classList.toggle('active');
    els.selectionScreen.classList.toggle('footer-open', active);
    els.footerToggle.setAttribute('aria-expanded', String(active));
    els.footerToggleText.textContent = active ? '收起选项' : '展开更多选项';
}

export function syncModeButton() {
    const isQA = state.quizMode === 'qa';
    els.modeBtn.textContent = isQA ? '问答模式' : '字卡模式';
    els.modeBtn.setAttribute('aria-pressed', String(isQA));
    els.modeBtn.setAttribute('aria-label', isQA ? '切换为字卡模式' : '切换为问答模式');
    els.modeBtn.classList.toggle('muted', !isQA);
}

export function syncRandomButton() {
    els.randomBtn.setAttribute('aria-pressed', String(state.isRandom));
    els.randomBtn.setAttribute('aria-label', state.isRandom ? '关闭随机练习' : '开启随机练习');
    els.randomSwitch.classList.toggle('active', state.isRandom);
}

export function syncDisplayInputs() {
    els.viewTypeInputs.forEach((input) => {
        input.checked = input.value === state.displayType;
    });
    updateChapterActions();
}

function refreshActiveSession() {
    if (els.trainingScreen.hidden || !state.wordPool.length) return;
    if (els.previewMode.hidden) {
        renderCard();
    } else {
        renderPreviewList();
    }
}
