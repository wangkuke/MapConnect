document.addEventListener('DOMContentLoaded', () => {
    // 检查 apiService 是否已定义
    if (typeof apiService === 'undefined') {
        console.error('apiService is not loaded. Make sure api-service.js is included before main.js.');
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
        try {
            const markers = await apiService.getPublicMarkers();
            markers.forEach(addMarkerToMap);
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
                    <div class="avatar" style="background-image: url(${profile.avatar_url || ''})">${profile.avatar_url ? '' : profile.username.charAt(0).toUpperCase()}</div>
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
        if (!markerData || markersOnMap[markerData.id]) return; // 防止重复添加

        const iconHtml = `<div class="marker-icon-wrapper"><i class="fas ${markerData.icon || 'fa-map-marker-alt'}"></i></div>`;
        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker-icon ' + markerData.category,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        const marker = L.marker([markerData.lat, markerData.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(createPopupContent(markerData));
        
        markersOnMap[markerData.id] = marker; // 存入列表
    }

    function createPopupContent(markerData) {
        return `
            <div class="popup-content">
                <h4>${markerData.title}</h4>
                <p>${markerData.description}</p>
                <div class="popup-footer">
                    <span>由 <strong>${markerData.username}</strong> 发布</span>
                    <button class="details-btn" onclick="showMarkerDetails(${markerData.id})">详情</button>
                </div>
            </div>
        `;
    }

    // Placeholder for a future function
    window.showMarkerDetails = (markerId) => {
        alert(`显示标注 #${markerId} 的详细信息的功能正在开发中！`);
    };

    // --- 事件监听 ---
    function setupEventListeners() {
        document.querySelector('.func-card:nth-child(3)').addEventListener('click', () => {
            window.location.href = 'user-system.html#profile';
        });

        document.getElementById('locate-btn').addEventListener('click', () => map.locate({setView: true, maxZoom: 16}));
        
        document.getElementById('add-marker-btn').addEventListener('click', () => {
            if (!currentUser) {
                alert('请先登录再添加标注！');
                window.location.href = 'user-system.html';
                return;
            }
            alert("请在地图上点击您想添加标注的位置。");
            map.once('click', onMapClickToAddMarker);
        });

        const overlay = document.getElementById('profile-modal-overlay');
        overlay.onclick = () => {
            document.getElementById('profile-modal').classList.remove('active');
            overlay.classList.remove('active');
        };
    }
    
    async function onMapClickToAddMarker(e) {
        // currentUser is already checked in the event listener
        const title = prompt("请输入标注标题：");
        if (!title) return;

        const description = prompt("请输入标注描述：");

        const newMarkerData = {
            title: title,
            description: description,
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            category: 'community', // 默认分类
            icon: 'fa-basketball-ball' // 默认图标
        };

        try {
            const createdMarker = await apiService.createMarker(newMarkerData);
            alert('标注创建成功！');
            addMarkerToMap(createdMarker);
        } catch (error) {
            console.error('创建标注失败:', error);
            alert(`创建标注失败: ${error.message}`);
        }
    }

    // --- 初始化 ---
    init();
}); 
