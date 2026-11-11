# MyOnlineTools

一个面向日常使用的轻量级在线工具箱。基于 Vue 3 构建，提供文本处理、开发辅助与编码转换工具，界面简洁，打开即用。

<p align="center">
  <a href="https://shenshou.github.io/MyOnlineTools/"><strong>在线体验 · MyOnlineTools</strong></a>
  ·
  <a href="https://github.com/shenshou/MyOnlineTools">GitHub 仓库</a>
</p>

## 项目简介

MyOnlineTools 收集并整合常用的小型在线工具，重点关注使用效率、操作直观性与数据隐私。无需注册，也不需要安装桌面软件；在浏览器中打开页面即可使用。

**项目特点**

- **即开即用：** 通过浏览器访问，无需注册或登录。
- **本地处理：** 工具逻辑在浏览器端执行，输入内容不会上传到项目服务器。
- **批量处理：** 支持多行文本和磁力链接批量处理。
- **个人工具箱：** 支持收藏工具、查看最近使用记录。
- **网址导航：** 提供独立网址导航页，支持分类、标签、收藏、搜索、卡片/列表切换、详情备注与 JSON 导入导出。
- **GitHub 数据管理：** 网址数据存放在仓库 JSON 文件中，管理员可批量编辑后统一保存，普通访客只读。
- **轻量简洁：** Vue 3 单页应用，按工具分类与搜索，快速定位所需功能。

## 在线访问

**[https://shenshou.github.io/MyOnlineTools/](https://shenshou.github.io/MyOnlineTools/)**

## 功能列表

目前提供 8 个工具：

| 分类 | 工具 | 功能说明 |
| --- | --- | --- |
| 开发工具 | JSON 格式化 | 校验 JSON，并支持格式化与压缩 |
| 开发工具 | 正则表达式测试 | 使用正则表达式匹配文本，查看匹配内容及位置 |
| 文本工具 | 文本统计 | 统计字符数、非空白字符数、单词数、行数和 UTF-8 字节数 |
| 文本工具 | 大小写转换 | 转换为 camelCase、PascalCase、snake_case、kebab-case、大写或小写 |
| 编码转换 | Base64 编解码 | 在文本与 Base64 字符串之间进行编码和解码，支持 UTF-8 中文 |
| 编码转换 | URL 编码 | 对 URL 组件进行百分号编码与解码 |
| 编码转换 | 颜色转换 | 将 HEX 颜色值转换为 RGB、HSL 格式 |
| 编码转换 | 磁力链接补全 | 批量为 BTIH 哈希补全 `magnet:?xt=urn:btih:` 前缀，已有标准前缀的链接保持不变 |

## 网址导航

通过左侧「资源管理」中的「网址导航」进入，可以添加和整理网站。页面支持卡片/列表切换、分类与标签筛选、全文搜索、收藏、详情抽屉、JSON 合并/覆盖导入和导出。

网址数据存放于 `public/data/navigation.json`，公开读取；只有拥有仓库写入权限并提供有效 Fine-grained Personal Access Token 的管理员才能保存修改。建议创建仅授权 `shenshou/MyOnlineTools` 仓库、且 `Contents` 权限为 `Read and write` 的令牌。令牌保存在当前标签页的 `sessionStorage` 中，刷新页面后仍保持授权，关闭标签页后会话结束。每次点击「保存到 GitHub」统一提交当前所有修改；单纯更新网址 JSON 不会触发 Pages 重新构建。

## 使用说明

1. 打开[在线工具箱](https://shenshou.github.io/MyOnlineTools/)。
2. 通过分类或搜索找到需要的工具。
3. 进入工具页面，输入或粘贴待处理内容。
4. 根据工具提供的选项执行处理，并复制结果。

部分工具提供不同处理模式，例如 JSON 格式化/压缩、Base64 编码/解码、大小写格式转换。正则表达式测试支持自定义表达式与 flags。

## 隐私与数据

- 工具的核心处理逻辑运行在用户当前浏览器中。
- 输入内容和处理结果不会由这些工具主动发送到项目服务器。
- 收藏、最近使用记录等偏好信息保存在当前浏览器的 `localStorage` 中。
- 清理浏览器站点数据或更换浏览器后，本地保存的偏好信息可能会丢失。

> 请注意：本项目是浏览器端工具集合，不代表浏览器、扩展程序或用户设备上的其他软件不会访问页面数据。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| [Vue 3](https://vuejs.org/) | 前端界面与组件 |
| [Vite](https://vite.dev/) | 开发服务器与生产构建 |
| [Vue Router](https://router.vuejs.org/) | 单页应用路由（Hash 模式） |
| [Pinia](https://pinia.vuejs.org/) | 收藏与最近使用等状态管理 |
| [lucide-vue-next](https://lucide.dev/) | 图标组件 |
| 原生 CSS | 页面布局、主题与视觉样式 |

项目使用 **JavaScript**，不使用 TypeScript。

## 本地运行

### 环境要求

- Node.js 22 或更高版本（部署工作流使用 Node.js 22）
- npm

### 安装依赖

```bash
git clone https://github.com/shenshou/MyOnlineTools.git
cd MyOnlineTools
npm install
```

### 启动开发服务器

```bash
npm run dev
```

根据终端提示，在浏览器中打开本地开发地址。

### 构建生产版本

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

### 本地预览生产构建

```bash
npm run preview
```

## 项目结构

```text
MyOnlineTools/
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Pages 自动部署工作流
├── public/                  # 静态资源与公开网址导航数据
│   └── data/
│       └── navigation.json
├── src/
│   ├── assets/              # 项目资源
│   ├── components/          # 通用 Vue 组件
│   ├── data/
│   │   └── tools.js         # 工具清单、分类与元数据
│   ├── modules/
│   │   └── navigation/      # 网址导航数据与 GitHub API 服务
│   ├── router/
│   │   └── index.js         # Hash 路由配置
│   ├── stores/
│   │   └── preferences.js   # 收藏、最近使用等本地偏好
│   ├── utils/
│   │   └── toolActions.js   # 各工具的核心处理逻辑
│   ├── views/
│   │   ├── HomeView.vue     # 工具箱首页
│   │   ├── NavigationView.vue # 网址导航页面
│   │   └── ToolView.vue     # 工具操作页面
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
└── vite.config.js
```

## 部署

项目通过 **GitHub Actions + GitHub Pages** 自动构建和部署。

- 部署工作流：`.github/workflows/deploy.yml`
- 触发条件：向 `main` 分支推送代码，或在 GitHub Actions 页面手动运行工作流。
- 例外：仅修改 `public/data/navigation.json` 时不会触发 Pages 构建；导航页面直接从 GitHub 仓库读取最新 JSON。
- 构建命令：`npm install`、`npm run build`
- 发布目录：`dist/`
- Vite 公共基础路径：`/MyOnlineTools/`

如需在自己的仓库部署，请根据仓库名称调整 `vite.config.js` 中的 `base`，并在 GitHub 仓库设置中启用 GitHub Pages 的 GitHub Actions 部署来源。

## 许可证

当前仓库未声明开源许可证。若计划允许他人复制、修改或分发本项目，请根据实际意愿补充 LICENSE 文件。
