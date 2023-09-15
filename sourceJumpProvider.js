const vscode = require("vscode");
const path = require("path");
const { extnames } = require("./constants");

const matchedFileListHandler = (workspaceFolder, importPath) => {
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

const npmBundleHandler = (list, workspaceFolderPath, importPath) => {
  const isNpmBundle = list.every(f => f.includes('node_modules'));
  if (isNpmBundle) {
    // TODO
    let sourcePath = path.resolve(workspaceFolderPath, 'node_modules', importPath);
    const sourcePackageInfo = require(path.resolve(sourcePath, 'package.json'));
    if (sourcePackageInfo.main && typeof sourcePackageInfo.main === 'string') {
      sourcePath = path.resolve(sourcePath, sourcePackageInfo.main);
      return [sourcePath];
    }
    return list.filter(f => f.includes(sourcePath)) || list;
  }
  return list;
}

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
          const result = npmBundleHandler(matchedFileListHandler(w, importPath), w.workspaceFolderPath, importPath);
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
        console.log(importPath, matchFilePath);
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
