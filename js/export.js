import { els } from './dom.js';
import { loadSelectedWords } from './practice.js';
import { selectedChapters, state } from './state.js';
import { updateChapterActions } from './chapters.js';

export async function exportSelectedToPDF() {
    if (!state.selectedIds.size || state.isLoading) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        els.selectionHint.textContent = '浏览器阻止了弹窗，请允许弹窗后再导出。';
        return;
    }

    printWindow.document.write('<p style="font-family: sans-serif; padding: 24px;">正在生成讲义...</p>');
    printWindow.document.close();

    state.isLoading = true;
    els.exportPdfBtn.disabled = true;
    els.exportPdfBtn.setAttribute('aria-disabled', 'true');
    els.exportPdfBtn.textContent = '正在生成...';
    els.selectionHint.textContent = '正在读取所选章节...';

    await loadSelectedWords();
    state.isLoading = false;
    updateChapterActions();

    if (!state.wordPool.length) {
        els.selectionHint.textContent = '没有可导出的词条，请检查 CSV 文件。';
        printWindow.close();
        return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHTML());
    printWindow.document.close();
}

function buildPrintHTML() {
    const groupedChapters = buildExportGroups();
    const isSentenceMode = state.displayType === 'sentence';
    const totalItems = groupedChapters.reduce((sum, chapter) => sum + chapter.items.length, 0);
    const exportDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const printData = stringifyForScript({
        chapters: groupedChapters,
        isSentenceMode,
        exportDate,
        chapterCount: groupedChapters.length,
        totalItems
    });

    return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>华文注释讲义</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 0;
                }

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    background: #fff;
                }

                .pdf-page {
                    width: 210mm;
                    height: 297mm;
                    box-sizing: border-box;
                    padding: 10mm;
                    background: #fff;
                    color: #111;
                    font-family: "Microsoft YaHei", "Noto Sans SC", sans-serif;
                    page-break-after: always;
                    overflow: hidden;
                }

                .pdf-header {
                    height: 18mm;
                    box-sizing: border-box;
                    margin: 0 0 5mm;
                    padding-bottom: 3mm;
                    border-bottom: 1px solid #cbd5e1;
                }

                .pdf-header h1 {
                    margin: 0 0 2mm;
                    font-size: 18pt;
                    line-height: 1.1;
                    letter-spacing: 0;
                    font-weight: 800;
                }

                .pdf-meta {
                    margin: 0;
                    color: #334155;
                    font-size: 8.5pt;
                    line-height: 1.35;
                }

                .pdf-columns {
                    width: 100%;
                    height: calc(297mm - 20mm - 18mm - 5mm);
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    column-gap: 8mm;
                    align-items: start;
                }

                .pdf-column {
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }

                .pdf-chapter-title {
                    break-after: avoid;
                    page-break-after: avoid;
                    margin: 0 0 2mm;
                    padding: 2mm 2.5mm;
                    font-size: 10.5pt;
                    line-height: 1.2;
                    font-weight: 800;
                    background: #f1f5f9;
                    border-left: 3px solid #2f6f5e;
                }

                .pdf-entry {
                    display: grid;
                    grid-template-columns: 36% 64%;
                    width: 100%;
                    box-sizing: border-box;
                    break-inside: avoid;
                    page-break-inside: avoid;
                    border: 1px solid #d8dee6;
                    border-bottom: 0;
                    font-size: 8.5pt;
                    line-height: 1.22;
                    background: #fff;
                }

                .pdf-entry:last-child {
                    border-bottom: 1px solid #d8dee6;
                }

                .pdf-left,
                .pdf-meaning {
                    box-sizing: border-box;
                    padding: 1.1mm 1.5mm;
                    min-width: 0;
                    word-break: break-word;
                }

                .pdf-left {
                    border-right: 1px solid #d8dee6;
                }

                .pdf-word {
                    font-weight: 800;
                    word-break: break-word;
                }

                .pdf-sentence {
                    margin-top: 0.5mm;
                    font-size: 7pt;
                    line-height: 1.15;
                    color: #64748b;
                    font-weight: 400;
                    word-break: break-all;
                }

                .pdf-meaning {
                    font-weight: 400;
                }

                @media screen {
                    body {
                        background: #e5e7eb;
                        padding: 16px;
                    }

                    .pdf-page {
                        margin: 0 auto;
                        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
                    }

                    .pdf-page + .pdf-page {
                        margin-top: 16px;
                    }
                }

                @media print {
                    body {
                        background: #fff;
                    }

                    .pdf-page {
                        box-shadow: none;
                    }

                    .pdf-page:last-child {
                        page-break-after: auto;
                    }
                }
            </style>
        </head>
        <body>
            <main id="pdf-root"></main>
            <script>
                const printData = ${printData};
                const root = document.getElementById('pdf-root');
                let currentPage = null;
                let currentColumns = [];
                let currentColumnIndex = 0;

                function escapeText(value) {
                    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;'
                    }[char]));
                }

                function createPage() {
                    const page = document.createElement('section');
                    page.className = 'pdf-page';
                    page.innerHTML = \`
                        <header class="pdf-header">
                            <h1 class="pdf-title">华文注释讲义</h1>
                            <p class="pdf-meta">导出日期：\${escapeText(printData.exportDate)} · 所选章节：\${printData.chapterCount} 个 · 总词条：\${printData.totalItems} 条</p>
                        </header>
                        <div class="pdf-columns">
                            <div class="pdf-column"></div>
                            <div class="pdf-column"></div>
                        </div>
                    \`;
                    root.appendChild(page);
                    currentPage = page;
                    currentColumns = Array.from(page.querySelectorAll('.pdf-column'));
                    currentColumnIndex = 0;
                    return page;
                }

                function currentColumn() {
                    if (!currentPage) createPage();
                    return currentColumns[currentColumnIndex];
                }

                function moveToNextColumnOrPage() {
                    if (currentColumnIndex === 0) {
                        currentColumnIndex = 1;
                    } else {
                        createPage();
                        currentColumnIndex = 0;
                    }
                    return currentColumn();
                }

                function overflows(column) {
                    return column.scrollHeight > column.clientHeight + 1;
                }

                function appendBlock(element) {
                    let column = currentColumn();
                    column.appendChild(element);
                    if (!overflows(column)) return;

                    column.removeChild(element);
                    column = moveToNextColumnOrPage();
                    column.appendChild(element);
                }

                function ensureTitleHasOneEntry(blocks, titleIndex) {
                    const nextBlock = blocks[titleIndex + 1];
                    if (!nextBlock || nextBlock.type !== 'entry') return;

                    const column = currentColumn();
                    const testEntry = nextBlock.element.cloneNode(true);
                    column.appendChild(testEntry);
                    const titleWouldBeAlone = overflows(column);
                    column.removeChild(testEntry);

                    if (!titleWouldBeAlone) return;

                    const titleElement = blocks[titleIndex].element;
                    if (titleElement.parentNode === column) {
                        column.removeChild(titleElement);
                    }

                    moveToNextColumnOrPage().appendChild(titleElement);
                }

                function createChapterTitle(text) {
                    const title = document.createElement('h2');
                    title.className = 'pdf-chapter-title';
                    title.textContent = text || '未命名章节';
                    return title;
                }

                function createEntry(item) {
                    const entry = document.createElement('div');
                    entry.className = 'pdf-entry';
                    const sentenceHTML = printData.isSentenceMode && item.sentence
                        ? \`<div class="pdf-sentence">\${escapeText(item.sentence)}</div>\`
                        : '';
                    entry.innerHTML = \`
                        <div class="pdf-left">
                            <div class="pdf-word">\${escapeText(item.word || '')}：</div>
                            \${sentenceHTML}
                        </div>
                        <div class="pdf-meaning">\${escapeText(item.meaning || '未填写含义')}</div>
                    \`;
                    return entry;
                }

                function buildBlocks() {
                    const blocks = [];
                    printData.chapters.forEach((chapter) => {
                        blocks.push({
                            type: 'chapter-title',
                            element: createChapterTitle(chapter.chapterTitle)
                        });

                        (chapter.items || []).forEach((item) => {
                            blocks.push({
                                type: 'entry',
                                element: createEntry(item)
                            });
                        });
                    });
                    return blocks;
                }

                function buildPages() {
                    createPage();
                    const blocks = buildBlocks();
                    blocks.forEach((block, index) => {
                        appendBlock(block.element);
                        if (block.type === 'chapter-title') {
                            ensureTitleHasOneEntry(blocks, index);
                        }
                    });
                }

                window.addEventListener('load', () => {
                    buildPages();
                    setTimeout(() => {
                        window.focus();
                        window.print();
                    }, 100);
                });
            </script>
        </body>
        </html>`;
}

function buildExportGroups() {
    return selectedChapters()
        .map((chapter) => ({
            chapterTitle: chapter.title,
            items: state.wordPool
                .filter((item) => item.chapterId === chapter.id)
                .map((item) => ({
                    word: item.w,
                    meaning: item.m,
                    sentence: item.s
                }))
        }))
        .filter((chapter) => chapter.items.length);
}

function stringifyForScript(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
