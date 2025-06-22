/**
 * 统一的 API 服务模块
 * 负责与后端API的所有通信
 */

// 检查全局API_CONFIG是否已存在，如果不存在则创建
if (typeof window.API_CONFIG === 'undefined') {
    window.API_CONFIG = {
        BASE_URL: 'https://api.9696mm.club'
    };
}

/**
 * 处理 API 响应的通用函数
 * @param {Response} response - fetch 返回的响应对象
 * @returns {Promise<any>} - 解析后的 JSON 数据
 */
async function handleResponse(response) {
    if (response.ok) {
        // 如果响应成功，直接解析JSON
        // 如果响应体为空，也返回一个成功的空对象
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    // 如果响应不成功，获取文本内容以进行调试
    const errorText = await response.text();
    console.error('服务器返回的原始错误响应:', errorText);

    try {
        // 尝试将错误文本解析为JSON
        const err = JSON.parse(errorText);
        // 抛出后端提供的具体错误信息
        throw new Error(err.error || `HTTP 错误，状态码: ${response.status}`);
    } catch (e) {
        // 如果JSON解析失败，或者不是我们预期的错误格式，抛出一个包含原始文本的更通用的错误
        throw new Error(`服务器返回了无效的响应: ${response.status}. 详情: ${errorText}`);
    }
}

/**
 * 创建一个带有认证头和错误处理的 fetch 请求
 * @param {string} endpoint - API 的端点 (例如 /markers)
 * @param {object} options - fetch 请求的选项 (method, body 等)
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, options = {}) {
    const currentUser = JSON.parse(sessionStorage.getItem('mapconnect_currentUser'));

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // 如果是需要身份验证的请求，添加用户名头
    // 在真实应用中，这里应该是更安全的 JWT (Token)
    if (currentUser && currentUser.username) {
        headers['X-User-Username'] = currentUser.username;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
        });
        return handleResponse(response);
    } catch (error) {
        console.error(`API 请求失败: ${options.method || 'GET'} ${endpoint}`, error);
        // 将错误继续向上抛出，以便调用者可以处理
        throw error;
    }
}

// --- 具体的 API 服务函数 ---

const apiService = {
    /**
     * 健康检查
     */
    healthCheck: () => apiFetch('/health'),

    /**
     * 用户注册
     * @param {object} userData - { username, password, email, gender }
     */
    register: (userData) => apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    }),

    /**
     * 用户登录
     * @param {object} credentials - { username, password }
     */
    login: (credentials) => apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    }),

    /**
     * 获取所有公开的标注
     */
    getPublicMarkers: () => apiFetch('/markers'),

    /**
     * 获取指定用户的所有标注
     * @param {string} username - 用户名
     */
    getUserMarkers: (username) => apiFetch(`/markers/${username}`),

    /**
     * 创建一个新的标注
     * @param {object} markerData - 标注数据
     */
    createMarker: (markerData) => apiFetch('/markers', {
        method: 'POST',
        body: JSON.stringify(markerData),
    }),

    /**
     * 更新标注状态
     * @param {string|number} markerId - 标注ID
     * @param {string} status - 新状态 ('active' 或 'inactive')
     */
    updateMarkerStatus: (markerId, status) => apiFetch(`/markers/${markerId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    }),

    /**
     * 删除一个标注
     * @param {string|number} markerId - 标注ID
     */
    deleteMarker: (markerId) => apiFetch(`/markers/${markerId}`, {
        method: 'DELETE',
    }),

    /**
     * 获取用户的公开资料
     * @param {string} username - 用户名
     */
    getUserProfile: (username) => apiFetch(`/users/${username}`),
};

// 地图标注系统 - 管理员API服务
// 版本：1.1
// 作者：Claude

// API服务对象
window.apiService = {
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
        console.log('API Service v1.1 初始化中...');
        // 尝试从sessionStorage恢复会话
        this.restoreSession();
        // 异步检查API可用性，不阻塞后续操作
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
        return fetch(`${this.config.BASE_URL}/health`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        })
        .then(res => {
            this.state.isOnline = res.ok;
            console.log(`API状态: ${this.state.isOnline ? '在线' : '离线'}`);
            return res.ok;
        })
        .catch(err => {
            console.warn('API连接失败:', err);
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
            // 登录成功后，更新当前用户状态
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

    // 获取所有标注
    getAllMarkers() {
        return this.request('/admin/all-markers');
    },
    
    // 获取所有用户
    getAllUsers() {
        return this.request('/admin/users');
    },
    
    // 获取统计数据
    getStats() {
        return this.request('/admin/stats');
    },
    
    // 更新标注
    updateMarker(id, data) {
        return this.request(`/admin/markers/${id}`, {
            method: 'PUT',
            body: data
        });
    },
    
    // 删除标注
    deleteMarker(id) {
        return this.request(`/admin/markers/${id}`, {
            method: 'DELETE'
        });
    },
    
    // 更新用户
    updateUser(id, data) {
        return this.request(`/admin/users/${id}`, {
            method: 'PUT',
            body: data
        });
    },
    
    // 删除用户
    deleteUser(id) {
        return this.request(`/admin/users/${id}`, {
            method: 'DELETE'
        });
    },
    
    // 通用请求方法
    request(endpoint, options = {}) {
        if (!this.state.isOnline && !options.forceOnline) {
            return Promise.reject(new Error('API服务器当前不可用'));
        }
        
        const url = `${this.config.BASE_URL}${endpoint}`;
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            mode: 'cors',
            cache: 'no-cache'
        };
        
        // 登录请求不需要认证头，其他请求需要
        if (endpoint !== '/login' && this.state.currentUser) {
            fetchOptions.headers['X-Admin-Username'] = encodeURIComponent(this.state.currentUser.username);
        }
        
        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        
        return fetch(url, fetchOptions)
            .then(async res => {
                const text = await res.text();
                const data = text ? JSON.parse(text) : {};
                
                if (!res.ok) {
                    throw new Error(data.error || data.message || `服务器返回错误: ${res.status}`);
                }
                return data;
            })
            .catch(err => {
                this.state.lastError = err.message;
                console.error(`API请求'${endpoint}'失败:`, err);
                throw err; // 继续向上抛出错误
            });
    },
    
    // 获取模拟数据（离线模式）
    getMockData(type) {
        const mockData = {
            stats: { total_markers: 0, total_users: 0, daily_new_markers: 0 },
            markers: [],
            users: []
        };
        return Promise.resolve(mockData[type] || {});
    }
};

// 初始化API服务
document.addEventListener('DOMContentLoaded', () => window.apiService.init());

// 导出API服务对象
window.apiService = apiService;
