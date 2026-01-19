const sqlite3 = require('sqlite3');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 数据库文件路径 (在项目根目录)
const dbPath = path.resolve(__dirname, '../mapconnect.db');
// SQL导出文件路径 (在项目根目录)
const exportPath = path.resolve(__dirname, '../backup.sql');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error(`错误：在以下路径找不到数据库文件: ${dbPath}`);
  process.exit(1);
}

// 由于直接使用node的sqlite3库的dump功能比较复杂，
// 且我们已经安装了sqlite3的npm包，它自带了一个命令行工具。
// 我们直接调用这个命令行工具来执行dump操作，这是最可靠的方式。

const sqliteCliPath = path.resolve(__dirname, 'node_modules/sqlite3/bin/sqlite3.js');

// 构建执行命令
// node [sqlite3的js文件] [数据库路径] .dump > [导出文件路径]
const command = `node "${sqliteCliPath}" "${dbPath}" .dump > "${exportPath}"`;

console.log('正在执行导出命令...');
console.log(command); // 打印出将要执行的命令，方便调试

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`导出时发生错误: ${error.message}`);
        return;
    }
    if (stderr) {
        // .dump 命令的输出在 stdout，stderr通常是空的，除非有错误
        console.error(`导出过程中产生错误信息: ${stderr}`);
        return;
    }

    console.log(`\n✅ 数据库已成功导出到: ${exportPath}`);
    console.log("现在您可以使用 wrangler d1 execute 命令来导入这个文件了。");
}); 