/**
 * 统一的 API 服务模块
 * 负责与后端API的所有通信
 */

// 原 Cloudflare Workers 地址
// const API_BASE_URL = 'https://user-api.532736720.workers.dev';

// 新的自定义域名 API 地址
const API_BASE_URL = 'https://api.9696mm.club';

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
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
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
    deleteMarker: (markerId) => apiFetch(`
