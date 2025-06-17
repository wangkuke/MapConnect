// 初始化地图
const map = L.map('map').setView([31.2304, 121.4737], 13);

// 添加地图图层
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let userLocationMarker = null;

// --- NEW UNIFIED ICON SYSTEM ---
const iconMap = {
    personal: 'fa-user',
    business: 'fa-briefcase',
    official: 'fa-landmark',
    charity: 'fa-hand-holding-heart'
};

const createIcon = (type) => {
    const iconClass = iconMap[type] || 'fa-map-marker-alt';
    return L.divIcon({
        html: `<i class="fas ${iconClass}"></i>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        className: `marker-icon ${type}`
    });
};
// --- END OF NEW SYSTEM ---

function displayMarkers(markers) {
    const markersContainer = document.querySelector('.markers-container');
    // Clear existing static markers, keeping the title
    markersContainer.innerHTML = '<h2><i class="fas fa-map-pin"></i> 附近标注</h2>'; 

    if (!markers || markers.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = '附近还没有任何标注，快去创建一个吧！';
        emptyMessage.style.padding = '20px';
        emptyMessage.style.textAlign = 'center';
        markersContainer.appendChild(emptyMessage);
        return;
    }

    markers.forEach(marker => {
        const markerType = marker.marker_type;
        const icon = createIcon(markerType);
        
        // Add marker to map with popup
        const popupIconClass = iconMap[markerType] || 'fa-map-marker-alt';
        const popupContent = `
            <div class="popup-header" style="display: flex; align-items: center; margin-bottom: 10px;">
                <i class="fas ${popupIconClass}" style="font-size: 1.5rem; color: var(--primary); margin-right: 10px;"></i>
                <h3 style="font-size: 1.2rem; margin:0;">${marker.title}</h3>
            </div>
            <p style="margin-bottom: 15px; line-height: 1.5;">${marker.description}</p>
            <div style="display:flex; justify-content: space-between; align-items:center;">
                <p style="margin:0; font-size: 0.9rem;">创建者: <a href="#" onclick="event.preventDefault(); showUserProfileModal('${marker.user_username}')" style="color: var(--primary); font-weight: 600; text-decoration: none;">${marker.user_name || marker.user_username}</a></p>
                <button class="contact-btn" style="padding:5px 12px; font-size:0.8rem;" onclick="alert('联系方式: ${marker.contact || '未提供'}')">获取联系方式</button>
            </div>
        `;
        
        L.marker([marker.lat, marker.lng], {icon: icon})
            .addTo(map)
            .bindPopup(popupContent);

        // Add marker card to side panel
        const card = document.createElement('div');
        card.className = 'marker-card';
        card.innerHTML = `
            <h3><i class="fas ${popupIconClass}"></i> ${marker.title}</h3>
            <p>${marker.description}</p>
            <div class="marker-footer">
                <div class="marker-user">
                    <a href="#" onclick="event.preventDefault(); showUserProfileModal('${marker.user_username}')" title="查看 ${marker.user_name || marker.user_username} 的资料">
                        <span>${(marker.user_name || marker.user_username).charAt(0).toUpperCase()}</span>
                    </a>
                </div>
                <button class="contact-btn" onclick="alert('联系方式: ${marker.contact || '未提供'}')">联系</button>
            </div>
        `;
        // Add click event to fly to the marker on the map
        card.addEventListener('click', () => {
            map.flyTo([marker.lat, marker.lng], 15);
        });
        markersContainer.appendChild(card);
    });
}

// 添加标注按钮事件
document.getElementById('add-marker-btn').addEventListener('click', function() {
    window.location.href = 'marker-editor.html';
});

// 定位按钮事件
document.getElementById('locate-btn').addEventListener('click', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newLatLng = L.latLng(lat, lng);

                map.setView(newLatLng, 16);

                if (userLocationMarker) {
                    userLocationMarker.setLatLng(newLatLng);
                } else {
                    userLocationMarker = L.marker(newLatLng, {
                        icon: L.divIcon({
                            className: 'user-location-marker-container',
                            html: '<div class="user-location-marker-pulse"></div><div class="user-location-marker"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(map);
                }
            },
            function() {
                alert('无法获取您的位置。请检查浏览器设置并允许位置访问。');
            }
        );
    } else {
        alert('您的浏览器不支持地理定位功能。');
    }
});

// 联系按钮事件
document.querySelectorAll('.contact-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        window.location.href = 'messages.html';
    });
});

// 功能卡片点击事件
document.querySelectorAll('.func-card').forEach(card => {
    card.addEventListener('click', function() {
        const title = this.querySelector('h3').textContent;
        
        switch(title) {
            case "添加标注":
                window.location.href = 'marker-editor.html';
                break;
            case "我的球友":
                window.location.href = 'messages.html';
                break;
            case "个人设置":
                window.location.href = 'user-system.html#profile';
                break;
            case "我的标注":
                window.location.href = 'my-markers.html';
                break;
        }
    });
});

// 搜索框点击事件
document.querySelector('.search-container').addEventListener('click', function() {
    window.location.href = 'marker-search.html';
});

// 用户区域点击事件
document.querySelector('.user-area').addEventListener('click', function() {
    window.location.href = 'user-system.html';
});

// 平滑滚动效果
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 页面加载时检查登录状态并获取标注
window.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(sessionStorage.getItem('mapconnect_currentUser'));
    const userArea = document.getElementById('user-area');
    const userAvatar = document.getElementById('user-avatar');
    const userNameEl = document.getElementById('user-name');
    const userStatusEl = document.getElementById('user-status');

    if (currentUser) {
        // 增加一个检查，确保我们处理的是正确的用户对象
        const user = currentUser.user || currentUser;

        // 用户已登录
        userNameEl.textContent = `${user.name || user.username}`;
        
        if(user.avatar_url) {
            // 注释掉本地服务器路径，改为条件检查
            // 如果头像URL是完整路径则直接使用，否则显示默认头像
            if(user.avatar_url.startsWith('http')) {
                userAvatar.style.backgroundImage = `url(${user.avatar_url})`;
            } else {
                // 默认显示首字母
                userAvatar.textContent = user.username.charAt(0).toUpperCase();
            }
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
        } else {
            userAvatar.textContent = user.username.charAt(0).toUpperCase();
        }
        
        const welcomeText = '欢迎回来！';
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = '退出登录';
        logoutLink.style.color = 'var(--primary)';
        logoutLink.style.textDecoration = 'none';
        logoutLink.style.marginLeft = '10px';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            sessionStorage.removeItem('mapconnect_currentUser');
            alert('您已成功退出。');
            window.location.reload();
        };

        userStatusEl.textContent = welcomeText;
        userStatusEl.appendChild(logoutLink);

        userArea.onclick = () => window.location.href = 'user-system.html#profile';
    } else {
        // 用户未登录
        userAvatar.textContent = 'Hi';
        userNameEl.textContent = '登录 / 注册';
        userStatusEl.textContent = '点击以加入我们';
        userArea.onclick = () => window.location.href = 'user-system.html';
    }

    // 加载标记，使用增强版的API请求函数
    loadMarkers();
});

// --- User Profile Modal Logic ---

const modal = document.getElementById('profile-modal');
const modalOverlay = document.getElementById('profile-modal-overlay');

// 定义API基础URL和后备URL
const API_PRIMARY_URL = 'https://user-api.532736720.workers.dev';
let BACKUP_API_URL = 'https://backup-api.532736720.workers.dev'; // 默认备用API，通过健康检查接口可能会更新
let CURRENT_API_URL = API_PRIMARY_URL;
let apiHealthy = true;

// API健康检查函数
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_PRIMARY_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // 设置较短的超时时间
            signal: AbortSignal.timeout(3000) // 3秒超时
        });
        
        if (response.ok) {
            const data = await response.json();
            apiHealthy = data.status === 'ok';
            CURRENT_API_URL = API_PRIMARY_URL;
            
            // 检查服务器是否提供了备份API地址
            if (data.backup_api_url && data.backup_api_url !== BACKUP_API_URL) {
                console.log('从服务器获取到新的备份API地址:', data.backup_api_url);
                BACKUP_API_URL = data.backup_api_url;
            }
            
            console.log('API健康状态:', data.status);
            return true;
        } else {
            apiHealthy = false;
            // 尝试切换到备用API
            CURRENT_API_URL = BACKUP_API_URL;
            console.warn('API健康检查失败，状态码:', response.status);
            return false;
        }
    } catch (error) {
        apiHealthy = false;
        console.error('API健康检查出错:', error);
        // 切换到备用API
        CURRENT_API_URL = BACKUP_API_URL;
        return false;
    }
}

// 增强版API请求函数，带有重试和错误处理
async function fetchWithRetry(url, options = {}, retries = 2) {
    try {
        const response = await fetch(url, {
            ...options,
            // 设置合理的超时时间
            signal: options.signal || AbortSignal.timeout(10000) // 10秒超时
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`API请求失败，正在重试 (${retries}次重试剩余):`, error);
            // 短暂延迟后重试
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        // 如果是主API且健康检查失败，尝试备用API
        if (url.startsWith(API_PRIMARY_URL) && !await checkApiHealth()) {
            // 切换到备用API并重试请求
            const backupUrl = url.replace(API_PRIMARY_URL, BACKUP_API_URL);
            console.log('尝试使用备用API:', backupUrl);
            return fetch(backupUrl, options);
        }
        
        // 所有重试和备用API都失败，显示友好的错误消息
        displayApiErrorMessage();
        throw error;
    }
}

// 显示API错误消息
function displayApiErrorMessage() {
    // 检查是否已经显示了错误消息
    if (document.getElementById('api-error-message')) {
        return;
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'api-error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #ffcccc;
        color: #cc0000;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        text-align: center;
        max-width: 80%;
    `;
    
    errorDiv.innerHTML = `
        <p><strong>服务器连接失败</strong></p>
        <p>我们无法连接到服务器。请检查您的网络连接或稍后再试。</p>
        <button id="retry-api-btn" style="
            background-color: #cc0000;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 10px;
        ">重试</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // 添加重试按钮事件
    document.getElementById('retry-api-btn').addEventListener('click', async () => {
        errorDiv.style.display = 'none';
        if (await checkApiHealth()) {
            errorDiv.remove();
            // 重新加载标记
            loadMarkers();
        } else {
            errorDiv.style.display = 'block';
        }
    });
}

// 启动时检查API健康状态
checkApiHealth().then(healthy => {
    if (!healthy) {
        console.warn('API健康检查失败，将在使用时提供后备方案');
    }
});

// 修改原有的标记加载函数
function loadMarkers() {
    fetchWithRetry(`${CURRENT_API_URL}/markers`)
        .then(response => response.json())
        .then(markers => {
            displayMarkers(markers);
        })
        .catch(error => {
            console.error('获取标记时出错:', error);
            const markersContainer = document.querySelector('.markers-container');
            // Clear existing static markers, keeping the title
            markersContainer.innerHTML = '<h2><i class="fas fa-map-pin"></i> 附近标注</h2>';
            const errorMessage = document.createElement('p');
            errorMessage.textContent = '加载标注失败。请确保后端服务正在运行，并刷新页面。';
            errorMessage.style.color = 'red';
            errorMessage.style.padding = '20px';
            errorMessage.style.textAlign = 'center';
            markersContainer.appendChild(errorMessage);
        });
}

function showUserProfileModal(username) {
    modal.innerHTML = `<div class="loading">正在加载用户资料...</div>`;
    modal.classList.add('active');
    modalOverlay.classList.add('active');

    fetchWithRetry(`${CURRENT_API_URL}/users/${username}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) throw new Error('用户不存在');
                throw new Error('加载失败');
            }
            return response.json();
        })
        .then(user => {
            const joinedDate = new Date(user.created_at).toLocaleDateString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            const avatarContent = user.avatar_url ? '' : (user.name || user.username).charAt(0).toUpperCase();
            const avatarStyle = user.avatar_url ? `background-image: url(${user.avatar_url.startsWith('http') ? user.avatar_url : CURRENT_API_URL + user.avatar_url});` : '';

            const displayName = user.name || user.username; // Fallback to username if name is not set

            let genderIcon = 'fa-question-circle';
            let genderText = '保密';
            if (user.gender === 'male') {
                genderIcon = 'fa-mars';
                genderText = '男';
            } else if (user.gender === 'female') {
                genderIcon = 'fa-venus';
                genderText = '女';
            } else if (user.gender === 'other') {
                genderIcon = 'fa-transgender-alt';
                genderText = '其他';
            }

            const ageText = user.age ? `${user.age}岁` : '年龄保密';

            modal.innerHTML = `
                <button class="profile-modal-close-btn" onclick="closeUserProfileModal()">&times;</button>
                <div class="profile-modal-content">
                    <div class="avatar" style="${avatarStyle}">${avatarContent}</div>
                    <h2 class="name">${displayName}</h2>
                    
                    <div class="user-details">
                        <span class="detail-item">
                            <i class="fas ${genderIcon}"></i> ${genderText}
                        </span>
                        <span class="detail-item">
                            <i class="fas fa-birthday-cake"></i> ${ageText}
                        </span>
                    </div>

                    <p class="bio">${user.bio || '还没有个人简介'}</p>
                    <p class="joined-date">
                        <i class="fas fa-calendar-alt"></i>
                        于 ${joinedDate} 加入
                    </p>
                </div>
            `;
        })
        .catch(error => {
            modal.innerHTML = `
                <button class="profile-modal-close-btn" onclick="closeUserProfileModal()">&times;</button>
                <div class="error">${error.message}</div>
            `;
        });
}

function closeUserProfileModal() {
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
}

modalOverlay.addEventListener('click', closeUserProfileModal);

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && modal.classList.contains('active')) {
        closeUserProfileModal();
    }
});

function updateDisplayMarker(markerId, latitude, longitude, note, type, images) {
    if (!note) note = ''; // 确保note不是undefined或null
    
    // 请求后端更新标记
    fetchWithRetry(`${CURRENT_API_URL}/markers/${markerId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            latitude,
            longitude,
            note,
            marker_type: type,
            images
        })
    })
    .then(response => response.json())
    .then(updatedMarker => {
        console.log('标记已更新:', updatedMarker);
        
        // 更新标记列表中的对应项
        loadMarkers(); // 重新加载标记
        
        // 清除表单
        clearMarkerForm();
        
        // 显示成功消息
        showMessage('标记已成功更新!', 'success');
    })
    .catch(error => {
        console.error('更新标记时出错:', error);
        showMessage('更新标记失败，请重试。', 'error');
    });
}

function addMarkerPin() {
    const latitude = document.getElementById('latitude').value;
    const longitude = document.getElementById('longitude').value;
    const note = document.getElementById('note').value;
    const type = document.getElementById('marker-type').value;
    const imagesInput = document.getElementById('marker-images');
    
    if (!latitude || !longitude) {
        showMessage('请选择一个位置', 'error');
        return;
    }
    
    // 创建表单数据对象
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('note', note);
    formData.append('marker_type', type);
    
    // 添加所有上传的图片
    for (let i = 0; i < imagesInput.files.length; i++) {
        formData.append('images', imagesInput.files[i]);
    }
    
    // 显示加载状态
    const submitButton = document.querySelector('#marker-form button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = '正在添加...';
    submitButton.disabled = true;
    
    // 发送到后端
    fetchWithRetry(`${CURRENT_API_URL}/markers`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(newMarker => {
        console.log('标记已添加:', newMarker);
        
        // 更新标记列表
        loadMarkers();
        
        // 清除表单
        clearMarkerForm();
        
        // 显示成功消息
        showMessage('标记已成功添加!', 'success');
        
        // 恢复按钮状态
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    })
    .catch(error => {
        console.error('添加标记时出错:', error);
        showMessage('添加标记失败，请重试。', 'error');
        
        // 恢复按钮状态
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    });
}

// 登录表单提交
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showMessage('请填写用户名和密码', 'error');
        return;
    }
    
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    loginButton.textContent = '登录中...';
    loginButton.disabled = true;
    
    fetchWithRetry(`${CURRENT_API_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('用户名或密码错误');
            }
            throw new Error('登录失败，请稍后再试');
        }
        return response.json();
    })
    .then(data => {
        localStorage.setItem('currentUser', JSON.stringify({
            username: data.username,
            name: data.name,
            avatar_url: data.avatar_url
        }));
        
        // 更新UI显示用户已登录
        updateUserUI();
        
        // 关闭登录弹窗
        document.getElementById('login-overlay').classList.remove('active');
        
        showMessage('登录成功!', 'success');
    })
    .catch(error => {
        console.error('登录出错:', error);
        showMessage(error.message || '登录失败，请重试', 'error');
    })
    .finally(() => {
        loginButton.textContent = '登录';
        loginButton.disabled = false;
    });
});

// 注册表单提交
document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (!username || !password) {
        showMessage('请填写用户名和密码', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('两次输入的密码不一致', 'error');
        return;
    }
    
    const registerButton = document.querySelector('#register-form button[type="submit"]');
    registerButton.textContent = '注册中...';
    registerButton.disabled = true;
    
    fetchWithRetry(`${CURRENT_API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error('用户名已存在');
            }
            throw new Error('注册失败，请稍后再试');
        }
        return response.json();
    })
    .then(data => {
        // 自动登录
        localStorage.setItem('currentUser', JSON.stringify({
            username: data.username,
            name: data.name,
            avatar_url: data.avatar_url
        }));
        
        // 更新UI显示用户已登录
        updateUserUI();
        
        // 关闭注册弹窗
        document.getElementById('register-overlay').classList.remove('active');
        
        showMessage('注册成功!', 'success');
    })
    .catch(error => {
        console.error('注册出错:', error);
        showMessage(error.message || '注册失败，请重试', 'error');
    })
    .finally(() => {
        registerButton.textContent = '注册';
        registerButton.disabled = false;
    });
});

// 更新用户资料
document.getElementById('profile-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || !user.username) {
        showMessage('请先登录', 'error');
        return;
    }
    
    const name = document.getElementById('profile-name').value;
    const gender = document.getElementById('profile-gender').value;
    const age = document.getElementById('profile-age').value;
    const bio = document.getElementById('profile-bio').value;
    const avatarFile = document.getElementById('profile-avatar').files[0];
    
    const formData = new FormData();
    if (name) formData.append('name', name);
    if (gender) formData.append('gender', gender);
    if (age) formData.append('age', age);
    if (bio) formData.append('bio', bio);
    if (avatarFile) formData.append('avatar', avatarFile);
    
    const profileButton = document.querySelector('#profile-form button[type="submit"]');
    profileButton.textContent = '更新中...';
    profileButton.disabled = true;
    
    fetchWithRetry(`${CURRENT_API_URL}/users/${user.username}`, {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('更新资料失败');
        }
        return response.json();
    })
    .then(updatedUser => {
        // 更新本地存储的用户信息
        localStorage.setItem('currentUser', JSON.stringify({
            username: updatedUser.username,
            name: updatedUser.name,
            avatar_url: updatedUser.avatar_url
        }));
        
        // 更新UI
        updateUserUI();
        
        // 关闭个人资料弹窗
        document.getElementById('edit-profile-overlay').classList.remove('active');
        
        showMessage('个人资料已更新!', 'success');
    })
    .catch(error => {
        console.error('更新资料出错:', error);
        showMessage('更新资料失败，请重试', 'error');
    })
    .finally(() => {
        profileButton.textContent = '更新资料';
        profileButton.disabled = false;
    });
});

// ... existing code ... 
