// Map Configuration
// 为了使用高德地图 JS API，您需要配置安全密钥和 API Key
// 请访问 https://console.amap.com/ 申请

window._AMapSecurityConfig = {
    // 安全密钥 (Security Code) - 必须在加载 JS API 之前设置
    // 注意：在生产环境中，建议使用代理服务器转发以保护密钥，或者绑定域名
    securityJsCode: '9bad26c2fd6edc13c49be9bc70451572',
};

// 调试日志：确认安全密钥已设置
console.log('MapConfig: Security Code set:', window._AMapSecurityConfig.securityJsCode ? 'Yes' : 'No');

window.MAP_CONFIG = {
    // API Key (Web端 JS API Key)
    // 请确保在高德控制台申请的是 "Web端 (JS API)" 类型的 Key，而不是 "Web服务" 类型
    AMAP_KEY: '6668d2ad3efeaa324161e8ae445e6b8d',
    
    // 默认中心点 (上海)
    DEFAULT_CENTER: [121.4737, 31.2304],
    DEFAULT_ZOOM: 13
};

/**
 * 监控地图状态，如果地图在加载后不久消失（通常是Key验证失败），则提示用户
 * @param {string} containerId 地图容器ID
 */
function watchMapStatus(containerId) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // 检查 AMap 层是否存在且可见
        const amapLayer = container.querySelector('.amap-layer');
        const isHidden = !amapLayer || getComputedStyle(amapLayer).display === 'none' || container.clientHeight === 0;
        
        if (isHidden) {
            console.error('MapConfig: Map disappeared. This usually indicates an API Key / Security Code mismatch.');
            container.innerHTML = `
                <div style="
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f8d7da;
                    color: #721c24;
                    padding: 20px;
                    text-align: center;
                ">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>地图加载验证失败</h3>
                    <p>地图在加载后被强制隐藏，这通常是因为 API Key 与安全密钥(Security Code)不匹配。</p>
                    <div style="background: rgba(255,255,255,0.5); padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left; font-family: monospace; font-size: 12px;">
                        <strong>Current Config:</strong><br>
                        Key: ${window.MAP_CONFIG.AMAP_KEY.substring(0, 6)}...<br>
                        Security: ${window._AMapSecurityConfig.securityJsCode ? 'Set (Ends with ...' + window._AMapSecurityConfig.securityJsCode.slice(-4) + ')' : 'Not Set'}
                    </div>
                    <p style="margin-top: 15px; font-size: 14px;">请检查 js/map-config.js 文件配置。</p>
                </div>
            `;
        } else {
            console.log('MapConfig: Map verification passed (visible after 2s).');
        }
    }, 2000); // 2秒后检查，因为验证失败通常在1秒左右发生
}

// 检查是否配置了 Key
function checkMapConfig() {
    if (window.MAP_CONFIG.AMAP_KEY === '6668d2ad3efeaa324161e8ae445e6b8d') {
        // Key 已经配置，不做提示
        return;
    }
    if (window.MAP_CONFIG.AMAP_KEY === 'YOUR_AMAP_KEY_HERE') {
        console.warn('请配置高德地图 API Key (js/map-config.js)');
        // 可以在这里添加一个 UI 提示
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff4444;color:white;text-align:center;padding:10px;z-index:9999;';
        div.innerHTML = '请在 js/map-config.js 中配置高德地图 API Key，否则地图无法加载。<a href="https://console.amap.com/" target="_blank" style="color:white;text-decoration:underline;">去申请</a>';
        document.body.appendChild(div);
    }
}

// 动态加载高德地图 API
function loadAMapAPI() {
    return new Promise((resolve, reject) => {
        if (window.AMap) {
            resolve(window.AMap);
            return;
        }

        checkMapConfig();

        const script = document.createElement('script');
        script.type = 'text/javascript';
        // 不再在 URL 中加载插件，而是通过 AMap.plugin 动态加载，以减少 404 错误风险
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${window.MAP_CONFIG.AMAP_KEY}`;
        script.onerror = (e) => {
            console.error('AMap script load error:', e);
            reject(e);
        };
        script.onload = () => {
            console.log('AMap script loaded successfully');
            resolve(window.AMap);
        };
        document.head.appendChild(script);
    });
}

// 将函数导出到全局作用域，让其他页面可以调用
window.loadAMapAPI = loadAMapAPI;
window.checkMapConfig = checkMapConfig;
window.watchMapStatus = watchMapStatus;

// 页面加载时检查配置
checkMapConfig();
