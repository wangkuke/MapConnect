alert('正在运行 js/admin.js 版本 v2.0');

const App = {
    state: {
        currentAdmin: null,
        markers: [],
        stats: { total_markers: 0, total_users: 0 },
        users: []
    },

    init() {
        this.state.currentAdmin = JSON.parse(sessionStorage.getItem('mapconnect_currentAdmin'));
        this.router();
        window.addEventListener('hashchange', () => this.router());
    },

    router() {
        const container = document.getElementById('app-container');
        // 清空容器
        container.innerHTML = '';

        if (!this.state.currentAdmin || this.state.currentAdmin.role !== 'admin') {
            const loginPageElement = this.LoginPage();
            container.appendChild(loginPageElement);
            this.attachLoginListeners();
            return;
        }

        const adminPanelElement = this.AdminPanel();
        // 因为 AdminPanel 仍然返回字符串，所以这里用 innerHTML
        container.innerHTML = adminPanelElement; 
        this.attachAdminPanelListeners();

        const hash = window.location.hash || '#dashboard';

        // 根据 hash 决定获取什么数据
        if (hash === '#dashboard') {
            this.fetchStats();
            this.fetchMarkers();
        } else if (hash === '#users') {
            this.fetchUsers();
        }
    },
    
    // --- API CALLS ---
    fetchData() {
        // 这个函数现在可以被 router 精确控制，暂时保留或移除
    },

    fetchStats() {
        fetch('https://user-api.532736720.workers.dev/admin/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.currentAdmin.token}`
            }
        })
        .then(res => res.json())
        .then(stats => {
            this.state.stats = stats;
            this.updateStats();
        })
        .catch(console.error);
    },
    
    fetchMarkers() {
        fetch('https://user-api.532736720.workers.dev/admin/all-markers', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.currentAdmin.token}`
            }
        })
        .then(res => res.json())
        .then(markers => {
            this.state.markers = markers;
            this.renderTable();
        })
        .catch(console.error);
    },

    fetchUsers() {
        fetch('https://user-api.532736720.workers.dev/admin/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(res => res.json())
        .then(users => {
            this.state.users = users;
            this.renderUsersTable();
        })
        .catch(console.error);
    },

    // --- RENDER METHODS ---
    LoginPage() {
        const container = document.createElement('div');
        container.className = 'login-container';

        const card = document.createElement('div');
        card.className = 'login-card';
        
        const header = document.createElement('div');
        header.className = 'login-header';
        header.innerHTML = '<h2>地图标注管理后台</h2>';
        
        const body = document.createElement('div');
        body.className = 'login-body';
        
        const form = document.createElement('form');
        form.id = 'admin-login-form';
        
        form.innerHTML = `
            <div class="mb-3">
                <label class="form-label">用户名</label>
                <input type="text" id="admin-username" class="form-control" required>
            </div>
            <div class="mb-3">
                <label class="form-label">密码</label>
                <input type="password" id="admin-password" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-primary w-100">登录</button>
        `;
        
        body.appendChild(form);
        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
        
        // 返回一个 DOM 元素而不是字符串
        return container;
    },
    
    AdminPanel() {
        const hash = window.location.hash || '#dashboard';

        const dashboardContent = `
            <h2>仪表盘</h2>
            <div class="row mb-4">
                <div class="col-md-6"><div class="card p-3"><h4 class="card-title">标注总数</h4><p class="fs-2" id="total-markers">0</p></div></div>
                <div class="col-md-6"><div class="card p-3"><h4 class="card-title">用户总数</h4><p class="fs-2" id="total-users">0</p></div></div>
            </div>
            <div class="card">
                <div class="card-body">
                    <h4 class="card-title">最新标注</h4>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr><th>ID</th><th>标题</th><th>发布者</th><th>类型</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
                            </thead>
                            <tbody id="markers-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const usersContent = `
            <h2>用户管理</h2>
            <div class="card">
                <div class="card-body">
                    <h4 class="card-title">用户列表</h4>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr><th>ID</th><th>用户</th><th>邮箱</th><th>注册方式</th><th>注册时间</th><th>操作</th></tr>
                            </thead>
                            <tbody id="users-table-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        return `
        <div class="main-container">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h1>管理后台</h1>
                </div>
                <div class="sidebar-menu">
                    <a href="#dashboard" class="menu-item ${hash === '#dashboard' ? 'active' : ''}"><i class="fas fa-tachometer-alt"></i><span>仪表盘</span></a>
                    <a href="#users" class="menu-item ${hash === '#users' ? 'active' : ''}"><i class="fas fa-users"></i><span>用户管理</span></a>
                    <div class="menu-item" id="logout-btn"><i class="fas fa-sign-out-alt"></i><span>退出登录</span></div>
                </div>
            </div>
            <div class="main-content">
                <div class="topbar">
                    <div class="user-profile">
                        <div class="user-avatar">${this.state.currentAdmin.username.charAt(0).toUpperCase()}</div>
                        <span>${this.state.currentAdmin.username}</span>
                    </div>
                </div>
                <div class="content">
                    ${hash === '#users' ? usersContent : dashboardContent}
                </div>
            </div>
        </div>`;
    },
    
    updateStats() {
        document.getElementById('total-markers').textContent = this.state.stats.total_markers;
        document.getElementById('total-users').textContent = this.state.stats.total_users;
    },

    renderTable() {
        const tableBody = document.getElementById('markers-table-body');
        tableBody.innerHTML = this.state.markers.map(marker => `
            <tr>
                <td>${marker.id}</td>
                <td>${marker.title}</td>
                <td>${marker.user_username}</td>
                <td>${marker.marker_type}</td>
                <td><span class="status ${marker.status}">${marker.status}</span></td>
                <td>${new Date(marker.created_at).toLocaleString()}</td>
                <td><button class="btn btn-danger btn-sm" data-id="${marker.id}">删除</button></td>
            </tr>
        `).join('');
    },

    renderUsersTable() {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = this.state.users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <img src="${user.avatar_url || 'https://via.placeholder.com/40'}" alt="avatar" width="40" height="40" class="rounded-circle me-2">
                    ${user.name || user.username}
                </td>
                <td>${user.email}</td>
                <td>${user.registration_method || 'email'}</td>
                <td>${new Date(user.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-primary btn-sm" data-id="${user.id}">编辑</button>
                    <button class="btn btn-danger btn-sm" data-id="${user.id}">删除</button>
                </td>
            </tr>
        `).join('');
    },

    // --- EVENT LISTENERS ---
    attachLoginListeners() {
        document.getElementById('admin-login-form').addEventListener('submit', e => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            const apiUrl = 'https://user-api.532736720.workers.dev/login';

            // --- 调试代码 ---
            console.log('即将发送登录请求到:', apiUrl);
            // --- 调试代码结束 ---

            // 确保登录请求发送到正确的线上API
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.ok ? res.json() : Promise.reject(res.json()))
            .then(data => {
                const user = data.user; 
                if (!user || user.role !== 'admin') {
                    throw new Error('非管理员用户或用户角色未定义');
                }
                sessionStorage.setItem('mapconnect_currentAdmin', JSON.stringify(user));
                this.state.currentAdmin = user;
                this.router();
            })
            .catch(async errPromise => {
                 try {
                    const err = await errPromise;
                    alert(`登录失败: ${err.error || err.message || '未知错误'}`);
                } catch (e) {
                    alert('登录失败，请检查网络或联系支持。');
                }
            });
        });
    },

    attachAdminPanelListeners() {
        document.getElementById('logout-btn').addEventListener('click', () => {
            sessionStorage.removeItem('mapconnect_currentAdmin');
            this.state.currentAdmin = null;
            this.router();
        });

        document.getElementById('markers-table-body').addEventListener('click', e => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.id) {
                const markerId = e.target.dataset.id;
                if (confirm(`确定要删除ID为 ${markerId} 的标注吗？`)) {
                    this.deleteMarker(markerId);
                }
            }
        });
    },
    
    deleteMarker(markerId) {
        fetch(`https://user-api.532736720.workers.dev/admin/markers/${markerId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.state.currentAdmin.token}`
            }
        })
        .then(res => {
            if (!res.ok) throw new Error('删除失败');
            this.fetchData();
        })
        .catch(err => alert(err.message));
    }
};

document.addEventListener('DOMContentLoaded', () => App.init()); 
