# 华文注释练习 EXAMMM

这是一个用于华文课文注释练习的纯前端单页应用。项目没有后端、数据库、登录系统或构建流程，可以直接部署到 GitHub Pages。

## 功能

- 从 `chapters.json` 读取章节列表。
- 根据章节配置读取 `data/*.csv` 词语数据。
- 支持多章节选择、章节搜索、随机练习。
- 支持问答模式、字卡模式、词语模式、原句模式。
- 支持预览全部词条和导出讲义 PDF。
- 支持浅色 / 深色主题，并使用 `localStorage` 保存设置。

## 项目结构

```txt
/
├── index.html
├── style.css
├── manifest.json
├── chapters.json
├── data/
│   └── *.csv
└── js/
    ├── app.js
    ├── chapters.js
    ├── csv.js
    ├── dom.js
    ├── export.js
    ├── practice.js
    ├── settings.js
    └── state.js
```

## 修改章节列表

章节配置写在 `chapters.json` 中，每个章节需要包含：

```json
{
  "id": "lesson3",
  "title": "高三:第三课《出师表》",
  "path": "data/S3ZSL3.csv",
  "count": 37
}
```

- `id`：章节唯一标识，不要重复。
- `title`：页面显示的章节名称。
- `path`：CSV 文件的相对路径，GitHub Pages 会按这个路径读取。
- `count`：词条数量，用于按钮和章节卡片显示。

## 添加新的 CSV 词语数据

1. 在 `data/` 文件夹中新增 CSV 文件，例如 `data/S3NEW.csv`。
2. 使用以下格式保存：

```csv
词语,含义,原句
崩殂,死亡,先帝创业未半而中道崩殂
开张,扩大,诚宜开张圣听
```

目前解析器也兼容旧格式 `word,meaning`，缺少原句时会自动留空。CSV 中如果含有逗号，请用英文双引号包住该字段。

3. 在 `chapters.json` 添加对应章节，并确保 `path` 与 CSV 文件路径一致。

## 本地预览

由于浏览器安全限制，直接双击打开 `index.html` 时，`fetch()` 可能无法读取 `chapters.json` 和 CSV 文件。建议使用 GitHub Pages 预览，或在本地启动一个静态文件服务器。

常见方式：

```bash
python -m http.server 8000
```

然后打开：

```txt
http://localhost:8000
```

这只是本地预览方式，不是项目运行依赖。部署到 GitHub Pages 不需要 Python、Node.js 或任何后端服务。

## 部署到 GitHub Pages

1. 将项目提交到 GitHub 仓库。
2. 打开仓库 Settings。
3. 进入 Pages。
4. Source 选择对应分支，例如 `main`。
5. 保存后等待 GitHub Pages 发布。

发布完成后，页面会通过相对路径读取 `chapters.json` 和 `data/*.csv`，因此可以正常运行。

## 常见问题

### 为什么本地双击 HTML 可能无法加载数据？

应用需要用 `fetch()` 读取本地 JSON 和 CSV 文件。很多浏览器会限制 `file://` 页面读取同目录文件，所以可能加载失败。

### 为什么 GitHub Pages 上可以正常运行？

GitHub Pages 会通过 HTTPS 静态托管这些文件，`fetch()` 可以正常读取同站点下的 `chapters.json` 和 CSV 文件。

### 如何添加新课文？

先把新 CSV 放到 `data/`，再在 `chapters.json` 添加一条章节配置。确认 `path` 使用相对路径，例如 `data/S3NEW.csv`。

### 如何修改主题颜色？

主题颜色集中在 `style.css` 顶部的 CSS 变量中。浅色主题在 `:root`，深色主题在 `[data-theme="dark"]`。
