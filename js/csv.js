export async function fetchText(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
}

export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(cell.trim());
            cell = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') i += 1;
            row.push(cell.trim());
            pushRow(rows, row);
            row = [];
            cell = '';
            continue;
        }

        cell += char;
    }

    row.push(cell.trim());
    pushRow(rows, row);
    return normalizeRows(rows);
}

function pushRow(rows, row) {
    if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
    }
}

function normalizeRows(rows) {
    const dataRows = looksLikeHeader(rows[0]) ? rows.slice(1) : rows;

    return dataRows
        .map((cols) => ({
            w: (cols[0] || '').trim(),
            m: (cols[1] || '').trim(),
            s: (cols[2] || '').trim()
        }))
        .filter((item) => item.w || item.m || item.s);
}

function looksLikeHeader(row = []) {
    const first = String(row[0] || '').toLowerCase();
    const second = String(row[1] || '').toLowerCase();
    return ['word', '词语', '詞語'].includes(first) || ['meaning', '含义', '含義'].includes(second);
}
