const vscode = require("vscode");
const path = require("path");
const { extnames } = require("./constants");

const findFile = (workspaceFolder, importPath) => {
  const extname = path.extname(importPath);
  if (extname) {
    return workspaceFolder.children.filter((f) => f.includes(importPath));
  } else {
    let list = [];
    extnames.forEach((ext) => {
      list = list.concat(
        workspaceFolder.children.filter(
          (f) =>
            f.includes(importPath + `${ext}`) ||
            f.includes(importPath + `/index${ext}`)
        )
      );
    });
    return list || [];
  }
};

module.exports = class SourceJumpProvider {
  constructor(options) {
    this.workspaceFolders = options.workspaceFolders;
    this.context = options.context;
  }
  provideDefinition(document, position, token) {
    const filename = document.fileName;
    const workspaceDir = path.dirname(filename);
    const currentLineText = document.lineAt(position).text;

    const regex = /['"]([^'"]+)['"]/;

    const match = currentLineText.match(regex);
    if (match) {
      let importPath = match[1];
      let matchFilePath = [];
      if (importPath) {
        const isReactivePath =
          importPath.startsWith("./") || importPath.startsWith("../");
        importPath = isReactivePath
          ? path.resolve(workspaceDir, importPath)
          : importPath.replace(/@|~/g, "");
        // 匹配文件目录
        this.workspaceFolders.forEach((w) => {
          //   const result = w.children.filter((f) => f.includes(importPath));
          const result = findFile(w, importPath);
          matchFilePath = [...matchFilePath, ...(result || [])];
        });
      }
      if (matchFilePath.length) {
        // return new vscode.Location(
        //   vscode.Uri.file(matchFilePath[0]), // 目标文件的 URI
        //   new vscode.Position(0, 0) // 定义位置的行号和列号
        // );
        if (matchFilePath.length > 1) {
          matchFilePath = matchFilePath.filter(filePath => !filePath.includes('node_modules'));
        }
        // console.log(importPath, matchFilePath);
        return matchFilePath.map((filePath) => {
          return {
            originSelectionRange: document.getWordRangeAtPosition(position),
            targetRange: new vscode.Range(0, 0, 0, 0),
            targetUri: vscode.Uri.file(filePath),
          };
        });
      }
    }

    return null;
  }
};
