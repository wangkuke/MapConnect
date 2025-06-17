const App = {
    state: {
        currentAdmin: null,
        markers: [],
        stats: { total_markers: 0, total_users: 0 }
    },

    init() {
        this.state.currentAdmin = JSON.parse(sessionStorage.getItem('mapconnect_currentAdmin'));
        this.router();
        window.addEventListener('hashchange', () => this.router());
    },

    router() {
        const container = document.getElementById('app-container');
        if (this.state.currentAdmin && this.state.currentAdmin.role === 'admin') {
            container.innerHTML = this.AdminPanel();
            this.attachAdminPanelListeners();
            this.fetchData();
        } else {
            container.innerHTML = this.LoginPage();
            this.attachLoginListeners();
        }
    },
    
    // --- API CALLS ---
    fetchData() {
        this.fetchStats();
        this.fetchMarkers();
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

    // --- RENDER METHODS ---
    LoginPage() {
        return `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <h2>地图标注管理后台</h2>
                </div>
                <div class="login-body">
                    <form id="admin-login-form">
                        <div class="mb-3">
                            <label class="form-label">用户名</label>
                            <input type="text" id="admin-username" class="form-control" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">密码</label>
                            <input type="password" id="admin-password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-100">登录</button>
                    </form>
                </div>
            </div>
        </div>`;
    },
    
    AdminPanel() {
        return `
        <div class="main-container">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h1>管理后台</h1>
                </div>
                <div class="sidebar-menu">
                    <div class="menu-item active"><i class="fas fa-tachometer-alt"></i><span>仪表盘</span></div>
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
                    <h2>仪表盘</h2>
                    <div class="row mb-4">
                        <div class="col-md-6"><div class="card p-3"><h4 class="card-title">标注总数</h4><p class="fs-2" id="total-markers">0</p></div></div>
                        <div class="col-md-6"><div class="card p-3"><h4 class="card-title">用户总数</h4><p class="fs-2" id="total-users">0</p></div></div>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <h4 class="card-title">标注管理</h4>
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

    // --- EVENT LISTENERS ---
    attachLoginListeners() {
        document.getElementById('admin-login-form').addEventListener('submit', e => {
            e.preventDefault();
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            fetch('https://user-api.532736720.workers.dev/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            .then(res => res.ok ? res.json() : Promise.reject(res.json()))
            .then(user => {
                if (user.role !== 'admin') throw new Error('非管理员用户');
                sessionStorage.setItem('mapconnect_currentAdmin', JSON.stringify(user));
                this.state.currentAdmin = user;
                this.router();
            })
            .catch(async errPromise => {
                 try {
                    const err = await errPromise;
                    alert(`登录失败: ${err.error || '未知错误'}`);
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
