// 地图标注系统 - 管理员API服务
// 版本：1.3
// 作者：Claude

(function() {
    'use strict';

    const apiService = {
        config: {
            BASE_URL: 'https://api.9696mm.club',
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
                const savedUser = sessionStorage.getItem('mapconnect_currentAdmin');
                if (savedUser) {
                    this.state.currentUser = JSON.parse(savedUser);
                    console.log('已恢复管理员会话:', this.state.currentUser.username);
                }
            } catch (err) {
                console.error('恢复会话失败:', err);
            }
        },
        checkAvailability() {
            // Ping根URL，因为它比/health更可能存在
            return fetch(this.config.BASE_URL, { method: 'GET', mode: 'cors', cache: 'no-cache' })
                .then(res => {
                    this.state.isOnline = res.ok;
                    console.log(`API状态: ${this.state.isOnline ? '在线' : '离线'}`);
                    return res.ok;
                })
                .catch(err => {
                    console.warn('API连接失败:', err.message);
                    this.state.isOnline = false;
                    this.state.lastError = err.message;
                    return false;
                });
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
            sessionStorage.removeItem('mapconnect_currentAdmin');
        },
        getAllMarkers: () => apiService.request('/admin/all-markers'),
        getAllUsers: () => apiService.request('/admin/users'),
        getStats: () => apiService.request('/admin/stats'),
        updateMarker: (id, data) => apiService.request(`/admin/markers/${id}`, { method: 'PUT', body: data }),
        deleteMarker: (id) => apiService.request(`/admin/markers/${id}`, { method: 'DELETE' }),
        updateUser: (id, data) => apiService.request(`/admin/users/${id}`, { method: 'PUT', body: data }),
        deleteUser: (id) => apiService.request(`/admin/users/${id}`, { method: 'DELETE' }),
        getPublicMarkers: () => apiService.request('/markers'),
        getUserProfile: (username) => apiService.request(`/users/${username}`),
        createMarker: (data) => apiService.request('/markers', { method: 'POST', body: data }),
        async request(endpoint, options = {}) {
            if (!this.state.isOnline && !options.forceOnline) {
                throw new Error('API服务器当前不可用');
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
                    if (userSession.token) {
                        fetchOptions.headers['Authorization'] = `Bearer ${userSession.token}`;
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
                throw err;
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
