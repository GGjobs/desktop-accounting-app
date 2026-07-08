# 项目指令：桌面记帐

## 固定协作规则

- 用户是编程和技术新手。凡是涉及技术选型、架构、依赖、打包、发布、数据库、测试、部署、代码组织等技术决策，Codex 必须先列出 2-4 个可选方案，并用非技术背景也能理解的话说明优劣势、推荐场景和风险，然后等待用户选择。
- 不要把需要用户决策的技术问题直接抛给用户开放作答；应由 Codex 先整理清晰选项，再让用户拍板。
- 未经用户确认技术方案前，不要开始搭建最终项目骨架或锁定长期技术栈。
- 任何需要使用 LibreOffice 的任务：不用沙盒内的 LibreOffice，用沙盒外的 LibreOffice。

## 产品定位

- 产品名称：桌面记帐
- 产品类型：本地桌面记帐 App
- 目标平台：Windows 和 macOS
- 目标用户：希望用电脑快速记录日常人民币花销的个人用户
- 核心价值：用尽量少的操作完成记帐，并能按月份和分类看清钱花在哪里
- 默认货币：人民币 CNY，金额显示为 `¥12.34`

## 产品范围

### 第一版 MVP 必须包含

- 新增一笔花销：金额、日期、一级分类、二级分类、备注/说明。
- 查看花销列表：按时间倒序展示，支持编辑和删除。
- 筛选与搜索：按日期范围、一级分类、二级分类、备注关键词筛选。
- 月度汇总：展示本月总支出、分类占比、每日支出趋势。
- 本地保存数据：默认不需要登录，不上传云端。
- 数据导出：至少支持导出 CSV，方便用户备份或用 Excel 打开。

### 第一版建议包含

- 快捷录入：打开 App 后优先看到“记一笔”入口。
- 最近常用分类：减少重复选择。
- 支付方式字段：现金、微信、支付宝、银行卡、信用卡、其他。
- 分类管理：允许用户在默认分类基础上新增、重命名、停用分类。

### 暂不纳入第一版

- 多人协作记帐
- 云同步和账号体系
- 发票 OCR、自动识别账单
- 股票、基金、资产管理
- 多币种

## 默认花销分类设计

分类为两级：一级大类 + 二级小类。第一版先使用以下默认分类，后续可做成可编辑。

| 一级大类 | 二级小类 |
| --- | --- |
| 餐饮 | 早餐、午餐、晚餐、外卖、饮品零食、聚餐 |
| 交通 | 公交地铁、打车网约车、火车高铁、机票、加油充电、停车过路 |
| 购物 | 日用品、服饰鞋包、数码电器、美妆个护、家居用品 |
| 居住 | 房租、房贷、物业、水电燃气、宽带通讯、维修 |
| 娱乐休闲 | 电影演出、游戏、旅行、运动健身、会员订阅 |
| 医疗健康 | 挂号问诊、药品、体检、保险、护理 |
| 教育成长 | 课程培训、书籍、考试证书、文具工具 |
| 人情社交 | 礼物、红包、请客、家庭支出 |
| 金融缴费 | 还款、手续费、税费、分期付款 |
| 其他 | 未分类、临时支出 |

## 关键页面

- 首页/仪表盘：本月总支出、今日支出、分类排行、最近记录。
- 记一笔：金额输入、日期选择、一级分类、二级分类、支付方式、备注。
- 明细列表：所有支出记录，支持筛选、搜索、编辑、删除。
- 统计分析：月度趋势、分类占比、二级分类排行。
- 分类管理：管理一级和二级分类。
- 设置/数据：导出 CSV、数据备份位置、应用版本信息。

## 数据字段草案

### Expense 花销记录

- `id`：唯一编号
- `amount_cents`：金额，单位为分，避免小数误差
- `currency`：默认 `CNY`
- `spent_at`：花销发生时间
- `category_level1_id`：一级分类
- `category_level2_id`：二级分类
- `payment_method`：支付方式
- `note`：备注
- `created_at`：创建时间
- `updated_at`：更新时间

### Category 分类

- `id`：唯一编号
- `name`：分类名称
- `parent_id`：上级分类；一级分类为空，二级分类指向一级分类
- `sort_order`：排序
- `is_active`：是否启用

## 技术栈候选方案

最终技术方案必须由用户选择。Codex 可以给推荐，但不能在用户确认前锁定。

### 已确认技术栈

- 用户已选择方案 B：`Electron + React + TypeScript + SQLite`。
- 后续开发应围绕这个技术栈推进，除非用户明确要求重新比较或更换技术栈。
- 用户已选择项目搭建方式：`Electron Forge`。
- 用户已选择 SQLite 接入方式：`better-sqlite3`。
- 用户已选择界面风格：清爽账本风。
- 用户已选择包管理器：`npm`。

### 已确认界面风格

- 风格名称：清爽账本风。
- 视觉方向：白底、浅灰分区、绿色点缀、清晰留白、轻量表格和图表。
- 设计目标：让用户打开 App 后能快速记一笔，也能一眼看懂本月花销概况。
- 用户已选择视觉方案 1：快速记一笔。
- 视觉参考图：`design-references/quick-entry-dashboard.png`。
- 实现重点：左侧导航、顶部月度概览、左侧快速记帐表单、右侧最近明细、底部趋势和分类排行。

### 方案 A：Tauri + React + TypeScript + SQLite

- 适合：想要 Windows/macOS 桌面 App，同时希望安装包更小、运行更轻。
- 优点：安装包通常比 Electron 小；前端用 React，界面开发效率高；SQLite 适合本地记帐数据。
- 缺点：会涉及 Rust/Tauri 工具链，初次配置比纯前端复杂；不同系统 WebView 可能有少量差异。
- Codex 当前倾向：推荐优先考虑。这个 App 以本地数据和轻量桌面体验为主，Tauri 比较贴合。

### 方案 B：Electron + React + TypeScript + SQLite

- 适合：优先追求成熟、资料多、开发路径稳。
- 优点：生态成熟；跨平台桌面开发经验丰富；很多桌面软件使用类似路线；前端开发体验好。
- 缺点：安装包和内存占用通常更大，因为会带 Chromium 运行环境。
- Codex 当前倾向：如果用户更在意“少踩坑、资料多”，可选这个。

### 方案 C：Flutter Desktop + Dart + SQLite

- 适合：未来可能扩展到移动端，或者希望界面高度统一。
- 优点：一套 UI 在多个平台风格一致；适合做漂亮、流畅的界面；以后扩展手机端相对自然。
- 缺点：需要 Dart/Flutter 技术栈；桌面端某些系统能力和打包细节可能需要额外处理。
- Codex 当前倾向：如果用户未来明确想做手机 App，再考虑这个。

## 下一步技术决策待用户确认

技术栈、项目搭建方式、SQLite 接入方式、包管理器已确认。开始搭建前，Codex 仍需向用户说明需要联网安装依赖，并在需要时请求用户授权。

### 已确认包管理器

- 选择：`npm`。
- 理由：Node.js 自带，最通用，适合刚开始使用 Codex 和前端桌面开发的用户。
- 后续命令优先使用 `npm install`、`npm start`、`npm run package` 等 npm 命令。

### 已确认脚手架方向

- 选择：Electron Forge。
- 理由：成熟稳妥，打包能力完整，适合少踩坑。

### SQLite 接入方式候选

1. `better-sqlite3`：同步 API，代码直接好懂，性能好；缺点是属于原生依赖，Electron 打包时需要处理平台编译。Codex 当前推荐这个。
2. `sqlite3`：生态常见，异步 API；缺点是代码会稍绕，也同样是原生依赖。
3. `sql.js`：SQLite 的 WebAssembly 版本，不需要原生编译；缺点是本地文件持久化和大数据量体验不如前两者自然。

### 已确认 SQLite 接入方式

- 选择：`better-sqlite3`。
- 理由：代码直观、性能好，适合本地桌面记帐 App。
- 注意：它是原生依赖，Electron 打包时需要处理平台编译和打包配置。

## 开发原则

- 优先做能真实运行的本地桌面 App，不做只展示的假页面。
- 数据默认保存在用户本机，先不做云端账号。
- 金额在程序内部用“分”保存，界面显示人民币元。
- 所有危险操作，如删除记录，应有确认或可撤销机制。
- 每次完成一个阶段后，Codex 应说明：做了什么、用户如何运行/查看、下一步有哪些选择。

## 当前实现状态

- 已创建 Electron Forge + React + TypeScript 项目骨架。
- 已接入 `better-sqlite3`，并实现本地 SQLite 数据库、默认分类、示例花销、添加花销、编辑花销、删除花销、分类管理、月预算设置和 CSV 导出。
- 已按视觉方案 1“快速记一笔”实现第一版首页界面。
- 已实现明细页：关键词搜索、日期范围筛选、一级/二级分类筛选、支付方式筛选、编辑记录、删除记录。
- 已实现基础导航切换：记一笔、明细、统计、分类、设置。
- 已实现分类管理：新增一级分类、新增二级分类、重命名分类、启用/停用分类；停用分类不会删除历史花销，只是不再出现在新记账的可选分类里。
- 已实现设置页增强：设置月预算、查看本地数据库保存位置、查看应用版本和平台、导出 CSV。
- 已实现自定义应用图标：图标生成脚本为 `scripts/generate-icons.mjs`，输出 `assets/icon.png`、`assets/icon.icns`、`assets/icon.ico`，`npm run package` 会自动先执行 `npm run generate:icons`。
- 已优化 macOS 打包元数据：Bundle ID 为 `com.hhl.desktop-accounting`，应用分类为 `public.app-category.finance`。
- 已配置 GitHub Actions 云端打包：`.github/workflows/build.yml` 会在 `main` 分支推送时构建 Windows/macOS 产物，在 `v*` 标签推送时创建 GitHub Release 并上传产物。
- 已添加 GitHub 发布说明：`docs/github-release.md`。
- 已生成 macOS arm64 打包产物：`out/桌面记帐-darwin-arm64/桌面记帐.app`。
- 已生成本机 macOS zip 产物：`out/make/zip/darwin/arm64/桌面记帐-darwin-arm64-1.0.0.zip`。
- `npm run lint` 已通过。
- `npm run package` 已通过；国内网络下如 Electron 下载超时，可使用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run package`。
- `npm run make` 已通过；当前 Mac 本机只能验证 macOS zip，Windows 安装包将由 GitHub Actions 的 Windows runner 生成。
- 视觉截图 QA 已通过，详见 `design-qa.md`。
- QA 首页截图：`qa-artifacts/offscreen-app-screenshot-v5.png`。
- QA 明细页截图：`qa-artifacts/offscreen-details-screenshot-v1.png`。
- QA 分类页截图：`qa-artifacts/offscreen-categories-screenshot-v1.png`。
- QA 设置页截图：`qa-artifacts/offscreen-settings-screenshot-v1.png`。
- QA 对比图：`qa-artifacts/design-comparison-v3.png`。

## 参考依据

- Tauri 官方定位为构建小型、快速、安全、跨平台桌面应用的工具。
- Electron 官方定位为使用 JavaScript、HTML、CSS 构建跨平台桌面应用的框架。
- Flutter 官方支持构建 Windows、macOS、Linux 桌面应用。
- SQLite 官方定位为自包含、无服务器、零配置、事务型 SQL 数据库，适合本地应用保存数据。
