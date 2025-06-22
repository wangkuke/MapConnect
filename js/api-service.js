// 地图标注系统 - 管理员API服务
// 版本：1.2
// 作者：Claude

(function() {
    'use strict';

    // API服务对象
    const apiService = {
        // API配置
        config: {
            BASE_URL: 'https://api.9696mm.club',
            FALLBACK_URL: 'https://user-api.532736720.workers.dev'
        },
        
        // 当前状态
        state: {
            isOnline: true,
            lastError: null,
            currentUser: null
        },
        
        // 初始化
        init() {
            console.log('API Service v1.2 初始化中...');
            this.restoreSession();
            this.checkAvailability();
        },
        
        // 恢复会话
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
        
        // 检查API可用性
        checkAvailability() {
            // 我们将ping根目录，因为它比/health更可能存在
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
        
        // 登录
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
        
        // 登出
        logout() {
            this.state.currentUser = null;
            sessionStorage.removeItem('mapconnect_currentAdmin');
        },

        // API请求
        getAllMarkers: () => apiService.request('/admin/all-markers'),
        getAllUsers: () => apiService.request('/admin/users'),
        getStats: () => apiService.request('/admin/stats'),
        updateMarker: (id, data) => apiService.request(`/admin/markers/${id}`, { method: 'PUT', body: data }),
        deleteMarker: (id) => apiService.request(`/admin/markers/${id}`, { method: 'DELETE' }),
        updateUser: (id, data) => apiService.request(`/admin/users/${id}`, { method: 'PUT', body: data }),
        deleteUser: (id) => apiService.request(`/admin/users/${id}`, { method: 'DELETE' }),
        
        // 通用请求方法
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
            
            if (endpoint !== '/login' && this.state.currentUser) {
                fetchOptions.headers['X-Admin-Username'] = encodeURIComponent(this.state.currentUser.username);
            }
            
            if (options.body) {
                fetchOptions.body = JSON.stringify(options.body);
            }
            
            try {
                const res = await fetch(url, fetchOptions);
                const text = await res.text();
                // 允许空的JSON响应
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
        
        // 获取模拟数据
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
