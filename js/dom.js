export const els = {
    html: document.documentElement,
    selectionScreen: document.getElementById('selection-screen'),
    trainingScreen: document.getElementById('training-screen'),
    searchBar: document.getElementById('search-bar'),
    chapterList: document.getElementById('chapter-list'),
    selectionHint: document.getElementById('selection-hint'),
    selectionFooter: document.getElementById('selection-footer'),
    footerToggle: document.getElementById('footer-toggle'),
    footerToggleText: document.getElementById('footer-toggle-text'),
    startBtn: document.getElementById('start-btn'),
    showAllBtn: document.getElementById('show-all-btn'),
    exportPdfBtn: document.getElementById('export-pdf-btn'),
    randomBtn: document.getElementById('random-btn'),
    randomSwitch: document.getElementById('random-switch'),
    modeBtn: document.getElementById('mode-btn'),
    themeSwitch: document.getElementById('theme-switch'),
    viewTypeInputs: document.querySelectorAll('input[name="viewType"]'),
    cardMode: document.getElementById('card-mode'),
    previewMode: document.getElementById('preview-mode'),
    previewList: document.getElementById('preview-list'),
    modeStatus: document.getElementById('mode-status'),
    progress: document.getElementById('progress'),
    trainingCard: document.getElementById('training-card'),
    displayWord: document.getElementById('display-word'),
    displayMean: document.getElementById('display-mean'),
    inputArea: document.getElementById('input-area'),
    userInput: document.getElementById('user-input'),
    prevBtn: document.getElementById('prev-btn'),
    actionBtn: document.getElementById('action-btn'),
    exitBtn: document.getElementById('exit-btn'),
    previewBackBtn: document.getElementById('preview-back-btn')
};

export function setBusy(button, isBusy, busyText, idleText) {
    button.disabled = isBusy;
    button.textContent = isBusy ? busyText : idleText;
}

export function emptyState(message, detail = '') {
    const detailHtml = detail ? `<p>${escapeHTML(detail)}</p>` : '';
    return `<div class="empty-state"><strong>${escapeHTML(message)}</strong>${detailHtml}</div>`;
}

export function escapeHTML(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
