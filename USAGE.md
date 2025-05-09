# GitBook转EPUB使用指南

本文档提供了如何使用 GitBook-to-EPUB 工具将 GitBook 项目转换为标准 EPUB 电子书的详细步骤和示例。

## 完整示例流程

下面是一个完整的示例，展示如何配置和转换一个标准的 GitBook 项目。

### 1. 准备 GitBook 项目

假设您已经有一个标准结构的 GitBook 项目，目录结构如下：

```
my-gitbook/
├── .gitbook/
│   └── assets/
│       ├── cover.png
│       └── other-images/
├── chapter1/
│   ├── section1.md
│   └── section2.md
├── chapter2/
│   └── section1.md
├── README.md
└── SUMMARY.md
```

确保您的 `SUMMARY.md` 文件使用正确的格式，例如：

```markdown
# Table of contents

* [简介](README.md)

## 第一章：入门

* [1.1 基础知识](chapter1/section1.md)
* [1.2 进阶技巧](chapter1/section2.md)

## 第二章：高级应用

* [2.1 实战案例](chapter2/section1.md)
```

### 2. 添加元数据配置

在 GitBook 项目根目录创建 `metadata.yaml` 文件：

```yaml
---
title: 我的电子书
subtitle: 一本关于某主题的指南
author: 作者名
date: 2024
rights: © 2024 版权所有
language: zh-CN
publisher: 自出版
description: 这是一本关于某主题的详细指南，适合初学者和进阶学习者。
subject: 技术, 编程, 指南
cover-image: .gitbook/assets/cover.png
css: custom-style.css
toc-title: 目录
...
```

### 3. 自定义样式（可选）

在 GitBook 项目根目录创建 `custom-style.css` 文件（如果您想使用自定义样式）：

```css
/* 自定义EPUB样式 */
body {
  font-family: 'Noto Serif SC', serif;
  line-height: 1.8;
  color: #333;
}

h1 {
  color: #1a73e8;
  text-align: center;
}

h2 {
  color: #1a73e8;
  border-bottom: 1px solid #eaecef;
}

/* 更多自定义样式... */
```

### 4. 运行转换工具

#### Windows系统：

打开 PowerShell，导航到 GitBook-to-EPUB 工具目录，然后运行：

```powershell
.\gitbook-to-epub.ps1 D:\path\to\my-gitbook my-ebook.epub
```

#### Linux/macOS系统：

打开终端，导航到 GitBook-to-EPUB 工具目录，然后运行：

```bash
./gitbook-to-epub.sh /path/to/my-gitbook my-ebook.epub
```

### 5. 验证生成的EPUB

转换完成后，您将得到一个 `my-ebook.epub` 文件。您可以使用以下工具验证和查看该文件：

- [Calibre](https://calibre-ebook.com/)：功能全面的电子书管理软件
- [Adobe Digital Editions](https://www.adobe.com/solutions/ebook/digital-editions.html)：EPUB阅读器
- 各种移动设备上的电子书阅读应用

## 高级配置选项

### 使用epub-config.yaml进行高级配置

如果您需要更精细的控制转换过程，可以在GitBook根目录创建 `epub-config.yaml` 文件：

```yaml
# 基本设置
coverImage: .gitbook/assets/custom-cover.png
css: advanced-style.css
outputFilename: final-book.epub

# 内容设置
tocDepth: 3
chapterPattern: true
includeFrontMatter: true

# 排除某些文件
excludeFiles:
  - draft-*.md
  - private/*.md

# 添加额外文件
extraFiles:
  - copyright.md
  - acknowledgments.md
```

### 生成PDF（需要额外工具）

您可以先生成EPUB，然后使用Calibre等工具将EPUB转换为PDF：

```bash
# 先生成EPUB
./gitbook-to-epub.sh /path/to/my-gitbook my-ebook.epub

# 使用Calibre的命令行工具转换为PDF
ebook-convert my-ebook.epub my-ebook.pdf
```

## 疑难解答

### 问题：中文显示为方块或乱码

解决方案：确保您的CSS指定了支持中文的字体，如 'Noto Serif SC'。您也可以使用嵌入字体功能：

1. 在`epub-config.yaml`中添加：
   ```yaml
   embedFonts: true
   fonts:
     - name: Noto Serif SC
       file: fonts/NotoSerifSC-Regular.otf
   ```

2. 将字体文件放在相应位置

### 问题：图片不显示

解决方案：
- 确保图片路径正确（相对于Markdown文件的位置）
- 检查图片格式是否支持（推荐JPG和PNG）
- 确保SUMMARY.md中引用的所有文件都存在

### 问题：章节层级结构不正确

解决方案：
- 检查SUMMARY.md的格式，确保使用正确的标题级别（##用于章，*用于节）
- 确保缩进正确，每个节点下的子节点应该有额外的缩进

## 最佳实践

1. **组织结构清晰**：使用有意义的目录结构组织文件
2. **使用相对路径**：所有链接和图片引用使用相对路径
3. **保持一致性**：文件命名和章节结构保持一致
4. **预先测试**：在发布前使用多种设备和阅读器测试EPUB
5. **版本控制**：使用Git管理您的GitBook项目
6. **备份原始文件**：在转换前备份您的原始GitBook项目

## 支持的Markdown特性

本工具通过Pandoc支持大多数标准Markdown语法，包括但不限于：

- 标题（#, ##, ###等）
- 强调（**粗体**, *斜体*)
- 列表（有序和无序）
- 链接和图片
- 表格
- 代码块
- 引用块
- 水平线
- 脚注

## 需要帮助？

如果您遇到任何问题或需要帮助，请：

1. 查看本文档和README.md
2. 检查常见问题解答
3. 提交GitHub Issue（如果有） 