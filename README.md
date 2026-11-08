# Encounter

> 邂逅 · 基于 [Chiri](https://github.com/the3ash/astro-chiri) 重构适配 Halo 2.27 的极简博客主题

一个从 Astro 静态主题完整移植到 Halo 的尝试：**尽量按原版还原**，还原不了的用最接近的能力替代，Halo 多出来的能力按原版的设计语言补进去。

当前版本：**0.1.0**
兼容：**Halo >= 2.27.0**

---

## 特性

- **单列窄栏排版**：内容区 560px 居中，无侧栏，桌面顶部留白 96px、移动端 64px
- **克制的标题层级**：h1/h2/h3 与正文同字号（15px / 26.25px 行高），靠字重与留白区分
- **紧凑文章列表**：44px 等高行，「标题 — 细线 — 日期」三段式，可选虚线分隔、日期左右位置
- **深色模式**：跟随系统、可手动切换，首屏渲染前即确定主题，无闪白
- **跨文档视图转场**：旧页淡出 / 新页带模糊淡入（View Transition，需 https 或 localhost）
- **顶部滚动遮罩**：滚动超过 64px 出现渐变模糊层
- **极简目录**：正文左侧横线指示，悬停浮出标题，滚动自动高亮
- **代码复制**：悬停出现复制按钮，点击反馈并 1.5s 复原
- **图片查看器**：点击正文图片全屏预览，毛玻璃背景，Esc 关闭
- **KaTeX 公式**：行内 `$...$` 与块级 `$$...$$` 均支持，字体本地托管
- **评论区**：接入 Halo 评论组件，按原版版式排布，懒加载 + 骨架占位
- **归档 / 标签 / 分类 / 404**：用原版列表语言延伸出的页面

---

## 安装

### 方式一：上传安装（推荐）

1. 将本仓库打包为 zip（`theme.yaml` 需位于 zip 根目录）
2. Halo 后台 → 主题 → 主题管理 → 上传安装 / 升级
3. 安装完成后启用即可

### 方式二：目录部署

把整个主题目录放到 Halo 工作目录的 `themes/theme-encounter/` 下，目录名必须与 `theme.yaml` 中的 `metadata.name` 一致。

---

## 主题设置

后台 → 主题 → 主题管理 → 设置：

| 分组 | 设置项 | 说明 | 默认 |
| --- | --- | --- | --- |
| 基本 | 内容区宽度 | 对应原版 `contentWidth` | `560px` |
| 基本 | 居中布局 | 内容列居中 | 开启 |
| 基本 | 列表使用虚线分隔 | 原版 `postListDottedDivider` | 关闭 |
| 基本 | 显示页脚 | | 开启 |
| 基本 | 启用淡入动画 | 关掉后禁用转场与淡入 | 开启 |
| 日期 | 日期格式 | `YYYY-MM-DD` / `MM-DD-YYYY` / `DD-MM-YYYY` / `MONTH DAY YYYY` / `DAY MONTH YYYY` | `YYYY-MM-DD` |
| 日期 | 日期分隔符 | | `.` |
| 日期 | 日期在右侧 | 关闭则日期在标题左侧 | 开启 |
| 文章 | 显示目录 | | 开启 |
| 文章 | 显示阅读时长 | | 关闭 |
| 文章 | 图片查看器 | | 开启 |
| 文章 | 代码块复制按钮 | | 开启 |
| 文章 | 启用 KaTeX 公式 | 关闭后不加载公式资源 | 开启 |
| Halo | 启用评论 | | 开启 |
| Halo | 启用搜索入口 | | 开启 |

---

## 目录结构

```
theme-encounter/
├── theme.yaml              # 主题元信息
├── settings.yaml           # 后台设置表单
├── LICENSE                 # MIT（保留原作者署名）
├── i18n/                   # 国际化（预留）
└── templates/
    ├── layout.html         # 页面外壳（列表类页面）
    ├── post-layout.html    # 文章外壳
    ├── index.html          # 首页
    ├── post.html           # 文章详情
    ├── page.html           # 独立页面
    ├── page_about.html     # 关于页（自定义模板）
    ├── archives.html       # 归档
    ├── tags.html / tag.html
    ├── categories.html / category.html
    ├── error/404.html
    ├── modules/            # 片段：head / header / footer / date / post-list / pager
    └── assets/
        ├── css/            # fonts / global / post / components / chiri / katex
        ├── js/             # chiri.js（交互）、katex、auto-render
        └── fonts/          # Inter、Besley、KaTeX 字体
```

---

## 与原版的对应关系

| 原版（Astro） | 本主题（Halo） |
| --- | --- |
| `content collections` | Halo 文章 / 独立页面 |
| `remark-math` + `rehype-katex` | KaTeX 客户端渲染（本地字体） |
| `rehype-copy-code` | `chiri.js` 注入复制按钮 |
| `ImageViewer` 组件 | 懒创建的查看器 + 毛玻璃遮罩 |
| `TableOfContents` 组件 | 自动扫描 h2/h3 生成，横线指示 |
| `TransitionWrapper` | 跨文档 View Transition + 非安全上下文降级淡入 |
| `GradientMask` | 滚动遮罩 |
| `config.ts` | `settings.yaml` 表单 → `theme.config` |
| 构建时生成 RSS / Sitemap | 使用 Halo 官方 Feed / Sitemap 插件 |

### 已知差异

- **LinkCard / GitHubCard / XPOST / NeoDB 卡片**：依赖原版的 Markdown 指令管线，Halo 编辑器输出 HTML，这条管线不存在，暂未实现
- **OG 图动态生成**：原版用 canvaskit 生成社交分享图，Halo 侧未实现，建议使用文章封面
- **图片多尺寸优化**：原版用 sharp 生成，Halo 侧改用 `thumbnail.gen()` 缩略图
- **评论区外观**：Halo 评论组件为 shadow DOM 且未暴露 `::part`，只能通过 `--halo-cw-*` 变量调色

---

## 开发说明

两个容易踩的坑，写在这里省得后来者重复：

1. **Halo 会缓存模板**：改 `templates/` 下的文件必须重启 Halo 或重新加载主题才生效
2. **静态资源有浏览器缓存**：改 CSS / JS 后要给引用地址升版本号（如 `chiri.js?v=26`），否则浏览器一直用旧文件

---

## 致谢与许可

- 原始设计与实现：[the3ash/astro-chiri](https://github.com/the3ash/astro-chiri)（MIT）
- 本项目为 Halo 2.27 的移植版本，遵循 **MIT** 许可，保留原作者署名

如果这个主题帮到你，欢迎给原项目点个 star。