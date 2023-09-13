const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

module.exports = class SourceJumpProvider {
  constructor(options) {
    this.workspaceFolders = options.workspaceFolders;
    this.context = options.context;
  }
  provideDefinition(document, position, token) {
    const filename = document.fileName;
    const workspaceDir = path.dirname(filename);
    const currentLineText = document.lineAt(position).text;
    console.log(filename);
    console.log(workspaceDir);
    console.log(currentLineText);

    const regex = /['"]([^'"]+)['"]/;

    const match = currentLineText.match(regex);
    if (match) {
      let importPath = match[1];
      let matchFilePath = [];
      if (importPath) {
        const isReactivePath = importPath.startsWith('./') || importPath.startsWith('../');
        importPath = isReactivePath ? path.resolve(workspaceDir, importPath) : importPath.replace(/@|~|\./g, "");
        // 匹配文件目录
        this.workspaceFolders.forEach((w) => {
          const result = w.children.filter((f) => f.includes(importPath));
          matchFilePath = [...matchFilePath, ...(result || [])];
        });
      }
      console.log(importPath, matchFilePath);
      if (matchFilePath.length) {
        // return new vscode.Location(
        //   vscode.Uri.file(matchFilePath[0]), // 目标文件的 URI
        //   new vscode.Position(0, 0) // 定义位置的行号和列号
        // );
        return [
            {
                originSelectionRange: document.getWordRangeAtPosition(position),
                targetRange: new vscode.Range(0,0,0,0),
                targetUri: vscode.Uri.file(matchFilePath[0])
            }
        ]
      }
    }

    return null;
  }
};
