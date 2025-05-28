const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('gui/index.html');
  
  // 开发环境下打开开发者工具
  // mainWindow.webContents.openDevTools();
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理文件夹选择
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// 处理文件选择
ipcMain.handle('select-file', async (event, fileTypes) => {
  const filters = [];
  if (fileTypes === 'yaml') {
    filters.push({ name: 'YAML文件', extensions: ['yaml', 'yml'] });
  } else if (fileTypes === 'css') {
    filters.push({ name: 'CSS文件', extensions: ['css'] });
  }
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters
  });
  
  if (!result.canceled) {
    return result.filePaths[0];
  }
  return null;
});

// 处理保存文件对话框
ipcMain.handle('save-file', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'EPUB文件', extensions: ['epub'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePath;
  }
  return null;
});

// 执行转换过程
ipcMain.handle('convert-gitbook', async (event, options) => {
  return new Promise((resolve, reject) => {
    try {
      // 创建转换进程
      const args = [];
      
      // 相对路径以实际项目路径为基准
      if (options.gitbookPath) {
        args.push(options.gitbookPath);
      }
      
      if (options.outputPath) {
        args.push(options.outputPath);
      }
      
      if (options.metadataPath) {
        args.push('--metadata');
        args.push(options.metadataPath);
      }
      
      if (options.stylePath) {
        args.push('--style');
        args.push(options.stylePath);
      }

      console.log(`执行命令: node gitbook2epub.js ${args.join(' ')}`);
      const convertProcess = spawn('node', ['gitbook2epub.js', ...args]);
      
      // 发送进度更新
      convertProcess.stdout.on('data', (data) => {
        const output = data.toString();
        mainWindow.webContents.send('conversion-progress', output);
      });
      
      convertProcess.stderr.on('data', (data) => {
        const error = data.toString();
        mainWindow.webContents.send('conversion-progress', `错误: ${error}`);
      });
      
      convertProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: '转换成功！' });
        } else {
          reject({ success: false, message: `转换失败，退出代码：${code}` });
        }
      });
    } catch (error) {
      reject({ success: false, message: `执行错误：${error.message}` });
    }
  });
});