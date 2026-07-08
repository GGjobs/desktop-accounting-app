# 发布到 GitHub

这个项目已经准备好使用 GitHub Actions 云端打包。

## 打包结果

推送到 GitHub 的 `main` 分支后，GitHub 会自动运行：

- Windows 打包：生成 Windows 可用的安装包文件。
- macOS 打包：生成 macOS 可用的压缩包文件。
- 代码检查：运行 `npm run lint`。

打包完成后，可以在 GitHub 仓库页面的 Actions 里下载构建产物。

## 正式发布版本

如果推送一个版本标签，例如：

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub 会自动创建 Release，并把 Windows 和 macOS 的打包文件上传到这个 Release。

## 本地常用命令

安装依赖：

```bash
npm install
```

本地检查：

```bash
npm run lint
```

本地打包当前系统：

```bash
npm run package
```

生成当前系统的安装/压缩产物：

```bash
npm run make
```

## 注意事项

- 这个项目使用 `better-sqlite3`，它是原生依赖。Windows 安装包建议在 GitHub 的 Windows 云端环境中打包。
- 当前没有做代码签名。Windows 和 macOS 第一次打开时，系统可能提示应用来自未知开发者。
- 如果以后要正式公开分发，建议再做代码签名和自动更新。
