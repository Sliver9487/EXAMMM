export const STORAGE_KEY = 'exammm_cfg';

export const state = {
    chapters: [],
    selectedIds: new Set(),
    wordPool: [],
    failedLoads: [],
    index: 0,
    answerVisible: false,
    isRandom: false,
    quizMode: 'qa',
    displayType: 'word',
    isLoading: false
};

export function selectedChapters() {
    return state.chapters.filter((chapter) => state.selectedIds.has(chapter.id));
}

export function selectedWordCount() {
    return selectedChapters().reduce((sum, chapter) => sum + Number(chapter.count || 0), 0);
}

export function resetSession() {
    state.wordPool = [];
    state.failedLoads = [];
    state.index = 0;
    state.answerVisible = false;
    state.isLoading = false;
}

export function loadSettings() {
    let config = {};
    try {
        config = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        config = {};
    }

    state.quizMode = config.mode === 'flashcard' ? 'flashcard' : 'qa';
    state.displayType = config.displayType === 'sentence' ? 'sentence' : 'word';
    state.isRandom = Boolean(config.random);
    return config.theme === 'dark' ? 'dark' : 'light';
}

export function saveSettings(theme) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.quizMode,
        displayType: state.displayType,
        random: state.isRandom,
        theme
    }));
}
