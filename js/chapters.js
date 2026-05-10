import { els, emptyState, escapeHTML } from './dom.js';
import { selectedWordCount, state } from './state.js';

export async function loadChapters() {
    els.chapterList.innerHTML = emptyState('章节加载中...');

    try {
        const response = await fetch('./chapters.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const chapters = await response.json();
        if (!Array.isArray(chapters)) throw new Error('chapters.json must be an array');

        state.chapters = chapters.filter((chapter) => chapter && chapter.id && chapter.title && chapter.path);
        renderChapters();
    } catch (error) {
        state.chapters = [];
        els.chapterList.innerHTML = emptyState('章节加载失败，请检查 chapters.json', error.message);
        updateChapterActions();
    }
}

export function renderChapters() {
    const query = els.searchBar.value.trim().toLowerCase();
    const chapters = state.chapters.filter((chapter) => chapter.title.toLowerCase().includes(query));

    if (!state.chapters.length) {
        els.chapterList.innerHTML = emptyState('章节加载失败，请检查 chapters.json');
        updateChapterActions();
        return;
    }

    if (!chapters.length) {
        els.chapterList.innerHTML = emptyState('没有找到相关章节', '可以换一个关键词试试。');
        updateChapterActions();
        return;
    }

    els.chapterList.innerHTML = chapters.map((chapter) => {
        const selected = state.selectedIds.has(chapter.id);
        return `
            <button class="chapter-item ${selected ? 'selected' : ''}" type="button" data-id="${escapeHTML(chapter.id)}" aria-pressed="${selected}">
                <span class="chapter-check" aria-hidden="true">${selected ? '✓' : ''}</span>
                <span class="chapter-info">
                    <strong>${escapeHTML(chapter.title)}</strong>
                    <small>${Number(chapter.count || 0)} 词 · ${escapeHTML(chapter.path)}</small>
                </span>
            </button>
        `;
    }).join('');

    updateChapterActions();
}

export function toggleChapter(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
    }
    renderChapters();
}

export function updateChapterActions() {
    const count = selectedWordCount();
    const hasSelection = state.selectedIds.size > 0;
    const loading = state.isLoading;

    els.selectionHint.textContent = hasSelection
        ? `已选择 ${state.selectedIds.size} 个章节，约 ${count} 个词条`
        : '请先选择章节';

    els.startBtn.disabled = !hasSelection || loading;
    els.showAllBtn.disabled = !hasSelection || loading;
    els.exportPdfBtn.disabled = !hasSelection || loading;
    els.startBtn.title = hasSelection ? '' : '请先选择章节';
    els.showAllBtn.title = hasSelection ? '' : '请先选择章节';
    els.exportPdfBtn.title = hasSelection ? '' : '请先选择章节';

    if (!loading) {
        els.startBtn.textContent = `开始练习 (${count})`;
        els.showAllBtn.textContent = '预览全部';
        els.exportPdfBtn.textContent = '导出讲义 PDF';
    }
}

export function showLoadErrors() {
    if (!state.failedLoads.length) return '';
    const names = state.failedLoads.map((item) => item.title).join('、');
    return `<div class="notice warning">以下章节加载失败：${escapeHTML(names)}</div>`;
}
