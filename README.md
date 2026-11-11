# dsh-endnote

简体中文 | [English](README.en.md)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的文献调研插件：**先查本地 EndNote 库，再读原文**。提问找文献时，模型会先检索你本机的 EndNote 库，命中后把 PDF 直接打开在 DSH 右侧栏，边读边问。

- **只读**：EndNote 库全程只读，绝不写入库目录；索引产物只落在插件自己的数据目录。
- **先本地、后联网**：系统提示要求文献调研先调 `endnote_search`；本地 0 命中时才联网拿规范标题/DOI，再回本地二次关联，仍没有再列出网络候选。
- **命中即读**：`endnote_open` 校验 PDF 真实存在后交给宿主 PDF 预览，只对本次会话新打开的结果生效。
- **侧栏面板**：文献库概览——统计汇总、最近阅读 / 最近导入（条数可选、可只显示其一或两者）、一键刷新；点标题在右侧栏打开 PDF，点文件夹直达系统文件管理器。

## 工作方式

```
用户提问（找文献）
        │
        ▼
  系统提示（插件注入）──► 先调 endnote_search，不先联网
        │
        ▼
  endnote_search ── 命中 ──► 标题 + 分组 + 摘要 + 本地 PDF 路径
        │
        ▼
  endnote_open(path) ── 校验文件存在 ──► meta {plugin, path, open}
        │
        ▼
  客户端半边 ──► 右侧栏用宿主 PDF 预览打开该文件
```

## 环境要求

- DSH 桌面版或 `dsh web`（需要右侧栏与侧栏插件页；纯 CLI 也能用工具，只是不弹预览）
- 本机装有 EndNote，且有一个 `…Data` 库目录
- Python 3（仅 `endnote_rebuild` 重建索引时需要）
- Node.js 18+（运行插件与测试）；无需构建步骤

## 安装

```sh
git clone https://github.com/<your-name>/dsh-endnote.git
```

**本仓库自带 `vendor/`（schemastery 及其依赖的副本），没有 npm 依赖、不需要 `npm install`、也不需要联网**——直接克隆后就能装。这一点专门为离线/新机器准备：以前从仓库安装时会去 npm 拉 `@deepseek-ai/schemastery`，注册表不可达或版本缺失就会报「不兼容版本 / 找不到匹配版本」。

然后在 DSH 侧栏「插件」页用插件管理器选择该目录安装（等价于 `plugin_manager: install_bundle`，`target` 传仓库路径）。装完强刷浏览器（Ctrl+Shift+R）。侧栏「插件」页会出现 `dsh-endnote` 卡片，侧栏导航也有同名入口。

> 兼容性：插件不声明 `engines.dsh`，也不声明任何 DSH 包 peer 依赖，所以 DSH 的版本兼容检查不会拦它；只要 DSH 带「插件管理器 + 侧栏」即可安装。

### 首次使用

1. 侧栏 `dsh-endnote` → 配置页 →「添加」选择你的 `My EndNote Library.Data` 目录 → 点「切换」。
2. 执行一次 `endnote_rebuild` 建索引（也可手动跑 `python scripts/endnote_index.py --lib "<库目录>" --out "<插件目录>/.data/endnote_index.json"`）。
3. `endnote_status` 确认条目数 / 带 PDF 数。

## 配置

配置写在插件行的 `config` 里（`cordis.patch.yml`），推荐用图形化配置页修改；字段均为 volatile，**保存后立即生效，无需重启**。

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `libraryPath` | `~/Documents/My EndNote Library.Data` | 当前生效库根目录（`…Data`），只读；配置页「切换」一键改它 |
| `libraries` | `[]` | 已存库列表，每项 `{name, path}`；第 1 个为主库，可添加 / 删除 / 设为主库 / 一键切换 |
| `indexFile` | 空 | 索引文件（`.json` / `.csv`）。留空则用每库独立自建索引 `endnote_index_<key>.json` → 数据目录旧单文件 → 历史候选位置 |
| `dataDir` | `<插件目录>/.data` | 自建索引、阅读日志与缓存目录 |
| `pythonPath` | `python` | `endnote_rebuild` 调用的解释器 |
| `openInSidebar` | `true` | 命中后是否自动在右侧栏打开 PDF |
| `limit` | `8` | 单次检索默认返回条数 |

**多库切换**：每个库独立索引；某库第一次切过去若无索引，跑一次 `endnote_rebuild` 即可，之后切换即时生效。索引里的路径按当前 `libraryPath` 重新拼接，库搬家后改配置即可，不必重建。

## 工具

| 工具 | 作用 |
| --- | --- |
| `endnote_search` | 检索本地库。多关键词 AND，覆盖标题 / 作者 / 年份 / 期刊 / 关键词 / DOI / 类型 / 分组 / 附件路径 / 摘要；支持 `group` 限定分组、`read=read/unread` 按已读状态过滤，结果标注已读状态与评分 |
| `endnote_open` | 校验 PDF 存在并在右侧栏打开（`openInSidebar=false` 时只回路径）；成功打开记入阅读日志 |
| `endnote_recent` | 最近阅读表（时间倒序）：标题 / 已读状态 / 评分 / 最近阅读时间 / 本地文件夹；数据 = 阅读日志 + EndNote 读状态变更时间 |
| `endnote_status` | 库路径、已存库列表、索引文件、条目数、已读数、带 PDF 数、是否自动打开 |
| `endnote_config` | 写回插件行配置（经宿主 `configEditor`，保存立即生效） |
| `endnote_rebuild` | 调 `scripts/endnote_index.py` 重建索引，并对账「登记 PDF = 磁盘 PDF」 |

## 侧栏面板

侧栏 `dsh-endnote` 面板页顶部是仪表盘，配置表单在其下方：

- **统计汇总**：文献总数 / 带 PDF / 已读 / 未读 / 未标记 / 有评分 / 分组 + 索引时间。
- **最近阅读**：条数可选（5/10/20/50），每行显示标题、已读状态、评分与最近阅读时间；点标题直接在右侧栏打开这篇 PDF（关掉标签后就从这里重开），点文件夹路径用系统文件管理器打开所在目录。
- **最近导入**：顶部「显示」下拉框可选「最近阅读 / 最近导入 / 两者都显示」，按 EndNote 入库时间倒序。
- **新标签页入口**：右侧栏「+ 新标签页」导航里有「EndNote 最近阅读」页面——点击即列出最近阅读的文献（无需先打开任何 PDF），点标题在 EndNote PDF 标签页打开；「开始」页与「更多工具」菜单里也有同名卡片。
- **刷新**：重新拉取展示数据（阅读记录、读状态变化点刷新即见；新导入文献要先 `endnote_rebuild` 才进统计）。
- **侧栏入口**：页面顶部一行显示侧栏入口状态；已注册可点「打开面板」，未注册（客户端半边晚于页面加载）可点「固定到侧栏」补注册，或用「重新加载页面」刷新一次。入口本身注册一次后每次启动都会自动常驻左侧栏。

数据走同源路由：`GET /dsh-endnote/panel-data`、`POST /dsh-endnote/open-folder`、`GET|HEAD /dsh-endnote/pdf-bytes?path=<绝对路径>`（支持 `Range`，供编辑器自己按需拉取 PDF 字节）、`GET|POST /dsh-endnote/pdf-annotations`、`POST /dsh-endnote/export-pdf`、`GET /dsh-endnote/vendor/pdfjs/*`，与官方 open-in-app 同款注册方式——每条请求先过宿主 `connection` 的 Host/Origin 栅栏，打开文件夹只接受绝对路径且必须是真实目录，字节与标注路由只接受绝对 `.pdf` 路径。`webServer` / `connection` 缺失时路由自动降级，六个工具不受影响。

## PDF 编辑器

- **取色**：工具栏 / 划词浮条 / 右键菜单 / 设置面板共用同一取色组件——行内一个「当前颜色方块」，点击弹出常用 7 色快捷色板 + 原生取色器，点面板外自动收起；设置面板三行（高亮 / 方框 / 标注文字）同样式对齐。
- **按钮**：保存与导出为图标按钮，悬停显示说明；时钟图标一键切换「保存时间 / 注释数量」是否展示（设置面板里也可单独勾选已保存提示）。
- **画布**：默认工具下空白处是抓手、按住拖动可移动画布；放到文字上自动变文本选择，拖选即出高亮浮条；按住空格临时强制抓手。

## 索引

`scripts/endnote_index.py` 只做三件事：只读打开 `sdb/sdb.eni`（SQLite，`mode=ro&immutable=1`）读文献 / 分组 / 附件映射 / 已读状态 / 评分 / 时间戳；只读扫描 `PDF/` 目录做磁盘对账；把结果写成一份 JSON。

```sh
python scripts/endnote_index.py --lib "<库目录>.Data" --out "<插件目录>/.data/endnote_index.json"
```

## 隐私

- EndNote 库**只读**，索引脚本以 `immutable=1` 打开数据库，不产生任何写操作。
- 除你与模型的正常对话外，插件**不向外发送任何数据**；检索、打开、面板全部在本地完成。
- `.data/` 内的索引与阅读日志含本地绝对路径和文献元数据，**已被 `.gitignore` 排除**，请勿提交。

## 已知限制

- 客户端半边依赖 `sidebarRight` 与 `sessions` 服务，缺失时安静降级（只告警一次），工具仍可用。
- 同一份 PDF 再次打开会聚焦已有标签页（宿主默认去重）。
- 自动打开只对「本次会话里新执行的 `endnote_open`」生效，不重放历史会话。

## 开发

纯 JS，无构建步骤。测试用 Node 内置 test runner：

```sh
node test/core.test.mjs
node test/tools.test.mjs
node test/client.test.mjs
# 或 npm test（需要能创建子进程的环境）
```

## License

MIT
