// 初始化地图
const map = L.map('map').setView([31.2304, 121.4737], 13);

// 添加地图图层
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let userLocationMarker = null;

// --- 图标系统 ---
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

// --- 核心功能函数 ---

function displayMarkers(markers) {
    const markersContainer = document.querySelector('.markers-container');
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
        
        const popupIconClass = iconMap[markerType] || 'fa-map-marker-alt';
        const popupContent = `
            <div class="popup-header">
                <i class="fas ${popupIconClass}"></i><h3>${marker.title}</h3>
            </div>
            <p>${marker.description}</p>
            <div class="popup-footer">
                <p>创建者: <a href="#" onclick="event.preventDefault(); showUserProfileModal('${marker.user_username}')">${marker.user_name || marker.user_username}</a></p>
                <button class="contact-btn" onclick="alert('联系方式: ${marker.contact || '未提供'}')">获取联系方式</button>
            </div>
        `;
        
        L.marker([marker.lat, marker.lng], {icon: icon})
            .addTo(map)
            .bindPopup(popupContent);

        const card = document.createElement('div');
        card.className = 'marker-card';
        card.innerHTML = `
            <h3><i class="fas ${popupIconClass}"></i> ${marker.title}</h3>
            <p>${marker.description}</p>
            <div class="marker-footer">
                <a href="#" onclick="event.preventDefault(); showUserProfileModal('${marker.user_username}')" title="查看 ${marker.user_name || marker.user_username} 的资料">
                    <span>${(marker.user_name || marker.user_username).charAt(0).toUpperCase()}</span>
                </a>
                <button class="contact-btn" onclick="alert('联系方式: ${marker.contact || '未提供'}')">联系</button>
            </div>
        `;
        card.addEventListener('click', () => {
            map.flyTo([marker.lat, marker.lng], 15);
        });
        markersContainer.appendChild(card);
    });
}

function loadMarkers() {
    // 使用 apiService 来获取标注
    apiService.getPublicMarkers()
        .then(displayMarkers)
        .catch(error => {
            console.error('获取标记时出错:', error);
            const markersContainer = document.querySelector('.markers-container');
            markersContainer.innerHTML = '<h2><i class="fas fa-map-pin"></i> 附近标注</h2>';
            const errorMessage = document.createElement('p');
            errorMessage.textContent = `加载标注失败: ${error.message}`;
            errorMessage.style.color = 'red';
            errorMessage.style.padding = '20px';
            errorMessage.style.textAlign = 'center';
            markersContainer.appendChild(errorMessage);
        });
}

// --- 用户界面和服务 ---

function showUserProfileModal(username) {
    const modal = document.getElementById('profile-modal');
    const modalOverlay = document.getElementById('profile-modal-overlay');
    
    modal.innerHTML = `<div class="loading">正在加载用户资料...</div>`;
    modal.classList.add('active');
    modalOverlay.classList.add('active');

    // 使用 apiService 来获取用户资料
    apiService.getUserProfile(username)
        .then(user => {
            // ... (渲染用户资料 modal 的 HTML) ...
            const joinedDate = new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
            const avatarContent = user.avatar_url ? '' : (user.name || user.username).charAt(0).toUpperCase();
            const avatarStyle = user.avatar_url ? `background-image: url(${user.avatar_url.startsWith('http') ? user.avatar_url : API_BASE_URL + user.avatar_url});` : '';
            const displayName = user.name || user.username;
            
            // 准备要显示的新字段
            const genderMap = { 'male': '男', 'female': '女', 'secret': '保密' };
            const genderDisplay = user.gender ? `<div class="detail-item"><i class="fas fa-venus-mars"></i> ${genderMap[user.gender] || '未知'}</div>` : '';
            const ageDisplay = user.age ? `<div class="detail-item"><i class="fas fa-birthday-cake"></i> ${user.age} 岁</div>` : '';
            const bioDisplay = user.bio ? `<p class="bio">${user.bio}</p>` : '<p class="bio">这位用户很神秘，什么也没留下...</p>';

            modal.innerHTML = `
                <button class="profile-modal-close-btn" onclick="closeUserProfileModal()">&times;</button>
                <div class="profile-modal-content">
                    <div class="avatar" style="${avatarStyle}">${avatarContent}</div>
                    <h2 class="name">${displayName}</h2>
                    <div class="user-details">
                        ${genderDisplay}
                        ${ageDisplay}
                    </div>
                    ${bioDisplay}
                    <p class="joined-date"><i class="fas fa-clock"></i> 于 ${joinedDate} 加入</p>
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
    const modal = document.getElementById('profile-modal');
    const modalOverlay = document.getElementById('profile-modal-overlay');
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
}

function updateUserUI() {
    const currentUser = JSON.parse(sessionStorage.getItem('mapconnect_currentUser'));
    const userArea = document.getElementById('user-area');
    const userAvatar = document.getElementById('user-avatar');
    const userNameEl = document.getElementById('user-name');
    const userStatusEl = document.getElementById('user-status');

    if (currentUser) {
        // --- 已登录状态 ---
        const user = currentUser.user || currentUser;
        userNameEl.textContent = user.name || user.username;
        userStatusEl.textContent = '欢迎回来！';

        // 更新头像
        userAvatar.innerHTML = ''; // 清空 'Hi' 或首字母
        if (user.avatar_url) {
            let avatarUrl = user.avatar_url;
            // 如果URL不是完整的，就拼接API基地址
            const API_BASE_URL = 'https://user-api.532736720.workers.dev';
            if (!avatarUrl.startsWith('http')) {
                avatarUrl = `${API_BASE_URL}${avatarUrl}`;
            }
            userAvatar.style.backgroundImage = `url(${avatarUrl})`;
            userAvatar.style.backgroundSize = 'cover';
            userAvatar.style.backgroundPosition = 'center';
        } else {
            userAvatar.style.backgroundImage = ''; // 移除可能存在的背景图片
            userAvatar.textContent = (user.name || user.username).charAt(0).toUpperCase();
        }

        // 恢复退出登录功能
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = ' 退出登录';
        logoutLink.style.color = 'var(--primary)';
        logoutLink.style.fontWeight = 'bold';
        logoutLink.style.marginLeft = '8px';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            sessionStorage.removeItem('mapconnect_currentUser');
            window.location.reload();
        };
        userStatusEl.appendChild(logoutLink);

        // 点击用户区域跳转到个人资料设置
        userArea.onclick = () => window.location.href = 'user-system.html#profile';
        
        // (可选) 如果需要登出功能可以直接在这里添加，或者在个人设置页处理
        // 例如：userStatusEl.innerHTML = '欢迎回来！<a href="#" id="logout-link">退出</a>';
        // document.getElementById('logout-link').onclick = ...

    } else {
        // --- 未登录状态 ---
        userAvatar.style.backgroundImage = ''; // 确保没有背景图片
        userAvatar.textContent = 'Hi';
        userNameEl.textContent = '登录 / 注册';
        userStatusEl.textContent = '点击以加入我们';
        userArea.onclick = () => window.location.href = 'user-system.html';
    }
}

// --- 事件监听器 ---

// 页面加载时
window.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
    loadMarkers();
});

// 定位按钮
document.getElementById('locate-btn').addEventListener('click', function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 16);
                if (userLocationMarker) {
                    userLocationMarker.setLatLng([lat, lng]);
                } else {
                    userLocationMarker = L.marker([lat, lng], { /* ... icon ... */ }).addTo(map);
                }
            },
            () => alert('无法获取您的位置。')
        );
    } else {
        alert('您的浏览器不支持地理定位。');
    }
});

// 关闭用户资料弹窗
document.getElementById('profile-modal-overlay').addEventListener('click', closeUserProfileModal);
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") closeUserProfileModal();
});

// 其他按钮的页面跳转
document.getElementById('add-marker-btn').addEventListener('click', () => window.location.href = 'marker-editor.html');
document.querySelector('.search-container').addEventListener('click', () => window.location.href = 'marker-search.html');
document.querySelectorAll('.func-card').forEach(card => {
    card.addEventListener('click', function() {
        const title = this.querySelector('h3').textContent.trim();
        const pageMap = { "添加标注": "marker-editor.html", "我的球友": "messages.html", "个人设置": "user-system.html#profile", "我的标注": "my-markers.html" };
        const targetPage = pageMap[title];
        
        // 检查是否需要登录
        const requireLogin = ["我的标注", "个人设置"];
        const currentUser = JSON.parse(sessionStorage.getItem('mapconnect_currentUser'));

        if (requireLogin.includes(title) && !currentUser) {
            // alert('此功能需要登录后才能使用，将为您跳转到登录页面。');
            window.location.href = 'user-system.html';
        } else if (targetPage) {
            window.location.href = targetPage;
        }
    });
}); 
