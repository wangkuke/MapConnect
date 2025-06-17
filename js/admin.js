<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>地图标注管理后台</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #4361ee;
            --secondary: #3f37c9;
            --success: #4cc9f0;
            --dark: #1d3557;
            --light: #f8f9fa;
            --sidebar-width: 280px;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }
        
        body {
            background-color: #f0f2f5;
            color: #333;
            display: flex;
            min-height: 100vh;
        }
        
        /* 侧边栏样式 */
        .sidebar {
            width: var(--sidebar-width);
            background: linear-gradient(180deg, var(--dark), #2a3b5a);
            color: white;
            padding: 0;
            display: flex;
            flex-direction: column;
            transition: all 0.3s;
            box-shadow: 0 0 30px rgba(0,0,0,0.1);
            z-index: 100;
        }
        
        .sidebar-header {
            padding: 25px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            text-align: center;
        }
        
        .sidebar-header h1 {
            font-size: 1.5rem;
            margin-bottom: 5px;
            color: white;
            font-weight: 700;
        }
        
        .sidebar-header p {
            font-size: 0.9rem;
            opacity: 0.7;
        }
        
        .sidebar-menu {
            padding: 20px 0;
            flex-grow: 1;
        }
        
        .menu-item {
            padding: 12px 25px;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s;
            border-left: 4px solid transparent;
        }
        
        .menu-item:hover, .menu-item.active {
            background: rgba(255,255,255,0.1);
            border-left: 4px solid var(--success);
        }
        
        .menu-item i {
            margin-right: 12px;
            width: 24px;
            text-align: center;
            font-size: 1.1rem;
        }
        
        .menu-item span {
            font-size: 1rem;
        }
        
        /* 主内容区 */
        .main-content {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        /* 顶部栏 */
        .topbar {
            background: white;
            padding: 0 25px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            height: 70px;
            z-index: 99;
        }
        
        .search-bar {
            position: relative;
            width: 300px;
        }
        
        .search-bar input {
            width: 100%;
            padding: 10px 15px 10px 40px;
            border: 1px solid #ddd;
            border-radius: 30px;
            font-size: 0.95rem;
        }
        
        .search-bar i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #777;
        }
        
        .user-actions {
            display: flex;
            align-items: center;
        }
        
        .notification {
            position: relative;
            margin-right: 20px;
            cursor: pointer;
        }
        
        .notification .badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #e74c3c;
            color: white;
            font-size: 0.7rem;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .user-profile {
            display: flex;
            align-items: center;
            cursor: pointer;
        }
        
        .user-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--primary), var(--success));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 10px;
            background-size: cover;
            background-position: center;
        }
        
        /* 内容区域 */
        .content {
            flex-grow: 1;
            padding: 25px;
            overflow-y: auto;
        }
        
        .dashboard-header {
            margin-bottom: 25px;
        }
        
        .dashboard-header h2 {
            font-weight: 600;
            color: var(--dark);
        }
        
        .dashboard-header p {
            color: #6c757d;
        }
        
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            transition: all 0.3s;
            border-left: 4px solid var(--primary);
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .stat-card.secondary {
            border-left: 4px solid var(--success);
        }
        
        .stat-card.warning {
            border-left: 4px solid #f9c74f;
        }
        
        .stat-card.danger {
            border-left: 4px solid #e74c3c;
        }
        
        .stat-card i {
            font-size: 2.5rem;
            margin-bottom: 15px;
            color: var(--primary);
        }
        
        .stat-card.secondary i {
            color: var(--success);
        }
        
        .stat-card.warning i {
            color: #f9c74f;
        }
        
        .stat-card.danger i {
            color: #e74c3c;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 5px;
            color: var(--dark);
        }
        
        .stat-card .label {
            font-size: 1rem;
            color: #6c757d;
        }
        
        /* 表格样式 */
        .card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            margin-bottom: 25px;
        }
        
        .card-header {
            background: white;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            padding: 20px 25px;
            border-radius: 12px 12px 0 0 !important;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .card-title {
            margin: 0;
            font-weight: 600;
            color: var(--dark);
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        .table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
        }
        
        .table thead th {
            background: rgba(67, 97, 238, 0.05);
            padding: 15px 20px;
            font-weight: 600;
            color: var(--dark);
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
        }
        
        .table tbody td {
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
            vertical-align: middle;
        }
        
        .table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .table tbody tr:hover {
            background: rgba(67, 97, 238, 0.03);
        }
        
        .status {
            padding: 5px 12px;
            border-radius: 30px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        
        .status.active {
            background: rgba(76, 201, 240, 0.15);
            color: var(--success);
        }
        
        .status.pending {
            background: rgba(249, 199, 79, 0.15);
            color: #f9c74f;
        }
        
        .status.inactive {
            background: rgba(231, 76, 60, 0.15);
            color: #e74c3c;
        }
        
        .action-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(67, 97, 238, 0.1);
            color: var(--primary);
            margin-right: 5px;
            transition: all 0.3s;
            border: none;
        }
        
        .action-btn:hover {
            background: var(--primary);
            color: white;
            transform: translateY(-3px);
        }
        
        .action-btn.edit {
            background: rgba(76, 201, 240, 0.1);
            color: var(--success);
        }
        
        .action-btn.edit:hover {
            background: var(--success);
            color: white;
        }
        
        .action-btn.delete {
            background: rgba(231, 76, 60, 0.1);
            color: #e74c3c;
        }
        
        .action-btn.delete:hover {
            background: #e74c3c;
            color: white;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }
        
        /* 表单样式 */
        .form-container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
        }
        
        .form-header {
            margin-bottom: 25px;
        }
        
        .form-header h3 {
            font-weight: 600;
            color: var(--dark);
            margin-bottom: 5px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            font-weight: 500;
            margin-bottom: 8px;
            color: #495057;
        }
        
        .form-control {
            padding: 12px 15px;
            border: 1px solid #e2e5e8;
            border-radius: 8px;
            transition: all 0.3s;
        }
        
        .form-control:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
        }
        
        .btn-primary {
            background: var(--primary);
            border: none;
            padding: 12px 25px;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.3s;
        }
        
        .btn-primary:hover {
            background: var(--secondary);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(67, 97, 238, 0.3);
        }
        
        /* 响应式设计 */
        @media (max-width: 992px) {
            .sidebar {
                width: 80px;
            }
            
            .sidebar-header h1, .sidebar-header p, .menu-item span {
                display: none;
            }
            
            .sidebar-header {
                padding: 20px 10px;
            }
            
            .menu-item {
                justify-content: center;
                padding: 15px 10px;
            }
            
            .menu-item i {
                margin-right: 0;
                font-size: 1.3rem;
            }
        }
        
        @media (max-width: 768px) {
            .stats-container {
                grid-template-columns: 1fr;
            }
            
            .search-bar {
                width: 150px;
            }
            
            .content {
                padding: 15px;
            }
        }
        
        /* 登录页面 */
        .login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #4361ee, #3a0ca3);
            padding: 20px;
        }
        
        .login-card {
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 450px;
            overflow: hidden;
        }
        
        .login-header {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        
        .login-header h2 {
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .login-body {
            padding: 40px 30px;
        }
        
        .login-footer {
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #eee;
            color: #6c757d;
        }

        .table-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
        }
        .table-avatar-initial {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--primary);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .role {
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: capitalize;
        }
        .role.admin {
            background: rgba(231, 76, 60, 0.15);
            color: #e74c3c;
        }
        .role.user {
            background: rgba(67, 97, 238, 0.1);
            color: var(--primary);
        }
        .fa-user-edit {
            color: #f9c74f;
        }
        .action-btn.edit-user:hover .fa-user-edit {
            color: white;
        }
        .action-btn.edit-user {
            background: rgba(249, 199, 79, 0.1);
        }
        .action-btn.edit-user:hover {
            background: #f9c74f;
        }

        .fa-user-times {
            color: #e74c3c;
        }
        .action-btn.delete-user:hover .fa-user-times {
            color: white;
        }
        .action-btn.delete-user {
            background: rgba(231, 76, 60, 0.1);
        }
        .action-btn.delete-user:hover {
            background: #e74c3c;
        }

        #admin-avatar {
            background-size: cover;
            background-position: center;
        }
    </style>
</head>
<body>
    <!-- 登录页面 -->
    <div class="login-container" id="loginPage">
        <div class="login-card">
            <div class="login-header">
                <h2>地图标注管理后台</h2>
                <p>管理员登录</p>
            </div>
            <div class="login-body">
                <div class="form-group">
                    <label>用户名</label>
                    <input type="text" class="form-control" id="admin-username" placeholder="请输入管理员用户名">
                </div>
                <div class="form-group">
                    <label>密码</label>
                    <input type="password" class="form-control" id="admin-password" placeholder="请输入密码">
                </div>
                <div class="form-group form-check">
                    <input type="checkbox" class="form-check-input" id="remember">
                    <label class="form-check-label" for="remember">记住我</label>
                </div>
                <button class="btn btn-primary w-100" id="login-btn">登录</button>
            </div>
            <div class="login-footer">
                <p>© 2025 地图标注系统 - 管理员后台</p>
            </div>
        </div>
    </div>
    
    <!-- 管理后台主界面 -->
    <div id="adminPanel" style="display: none; width: 100%;">
        <!-- 侧边导航 -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>标注管理系统</h1>
                <p>管理员后台</p>
            </div>
            
            <div class="sidebar-menu">
                <div class="menu-item active" data-page="dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>仪表盘</span>
                </div>
                <div class="menu-item" data-page="markers">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>标注管理</span>
                </div>
                <div class="menu-item" data-page="users">
                    <i class="fas fa-users"></i>
                    <span>用户管理</span>
                </div>
                <div class="menu-item" id="logout-btn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>退出登录</span>
                </div>
            </div>
        </div>
        
        <!-- 主内容区 -->
        <div class="main-content">
            <!-- 顶部栏 -->
            <div class="topbar">
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="搜索标注、用户...">
                </div>
                
                <div class="user-actions">
                    <div class="user-profile">
                        <div class="user-avatar" id="admin-avatar">A</div>
                        <span id="admin-name">管理员</span>
                    </div>
                </div>
            </div>
            
            <!-- 内容区域 -->
            <div class="content">
                <div class="dashboard-header">
                    <h2>仪表盘</h2>
                    <p>欢迎回来，<span id="welcome-name">管理员</span>！以下是系统概览数据</p>
                </div>
                
                <div class="stats-container">
                    <div class="stat-card">
                        <i class="fas fa-map-marker-alt"></i>
                        <div class="value" id="total-markers">0</div>
                        <div class="label">标注总数</div>
                    </div>
                    <div class="stat-card secondary">
                        <i class="fas fa-users"></i>
                        <div class="value" id="total-users">0</div>
                        <div class="label">注册用户</div>
                    </div>
                    <div class="stat-card warning">
                        <i class="fas fa-calendar-check"></i>
                        <div class="value" id="daily-new-markers">0</div>
                        <div class="label">
                            今日新增
                            <span style="font-size: 0.75rem; color: #6c757d; margin-left: 8px; font-weight: normal;">(标注数量)</span>
                        </div>
                    </div>
                </div>
                
                <!-- 标注管理表格 -->
                <div class="card page-content" id="markers-page">
                    <div class="card-header">
                        <h5 class="card-title">标注管理</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>标题</th>
                                        <th>类型</th>
                                        <th>创建者</th>
                                        <th>联系方式</th>
                                        <th>创建时间</th>
                                        <th>可见时间</th>
                                        <th>状态</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody id="markers-table-body">
                                    <!-- 表格内容将由JavaScript动态填充 -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- User Management Table -->
                <div class="card page-content" id="users-page" style="display: none;">
                    <div class="card-header">
                        <h5 class="card-title">用户管理</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>头像</th>
                                        <th>用户名</th>
                                        <th>邮箱</th>
                                        <th>角色</th>
                                        <th>注册时间</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody id="users-table-body">
                                    <!-- User data here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Marker Modal -->
    <div class="modal fade" id="editMarkerModal" tabindex="-1" aria-labelledby="editMarkerModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editMarkerModalLabel">编辑标注信息</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-marker-form">
                        <input type="hidden" id="edit-marker-id">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit-marker-title">标注标题</label>
                                    <input type="text" class="form-control" id="edit-marker-title" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit-marker-type">活动类型</label>
                                    <select class="form-control" id="edit-marker-type" required>
                                        <option value="personal">个人</option>
                                        <option value="business">企业</option>
                                        <option value="official">官方</option>
                                        <option value="charity">公益</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-marker-description">详细描述</label>
                            <textarea class="form-control" id="edit-marker-description" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-marker-contact">联系方式</label>
                            <input type="text" class="form-control" id="edit-marker-contact">
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit-marker-visibility">可见时间</label>
                                    <select class="form-control" id="edit-marker-visibility">
                                        <option value="today">一日</option>
                                        <option value="three_days">三日</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="edit-marker-status">状态</label>
                                    <select class="form-control" id="edit-marker-status">
                                        <option value="active">正常 (上线)</option>
                                        <option value="inactive">关闭 (下线)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" id="save-marker-changes-btn">保存更改</button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Edit User Modal -->
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editUserModalLabel">编辑用户信息</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="edit-user-form">
                        <input type="hidden" id="edit-user-id">
                        <div class="form-group">
                            <label for="edit-user-name">姓名</label>
                            <input type="text" class="form-control" id="edit-user-name">
                        </div>
                        <div class="form-group">
                            <label for="edit-user-contact">联系方式</label>
                            <input type="text" class="form-control" id="edit-user-contact">
                        </div>
                        <div class="form-group">
                            <label for="edit-user-role">角色</label>
                            <select class="form-control" id="edit-user-role">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" id="save-user-changes-btn">保存更改</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const API_BASE_URL = 'https://user-api.532736720.workers.dev';

        // 管理员登录与数据管理
        const Admin = {
            state: {
                currentAdmin: null,
                markers: [],
                users: [],
                stats: { total_markers: 0, total_users: 0, daily_new_markers: 0 }
            },

            typeMap: {
                personal: '个人',
                business: '企业',
                official: '官方',
                charity: '公益'
            },

            init() {
                this.state.currentAdmin = JSON.parse(sessionStorage.getItem('mapconnect_currentAdmin'));
                this.checkLoginStatus();
                this.attachEventListeners();
            },

            checkLoginStatus() {
                if (this.state.currentAdmin && this.state.currentAdmin.role === 'admin') {
                    this.showAdminPanel();
                } else {
                    this.showLoginPage();
                }
            },

            showLoginPage() {
                document.getElementById('loginPage').style.display = 'flex';
                document.getElementById('adminPanel').style.display = 'none';
            },

            showAdminPanel() {
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'flex';
                
                const admin = this.state.currentAdmin;
                document.getElementById('admin-name').textContent = admin.username;
                document.getElementById('welcome-name').textContent = admin.username;
                
                const avatarCircle = document.getElementById('admin-avatar');
                if (admin.avatar_url) {
                    avatarCircle.style.backgroundImage = `url(${API_BASE_URL}${admin.avatar_url})`;
                    avatarCircle.style.backgroundSize = 'cover';
                    avatarCircle.style.backgroundPosition = 'center';
                    avatarCircle.textContent = '';
                } else {
                    avatarCircle.textContent = admin.username.charAt(0).toUpperCase();
                }
                
                this.fetchData();
                this.switchPage('dashboard');
            },

            attachEventListeners() {
                document.getElementById('login-btn').addEventListener('click', () => this.login());
                document.getElementById('admin-password').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.login();
                });

                document.getElementById('adminPanel').addEventListener('click', (e) => {
                    if (e.target.closest('#logout-btn')) {
                        this.logout();
                    }
                    
                    // Page switching
                    const pageButton = e.target.closest('.menu-item[data-page]');
                    if (pageButton && !pageButton.id) { // Exclude logout button
                        this.switchPage(pageButton.dataset.page);
                    }

                    // Marker actions
                    const editMarkerButton = e.target.closest('.action-btn.edit-marker');
                    if (editMarkerButton) {
                        const markerId = editMarkerButton.closest('tr').dataset.id;
                        this.populateEditModal(markerId);
                    }
                    
                    const deleteMarkerButton = e.target.closest('.action-btn.delete-marker');
                    if (deleteMarkerButton) {
                        const markerId = deleteMarkerButton.closest('tr').dataset.id;
                        if (confirm(`确定要删除ID为 ${markerId} 的标注吗？`)) {
                            this.deleteMarker(markerId);
                        }
                    }

                    // User actions
                    const editUserButton = e.target.closest('.action-btn.edit-user');
                    if (editUserButton) {
                        const userId = editUserButton.closest('tr').dataset.id;
                        this.populateUserEditModal(userId);
                    }

                    const deleteUserButton = e.target.closest('.action-btn.delete-user');
                    if (deleteUserButton) {
                        const userId = deleteUserButton.closest('tr').dataset.id;
                        const username = deleteUserButton.closest('tr').dataset.username;
                        if (confirm(`确定要删除用户 ${username} (ID: ${userId}) 吗？\n警告：该用户的所有标注也将被一并删除！`)) {
                            this.deleteUser(userId);
                        }
                    }
                });
                
                document.getElementById('save-marker-changes-btn').addEventListener('click', () => this.updateMarker());
                document.getElementById('save-user-changes-btn').addEventListener('click', () => this.updateUser());

                const editModalEl = document.getElementById('editMarkerModal');
                editModalEl.addEventListener('hidden.bs.modal', () => {
                    const typeSelect = document.getElementById('edit-marker-type');
                    const defaultOptions = ["personal", "business", "official", "charity"];
                    // 从后往前遍历并移除，避免索引问题
                    for (let i = typeSelect.options.length - 1; i >= 0; i--) {
                        if (!defaultOptions.includes(typeSelect.options[i].value)) {
                            typeSelect.remove(i);
                        }
                    }
                });
            },

            logout() {
                sessionStorage.removeItem('mapconnect_currentAdmin');
                this.state.currentAdmin = null;
                this.showLoginPage();
            },

            switchPage(page) {
                document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

                const targetPage = document.getElementById(`${page}-page`);
                const targetMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
                
                if (targetPage) targetPage.style.display = 'block';
                // The dashboard is a collection of stats, not a specific page div
                if (page === 'dashboard') {
                    document.querySelector('.stats-container').style.display = 'grid';
                } else {
                    document.querySelector('.stats-container').style.display = 'none';
                }
                if (targetMenu) targetMenu.classList.add('active');
            },

            login() {
                const username = document.getElementById('admin-username').value;
                const password = document.getElementById('admin-password').value;
                
                if (!username || !password) return alert('请输入用户名和密码');
                
                fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                })
                .then(res => res.ok ? res.json() : Promise.reject(res.json()))
                .then(user => {
                    if (user.role !== 'admin') throw new Error('非管理员用户');
                    sessionStorage.setItem('mapconnect_currentAdmin', JSON.stringify(user));
                    this.state.currentAdmin = user;
                    this.showAdminPanel();
                })
                .catch(async errPromise => {
                    try {
                        const err = await errPromise;
                        alert(`登录失败: ${err.error || '未知错误'}`);
                    } catch (e) { alert('登录失败，请检查网络或联系支持。'); }
                });
            },

            fetchData() {
                this.fetchStats();
                this.fetchMarkers();
                this.fetchUsers();
            },

            fetchStats() {
                fetch(`${API_BASE_URL}/admin/stats`, {
                    headers: { 'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username) }
                })
                .then(res => res.json()).then(stats => {
                    this.state.stats = stats;
                    this.updateStats();
                }).catch(console.error);
            },
            
            fetchMarkers() {
                fetch(`${API_BASE_URL}/admin/all-markers`, {
                    headers: { 'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username) }
                })
                .then(res => res.json()).then(markers => {
                    this.state.markers = markers;
                    this.renderTable();
                }).catch(console.error);
            },

            fetchUsers() {
                fetch(`${API_BASE_URL}/admin/all-users`, {
                    headers: { 'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username) }
                })
                .then(res => res.json()).then(users => {
                    this.state.users = users;
                    this.renderUsersTable();
                }).catch(console.error);
            },

            updateStats() {
                document.getElementById('total-markers').textContent = this.state.stats.total_markers;
                document.getElementById('total-users').textContent = this.state.stats.total_users;
                document.getElementById('daily-new-markers').textContent = this.state.stats.daily_new_markers || 0;
            },

            renderTable() {
                const tableBody = document.getElementById('markers-table-body');
                tableBody.innerHTML = '';
                
                this.state.markers.forEach(marker => {
                    const row = document.createElement('tr');
                    row.dataset.id = marker.id;
                    const statusClass = marker.status === 'active' ? 'active' : 'inactive';
                    const statusText = marker.status === 'active' ? '正常' : '已关闭';
                    const typeText = this.typeMap[marker.marker_type] || marker.marker_type;
                    
                    // 可见时间映射
                    const visibilityMap = {
                        'today': '一日',
                        'three_days': '三日'
                    };
                    const visibilityText = visibilityMap[marker.visibility] || marker.visibility;
                    
                    row.innerHTML = `
                        <td>#${marker.id}</td>
                        <td>${marker.title}</td>
                        <td>${typeText}</td>
                        <td>${marker.user_username}</td>
                        <td>${marker.contact || '未提供'}</td>
                        <td>${new Date(marker.created_at).toLocaleString()}</td>
                        <td>${visibilityText}</td>
                        <td><span class="status ${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="action-btn edit edit-marker" data-bs-toggle="modal" data-bs-target="#editMarkerModal">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete delete-marker">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            },

            renderUsersTable() {
                const tableBody = document.getElementById('users-table-body');
                tableBody.innerHTML = '';

                this.state.users.forEach(user => {
                    const row = document.createElement('tr');
                    row.dataset.id = user.id;
                    row.dataset.username = user.username;
                    
                    const avatar = user.avatar_url 
                        ? `<img src="${API_BASE_URL}${user.avatar_url}" class="table-avatar" alt="${user.username}">` 
                        : `<div class="table-avatar-initial">${user.username.charAt(0).toUpperCase()}</div>`;

                    row.innerHTML = `
                        <td>#${user.id}</td>
                        <td>${avatar}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td><span class="role ${user.role}">${user.role}</span></td>
                        <td>${new Date(user.created_at).toLocaleString()}</td>
                        <td>
                            <button class="action-btn edit edit-user" data-bs-toggle="modal" data-bs-target="#editUserModal">
                                <i class="fas fa-user-edit"></i>
                            </button>
                            <button class="action-btn delete delete-user">
                                <i class="fas fa-user-times"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            },
            
            populateEditModal(markerId) {
                const marker = this.state.markers.find(m => m.id == markerId);
                if (!marker) return;

                document.getElementById('edit-marker-id').value = marker.id;
                document.getElementById('edit-marker-title').value = marker.title;
                document.getElementById('edit-marker-description').value = marker.description;
                document.getElementById('edit-marker-contact').value = marker.contact || '';
                
                const typeSelect = document.getElementById('edit-marker-type');
                const optionExists = Array.from(typeSelect.options).some(opt => opt.value === marker.marker_type);

                if (!optionExists && marker.marker_type) {
                    const newOption = new Option(marker.marker_type, marker.marker_type, true, true);
                    typeSelect.add(newOption);
                }
                typeSelect.value = marker.marker_type;

                document.getElementById('edit-marker-visibility').value = marker.visibility;
                document.getElementById('edit-marker-status').value = marker.status;
            },

            populateUserEditModal(userId) {
                const user = this.state.users.find(u => u.id == userId);
                if (!user) return;

                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-user-name').value = user.name || '';
                document.getElementById('edit-user-contact').value = user.contact || '';
                document.getElementById('edit-user-role').value = user.role;
            },

            updateMarker() {
                const markerId = document.getElementById('edit-marker-id').value;
                const updatedData = {
                    title: document.getElementById('edit-marker-title').value,
                    description: document.getElementById('edit-marker-description').value,
                    contact: document.getElementById('edit-marker-contact').value,
                    marker_type: document.getElementById('edit-marker-type').value,
                    visibility: document.getElementById('edit-marker-visibility').value,
                    status: document.getElementById('edit-marker-status').value,
                };

                fetch(`${API_BASE_URL}/admin/markers/${markerId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username)
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(res => {
                    if (!res.ok) throw new Error('更新失败');
                    return res.json();
                })
                .then(() => {
                    alert(`标注 #${markerId} 更新成功！`);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editMarkerModal'));
                    if (modal) modal.hide();
                    this.fetchData();
                })
                .catch(err => {
                    alert(err.message);
                });
            },

            updateUser() {
                const userId = document.getElementById('edit-user-id').value;
                const updatedData = {
                    name: document.getElementById('edit-user-name').value,
                    contact: document.getElementById('edit-user-contact').value,
                    role: document.getElementById('edit-user-role').value,
                };

                fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username)
                    },
                    body: JSON.stringify(updatedData)
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.error || '更新失败') });
                    return res.json();
                })
                .then(() => {
                    alert(`用户 #${userId} 更新成功！`);
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
                    if (modal) modal.hide();
                    this.fetchUsers(); // Only fetch users as other data is unchanged
                })
                .catch(err => {
                    alert(err.message);
                });
            },

            deleteMarker(markerId) {
                fetch(`${API_BASE_URL}/admin/markers/${markerId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username) }
                })
                .then(res => {
                    if (!res.ok) throw new Error('删除失败');
                    this.fetchData();
                    alert(`标注 #${markerId} 已成功删除`);
                })
                .catch(err => alert(err.message));
            },

            deleteUser(userId) {
                fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-Username': encodeURIComponent(this.state.currentAdmin.username) }
                })
                .then(res => {
                    if (!res.ok) return res.json().then(err => { throw new Error(err.error || '删除失败') });
                    return res.json();
                })
                .then(data => {
                    this.fetchData(); // Refetch all data as user deletion affects markers and stats
                    alert(data.message || `用户 #${userId} 已成功删除`);
                })
                .catch(err => alert(err.message));
            }
        };

        // 初始化应用
        document.addEventListener('DOMContentLoaded', () => Admin.init());
    </script>
</body>
</html> 
