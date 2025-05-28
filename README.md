# GitBook2EPUB 转换工具

一个纯Node.js实现的工具，用于将GitBook项目转换为标准EPUB电子书格式。

## 功能特点

- 自动解析SUMMARY.md文件结构
- 保留GitBook的章节层级
- 自动生成目录和导航
- 支持自定义封面和样式
- 生成符合标准的EPUB文件
- 跨平台兼容（Windows、macOS和Linux）
- 纯Node.js实现，依赖少

## 系统要求

- [Node.js](https://nodejs.org/) (v12.0.0或更高版本)
- [Pandoc](https://pandoc.org/installing.html) (v2.0或更高版本)

### Pandoc 安装指南

#### Windows
- 方法1：访问 [Pandoc官网](https://pandoc.org/installing.html) 下载安装包
- 方法2：使用 Chocolatey: `choco install pandoc`
- 方法3：使用 winget: `winget install JohnMacFarlane.Pandoc`

#### macOS
- 方法1：使用 Homebrew: `brew install pandoc`
- 方法2：访问 [Pandoc官网](https://pandoc.org/installing.html) 下载安装包

#### Linux
- Ubuntu/Debian: `sudo apt-get install pandoc`
- CentOS/RHEL: `sudo yum install pandoc`
- Arch Linux: `sudo pacman -S pandoc`

## 安装

### 全局安装

```bash
npm install -g gitbook2epub
```

### 本地安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/gitbook2epub.git
cd gitbook2epub

# 安装依赖
npm install

# 检查系统依赖
npm run check-deps

# 可选：将命令链接到全局
npm link
```

## 使用方法

### 图形界面使用

```bash
# 启动图形界面
npm run gui
```

图形界面提供了以下功能：
- 选择GitBook源目录
- 选择自定义的metadata.yaml文件（可选）
- 选择自定义的style.css文件（可选）
- 选择EPUB输出位置
- 实时显示转换进度

### 命令行使用

```bash
gitbook2epub [GitBook目录路径] [输出EPUB文件路径] [选项]
```

可用选项：
- `--metadata`或`-m`: 指定自定义元数据文件路径
- `--style`或`-s`: 指定自定义样式文件路径

示例：
```bash
gitbook2epub ./my-gitbook ./output.epub --metadata ./custom-metadata.yaml --style ./custom-style.css
```

如果不提供参数，工具将默认使用当前目录作为GitBook项目，并以当前目录名称生成EPUB文件。

### 示例

```bash
# 转换当前目录
gitbook2epub

# 转换指定目录
gitbook2epub ./my-gitbook

# 转换指定目录并指定输出文件名
gitbook2epub ./my-gitbook ./output.epub
```

## 配置文件

### metadata.yaml

在GitBook根目录创建`metadata.yaml`文件，用于定义电子书元数据：

```yaml
---
title: 书籍标题
author: 作者名
language: zh-CN
date: 2024
cover-image: .gitbook/assets/cover.jpg
css: custom-style.css
---
```

所有元数据字段都是可选的。如果不提供，工具将使用默认值。

## GitBook项目要求

标准的GitBook项目应包含：

- `SUMMARY.md`：定义书籍的章节结构
- `README.md`：书籍的首页或介绍
- Markdown文件：按照SUMMARY.md中的结构组织

## 自定义样式

工具内置了一个默认样式文件`default-style.css`，适用于大多数GitBook项目。

如需自定义样式，可以在GitBook根目录创建自己的CSS文件，并在`metadata.yaml`中指定：

```yaml
css: custom-style.css
```

## 常见问题

**Q: 生成的EPUB没有封面？**  
A: 确保在metadata.yaml中指定了正确的`cover-image`路径，该路径应相对于GitBook根目录。

**Q: 某些文件没有包含在转换中？**  
A: 检查SUMMARY.md文件中的链接是否正确，工具只会包含SUMMARY.md中引用的文件。

**Q: 中文显示乱码？**  
A: 确保您的Markdown文件使用UTF-8编码，并且pandoc版本足够新（建议2.0以上）。

## 许可证

MIT 