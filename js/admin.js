// 地图标注系统 - 管理员后台脚本
// 版本：2.2
// 作者：Claude

if (typeof apiService === 'undefined') {
    throw new Error('apiService is not loaded. Make sure api-service.js is included before this script.');
}

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
        this.state.currentAdmin = apiService.state.currentUser;
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
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('admin-password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        document.getElementById('adminPanel').addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('#logout-btn')) {
                this.logout();
                return;
            }
            const pageButton = target.closest('.menu-item[data-page]');
            if (pageButton && !pageButton.id) {
                this.switchPage(pageButton.dataset.page);
                return;
            }
            const actionButton = target.closest('.action-btn');
            if (!actionButton) return;
            const row = actionButton.closest('tr');
            if (!row) return;
            const id = row.dataset.id;
            const username = row.dataset.username;
            if (actionButton.classList.contains('edit-marker')) this.populateEditModal(id);
            else if (actionButton.classList.contains('delete-marker')) {
                if (confirm(`确定要删除ID为 ${id} 的标注吗？`)) this.deleteMarker(id);
            } 
            else if (actionButton.classList.contains('edit-user')) this.populateUserEditModal(id);
            else if (actionButton.classList.contains('delete-user')) {
                if (confirm(`确定要删除用户 ${username} (ID: ${id}) 吗？\n警告：该用户的所有标注也将被一并删除！`)) this.deleteUser(id);
            }
        });
        document.getElementById('save-marker-changes-btn').addEventListener('click', () => this.updateMarker());
        document.getElementById('save-user-changes-btn').addEventListener('click', () => this.updateUser());
    },
    login() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        if (!username || !password) return alert('请输入用户名和密码');
        const loginBtn = document.getElementById('login-btn');
        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        apiService.login(username, password)
            .then(data => {
                const user = data.user;
                if (!user || user.role !== 'admin') throw new Error('非管理员用户或用户角色未定义');
                this.state.currentAdmin = user;
                this.showAdminPanel();
            })
            .catch(error => {
                alert(`登录失败: ${error.message}`);
            })
            .finally(() => {
                loginBtn.disabled = false;
                loginBtn.textContent = originalText;
            });
    },
    logout() {
        apiService.logout();
        this.state.currentAdmin = null;
        this.showLoginPage();
    },
    switchPage(page) {
        document.querySelectorAll('.page-content').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const targetPage = document.getElementById(`${page}-page`);
        const targetMenu = document.querySelector(`.menu-item[data-page="${page}"]`);
        if (targetPage) targetPage.style.display = 'block';
        const statsContainer = document.querySelector('.stats-container');
        if (page === 'dashboard') {
            statsContainer.style.display = 'grid';
            if (!this.state.markers || !this.state.markers.length) this.fetchData();
        } else {
            statsContainer.style.display = 'none';
        }
        if (targetMenu) targetMenu.classList.add('active');
    },
    fetchData() {
        Promise.all([
            apiService.getStats(),
            apiService.getAllMarkers(),
            apiService.getAllUsers()
        ])
        .then(([stats, markers, users]) => {
            this.state.stats = stats;
            this.state.markers = markers;
            this.state.users = users;
            this.updateStats();
            this.renderTable();
            this.renderUsersTable();
        })
        .catch(err => {
            alert(`获取数据失败: ${err.message}`);
            if (confirm('是否切换到离线模式并使用模拟数据？')) this.loadMockData();
        });
    },
    loadMockData() {
        Promise.all([
            apiService.getMockData('stats'),
            apiService.getMockData('markers'),
            apiService.getMockData('users')
        ])
        .then(([stats, markers, users]) => {
            this.state.stats = stats;
            this.state.markers = markers;
            this.state.users = users;
            this.updateStats();
            this.renderTable();
            this.renderUsersTable();
            alert('系统当前处于离线模式，显示的是模拟数据。');
        });
    },
    updateStats() {
        document.getElementById('total-markers').textContent = this.state.stats.total_markers || 0;
        document.getElementById('total-users').textContent = this.state.stats.total_users || 0;
        document.getElementById('daily-new-markers').textContent = this.state.stats.daily_new_markers || 0;
    },
    renderTable() {
        const tableBody = document.getElementById('markers-table-body');
        tableBody.innerHTML = '';
        if (!this.state.markers || !this.state.markers.length) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center">没有找到标注数据</td></tr>`;
            return;
        }
        this.state.markers.forEach(marker => {
            const row = document.createElement('tr');
            row.dataset.id = marker.id;
            const statusClass = marker.status === 'active' ? 'active' : 'inactive';
            const statusText = marker.status === 'active' ? '正常' : '已关闭';
            const typeText = this.typeMap[marker.marker_type] || marker.marker_type;
            const visibilityMap = { 'today': '一日', 'three_days': '三日' };
            const visibilityText = visibilityMap[marker.visibility] || marker.visibility;
            row.innerHTML = `
                <td>#${marker.id}</td>
                <td>${marker.title}</td>
                <td>${typeText}</td>
                <td>${marker.user_username || 'N/A'}</td>
                <td>${marker.contact || '未提供'}</td>
                <td>${new Date(marker.created_at).toLocaleString()}</td>
                <td>${visibilityText}</td>
                <td><span class="status ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn edit edit-marker" data-bs-toggle="modal" data-bs-target="#editMarkerModal"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete delete-marker"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    },
    renderUsersTable() {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (!this.state.users || !this.state.users.length) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center">没有找到用户数据</td></tr>`;
            return;
        }
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
                    <button class="action-btn edit edit-user" data-bs-toggle="modal" data-bs-target="#editUserModal"><i class="fas fa-user-edit"></i></button>
                    <button class="action-btn delete delete-user"><i class="fas fa-user-times"></i></button>
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
        document.getElementById('edit-marker-type').value = marker.marker_type;
        document.getElementById('edit-marker-visibility').value = marker.visibility;
        document.getElementById('edit-marker-status').value = marker.status;
    },
    populateUserEditModal(userId) {
        const user = this.state.users.find(u => u.id == userId);
        if (!user) return;
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-user-name').value = user.username || '';
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
        apiService.updateMarker(markerId, updatedData)
            .then(() => {
                alert(`标注 #${markerId} 更新成功！`);
                bootstrap.Modal.getInstance(document.getElementById('editMarkerModal'))?.hide();
                this.fetchData();
            })
            .catch(err => alert(`更新失败: ${err.message}`));
    },
    updateUser() {
        const userId = document.getElementById('edit-user-id').value;
        const updatedData = {
            username: document.getElementById('edit-user-name').value,
            contact: document.getElementById('edit-user-contact').value,
            role: document.getElementById('edit-user-role').value,
        };
        apiService.updateUser(userId, updatedData)
            .then(() => {
                alert(`用户 #${userId} 更新成功！`);
                bootstrap.Modal.getInstance(document.getElementById('editUserModal'))?.hide();
                this.fetchData();
            })
            .catch(err => alert(`更新失败: ${err.message}`));
    },
    deleteMarker(markerId) {
        apiService.deleteMarker(markerId)
            .then(() => {
                alert(`标注 #${markerId} 已成功删除`);
                this.fetchData();
            })
            .catch(err => alert(`删除失败: ${err.message}`));
    },
    deleteUser(userId) {
        apiService.deleteUser(userId)
            .then(data => {
                alert(data.message || `用户 #${userId} 已成功删除`);
                this.fetchData();
            })
            .catch(err => alert(`删除失败: ${err.message}`));
    }
};

document.addEventListener('DOMContentLoaded', () => Admin.init());
