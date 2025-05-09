const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取命令行参数，允许指定GitBook目录
const gitbookDir = process.argv[2] || path.join(__dirname, 'the-truths-i-am-unwilling-to-tell-humanity');
const outputName = process.argv[3] || path.basename(gitbookDir);
const basePath = path.resolve(gitbookDir);

console.log(`处理GitBook目录: ${basePath}`);
console.log(`输出文件名: ${outputName}`);

// 读取文件内容
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`无法读取文件 ${filePath}: ${error.message}`);
    return '';
  }
}

// 处理图片链接
function processImageLinks(content) {
  // 移除 Markdown 图片链接，替换为[图片]标记
  return content.replace(/!\[.*?\]\(.*?\)/g, '[图片]');
}

// 检查文件是否存在
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// 主函数
async function combineFiles() {
  try {
    // 检查SUMMARY.md是否存在
    const summaryPath = path.join(basePath, 'SUMMARY.md');
    if (!fileExists(summaryPath)) {
      throw new Error(`在 ${basePath} 中找不到 SUMMARY.md 文件`);
    }

    // 读取SUMMARY.md来了解文件结构
    const summaryContent = readFile(summaryPath);
    
    // 从摘要中提取文件路径和章节标题
    const chapters = [];
    // 匹配Markdown链接，格式为 [标题](路径.md)
    const mdLinkRegex = /\[(.*?)\]\((.*?\.md)\)/g;
    let match;
    
    while ((match = mdLinkRegex.exec(summaryContent)) !== null) {
      chapters.push({
        title: match[1],
        path: match[2]
      });
    }
    
    if (chapters.length === 0) {
      throw new Error('SUMMARY.md 中未找到任何章节链接');
    }
    
    console.log(`在SUMMARY.md中找到 ${chapters.length} 个章节`);
    
    // 初始化合并内容
    let combinedContent = '';
    
    // // 检查README.md是否存在并添加为封面
    // const readmePath = path.join(basePath, 'README.md');
    // if (fileExists(readmePath)) {
    //   console.log('添加README.md作为封面');
    //   combinedContent += processImageLinks(readFile(readmePath)) + '\n\n';
    //   combinedContent += '<div style="page-break-after: always;"></div>\n\n';
    // }
    
    // 依次添加所有章节内容
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const fullPath = path.join(basePath, chapter.path);
      
      if (fileExists(fullPath)) {
        console.log(`处理章节: ${chapter.title} (${chapter.path})`);
        const content = processImageLinks(readFile(fullPath));
        combinedContent += content + '\n\n';
        
        // 在每个章节后添加分页符，最后一个章节除外
        if (i < chapters.length - 1) {
          combinedContent += '<div style="page-break-after: always;"></div>\n\n';
        }
      } else {
        console.warn(`警告: 找不到文件 ${chapter.path}，将跳过`);
      }
    }
    
    // 创建简单的CSS样式文件
    fs.writeFileSync('book-style.css', `
      body {
        font-family: 'Noto Serif SC', serif;
        line-height: 1.6;
      }
      .page-break {
        page-break-after: always;
      }
      h1, h2, h3 {
        margin-top: 1em;
      }
    `);
    
    // 确定输出文件名
    const combinedFilePath = 'combined.md';
    const pdfFilePath = `${outputName}.pdf`;
    
    // 写入合并后的内容到新文件
    fs.writeFileSync(combinedFilePath, combinedContent);
    console.log(`合并完成! 文件已保存为 ${combinedFilePath}`);
    
    // 转换为PDF
    try {
      console.log('正在尝试将Markdown转换为PDF...');
      execSync(`md-to-pdf ${combinedFilePath}`, { stdio: 'inherit' });
      console.log(`PDF文件已生成: combined.pdf`);
      
      // 重命名生成的PDF文件
      fs.renameSync('combined.pdf', pdfFilePath);
      console.log(`已将PDF文件重命名为: ${pdfFilePath}`);
    } catch (error) {
      console.error('PDF生成失败:', error.message);
    }
    
  } catch (error) {
    console.error('合并过程中出错:', error);
  }
}

// 执行合并
combineFiles(); 