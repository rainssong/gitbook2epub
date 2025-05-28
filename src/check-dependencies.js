#!/usr/bin/env node

/**
 * 依赖检查脚本
 * 检查系统是否满足运行条件
 */

const { execSync } = require('child_process');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(color + message + colors.reset);
}

function checkNode() {
  try {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion >= 12) {
      log(colors.green, `✓ Node.js ${version} - 版本满足要求`);
      return true;
    } else {
      log(colors.red, `✗ Node.js ${version} - 需要 v12.0.0 或更高版本`);
      return false;
    }
  } catch (error) {
    log(colors.red, '✗ Node.js 未安装');
    return false;
  }
}

function checkPandoc() {
  try {
    const version = execSync('pandoc --version', { encoding: 'utf8' });
    const versionLine = version.split('\n')[0];
    log(colors.green, `✓ ${versionLine} - 已安装`);
    return true;
  } catch (error) {
    log(colors.red, '✗ Pandoc 未安装');
    return false;
  }
}

function showPandocInstallGuide() {
  log(colors.yellow, '\n📦 Pandoc 安装指南:');
  
  const platform = os.platform();
  
  if (platform === 'win32') {
    log(colors.cyan, '\nWindows:');
    log(colors.cyan, '  方法1: 访问 https://pandoc.org/installing.html 下载安装包');
    log(colors.cyan, '  方法2: choco install pandoc (需要 Chocolatey)');
    log(colors.cyan, '  方法3: winget install JohnMacFarlane.Pandoc (Windows 10+)');
  } else if (platform === 'darwin') {
    log(colors.cyan, '\nmacOS:');
    log(colors.cyan, '  方法1: brew install pandoc (推荐)');
    log(colors.cyan, '  方法2: 访问 https://pandoc.org/installing.html 下载安装包');
  } else {
    log(colors.cyan, '\nLinux:');
    log(colors.cyan, '  Ubuntu/Debian: sudo apt-get install pandoc');
    log(colors.cyan, '  CentOS/RHEL: sudo yum install pandoc');
    log(colors.cyan, '  Arch Linux: sudo pacman -S pandoc');
    log(colors.cyan, '  其他发行版: 访问 https://pandoc.org/installing.html');
  }
  
  log(colors.yellow, '\n安装完成后，请重新运行此检查脚本验证安装。');
}

function main() {
  log(colors.cyan, '🔍 检查系统依赖...\n');
  
  const nodeOk = checkNode();
  const pandocOk = checkPandoc();
  
  if (nodeOk && pandocOk) {
    log(colors.green, '\n🎉 所有依赖都已正确安装！');
    log(colors.green, '可以开始使用 GitBook2EPUB 工具了。');
    log(colors.cyan, '\n使用方法:');
    log(colors.cyan, '  GUI 模式: npm run gui');
    log(colors.cyan, '  命令行: npm start [GitBook目录] [输出文件]');
  } else {
    log(colors.red, '\n❌ 存在缺失的依赖，请安装后重试。');
    
    if (!pandocOk) {
      showPandocInstallGuide();
    }
    
    process.exit(1);
  }
}

main();
