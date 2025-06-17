# MapConnect - 地图标注系统

一个基于Web的地图标注系统，允许用户在地图上创建和分享标注点。

## 功能特点

- 用户注册和登录系统
- 在地图上创建、编辑和删除标注点
- 支持多种标注类型（个人、企业、官方、公益）
- 标注可见时间控制（一日、三日）
- 管理员后台管理系统
- 文件上传和头像管理

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Python Flask
- 存储：Cloudflare R2
- 部署：Cloudflare Pages

## 开发环境要求

- Python 3.8+
- 安装依赖：`pip install -r requirements.txt`

## 本地运行

1. 克隆仓库：
```bash
git clone https://github.com/wangkuke/MapConnect.git
cd MapConnect
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 运行后端服务：
```bash
python app.py
```

4. 运行前端服务：
```bash
python -m http.server 8000
```

5. 访问应用：
- 主页：http://localhost:8000
- 管理后台：http://localhost:8000/admin.html

## 许可证

MIT License 