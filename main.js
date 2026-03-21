let state = {
    chapters: [],
    selectedIds: new Set(),
    wordPool: [],
    index: 0,
    isRandom: false,
    theme: 'light',
    quizMode: 'en-to-zh' // 'en-to-zh' (问答) 或 'zh-to-en' (字卡)
};

// 1. 初始化：从本地读取配置
async function init() {
    loadSettings(); // 读取持久化选项
    try {
        const resp = await fetch('chapters.json');
        state.chapters = await resp.json();
        renderChapters();
    } catch (e) {
        document.getElementById('chapter-list').innerHTML =
            `<div style="padding:20px; color:red;">加载失败: 请检查 chapters.json</div>`;
    }
}

// 2. 保存配置到 localStorage
function saveSettings() {
    const config = {
        isRandom: state.isRandom,
        theme: document.documentElement.getAttribute('data-theme'),
        quizMode: state.quizMode // 新增记录
    };
    localStorage.setItem('exammm_config', JSON.stringify(config));
}

// 3. 读取配置并应用到 UI
function loadSettings() {
    const saved = localStorage.getItem('exammm_config');
    if (saved) {
        const config = JSON.parse(saved);
        state.isRandom = config.isRandom;
        state.quizMode = config.quizMode || 'en-to-zh'; // 读取记录

        // 同步 UI 状态
        const modeBtn = document.getElementById('mode-btn');
        if (modeBtn) modeBtn.innerText = state.quizMode === 'en-to-zh' ? '问答' : '字卡';

        // 应用随机设置
        state.isRandom = config.isRandom;
        if (state.isRandom) {
            document.getElementById('random-switch').classList.add('active');
            document.getElementById('random-text').style.color = "var(--primary)";
        }

        // 应用主题设置
        state.theme = config.theme;
        document.documentElement.setAttribute('data-theme', state.theme);
        if (state.theme === 'dark') {
            document.getElementById('theme-switch').classList.add('active');
        }
    }
}

// 4. 切换函数：增加保存逻辑
function toggleMode() {
    // 切换模式
    state.quizMode = state.quizMode === 'en-to-zh' ? 'flashcard' : 'en-to-zh';

    // 更新按钮文字
    const modeBtn = document.getElementById('mode-btn');
    modeBtn.innerText = state.quizMode === 'en-to-zh' ? '问答' : '字卡';

    // 如果正在训练中，立即刷新当前卡片状态
    if (document.getElementById('training-screen').style.display === 'block') {
        updateCard();
    }
    saveSettings();
}

function toggleRandom() {
    state.isRandom = !state.isRandom;
    document.getElementById('random-switch').classList.toggle('active');
    document.getElementById('random-text').style.color = state.isRandom ? "var(--primary)" : "var(--text-sub)";
    saveSettings();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    document.getElementById('theme-switch').classList.toggle('active');
    saveSettings();
}

function showAbout() {
    document.getElementById('about-overlay').classList.add('active');
}

function closeAbout(event) {
    // 如果传入了 event，判断点击的是否是遮罩层本身
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('about-overlay').classList.remove('active');
}

// --- 单词练习逻辑 ---

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

async function loadAndStart() {
    const btn = document.getElementById('start-btn');
    const originalText = btn.innerText;
    btn.innerText = "读取中...";
    btn.disabled = true;

    try {
        const tasks = Array.from(state.selectedIds).map(async id => {
            const ch = state.chapters.find(c => c.id === id);
            const r = await fetch(ch.path);
            if (!r.ok) throw new Error(`文件不存在: ${ch.title}`);
            const t = await r.text();
            return parseCSV(t);
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
        btn.style.background = "#ef4444";
        btn.innerText = "读取失败: " + e.message;
        setTimeout(() => {
            btn.style.background = "";
            btn.innerText = originalText;
            btn.disabled = false;
        }, 3000);
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
    const actionBtn = document.getElementById('action-btn');
    const word = state.wordPool[state.index];

    // 如果还没显示答案
    if (!meanEl.classList.contains('show')) {
        if (state.quizMode === 'en-to-zh') {
            // 【问答模式】逻辑：判定输入
            const userAnswer = document.getElementById('user-input').value.trim();
            const isCorrect = userAnswer !== "" && (word.m === userAnswer || word.m.includes(userAnswer));

            meanEl.style.color = isCorrect ? "#10b981" : "#ef4444";
            meanEl.innerText = (isCorrect ? "⭐ 正确: " : "❌ 答案: ") + word.m;
            document.getElementById('user-input').disabled = true;
        } else {
            // 【字卡模式】逻辑：直接展示答案
            meanEl.style.color = "var(--text-sub)";
            meanEl.innerText = word.m;
        }

        meanEl.classList.add('show');
        actionBtn.innerText = "下一个 (Enter)";
    } else {
        // 如果已经显示了答案，点击则跳到下一题
        moveToNext();
    }
}

function updateCard() {
    const word = state.wordPool[state.index];
    const wordEl = document.getElementById('display-word');
    const meanEl = document.getElementById('display-mean');
    const inputArea = document.getElementById('input-area');
    const inputEl = document.getElementById('user-input');
    const actionBtn = document.getElementById('action-btn');

    // 1. 重置显示状态
    meanEl.classList.remove('show');
    inputEl.value = "";
    inputEl.disabled = false;

    // 2. 根据模式控制输入框的显示/隐藏
    if (state.quizMode === 'flashcard') {
        inputArea.classList.add('hidden'); // 字卡模式隐藏输入框
        actionBtn.innerText = "查看答案 (Enter)";
    } else {
        inputArea.classList.remove('hidden'); // 问答模式显示输入框
        actionBtn.innerText = "确定 (Enter)";
        setTimeout(() => inputEl.focus(), 50);
    }

    // 3. 内容显示 (字卡模式默认显示英文)
    wordEl.innerText = word.w;

    // 4. 更新进度
    document.getElementById('progress').innerText = `${state.index + 1} / ${state.wordPool.length}`;
}
function moveToNext() {
    if (state.index < state.wordPool.length - 1) {
        state.index++;
        updateCard();
    } else {
        renderEndScreen();
    }
}

function prevWord() {
    if (state.index > 0) {
        state.index--;
        updateCard();
    }
}

function exitSession() {
    location.reload();
}

function renderEndScreen() {
    const card = document.querySelector('.card');
    document.getElementById('progress').style.visibility = 'hidden';
    card.onclick = null;
    card.innerHTML = `
        <div class="end-title">🎉 练习已完成！</div>
        <p style="color: var(--text-sub); margin-bottom: 30px;">
            本次共温习了 ${state.wordPool.length} 个单词
        </p>
        <button class="btn-main" onclick="exitSession()" style="width: 80%; margin: 0 auto;">
            返回主页
        </button>
    `;
    const footer = document.querySelector('#training-screen .footer-toolbar');
    if (footer) footer.style.display = 'none';
}

// 键盘监听
document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        const trainingScreen = document.getElementById('training-screen');
        if (trainingScreen && trainingScreen.style.display === 'block') {
            e.preventDefault();
            handleAction();
        }
    }
});

// 启动程序
init();