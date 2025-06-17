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

    // Fetch markers from the backend
    fetch('https://user-api.532736720.workers.dev/markers')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(markers => {
            displayMarkers(markers);
        })
        .catch(error => {
            console.error('Error fetching markers:', error);
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
});

// --- User Profile Modal Logic ---

const modal = document.getElementById('profile-modal');
const modalOverlay = document.getElementById('profile-modal-overlay');
const API_BASE_URL = 'https://user-api.532736720.workers.dev';

function showUserProfileModal(username) {
    modal.innerHTML = `<div class="loading">正在加载用户资料...</div>`;
    modal.classList.add('active');
    modalOverlay.classList.add('active');

    fetch(`${API_BASE_URL}/users/${username}`)
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
            const avatarStyle = user.avatar_url ? `background-image: url(${user.avatar_url.startsWith('http') ? user.avatar_url : API_BASE_URL + user.avatar_url});` : '';

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
