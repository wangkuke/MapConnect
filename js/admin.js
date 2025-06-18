// 地图标注系统 - 管理员后台脚本
// 版本：2.0
// 作者：Claude

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
        // 从 sessionStorage 恢复登录状态
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
            avatarCircle.style.backgroundImage = `url(${admin.avatar_url})`;
            avatarCircle.textContent = '';
        } else {
            avatarCircle.textContent = admin.username.charAt(0).toUpperCase();
        }
        
        this.fetchData();
        this.switchPage('dashboard');
    },

    attachEventListeners() {
        // 登录按钮事件
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('admin-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // 管理面板事件委托
        document.getElementById('adminPanel').addEventListener('click', (e) => {
            // 登出按钮
            if (e.target.closest('#logout-btn')) {
                this.logout();
            }
            
            // 页面切换
            const pageButton = e.target.closest('.menu-item[data-page]');
            if (pageButton && !pageButton.id) { // 排除登出按钮
                this.switchPage(pageButton.dataset.page);
            }

            // 标注操作
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

            // 用户操作
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
        
        // 保存更改按钮
        document.getElementById('save-marker-changes-btn').addEventListener('click', () => this.updateMarker());
        document.getElementById('save-user-changes-btn').addEventListener('click', () => this.updateUser());
    },

    login() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        
        if (!username || !password) return alert('请输入用户名和密码');
        
        console.log('即将发送登录请求到:', `${API_BASE_URL}/login`);
        
        fetch(`${API_BASE_URL}/login`, {
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
            this.showAdminPanel();
        })
        .catch(async errPromise => {
            try {
                const err = await errPromise;
                alert(`登录失败: ${err.error || err.message || '未知错误'}`);
            } catch (e) {
                alert('登录失败，请检查网络或联系支持。');
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
        // 仪表盘是一组统计信息，而不是特定的页面div
        if (page === 'dashboard') {
            document.querySelector('.stats-container').style.display = 'grid';
        } else {
            document.querySelector('.stats-container').style.display = 'none';
        }
        if (targetMenu) targetMenu.classList.add('active');
    },

    fetchData() {
        this.fetchStats();
        this.fetchMarkers();
        this.fetchUsers();
    },

    fetchStats() {
        fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'X-Admin-Username': this.state.currentAdmin.username }
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error || '获取统计数据失败') });
            return res.json();
        }).then(stats => {
            this.state.stats = stats;
            this.updateStats();
        }).catch(err => alert(err.message));
    },
    
    fetchMarkers() {
        fetch(`${API_BASE_URL}/admin/all-markers`, {
            headers: { 'X-Admin-Username': this.state.currentAdmin.username }
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error || '获取标注失败') });
            return res.json();
        }).then(markers => {
            this.state.markers = markers;
            this.renderTable();
        }).catch(err => alert(err.message));
    },

    fetchUsers() {
        fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'X-Admin-Username': this.state.currentAdmin.username }
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error || '获取用户失败') });
            return res.json();
        }).then(users => {
            this.state.users = users;
            this.renderUsersTable();
        }).catch(err => alert(err.message));
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
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.state.users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.id = user.id;
            row.dataset.username = user.username;
            
            const avatar = user.avatar_url 
                ? `<img src="${user.avatar_url}" class="table-avatar" alt="${user.username}">` 
                : `<div class="table-avatar-initial">${user.username.charAt(0).toUpperCase()}</div>`;

            row.innerHTML = `
                <td>#${user.id}</td>
                <td>${avatar}</td>
                <td>${user.username}</td>
                <td>${user.email || '未提供'}</td>
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
            this.fetchUsers(); // 只更新用户数据，其他数据保持不变
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
            this.fetchData(); // 重新获取所有数据，因为用户删除会影响标注和统计
            alert(data.message || `用户 #${userId} 已成功删除`);
        })
        .catch(err => alert(err.message));
    }
};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => Admin.init()); 
