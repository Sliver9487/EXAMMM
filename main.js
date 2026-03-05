let state = {
    chapters: [],
    selectedIds: new Set(),
    wordPool: [],
    index: 0,
    isRandom: false,
    lang: 'zh'
};

// 初始化加载
async function init() {
    try {
        const resp = await fetch('chapters.json');
        state.chapters = await resp.json();
        renderChapters();
    } catch (e) {
        document.getElementById('chapter-list').innerHTML = `<div style="padding:20px; color:red;">加载失败: 请检查 chapters.json</div>`;
    }
}

function renderChapters() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const list = document.getElementById('chapter-list');
    if (!list) return;

    list.innerHTML = "";
    let totalCount = 0;

    state.chapters.filter(c => c.title.toLowerCase().includes(query)).forEach(ch => {
        const isSelected = state.selectedIds.has(ch.id);
        if (isSelected) totalCount += (ch.count || 0);

        const div = document.createElement('div');
        div.className = `chapter-item ${isSelected ? 'selected' : ''}`;
        div.onclick = () => {
            isSelected ? state.selectedIds.delete(ch.id) : state.selectedIds.add(ch.id);
            renderChapters();
        };
        div.innerHTML = `
                <div class="checkbox"></div>
                <div class="chapter-info">
                    <span class="name">${ch.title}</span>
                    <span class="count">${ch.count || 0} 单词</span>
                </div>
            `;
        list.appendChild(div);
    });

    const btn = document.getElementById('start-btn');
    btn.disabled = state.selectedIds.size === 0;
    btn.innerText = `开始练习 (${totalCount} 词)`;
}

function renderEndScreen() {
    const card = document.querySelector('.card');
    // 隐藏进度条
    document.getElementById('progress').style.visibility = 'hidden';

    // 在卡片内插入结束信息和返回按钮
    card.onclick = null; // 禁用点击翻转
    card.innerHTML = `
        <div class="end-title">🎉 练习已完成！</div>
        <p style="color: var(--text-sub); margin-bottom: 30px;">
            本次共温习了 ${state.wordPool.length} 个单词
        </p>
        <button class="btn-main" onclick="exitSession()" style="width: 80%; margin: 0 auto;">
            返回主页
        </button>
    `;

    // 隐藏底部的“上一个/下一个”工具栏，避免误触
    const footer = document.querySelector('#training-screen .footer-toolbar');
    if (footer) footer.style.display = 'none';
}

function toggleRandom() {
    state.isRandom = !state.isRandom;
    document.getElementById('random-switch').classList.toggle('active');
    document.getElementById('random-text').style.color = state.isRandom ? "var(--primary)" : "var(--text-sub)";
}

async function loadAndStart() {
    const btn = document.getElementById('start-btn');
    const originalText = btn.innerText;
    btn.innerText = "读取中...";
    btn.disabled = true;

    try {
        const tasks = Array.from(state.selectedIds).map(async id => {
            const ch = state.chapters.find(c => c.id === id);
            const r = await fetch(ch.path);

            // 核心修改：检查 HTTP 状态，如果 404 或其他错误直接抛出异常
            if (!r.ok) throw new Error(`无法读取文件: ${ch.title} (${ch.path})`);

            const t = await r.text();
            const data = parseCSV(t);

            // 如果 CSV 解析出来是空的，也视为读取失败
            if (data.length === 0) throw new Error(`${ch.title} 章节内没有单词数据`);

            return data;
        });

        const results = await Promise.all(tasks);
        let pool = results.flat();

        if (state.isRandom) pool.sort(() => Math.random() - 0.5);

        state.wordPool = pool;
        state.index = 0;

        // 只有成功获取到数据才切换屏幕
        document.getElementById('selection-screen').style.display = 'none';
        document.getElementById('training-screen').style.display = 'block';
        updateCard();

    } catch (e) {
        // 修改：不再只是弹窗，而是直接更新按钮文字告知用户
        const btn = document.getElementById('start-btn');
        btn.innerText = "无法读取文件";
        btn.style.background = "#ef4444"; // 变成红色警示

        console.error(e);
        alert("错误详情: " + e.message);

        // 3秒后恢复按钮颜色
        setTimeout(() => {
            btn.style.background = "";
            renderChapters();
        }, 3000);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

function parseCSV(text) {
    return text.split(/\r?\n/).filter(l => l.trim() !== "").slice(1).map(l => {
        const c = l.split(',');
        return { w: c[0], m: c[1] };
    });
}

function updateCard() {
    const word = state.wordPool[state.index];
    const wordEl = document.getElementById('display-word');
    const meanEl = document.getElementById('display-mean');
    const progressEl = document.getElementById('progress');

    if (!wordEl || !meanEl) return;

    // 1. 第一步：立即强制隐藏意思，防止“偷看”
    meanEl.style.transition = 'none'; // 瞬间关闭过渡动画
    meanEl.classList.remove('show');

    // 2. 第二步：更新单词标题和进度（这些是公开信息）
    wordEl.innerText = word.w;
    if (progressEl) progressEl.innerText = `${state.index + 1} / ${state.wordPool.length}`;

    // 3. 第三步：利用微延迟，在后台更换意思并恢复动画
    setTimeout(() => {
        meanEl.innerText = word.m; // 此时意思已经完全透明，更换内容
        meanEl.style.transition = '0.3s'; // 重新开启 0.3s 的淡入过渡
    }, 50); // 50毫秒的延迟足以避开浏览器的渲染合并
}

function nextWord() {
    if (state.index < state.wordPool.length - 1) {
        state.index++;
        updateCard();
    } else {
        // 结束后不再使用 alert，直接在卡片里渲染结束界面
        renderEndScreen();
    }
}

function prevWord() {
    if (state.index > 0) {
        state.index--; updateCard();
    }
}

// 修改原有的退出函数，确保重置工具栏显示
function exitSession() {
    document.getElementById('selection-screen').style.display = 'block';
    document.getElementById('training-screen').style.display = 'none';

    // 恢复可能被修改的 DOM 状态
    const footer = document.querySelector('#training-screen .footer-toolbar');
    if (footer) footer.style.display = 'flex';
    document.getElementById('progress').style.visibility = 'visible';

    // 重新渲染章节列表（为了重置卡片 HTML）
    renderChapters();
    // 强制刷新页面部分内容以恢复 card 初始 HTML 结构，或直接在 updateCard 里处理
    location.reload(); // 最简单稳妥的重置方式
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-switch').classList.toggle('active');
}

function toggleLang() {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    document.getElementById('lang-btn').innerText = state.lang === 'zh' ? 'EN' : '中';
    renderChapters();
}

init();