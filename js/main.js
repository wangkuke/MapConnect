document.addEventListener('DOMContentLoaded', () => {
    // 检查 apiService 是否已定义
    if (typeof apiService === 'undefined') {
        console.error('apiService is not loaded. Make sure api-service.js is included before this script.');
        alert('核心服务加载失败，请刷新页面重试。');
        return;
    }

    const map = L.map('map', {
        zoomControl: false, // 禁用默认的缩放控件
    }).setView([39.9042, 116.4074], 13); // 默认视图（北京）

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- 全局变量 ---
    let currentUser = null;
    let markersOnMap = {}; // 存储 marker 实例, key 是 marker ID

    // --- 初始化函数 ---
    function init() {
        updateUserLoginState();
        loadPublicMarkers();
        setupEventListeners();
        // 尝试定位用户
        map.locate({setView: true, maxZoom: 16});
    }

    // --- UI 更新函数 ---
    function updateUserLoginState() {
        const userArea = document.getElementById('user-area');
        const userNameEl = document.getElementById('user-name');
        const userStatusEl = document.getElementById('user-status');
        const userAvatarEl = document.getElementById('user-avatar');

        const userData = sessionStorage.getItem('mapconnect_currentUser');

        if (userData) {
            currentUser = JSON.parse(userData);
            userNameEl.textContent = currentUser.name || currentUser.username;
            userStatusEl.textContent = '欢迎回来！';
            if (currentUser.avatar_url) {
                userAvatarEl.style.backgroundImage = `url(${currentUser.avatar_url})`;
                userAvatarEl.textContent = '';
            } else {
                userAvatarEl.style.backgroundImage = 'none';
                userAvatarEl.textContent = (currentUser.name || currentUser.username).charAt(0).toUpperCase();
            }
            userArea.onclick = () => showUserProfile(currentUser.username);
        } else {
            currentUser = null;
            userNameEl.textContent = '登录 / 注册';
            userStatusEl.textContent = '点击以加入我们';
            userAvatarEl.style.backgroundImage = 'none';
            userAvatarEl.textContent = 'Hi';
            userArea.onclick = () => window.location.href = 'user-system.html';
        }
    }

    // --- 数据加载函数 ---
    async function loadPublicMarkers() {
        // 加载新标记前清除现有标记
        for (const markerId in markersOnMap) {
            map.removeLayer(markersOnMap[markerId]);
        }
        markersOnMap = {};

        try {
            const markers = await apiService.getPublicMarkers();
            if (markers && Array.isArray(markers)) {
                markers.forEach(addMarkerToMap);
            }
        } catch (error) {
            console.error('加载公开标注失败:', error);
            alert('无法加载地图标注，请检查网络连接或稍后重试。');
        }
    }

    // --- 个人资料弹窗 ---
    async function showUserProfile(username) {
        const modal = document.getElementById('profile-modal');
        const overlay = document.getElementById('profile-modal-overlay');
        modal.innerHTML = '<div class="loading">正在加载用户资料...</div>';
        modal.classList.add('active');
        overlay.classList.add('active');

        try {
            const profile = await apiService.getUserProfile(username);
            const joinDate = new Date(profile.created_at).toLocaleDateString();

            modal.innerHTML = `
                <button class="profile-modal-close-btn">&times;</button>
                <div class="profile-modal-content">
                    <div class="avatar" style="background-image: url(${profile.avatar_url || ''})">${profile.avatar_url ? '' : (profile.name || profile.username).charAt(0).toUpperCase()}</div>
                    <h2 class="name">${profile.name || profile.username}</h2>
                    <div class="user-details">
                        ${profile.gender && profile.gender !== 'secret' ? `<div class="detail-item"><i class="fas fa-venus-mars"></i> ${profile.gender === 'male' ? '男' : '女'}</div>` : ''}
                        ${profile.age ? `<div class="detail-item"><i class="fas fa-birthday-cake"></i> ${profile.age} 岁</div>` : ''}
                    </div>
                    <p class="bio">${profile.bio || '这位用户很神秘，什么也没留下...'}</p>
                    <p class="joined-date">于 ${joinDate} 加入</p>
                </div>
            `;

            modal.querySelector('.profile-modal-close-btn').onclick = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
            };

        } catch (error) {
            console.error('加载用户资料失败:', error);
            modal.innerHTML = '<div class="error">无法加载用户资料。请稍后重试。</div>';
        }
    }

    // --- 地图交互 ---
    function addMarkerToMap(markerData) {
        if (!markerData || !markerData.id || !markerData.lat || !markerData.lng || markersOnMap[markerData.id]) return;

        const markerType = markerData.marker_type || 'default';
        const iconClass = getIconForType(markerType);

        const customIcon = L.divIcon({
            html: `<div class="marker-icon-wrapper ${markerType}"><i class="fas ${iconClass}"></i></div>`,
            className: 'custom-marker-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(createPopupContent(markerData));

        markersOnMap[markerData.id] = marker;
    }
    
    function createPopupContent(markerData) {
        return `
            <div class="popup-content">
                <h4>${markerData.title}</h4>
                <p>${markerData.description}</p>
                <div class="popup-footer">
                    <span>由 <strong>${markerData.user_username || '未知用户'}</strong> 发布</span>
                    <button class="details-btn" data-marker-id="${markerData.id}">详情</button>
                </div>
            </div>
        `;
    }
    
    function getIconForType(type) {
        const icons = {
            'personal': 'fa-map-marker-alt',
            'activity': 'fa-calendar-check',
            'business': 'fa-store',
            'food': 'fa-utensils',
            'scenery': 'fa-tree',
            'default': 'fa-question-circle'
        };
        return icons[type] || icons['default'];
    }
    
    window.showMarkerDetails = (markerId) => {
        alert(`显示标注 #${markerId} 的详细信息的功能正在开发中！`);
    };

    // --- 事件监听 ---
    function setupEventListeners() {
        document.querySelector('.functions .func-card:nth-child(1)').addEventListener('click', handleAddMarkerClick);
        
        document.querySelector('.functions .func-card:nth-child(4)').addEventListener('click', () => {
             if (!currentUser) {
                alert('请先登录！');
                window.location.href = 'user-system.html';
                return;
            }
            window.location.href = `marker-search.html?username=${currentUser.username}`;
        });
        
        document.querySelector('.functions .func-card:nth-child(3)').addEventListener('click', () => {
             if (currentUser) {
                window.location.href = 'user-system.html#profile';
            } else {
                window.location.href = 'user-system.html';
            }
        });

        document.getElementById('locate-btn').addEventListener('click', () => map.locate({setView: true, maxZoom: 16}));
        
        document.getElementById('add-marker-btn').addEventListener('click', handleAddMarkerClick);

        const profileOverlay = document.getElementById('profile-modal-overlay');
        profileOverlay.onclick = () => {
            document.getElementById('profile-modal').classList.remove('active');
            profileOverlay.classList.remove('active');
        };
    }
    
    function handleAddMarkerClick() {
        if (!currentUser) {
            alert('请先登录再添加标注！');
            window.location.href = 'user-system.html';
            return;
        }
        alert("请在地图上点击您想添加标注的位置。");
        map.once('click', onMapClickForNewMarker);
    }
    
    async function onMapClickForNewMarker(e) {
        const title = prompt("请输入标注标题：");
        if (!title) return;

        const description = prompt("请输入标注描述：");
        if (!description) return;
        
        const markerData = {
            user_id: currentUser.id,
            title: title,
            description: description,
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            marker_type: 'personal',
            visibility: 'three_days',
            is_private: false,
        };
        
        try {
            await apiService.createMarker(markerData);
            alert('标注创建成功！');
            loadPublicMarkers();
        } catch (error) {
            console.error('创建标注失败:', error);
            alert(`创建标注失败: ${error.message}`);
        }
    }

    // --- Map Events ---
    map.on('locationfound', function(e) {
        L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'user-location-marker-container',
                html: '<div class="user-location-marker-pulse"></div><div class="user-location-marker"></div>'
            })
        }).addTo(map);
    });

    map.on('locationerror', function(e) {
        console.warn(e.message);
    });

    map.on('popupopen', function (e) {
        const detailsBtn = e.popup.getElement().querySelector('.details-btn');
        if (detailsBtn) {
            detailsBtn.onclick = function () {
                const markerId = this.getAttribute('data-marker-id');
                window.showMarkerDetails(markerId);
            };
        }
    });

    // --- 初始化 ---
    init();
}); 