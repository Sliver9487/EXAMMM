import { els, escapeHTML } from './dom.js';
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
    printWindow.focus();
    printWindow.print();
}

function buildPrintHTML() {
    const chapters = selectedChapters();
    const rows = state.wordPool.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(item.chapterTitle || '')}</td>
            <td>${escapeHTML(item.w || '')}</td>
            <td>${escapeHTML(item.m || '')}</td>
            <td>${escapeHTML(item.s || '-')}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>华文注释讲义</title>
            <style>
                body { font-family: "Noto Serif SC", "Songti SC", "Microsoft YaHei", serif; color: #111827; padding: 28px; }
                h1 { margin: 0 0 8px; font-size: 28px; }
                p { margin: 0 0 20px; color: #4b5563; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th, td { border: 1px solid #d1d5db; padding: 8px; vertical-align: top; }
                th { background: #f3f4f6; text-align: left; }
                td:first-child { width: 36px; text-align: center; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <h1>华文注释讲义</h1>
            <p>${escapeHTML(chapters.map((chapter) => chapter.title).join('、'))}</p>
            <table>
                <thead>
                    <tr><th>#</th><th>章节</th><th>词语</th><th>含义</th><th>原句</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
        </html>`;
}
