import { fetchText, parseCSV } from './csv.js';
import { els, emptyState, escapeHTML, setBusy } from './dom.js';
import { renderChapters, showLoadErrors, updateChapterActions } from './chapters.js';
import { resetSession, selectedChapters, selectedWordCount, state } from './state.js';

export async function startSession(isPreview = false) {
    if (!state.selectedIds.size || state.isLoading) return;

    setLoading(true, isPreview ? '正在加载预览...' : '正在加载词条...');
    resetSession();
    state.isLoading = true;

    await loadSelectedWords();
    state.isLoading = false;
    updateChapterActions();

    if (!state.wordPool.length) {
        const failedNames = state.failedLoads.map((item) => item.title).join('、');
        els.selectionHint.textContent = failedNames
            ? `章节加载失败：${failedNames}`
            : '没有可练习的词条，请检查 CSV 文件。';
        setLoading(false);
        renderChapters();
        return;
    }

    if (state.isRandom) shuffle(state.wordPool);
    state.index = 0;
    state.answerVisible = false;
    showTrainingScreen(isPreview);
    setLoading(false);
}

export async function loadSelectedWords() {
    const chapters = selectedChapters();
    const results = await Promise.allSettled(chapters.map(async (chapter) => {
        const text = await fetchText(chapter.path);
        return parseCSV(text).map((word) => ({
            ...word,
            chapterId: chapter.id,
            chapterTitle: chapter.title
        }));
    }));

    state.wordPool = [];
    state.failedLoads = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            state.wordPool.push(...result.value);
        } else {
            state.failedLoads.push({
                ...chapters[index],
                message: result.reason?.message || '读取失败'
            });
        }
    });
}

export function showTrainingScreen(isPreview) {
    els.selectionScreen.hidden = true;
    els.trainingScreen.hidden = false;
    els.cardMode.hidden = isPreview;
    els.previewMode.hidden = !isPreview;
    updateModeStatus();

    if (isPreview) {
        renderPreviewList();
    } else {
        renderCard();
    }
}

export function renderCard() {
    const word = state.wordPool[state.index];
    if (!word) {
        renderCompletion();
        return;
    }

    const displayText = getPromptText(word);
    els.trainingCard.classList.remove('complete');
    els.inputArea.hidden = state.quizMode !== 'qa';
    els.displayWord.textContent = displayText || '未填写词条';
    els.displayMean.textContent = state.answerVisible ? (word.m || '未填写含义') : '';
    els.displayMean.classList.toggle('show', state.answerVisible);
    els.actionBtn.textContent = state.answerVisible ? nextButtonText() : '显示答案';
    els.prevBtn.disabled = state.index === 0;
    els.progress.textContent = `${state.index + 1} / ${state.wordPool.length}`;

    if (state.quizMode === 'qa') {
        els.userInput.value = '';
        requestAnimationFrame(() => els.userInput.focus());
    }
}

export function handleAction() {
    if (!state.wordPool.length) return;
    if (els.trainingCard.classList.contains('complete')) {
        restartSession();
        return;
    }

    if (!state.answerVisible) {
        state.answerVisible = true;
        renderCard();
        return;
    }

    if (state.index < state.wordPool.length - 1) {
        state.index += 1;
        state.answerVisible = false;
        renderCard();
    } else {
        renderCompletion();
    }
}

export function prevWord() {
    if (state.index <= 0) return;
    state.index -= 1;
    state.answerVisible = false;
    renderCard();
}

export function handleInputKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleAction();
    }
}

export function renderCompletion() {
    els.trainingCard.classList.add('complete');
    els.inputArea.hidden = true;
    els.displayWord.textContent = '练习完成';
    els.displayMean.innerHTML = `
        <div class="complete-actions">
            <button class="btn-main" type="button" id="restart-session-btn">重新练习</button>
            <button class="btn-secondary-integrated" type="button" id="return-selection-btn">返回章节选择</button>
        </div>
    `;
    els.displayMean.classList.add('show');
    els.progress.textContent = `${state.wordPool.length} / ${state.wordPool.length}`;
    els.actionBtn.textContent = '重新练习';
    els.prevBtn.disabled = state.wordPool.length <= 1;
}

export function restartSession() {
    if (!state.wordPool.length) return;
    if (state.isRandom) shuffle(state.wordPool);
    state.index = 0;
    state.answerVisible = false;
    renderCard();
}

export function exitSession() {
    els.trainingScreen.hidden = true;
    els.selectionScreen.hidden = false;
    els.cardMode.hidden = false;
    els.previewMode.hidden = true;
    state.index = 0;
    state.answerVisible = false;
    renderChapters();
}

export function renderPreviewList() {
    const grouped = selectedChapters();
    const warning = showLoadErrors();
    const content = grouped.map((chapter) => {
        const words = state.wordPool.filter((word) => word.chapterId === chapter.id);
        if (!words.length) return '';

        return `
            <section class="preview-chapter">
                <h2>${escapeHTML(chapter.title)}</h2>
                ${words.map((word) => `
                    <article class="preview-item">
                        <strong>${escapeHTML(getPromptText(word))}</strong>
                        <span>${escapeHTML(word.m || '未填写含义')}</span>
                    </article>
                `).join('')}
            </section>
        `;
    }).join('');

    els.previewList.innerHTML = warning + (content || emptyState('没有可预览的词条'));
    els.progress.textContent = `共 ${state.wordPool.length} 条`;
}

export function updateModeStatus() {
    const mode = state.quizMode === 'qa' ? '问答模式' : '字卡模式';
    const display = state.displayType === 'sentence' ? '原句模式' : '词语模式';
    els.modeStatus.textContent = `${mode} · ${display}`;
}

function getPromptText(word) {
    return state.displayType === 'sentence' && word.s ? word.s : word.w;
}

function nextButtonText() {
    return state.index >= state.wordPool.length - 1 ? '完成练习' : '下一题';
}

function setLoading(isLoading, text = '') {
    setBusy(els.startBtn, isLoading, text, `开始练习 (${selectedWordCount()})`);
    els.showAllBtn.disabled = isLoading || !state.selectedIds.size;
    els.exportPdfBtn.disabled = isLoading || !state.selectedIds.size;
    if (isLoading) {
        els.showAllBtn.textContent = '加载中...';
        els.exportPdfBtn.textContent = '加载中...';
        els.selectionHint.textContent = text;
    }
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
}
