// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const SourceJumpProvider = require("./sourceJumpProvider");
const { extnames } = require("./constants");
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Extension "jump-everywhere" is now active!');
  function supportedExtname(filePath) {
    const extname = path.extname(filePath).toLowerCase();
    return extnames.includes(extname);
  }

  function getAllFilePaths(dirPath, fileArray = []) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // 如果是目录，则递归遍历
        getAllFilePaths(filePath, fileArray);
      } else if (stat.isFile()) {
        if (supportedExtname(filePath)) {
          fileArray.push({
            filePath,
            sort: filePath.includes("node_modules") ? -1 : 0,
          });
        }
      }
    }
    return fileArray.sort((a, b) => b.sort - a.sort).map((f) => f.filePath);
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspacePathList = [];
  if (workspaceFolders && workspaceFolders.length) {
    workspaceFolders.forEach((w) => {
      const workspaceFolderPath = w.uri.fsPath;
      workspacePathList.push({
        workspaceFolderPath: workspaceFolderPath,
        children: getAllFilePaths(workspaceFolderPath),
      });
      const watcher = vscode.workspace.createFileSystemWatcher(
        `${workspaceFolderPath}/**/*`
      );

      watcher.onDidCreate((uri) => {
        // 文件或文件夹被创建时的操作
        console.log(`文件或文件夹被创建：${uri.fsPath}`);
        if (supportedExtname(uri.path)) {
          const target = workspacePathList.find(
            (i) => i.workspaceFolder === workspaceFolderPath
          );
          target.children.push(uri.path);
        }
      });

      watcher.onDidDelete((uri) => {
        // 文件或文件夹被删除时的操作
        console.log(`文件或文件夹被删除：${uri.fsPath}`);
        if (supportedExtname(uri.path)) {
          const target = workspacePathList.find(
            (i) => i.workspaceFolder === workspaceFolderPath
          );
          target.children = target.children.filter((i) => i !== uri.path);
        }
      });
    });
  } else {
    console.error("没有打开的工作区。");
  }

  vscode.languages.registerDefinitionProvider(
    [
      { scheme: "file", language: "vue" },
      { scheme: "file", language: "scss" },
      { scheme: "file", language: "css" },
      { scheme: "file", language: "less" },
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascriptreact" },
    ],
    new SourceJumpProvider({ workspaceFolders: workspacePathList, context })
  );
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
