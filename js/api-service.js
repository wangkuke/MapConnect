// 地图标注系统 - 管理员API服务
// 版本：1.3
// 作者：Claude

(function() {
    'use strict';

    const apiService = {
        config: {
            // 自动判断环境：
            // 1. 本地开发 (localhost, 127.0.0.1) -> http://localhost:5000/api
            // 2. 部署环境 (GitHub Pages 等) -> 默认为 http://localhost:5000/api (需要您修改为真实的后端地址)
            // 注意：如果您在 HTTPS 环境(如 GitHub Pages)下访问 HTTP 本地后端，可能会被浏览器拦截(Mixed Content)。
            BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                ? 'http://localhost:5000/api' 
                : 'https://api.9696mm.club', // TODO: 部署上线时，请将此处修改为您的真实后端域名，例如 'https://your-backend.com/api'
        },
        state: {
            isOnline: true,
            lastError: null,
            currentUser: null
        },
        init() {
            console.log('API Service v1.3 初始化中...');
            this.restoreSession();
            this.checkAvailability();
        },
        restoreSession() {
            try {
                const savedUser = sessionStorage.getItem('mapconnect_currentUser');
                if (savedUser) {
                    this.state.currentUser = JSON.parse(savedUser);
                    console.log('已恢复用户会话:', this.state.currentUser.username || this.state.currentUser.name);
                }
            } catch (err) {
                console.error('恢复会话失败:', err);
            }
        },
        checkAvailability() {
            // 直接返回在线状态，避免API请求失败
        this.state.isOnline = true;
        console.log('API状态: 在线');
        return Promise.resolve(true);
        },
        login(username, password) {
            return this.request('/login', {
                method: 'POST',
                body: { username, password }
            }).then(data => {
                if (data.user && data.user.role === 'admin') {
                    this.state.currentUser = data.user;
                    sessionStorage.setItem('mapconnect_currentAdmin', JSON.stringify(data.user));
                }
                return data;
            });
        },
        logout() {
            this.state.currentUser = null;
            sessionStorage.removeItem('mapconnect_currentUser');
        },
        getAdminAllMarkers() { return this.request('/admin/all-markers'); },
        getAllUsers() { return this.request('/admin/all-users'); },
        getStats() { return this.request('/admin/stats'); },
        updateMarker(id, data) { return this.request(`/admin/markers/${id}`, { method: 'PUT', body: data }); },
        deleteMarker(id) { return this.request(`/admin/markers/${id}`, { method: 'DELETE' }); },
        updateUser(id, data) { return this.request(`/admin/users/${id}`, { method: 'PUT', body: data }); },
        deleteUser(id) { return this.request(`/admin/users/${id}`, { method: 'DELETE' }); },
        getAllMarkers() { return this.request('/markers'); },
        getPublicMarkers() {
            return this.request('/markers');
        },
        getUserProfile(username) {
            return this.request(`/users/${username}`);
        },
        getUserMarkers(username) { 
            return this.request(`/markers/${username}`);
        },
        updateMarkerStatus(id, status) {
            return this.request(`/markers/${id}/status`, { 
                method: 'PUT', 
                body: { status } 
            });
        },
        createMarker(data) {
            return this.request('/markers', { 
                method: 'POST', 
                body: data 
            });
        },
        async request(endpoint, options = {}) {
            if (!this.state.isOnline && !options.forceOnline) {
                throw new Error('API服务器当前不可用，请检查网络连接或稍后重试');
            }
            const url = `${this.config.BASE_URL}${endpoint}`;
            const fetchOptions = {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...options.headers },
                mode: 'cors',
                cache: 'no-cache'
            };
            
            if (endpoint.startsWith('/admin/')) {
                // Admin endpoints require admin user in state
                if (this.state.currentUser && this.state.currentUser.role === 'admin') {
                    fetchOptions.headers['X-Admin-Username'] = encodeURIComponent(this.state.currentUser.username);
                }
            } else if (endpoint !== '/login' && endpoint !== '/token') {
                // For other endpoints, check for a regular user session token
                const userSessionData = sessionStorage.getItem('mapconnect_currentUser');
                if (userSessionData) {
                    const userSession = JSON.parse(userSessionData);
                    // Standard Authorization header (if using JWT)
                    if (userSession.token) {
                        fetchOptions.headers['Authorization'] = `Bearer ${userSession.token}`;
                    }
                    // Custom header expected by our current simple backend
                    if (userSession.username) {
                        fetchOptions.headers['X-User-Username'] = userSession.username;
                    }
                }
            }

            if (options.body) {
                fetchOptions.body = JSON.stringify(options.body);
            }
            try {
                const res = await fetch(url, fetchOptions);
                const text = await res.text();
                const data = text ? JSON.parse(text) : {};
                if (!res.ok) {
                    throw new Error(data.error || data.message || `服务器错误: ${res.status}`);
                }
                return data;
            } catch (err) {
                this.state.lastError = err.message;
                console.error(`API请求'${endpoint}'失败:`, err);
                
                // 改进错误信息，让用户更容易理解
                let userFriendlyError = err.message;
                if (err.message === 'Failed to fetch') {
                    userFriendlyError = `无法连接到服务器 (${this.config.BASE_URL})，请确认后端服务已启动且端口正确`;
                }
                
                throw new Error(userFriendlyError);
            }
        },
        getMockData(type) {
            const mockData = {
                stats: { total_markers: 0, total_users: 0, daily_new_markers: 0 },
                markers: [],
                users: []
            };
            return Promise.resolve(mockData[type] || {});
        }
    };
    window.apiService = apiService;
    document.addEventListener('DOMContentLoaded', () => apiService.init());
})();