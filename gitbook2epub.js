#!/usr/bin/env node

/**
 * GitBook to EPUB 转换工具
 * 纯 Node.js 实现，跨平台兼容
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const yaml = require('js-yaml');
const os = require('os');

// 终端颜色设置（不使用外部依赖）
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// 检测是否在GUI模式下运行（通过环境变量或父进程）
const isGUIMode = process.env.GITBOOK2EPUB_GUI_MODE === 'true' || 
                  process.ppid && process.title.includes('electron');

// 日志输出
const log = {
  info: (msg) => {
    if (isGUIMode) {
      console.log(msg);
    } else {
      console.log(colors.cyan + msg + colors.reset);
    }
  },
  success: (msg) => {
    if (isGUIMode) {
      console.log(msg);
    } else {
      console.log(colors.green + msg + colors.reset);
    }
  },
  warn: (msg) => {
    if (isGUIMode) {
      console.log('警告: ' + msg);
    } else {
      console.log(colors.yellow + msg + colors.reset);
    }
  },
  error: (msg) => {
    if (isGUIMode) {
      console.log('错误: ' + msg);
    } else {
      console.log(colors.red + msg + colors.reset);
    }
  },
  fileItem: (msg) => {
    if (isGUIMode) {
      console.log('- ' + msg);
    } else {
      console.log(colors.magenta + '- ' + colors.reset + msg);
    }
  }
};

// 命令行参数处理
const args = process.argv.slice(2);

// 解析命令行参数
let gitbookName = '.';
let outputFileName = '';
let metadataPath = '';
let stylePath = '';

// 提取标准参数(gitbookName, outputFileName)和选项(--metadata, --style)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--metadata' || args[i] === '-m') {
    if (i + 1 < args.length) {
      metadataPath = args[i + 1];
      i++; // 跳过下一个参数
    }
  } else if (args[i] === '--style' || args[i] === '-s') {
    if (i + 1 < args.length) {
      stylePath = args[i + 1];
      i++; // 跳过下一个参数
    }
  } else if (!gitbookName || gitbookName === '.') {
    gitbookName = args[i];
  } else if (!outputFileName) {
    outputFileName = args[i];
  }
}

// 如果第一个参数是完整路径，则直接使用
const gitbookDir = path.isAbsolute(gitbookName) 
  ? gitbookName 
  : path.resolve('gitbooks', gitbookName);

// 如果第二个参数是完整路径，则直接使用
const outputPath = outputFileName && path.isAbsolute(outputFileName)
  ? outputFileName
  : path.resolve('output', outputFileName || path.basename(gitbookDir) + '.epub');

// 临时文件集合，用于在程序结束时清理
const tempFiles = [];

// 检查文件/目录是否存在
function checkExists(filePath, isRequired = true, type = 'file') {
  const exists = type === 'file' 
    ? fs.existsSync(filePath) && fs.statSync(filePath).isFile() 
    : fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
  
  if (!exists && isRequired) {
    log.error(`错误: ${type === 'file' ? '文件' : '目录'} ${filePath} 不存在`);
    process.exit(1);
  }
  return exists;
}

// 读取文件内容
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error(`无法读取文件 ${filePath}: ${error.message}`);
    return '';
  }
}

// 从SUMMARY.md解析GitBook结构
function parseStructure(summaryPath, gitbookDir) {
  log.info('解析 SUMMARY.md 文件...');
  
  const summaryContent = readFile(summaryPath);
  const fileList = [];
  
  // 第一步：添加基本文件
  const readmePath = path.join(gitbookDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    fileList.push(readmePath);
  }
  
  // 从SUMMARY.md中提取文件路径
  const lines = summaryContent.split('\n');
  
  // 提取所有Markdown链接，不管缩进级别
  const mdLinkRegex = /\[.*?\]\((.*?\.md)\)/g;
  const filePathsInSummary = [];
  
  for (const line of lines) {
    let match;
    while ((match = mdLinkRegex.exec(line)) !== null) {
      const mdFilePath = match[1];
      if (!mdFilePath.startsWith('http')) {
        filePathsInSummary.push(path.join(gitbookDir, mdFilePath));
      }
    }
  }
  
  // 添加从SUMMARY提取的文件（如果文件存在）
  for (const filePath of filePathsInSummary) {
    if (fs.existsSync(filePath)) {
      fileList.push(filePath);
      log.info(`找到文件: ${filePath}`);
    } else {
      log.warn(`文件不存在，将跳过: ${filePath}`);
    }
  }
  
  // 去除重复项
  const uniqueFileList = [...new Set(fileList)];
  log.success(`找到 ${uniqueFileList.length} 个文件用于转换`);
  
  return uniqueFileList;
}

// 根据章节级别提取文件列表
function extractFilesByChapter(summaryPath, gitbookDir) {
  log.info('按章节结构提取文件...');
  
  const summaryContent = readFile(summaryPath);
  const lines = summaryContent.split('\n');
  
  // 结果结构
  const result = {
    frontMatter: [], // 前言部分：封面、自序等
    chapters: [],    // 章节列表
    maxLevel: 1      // 最大层级数，默认为1
  };
  
  // 当前处理的章节
  let currentChapter = null;
  // 当前处理的子章节
  let currentSubChapter = null;
  // 记录已添加的文件路径，避免重复
  const addedFiles = new Set();
  
  // 第一步：先处理README.md（如果存在）
  const readmePath = path.join(gitbookDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    // 查找README.md对应的标题（通常是第一个条目）
    let readmeTitle = "自序"; // 默认标题
    for (const line of lines) {
      const readmeMatch = line.match(/^\* \[(.*?)\]\(README\.md\)/);
      if (readmeMatch) {
        readmeTitle = readmeMatch[1];
        break;
      }
    }
    result.frontMatter.push({
      title: readmeTitle,
      path: readmePath,
      isReadme: true
    });
    addedFiles.add(readmePath);
  }

  // 处理每一行
  for (const line of lines) {
    // 跳过空行和非列表项
    if (!line.trim() || !line.includes('*')) {
      continue;
    }
    
    // 计算当前行的缩进级别
    const indentLevel = line.search(/\S/) / 2 + 1; // 缩进空格数除以2再加1得到层级
    result.maxLevel = Math.max(result.maxLevel, indentLevel); // 更新最大层级数
    
    // 检查是否是一级列表项（第一级目录）
    const mainItemMatch = line.match(/^\* \[(.*?)\]\((.*?\.md)\)/);
    if (mainItemMatch) {
      const title = mainItemMatch[1];
      const filePath = path.join(gitbookDir, mainItemMatch[2]);
      
      // 如果是README.md且已经处理过，则跳过
      if (mainItemMatch[2] === 'README.md' && addedFiles.has(filePath)) {
        continue;
      }
      
      // 如果路径包含README.md，表示是章节标题
      if (mainItemMatch[2].includes('README.md') && mainItemMatch[2] !== 'README.md') {
        // 创建新章节
        currentChapter = {
          title: title,
          path: filePath,
          files: []
        };
        result.chapters.push(currentChapter);
        currentSubChapter = null; // 重置当前子章节
        
        if (fs.existsSync(filePath)) {
          addedFiles.add(filePath);
        }
      } else {
        // 否则是前言部分的文件（非README.md）
        if (fs.existsSync(filePath) && !addedFiles.has(filePath)) {
          result.frontMatter.push({
            title,
            path: filePath
          });
          addedFiles.add(filePath);
        }
      }
      continue;
    }
    
    // 检查是否是二级列表项（第二级目录）
    const subItemMatch = line.match(/^\s+\* \[(.*?)\]\((.*?\.md)\)/);
    if (subItemMatch && currentChapter) {
      const title = subItemMatch[1];
      const filePath = path.join(gitbookDir, subItemMatch[2]);
      
      if (fs.existsSync(filePath) && !addedFiles.has(filePath)) {
        // 如果是README.md文件，可能是子章节的标题
        if (subItemMatch[2].includes('README.md')) {
          // 创建子章节
          currentSubChapter = {
            title: title,
            path: filePath,
            files: [],
            isSubChapter: true
          };
          currentChapter.files.push(currentSubChapter);
        } else if (currentSubChapter && line.indexOf('*') > 4) {
          // 如果有更多缩进，添加到当前子章节
          currentSubChapter.files.push({
            title,
            path: filePath,
            isSubItem: true
          });
        } else {
          // 否则直接添加到当前章节
          currentChapter.files.push({
            title,
            path: filePath,
            isSubItem: true
          });
        }
        addedFiles.add(filePath);
      }
    }
  }
  
  log.info(`SUMMARY.md中的最大目录层级: ${result.maxLevel}`);
  return result;
}

// 为每个章节创建临时标记文件
function createChapterFiles(chapterStructure) {
  log.info('创建章节标记文件...');
  
  const fileList = [];
  const tempDir = path.join(os.tmpdir(), 'gitbook2epub-' + Date.now());
  
  try {
    // 创建临时目录
    fs.mkdirSync(tempDir, { recursive: true });
    
    // 按照SUMMARY.md中的顺序处理前言部分
    chapterStructure.frontMatter.forEach((item, index) => {
      if (item.path && fs.existsSync(item.path)) {
        const fileContent = readFile(item.path);
        // 创建修改后的文件，确保只有第一个标题是一级标题，其余标题降级（不出现在目录中）
        const outputFile = path.join(tempDir, `frontmatter-${index.toString().padStart(2, '0')}-${path.basename(item.path)}`);
        // 处理内容：第一个标题设为一级，其余标题都降级（增加一个#）
        let modifiedContent = processMarkdownHeaders(fileContent, 1);
        fs.writeFileSync(outputFile, modifiedContent, 'utf8');
        fileList.push(outputFile);
        tempFiles.push(outputFile);
        log.info(`✓ 处理前言文件: ${item.title}`);
      }
    });
    
    // 处理各章节
    chapterStructure.chapters.forEach((chapter, chapterIndex) => {
      // 添加章节文件（通常是README.md）
      if (chapter.path && fs.existsSync(chapter.path)) {
        const chapterContent = readFile(chapter.path);
        // 创建修改后的章节文件，确保使用一级标题
        const chapterFile = path.join(tempDir, `chapter-${chapterIndex+1}.md`);
        // 处理内容：将第一个标题设为一级，其余标题都降级（加#）
        let modifiedContent = processMarkdownHeaders(chapterContent, 1);
        fs.writeFileSync(chapterFile, modifiedContent, 'utf8');
        fileList.push(chapterFile);
        tempFiles.push(chapterFile);
      } else {
        // 如果没有README文件，创建章节标记文件
        const chapterFile = path.join(tempDir, `chapter-${chapterIndex+1}.md`);
        fs.writeFileSync(chapterFile, `# ${chapter.title}\n\n`, 'utf8');
        fileList.push(chapterFile);
        tempFiles.push(chapterFile);
      }
      
      // 处理章节内的文件
      chapter.files.forEach((file, fileIndex) => {
        if (file.isSubChapter) {
          // 处理子章节
          if (file.path && fs.existsSync(file.path)) {
            const subChapterContent = readFile(file.path);
            // 创建修改后的子章节文件，确保使用二级标题
            const subChapterFile = path.join(tempDir, `subchapter-${chapterIndex+1}-${fileIndex+1}.md`);
            // 处理内容：将第一个标题设为二级，其余标题都降级（加#）
            let modifiedContent = processMarkdownHeaders(subChapterContent, 2);
            fs.writeFileSync(subChapterFile, modifiedContent, 'utf8');
            fileList.push(subChapterFile);
            tempFiles.push(subChapterFile);
          } else {
            // 创建子章节标记文件
            const subChapterFile = path.join(tempDir, `subchapter-${chapterIndex+1}-${fileIndex+1}.md`);
            fs.writeFileSync(subChapterFile, `## ${file.title}\n\n`, 'utf8');
            fileList.push(subChapterFile);
            tempFiles.push(subChapterFile);
          }
          
          // 处理子章节内的文件
          if (file.files && file.files.length > 0) {
            file.files.forEach(subFile => {
              if (subFile.path && fs.existsSync(subFile.path)) {
                const subFileContent = readFile(subFile.path);
                // 创建修改后的文件，确保内部标题不会出现在目录中
                const subItemFile = path.join(tempDir, `subitem-${path.basename(subFile.path)}`);
                // 处理内容：将第一个标题设为三级标题，其余标题都降级（加#）
                let modifiedContent = processMarkdownHeaders(subFileContent, 3);
                fs.writeFileSync(subItemFile, modifiedContent, 'utf8');
                fileList.push(subItemFile);
                tempFiles.push(subItemFile);
              }
            });
          }
        } else if (file.path && fs.existsSync(file.path)) {
          // 普通文件，添加为二级标题
          const fileContent = readFile(file.path);
          const itemFile = path.join(tempDir, `item-${chapterIndex+1}-${fileIndex+1}-${path.basename(file.path)}`);
          // 处理内容：将第一个标题设为二级，其余标题都降级（加#）
          let modifiedContent = processMarkdownHeaders(fileContent, 2);
          fs.writeFileSync(itemFile, modifiedContent, 'utf8');
          fileList.push(itemFile);
          tempFiles.push(itemFile);
        }
      });
    });
    
    return fileList;
  } catch (error) {
    log.error(`创建章节文件时出错: ${error.message}`);
    return null;
  }
}

// 处理Markdown文件中的标题，将第一个标题设为指定级别，其余标题都降级
function processMarkdownHeaders(content, firstHeaderLevel) {
  // 拆分内容行
  const lines = content.split('\n');
  let firstHeaderFound = false;
  
  // 处理每一行
  const processedLines = lines.map(line => {
    // 检查是否是标题行
    if (line.match(/^#+\s+/)) {
      if (!firstHeaderFound) {
        // 第一个标题，设置为指定级别
        firstHeaderFound = true;
        return '#'.repeat(firstHeaderLevel) + ' ' + line.replace(/^#+\s+/, '');
      } else {
        // 其他标题，全部降级（标题级别+1，相当于层级更深，不会出现在目录中）
        const headerMatch = line.match(/^(#+)\s+(.*)/);
        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          const headerText = headerMatch[2];
          // 确保标题级别至少是toc-depth+1，这样就不会出现在目录中
          const newLevel = Math.max(headerLevel + 1, 3); // toc-depth=2，所以要至少是3级
          return '#'.repeat(newLevel) + ' ' + headerText;
        }
      }
    }
    return line;
  });
  
  return processedLines.join('\n');
}

// 读取和处理元数据
function processMetadata(gitbookDir, customMetadataPath = '') {
  // 使用自定义元数据路径（如果提供），否则使用默认路径
  const metadataPath = customMetadataPath || path.join(gitbookDir, 'metadata.yaml');
  
  // 默认元数据
  const defaultMetadata = {
    title: path.basename(gitbookDir),
    author: 'Unknown',
    date: new Date().getFullYear(),
    lang: 'zh-CN',
    'cover-image': null,
    css: null
  };
  
  if (!fs.existsSync(metadataPath)) {
    log.warn(`未找到元数据文件 ${metadataPath}，将使用默认元数据`);
    
    // 创建临时元数据文件
    const tempMetadataPath = path.join(os.tmpdir(), 'gitbook2epub-metadata-' + Date.now() + '.yaml');
    try {
      fs.writeFileSync(tempMetadataPath, yaml.dump(defaultMetadata));
      tempFiles.push(tempMetadataPath);
      return {
        path: tempMetadataPath,
        data: defaultMetadata,
        isTemp: true
      };
    } catch (error) {
      log.error(`无法创建临时元数据文件: ${error.message}`);
      return {
        path: null,
        data: defaultMetadata,
        isTemp: false
      };
    }
  }
  
  try {
    const metadataContent = readFile(metadataPath);
    const metadataObj = yaml.load(metadataContent);
    
    log.info('成功读取元数据文件');
    return {
      path: metadataPath,
      data: { ...defaultMetadata, ...metadataObj },
      isTemp: false
    };
  } catch (error) {
    log.error(`解析 metadata.yaml 失败: ${error.message}`);
    return {
      path: null,
      data: defaultMetadata,
      isTemp: false
    };
  }
}

// 使用 pandoc 转换为 EPUB
function convertToEpub(fileList, metadata, options) {
  const outputPath = path.resolve(options.outputPath);
  
  log.info('准备转换为 EPUB...');
  log.info(`输出文件: ${outputPath}`);
  log.info(`包含 ${fileList.length} 个文件`);
  
  // 构建 pandoc 命令参数
  const args = [
    '-o', outputPath,
    '--toc',
    `--toc-depth=${options.tocDepth || 2}` // 使用传入的tocDepth值或默认为2
  ];
  
  // 添加元数据
  if (metadata.path) {
    args.push('--metadata-file', metadata.path);
  }
  
  // 添加封面图片
  if (metadata.data['cover-image']) {
    const coverPath = path.resolve(gitbookDir, metadata.data['cover-image']);
    if (fs.existsSync(coverPath)) {
      args.push('--epub-cover-image', coverPath);
      log.info(`使用封面图片: ${coverPath}`);
    } else {
      log.warn(`封面图片不存在: ${coverPath}`);
    }
  }
  
  // 添加自定义样式（命令行参数优先）
  if (options.customStylePath && fs.existsSync(options.customStylePath)) {
    args.push('--css', options.customStylePath);
    log.info(`使用命令行指定的样式文件: ${options.customStylePath}`);
  } 
  // 其次使用metadata中指定的样式
  else if (metadata.data.css) {
    const cssPath = path.resolve(gitbookDir, metadata.data.css);
    if (fs.existsSync(cssPath)) {
      args.push('--css', cssPath);
      log.info(`使用元数据中指定的样式: ${cssPath}`);
    } else {
      log.warn(`元数据中指定的样式文件不存在: ${cssPath}`);
    }
  }
  
  // 最后使用默认样式（如果存在且未指定其他样式）
  const defaultCssPath = path.join(__dirname, 'default-style.css');
  if (fs.existsSync(defaultCssPath) && !options.customStylePath && !metadata.data.css) {
    args.push('--css', defaultCssPath);
    log.info('使用默认样式文件');
  }
  
  // 添加输入文件（使用相对路径）
  fileList.forEach(file => {
    args.push(file);
  });
  
  log.info('执行 pandoc 命令...');
  try {
    // Windows平台上可能需要使用引号包围文件路径
    const command = `pandoc ${args.map(arg => `"${arg}"`).join(' ')}`;
    execSync(command, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8'
    });
    log.success(`EPUB 文件生成成功: ${outputPath}`);
    
    return true;
  } catch (error) {
    log.error(`EPUB 生成失败: ${error.message}`);
    return false;
  }
}

// 显示文件列表
function displayFileList(fileList) {
  log.info('将包含以下文件:');
  fileList.forEach(file => {
    if (file.includes('chapter-') && file.includes('gitbook2epub')) {
      log.fileItem(`[章节标记文件] ${path.basename(file)}`);
    } else {
      log.fileItem(file);
    }
  });
}

// 清理临时文件
function cleanupTempFiles() {
  if (tempFiles.length > 0) {
    log.info('清理临时文件...');
    tempFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        log.warn(`无法删除临时文件 ${file}: ${error.message}`);
      }
    });
  }
}

// 主函数
async function main() {
  try {
    log.info(`将 GitBook 转换为 EPUB`);
    log.info(`源目录: ${gitbookDir}`);
    log.info(`输出文件: ${outputPath}`);
    
    // 检查GitBook目录是否存在
    checkExists(gitbookDir, true, 'directory');
    
    // 检查是否安装了pandoc
    try {
      execSync('pandoc --version', { stdio: 'ignore' });
    } catch (error) {
      log.error('未找到 pandoc 命令。请安装 pandoc 后再试。');
      log.error('安装指南: https://pandoc.org/installing.html');
      process.exit(1);
    }
    
    // 检查SUMMARY.md文件
    const summaryPath = path.join(gitbookDir, 'SUMMARY.md');
    if (!checkExists(summaryPath, false)) {
      log.error('SUMMARY.md 文件不存在，无法解析 GitBook 结构。');
      process.exit(1);
    }
    
    // 读取和处理元数据
    const metadata = processMetadata(gitbookDir, metadataPath);
    
    // 按照章节结构提取文件
    const chapterStructure = extractFilesByChapter(summaryPath, gitbookDir);
    
    // 创建章节文件，保持SUMMARY.md中的层级结构
    const fileList = createChapterFiles(chapterStructure);
    
    if (!fileList || fileList.length === 0) {
      log.error('未找到有效的内容文件。请检查 SUMMARY.md 文件格式是否正确。');
      process.exit(1);
    }
    
    // 显示要包含的文件
    displayFileList(fileList);
    
    // 执行转换，传入SUMMARY.md中的最大层级数作为tocDepth
    convertToEpub(fileList, metadata, {
      outputPath: outputPath,
      tocDepth: chapterStructure.maxLevel,
      customStylePath: stylePath
    });
    
  } catch (error) {
    log.error(`处理过程中出错: ${error.message}`);
    process.exit(1);
  } finally {
    // 清理临时文件
    cleanupTempFiles();
  }
}

// 处理程序退出时的清理工作
process.on('exit', () => {
  cleanupTempFiles();
});

process.on('SIGINT', () => {
  log.info('接收到中断信号，正在清理...');
  cleanupTempFiles();
  process.exit(0);
});

// 运行主函数
main(); 