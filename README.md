<p align="center">
  <img src="public/logo.jpg" alt="吃了么 Logo" width="120" />
</p>

<h1 align="center">吃了么 · Chi Le Me</h1>

<p align="center">
  <strong>一款用自然语言帮你决定吃什么的 AI 饮食伙伴</strong>
</p>

<p align="center">
  <a href="http://eat.wanfengtech.fun"><img src="https://img.shields.io/badge/Live_Demo-eat.wanfengtech.fun-ff6b6b?style=flat-square" alt="demo" /></a>
  <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react" alt="react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="typescript" />
  <img src="https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite" alt="vite" />
  <img src="https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs" alt="node" />
  <img src="https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm" alt="pnpm" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license" />
</p>

---

## 这是什么

**吃了么** 是一个面向年轻人的 AI 饮食推荐助手。不用翻菜谱 App、不用纠结"吃什么"——像和朋友聊天一样描述你的需求，AI 从中文互联网实时检索真实菜谱，给出可解释的个性化推荐。

> 今天，你吃了啥？

---

## 页面预览

<p align="center">
  <img src="public/images/heroshot.jpg" alt="吃了么首页截图" width="280" />
</p>

<details>
<summary>点击展开更多页面说明</summary>

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/taste` | 口语化搜索 + 视频动画 + 语音输入 |
| 饮食顾问 | `/advisor` | AI 多轮对话，推荐菜品 + 追问建议 |
| 厨房 | `/studio` | 看图做饭 / 味觉 DNA / 一日菜单（三模式） |
| 膳食日记 | `/diary` | 日期化记录，营养摄入一目了然 |
| 菜品详情 | `/dish/:id` | 食材清单、分步做法、营养成分、B 站视频 |
| 营养推荐 | `/recommend` | 基于当日摄入缺口，智能推荐 |
| 个人中心 | `/profile` | 用户画像、偏好设置、家乡选择 |

</details>

---

## 核心能力

| 能力 | 说明 |
|------|------|
| AI 饮食顾问 | 自然语言多轮对话，理解口味偏好、家乡饮食文化与营养需求 |
| 看图做饭 | 拍照上传厨房食材，视觉 AI 识别后推荐可制作的菜品 |
| 味觉 DNA | 酸甜麻辣咸鲜香六维口味雷达，越用越懂你 |
| 一日菜单 | 按早中晚生成组合菜单，一键加入膳食日记 |
| 膳食日记 | 日期化记录每餐，热量、蛋白质、碳水、纤维一目了然 |
| 营养缺口推荐 | 根据当日摄入缺口，主动推荐下一餐该补什么 |
| 全网菜谱检索 | AI 生成检索策略，实时抓取下厨房、豆果美食等真实菜谱 |
| 视频教程 | 内联播放 B 站菜谱视频，无需跳转 |

---

## 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/20070604/chi-le-me.git
cd chi-le-me

# 安装依赖
pnpm install

# 配置环境变量（必填）
cp .env.example .env.local
# 编辑 .env.local，至少填入 OPENAI_NEXT_API_KEY

# 启动开发服务器
pnpm dev
```

浏览器访问 `http://localhost:5173/taste`。

### 环境变量

创建 `.env.local` 文件，最小配置只需填入一个 API Key：

```bash
# 必填 - 主模型 API（OpenAI-compatible 接口均可）
OPENAI_NEXT_API_KEY=sk-your-key-here
OPENAI_NEXT_BASE_URL=https://api.openai-next.com/v1

# 以下均为可选，不填则使用默认值
AI_TEXT_MODEL=gpt-5.4-mini
AI_VISION_MODEL=gpt-5.4-mini
AI_FALLBACK_MODEL=gpt-5.6-terra
AI_CHAT_FAST_MODEL=deepseek-v4-flash
AI_CHAT_BALANCED_MODEL=qwen3.5-plus
AI_CHAT_DEEP_MODEL=gpt-5.6-terra

# 搜索模型（独立配置，不填则复用主模型）
SEARCH_BASE_URL=https://api.deepseek.com/v1
SEARCH_API_KEY=sk-your-search-key
SEARCH_MODEL=deepseek-chat

# Kimi 备用模型
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_API_KEY=sk-your-kimi-key
KIMI_MODEL=kimi-k2.7-code

# 饮食顾问（独立通道）
ADVISOR_BASE_URL=https://uuapi.net/v1
ADVISOR_API_KEY=sk-your-advisor-key
ADVISOR_MODEL=gpt-5.5-mini
```

> 所有模型接口均为 OpenAI-compatible Chat Completions 协议，你可以替换为任何兼容的服务商（如 DeepSeek、Moonshot、Ollama 本地模型等）。

---

## 技术栈

### 前端

| 类别 | 技术 |
|------|------|
| 框架 | React 18（函数组件 + Hooks） |
| 语言 | TypeScript 5（全量类型覆盖） |
| 构建 | Vite 5 |
| 路由 | React Router 6 |
| 状态管理 | Context API + useReducer + localStorage 持久化 |
| 样式 | CSS 自定义属性 + 渐变梦幻风格 + 玻璃拟态 |
| 语音输入 | Web Speech API |

### 后端

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js（原生 `http` 模块，零框架依赖） |
| 语言 | TypeScript（Vite SSR 编译为单文件） |
| AI 协议 | OpenAI-compatible Chat Completions |
| 进程管理 | PM2 |
| 反向代理 | Nginx |

---

## 项目结构

```
chi-le-me/
├── public/
│   ├── images/              # 菜品图片（Unsplash / Pexels 开放版权）
│   │   ├── dishes/          # 菜品图
│   │   ├── heroes/          # 英雄图
│   │   └── home/            # 首页场景图（早/午/晚餐）
│   ├── videos/              # 视频素材
│   └── logo.jpg
├── server/
│   ├── aiGateway.ts         # AI 网关核心（多模型路由、置信度回退、菜谱检索）
│   ├── production.ts        # 生产环境 HTTP 服务入口
│   ├── tasteAdvisorSkill.ts # 饮食顾问 Skill（三级深度、用户画像、多轮对话）
│   └── viteAiPlugin.ts      # 开发环境 Vite 插件（API 挂载到 dev server）
├── src/
│   ├── components/          # 通用组件（Icon / DishCard / NutritionRing / Sheet / Toast）
│   ├── context/             # 全局状态（AppContext：用户画像、膳食记录、营养目标）
│   ├── data/                # 本地菜品数据、场景图、地方菜系
│   ├── lib/                 # 业务逻辑
│   │   ├── aiTaste.ts       # AI 口味分析 API
│   │   ├── tasteAdvisor.ts  # 饮食顾问前端调用
│   │   ├── onlineSearch.ts  # 在线搜索 + 双重缓存
│   │   ├── kitchen.ts       # 看图做饭（食材管理、偏好排序）
│   │   ├── tasteDna.ts      # 六维味觉 DNA
│   │   ├── recommend.ts     # 营养缺口计算与推荐
│   │   └── regionData.ts    # 省市区三级联动
│   └── pages/               # 页面组件（8 个页面）
├── ecosystem.config.js      # PM2 生产环境配置
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 架构

```
 浏览器 ──► Nginx (:80)
               ├─ /api/* ──► Node.js (:9001)
               │               └─ AI Gateway
               │                    ├─ 味觉分析 → GPT-5.4-Mini ──(回退)──→ GPT-5.6-Terra
               │                    ├─ 菜谱搜索 → DeepSeek ──(回退)──→ Kimi K2.7
               │                    ├─ 饮食顾问 → GPT-5.5-Mini（独立通道）
               │                    └─ 食材识别 → GPT-5.4-Mini Vision
               └─ /* ──► React SPA 静态文件
```

### 多模型智能路由

| 业务场景 | 默认模型 | 回退策略 |
|----------|----------|----------|
| 味觉分析 / 菜品排序 | GPT-5.4-Mini | 置信度 < 0.76 → GPT-5.6-Terra |
| 食材视觉识别 | GPT-5.4-Mini Vision | 置信度 < 0.66 → GPT-5.6-Terra |
| 菜谱详情提取 | GPT-5.4-Mini | 置信度 < 0.70 → GPT-5.6-Terra |
| 全网菜谱检索 | DeepSeek Chat | 失败 → Kimi K2.7 |
| 饮食顾问对话 | GPT-5.5-Mini（独立通道） | 无独立通道时 → 对话模型分级回退 |

### API 端点

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 + 模型配置状态 |
| `/api/taste/analyze` | POST | 口味 DNA + 家乡 + 营养 → 菜品排序 |
| `/api/pantry/scan` | POST | 拍照识别食材 → 推荐菜品 |
| `/api/search/dishes` | POST | 生成检索策略 → 实时抓取菜谱 |
| `/api/advisor/chat` | POST | 饮食顾问多轮对话 |
| `/api/recipe/details` | POST | 提取菜谱详情（食材 / 步骤 / 营养 / 视频） |

---

## 关键设计

### 置信度回退

所有 AI 调用均配备双模型保障：主模型返回后校验置信度，不足时自动切换回退模型重试。若回退也失败但主模型有值，降级使用主模型结果，确保服务不中断。

### 联网菜谱检索链路

```
用户输入 → AI 生成检索策略(5个菜名+关键词)
         → 优先抓取下厨房 HTML（解析食材/步骤/小贴士）
         → 回退 Bing RSS 搜索（匹配菜谱域名）
         → 图片：og:image → Openverse 开放版权 API
         → 视频：B 站 API → Bing 搜索
         → 结果缓存 15 分钟（服务端）+ 24 小时（浏览器端）
```

### 饮食顾问 Skill

- 三级深度自适应：消息含"营养/减脂/一周"等关键词 → 自动升级为深度模式
- 集成用户画像：姓名、性别、家乡、营养目标、近期饮食、收藏偏好
- 多轮对话：携带最近 6 轮历史上下文
- 输出结构化响应：直接回答 + 多维分析 + 假设说明 + 追问建议

### 浏览器端缓存

- 搜索结果 24 小时持久化至 localStorage，避免重复调用 API
- 最多保留 50 条搜索记录、1000 道菜谱，按 sourceUrl 去重
- 运行时内存缓存（Map），同一会话内即时命中

---

## 部署

### 生产构建

```bash
pnpm build          # 前端 SPA → dist/
pnpm build:server   # 后端 API → dist-server/
```

### 部署到服务器

```bash
# 打包
tar -czf deploy.tar.gz dist dist-server ecosystem.config.js

# 上传
scp deploy.tar.gz root@<your-server>:/tmp/

# 部署（原子化，支持一键回退）
ssh root@<your-server> "
  VERSION=\$(date +%Y%m%d-%H%M%S)
  mkdir -p /var/www/chi-le-me/releases/\$VERSION
  tar -xzf /tmp/deploy.tar.gz -C /var/www/chi-le-me/releases/\$VERSION
  rm -f /var/www/chi-le-me/current
  ln -s /var/www/chi-le-me/releases/\$VERSION /var/www/chi-le-me/current
  cd /var/www/chi-le-me/current
  pm2 start ecosystem.config.js
  pm2 save
"
```

### 回退

```bash
ssh root@<your-server> "
  rm -f /var/www/chi-le-me/current
  ln -s /var/www/chi-le-me/releases/<上一版本目录> /var/www/chi-le-me/current
  pm2 restart chi-le-me-api
"
```

### Nginx 参考配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/chi-le-me/current/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:9001;
        proxy_set_header Host $host;
        proxy_read_timeout 90s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 设计理念

- **真实食物摄影** — 所有菜品图片使用真实照片，拒绝插画和 emoji
- **渐变梦幻 + 玻璃拟态** — 年轻化视觉风格，宽间距布局
- **可解释的推荐** — 每条推荐附带具体理由，而非黑盒输出
- **个人菜单库** — 搜索结果写入浏览器本地缓存，越用越准
- **营养闭环** — 推荐 → 记录 → 分析缺口 → 再推荐

---

## 贡献指南

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 本地开发

```bash
pnpm install
pnpm dev
```

提交前请确保 TypeScript 编译无错误：

```bash
pnpm build
```

---

## 图片版权

菜品图片来自 [Unsplash](https://unsplash.com) / [Pexels](https://pexels.com) 等开放版权平台，详见 [`public/images/dishes/ATTRIBUTION.md`](public/images/dishes/ATTRIBUTION.md)。

---

## 许可证

本项目基于 [MIT](LICENSE) 协议开源。

---

<p align="center">
  <sub>Made with appetite · 2025</sub>
</p>