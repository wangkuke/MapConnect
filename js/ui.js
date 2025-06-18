/**
 * =================================================================
 * MapConnect UI Interaction Script (ui.js)
 * =================================================================
 * 负责 index.html 页面的主要用户界面交互逻辑.
 * 包括：
 * - 用户登录状态的UI更新
 * - 功能卡片的点击事件处理
 * - 个人资料弹窗的显示与隐藏
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    const userArea = document.getElementById('user-area');
    const userNameEl = document.getElementById('user-name');
    const userStatusEl = document.getElementById('user-status');
    const userAvatarEl = document.getElementById('user-avatar');
    
    const addMarkerBtn = document.getElementById('add-marker-btn');
    const addMarkerCard = document.querySelector('.func-card:first-child');
    const myMarkersCard = document.querySelector('.func-card:nth-child(4)');

    const profileModalOverlay = document.getElementById('profile-modal-overlay');
    const profileModal = document.getElementById('profile-modal');

    // --- 1. 初始化用户状态 ---
    const currentUser = JSON.parse(sessionStorage.getItem('mapconnect_currentUser'));
    if (currentUser && currentUser.username) {
        // 已登录
        userNameEl.textContent = currentUser.name || currentUser.username;
        userStatusEl.textContent = '欢迎回来！';
        userAvatarEl.textContent = (currentUser.name || currentUser.username).charAt(0).toUpperCase();
        userAvatarEl.style.backgroundImage = `url(${currentUser.avatar_url || ''})`;

    } else {
        // 未登录
        userNameEl.textContent = '登录 / 注册';
        userStatusEl.textContent = '点击以加入我们';
        userAvatarEl.textContent = 'Hi';
    }

    // --- 2. 绑定事件监听器 ---

    // 点击整个用户区域
    userArea.addEventListener('click', () => {
        if (currentUser) {
            // 如果已登录，显示个人资料弹窗
            showProfileModal(currentUser);
        } else {
            // 如果未登录，跳转到登录页面
            window.location.href = 'user-system.html';
        }
    });

    // 点击 "添加标注" 按钮 (地图上)
    addMarkerBtn.addEventListener('click', () => {
        window.location.href = 'marker-editor.html';
    });

    // 点击 "添加标注" 功能卡片
    addMarkerCard.addEventListener('click', () => {
        window.location.href = 'marker-editor.html';
    });
    
    // 点击 "我的标注" 功能卡片
    myMarkersCard.addEventListener('click', () => {
        window.location.href = 'my-markers.html';
    });
    
    // 点击遮罩层关闭弹窗
    profileModalOverlay.addEventListener('click', () => {
        hideProfileModal();
    });

    // --- 3. 弹窗控制函数 ---

    function showProfileModal(user) {
        profileModal.innerHTML = `
            <button id="profile-modal-close-btn" class="profile-modal-close-btn">&times;</button>
            <div class="profile-modal-content">
                <div class="avatar" style="background-image: url(${user.avatar_url || ''})">${user.avatar_url ? '' : (user.name || user.username).charAt(0).toUpperCase()}</div>
                <h2 class="name">${user.name || user.username}</h2>
                <div class="user-details">
                    <div class="detail-item"><i class="fas fa-user"></i> ${user.username}</div>
                    <div class="detail-item"><i class="fas fa-envelope"></i> ${user.email}</div>
                </div>
                <p class="bio">${user.bio || '这位用户很神秘，什么也没留下...'}</p>
                <button id="logout-btn" class="btn btn-danger">退出登录</button>
            </div>
        `;
        profileModal.classList.add('active');
        profileModalOverlay.classList.add('active');

        // 给新添加的按钮绑定事件
        document.getElementById('profile-modal-close-btn').addEventListener('click', hideProfileModal);
        document.getElementById('logout-btn').addEventListener('click', () => {
            sessionStorage.removeItem('mapconnect_currentUser');
            window.location.reload();
        });
    }

    function hideProfileModal() {
        profileModal.classList.remove('active');
        profileModalOverlay.classList.remove('active');
    }
}); 