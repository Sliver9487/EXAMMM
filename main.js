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
            
            // 严格检查文件是否存在
            if (!r.ok) throw new Error(`文件不存在: ${ch.title}`);
            
            const t = await r.text();
            const data = parseCSV(t);
            if (data.length === 0) throw new Error(`${ch.title} 章节内容为空`);
            
            return data;
        });

        const results = await Promise.all(tasks);
        let pool = results.flat();
        if (state.isRandom) pool.sort(() => Math.random() - 0.5);

        state.wordPool = pool;
        state.index = 0;

        document.getElementById('selection-screen').style.display = 'none';
        document.getElementById('training-screen').style.display = 'block';
        updateCard();

    } catch (e) {
        // UI 友好报错：按钮变红并提示
        btn.style.background = "#ef4444";
        btn.innerText = "读取失败: " + e.message;
        setTimeout(() => {
            btn.style.background = "";
            btn.innerText = originalText;
            btn.disabled = false;
        }, 3000);
    } finally {
        if (!document.getElementById('training-screen').style.display === 'block') {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}

function parseCSV(text) {
    return text.split(/\r?\n/).filter(l => l.trim() !== "").slice(1).map(l => {
        const c = l.split(',');
        return { w: c[0], m: c[1] };
    });
}

function handleAction() {
    const meanEl = document.getElementById('display-mean');
    const inputEl = document.getElementById('user-input');
    const actionBtn = document.getElementById('action-btn');

    if (!meanEl || !inputEl) return;

    // 状态 A：如果解释还没显示 -> 执行判定并显示
    if (!meanEl.classList.contains('show')) {
        const word = state.wordPool[state.index];
        const userAnswer = inputEl.value.trim();
        
        if (userAnswer !== "" && (word.m === userAnswer || word.m.includes(userAnswer))) {
            meanEl.style.color = "#10b981"; // 绿
            meanEl.innerText = "⭐ 正确: " + word.m;
        } else {
            meanEl.style.color = "#ef4444"; // 红
            meanEl.innerText = "❌ 答案: " + word.m;
        }

        meanEl.classList.add('show');
        inputEl.disabled = true;
        if (actionBtn) actionBtn.innerText = "下一个 (Enter)";
    } 
    // 状态 B：如果解释已经显示了 -> 切词
    else {
        moveToNext();
    }
}   

function updateCard() {
    const word = state.wordPool[state.index];
    const wordEl = document.getElementById('display-word');
    const meanEl = document.getElementById('display-mean');
    const inputEl = document.getElementById('user-input');
    const actionBtn = document.getElementById('action-btn');

    // 1. 彻底清除状态
    meanEl.classList.remove('show');
    meanEl.style.color = "var(--text-sub)";
    
    if (inputEl) {
        inputEl.value = "";
        inputEl.disabled = false;
        // 关键：切换后强制重新聚焦
        setTimeout(() => inputEl.focus(), 50);
    }
    
    if (actionBtn) actionBtn.innerText = "确定 (Enter)";

    // 2. 更新文字
    wordEl.innerText = word.w;
    
    // 3. 更新进度
    const progressEl = document.getElementById('progress');
    if (progressEl) progressEl.innerText = `${state.index + 1} / ${state.wordPool.length}`;
}

function nextWord() {
    if (state.index < state.wordPool.length - 1) {
        state.index++;
        updateCard();
    } else {
        renderEndScreen();
    }
}

function prevWord() {
    if (state.index > 0) {
        state.index--; updateCard();
    }
}

function moveToNext() {
    if (state.index < state.wordPool.length - 1) {
        state.index++;
        updateCard();
    } else {
        renderEndScreen();
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

// 监听键盘 Enter 事件
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        // 如果当前正在训练界面（即训练屏幕已显示）
        const trainingScreen = document.getElementById('training-screen');
        if (trainingScreen && trainingScreen.style.display === 'block') {
            e.preventDefault(); // 阻止默认的提交行为
            handleAction();     // 执行我们的逻辑
        }
    }
});