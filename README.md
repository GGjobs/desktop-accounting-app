# 桌面记帐

一个本地运行的桌面记帐 App，用来记录人民币花销、查看明细、按分类统计支出，并支持导出 CSV。

GitHub 仓库名：`desktop-accounting-app`

## 当前技术选择

- 桌面框架：Electron
- 项目搭建：Electron Forge
- 界面：React + TypeScript
- 本地数据库：SQLite，通过 `better-sqlite3` 接入
- 包管理器：npm

## 已实现

- 快速新增一笔花销
- 默认两级分类
- 分类管理：新增、重命名、启用/停用一级和二级分类
- 最近花销明细
- 明细页搜索、日期筛选、分类筛选、支付方式筛选
- 编辑花销记录
- 本月支出、今日支出、日均支出、预算剩余
- 设置月预算
- 分类支出排行
- 每日支出趋势
- 删除花销记录
- 导出 CSV
- 查看本地数据库保存位置和应用版本
- 自定义应用图标
- GitHub Actions 云端打包 Windows 和 macOS
- 数据本地保存，不需要登录

## 常用命令

首次拿到项目后安装依赖：

```bash
npm install
```

开发时启动 App：

```bash
npm start
```

打包当前系统的 App：

```bash
npm run package
```

生成当前系统安装/压缩产物：

```bash
npm run make
```

重新生成应用图标：

```bash
npm run generate:icons
```

如果在国内网络下 Electron 下载超时，可以临时使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run package
```

## 当前打包结果

本机 macOS arm64 打包已通过，生成位置：

```text
out/桌面记帐-darwin-arm64/桌面记帐.app
```

应用图标资源在：

```text
assets/icon.png
assets/icon.icns
assets/icon.ico
```

## GitHub 云端打包

项目已配置 GitHub Actions：

- 推送到 `main` 分支后，云端会自动打包 Windows 和 macOS。
- 推送 `v1.0.0` 这类版本标签后，云端会自动创建 GitHub Release。
- 详细说明见：`docs/github-release.md`

## 开源许可

本项目使用 MIT License，见 `LICENSE`。

## 设计参考

选中的视觉方案是“快速记一笔”，参考图在：

```text
design-references/quick-entry-dashboard.png
```

## 注意

视觉截图 QA 已通过，记录见：

```text
design-qa.md
```

最新 QA 截图和对比图在：

```text
qa-artifacts/offscreen-app-screenshot-v5.png
qa-artifacts/offscreen-details-screenshot-v1.png
qa-artifacts/offscreen-categories-screenshot-v1.png
qa-artifacts/offscreen-settings-screenshot-v1.png
qa-artifacts/design-comparison-v3.png
```
