const { contextBridge, ipcRenderer } = require('electron');

// 为渲染进程暴露安全的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 选择目录
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  
  // 选择文件
  selectFile: (fileTypes) => ipcRenderer.invoke('select-file', fileTypes),
  
  // 选择保存路径
  saveFile: () => ipcRenderer.invoke('save-file'),
  
  // 开始转换
  convertGitbook: (options) => ipcRenderer.invoke('convert-gitbook', options),
  
  // 监听转换进度
  onConversionProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, value) => callback(value));
    
    // 返回一个清理函数
    return () => {
      ipcRenderer.removeAllListeners('conversion-progress');
    };
  }
});