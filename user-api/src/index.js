// 密码哈希函数 (使用Web Crypto API，无需第三方库)
async function hashPassword(password) {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 密码验证函数
async function verifyPassword(password, hashedPassword) {
	const hashToVerify = await hashPassword(password);
	return hashToVerify === hashedPassword;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// 一个简单的路由器：根据路径和请求方法，调用不同的处理函数
		if (url.pathname === '/register' && request.method === 'POST') {
			return await handleRegister(request, env);
		}

		if (url.pathname === '/login' && request.method === 'POST') {
			return await handleLogin(request, env);
		}

		if (url.pathname === '/markers' && request.method === 'GET') {
			return await handleGetMarkers(request, env);
		}

		if (url.pathname === '/') {
			return new Response('Hello from your User API! Database is connected.');
		}

		return new Response('Not Found', { status: 404 });
	},
};

/**
 * 处理用户注册请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
async function handleRegister(request, env) {
	// 1. 检查请求头，确保是JSON格式
	if (request.headers.get('content-type') !== 'application/json') {
		return new Response(JSON.stringify({ error: 'Content-Type必须是application/json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 2. 从请求体中安全地解析用户数据
	let userData;
	try {
		userData = await request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: '无效的JSON格式' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 3. 验证必需的字段是否存在
	const { username, password, email, gender } = userData;
	if (!username || !password || !email || !gender) {
		const missingFields = ['username', 'password', 'email', 'gender'].filter(field => !userData[field]);
		return new Response(JSON.stringify({ error: `缺少必需的字段: ${missingFields.join(', ')}` }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 4. 将新用户插入数据库
	try {
		// 使用预处理语句来防止SQL注入，这是最重要的安全措施
		const hashedPassword = await hashPassword(password);
		const ps = env.DB.prepare(
			'INSERT INTO users (username, password, email, gender) VALUES (?, ?, ?, ?)'
		).bind(username, hashedPassword, email, gender); // 存储哈希后的密码

		await ps.run();

		return new Response(JSON.stringify({ message: '用户注册成功' }), {
			status: 201, // 201 Created 表示资源创建成功
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		// 处理数据库错误，例如用户名或邮箱已经存在（违反UNIQUE约束）
		if (e.message.includes('UNIQUE constraint failed')) {
			return new Response(JSON.stringify({ error: '用户名或邮箱已存在' }), {
				status: 409, // 409 Conflict 表示请求冲突
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 其他未知服务器错误
		console.error('注册时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * 处理用户登录请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
async function handleLogin(request, env) {
	// 1. 解析请求体
	let userData;
	try {
		userData = await request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: '无效的JSON格式' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	// 2. 验证字段
	const { username, password } = userData;
	if (!username || !password) {
		return new Response(JSON.stringify({ error: '缺少用户名或密码' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
	}

	// 3. 从数据库查找用户
	try {
		const ps = env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username);
		const user = await ps.first();

		if (!user) {
			return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
		}

		// 4. 验证密码
		const isPasswordCorrect = await verifyPassword(password, user.password);

		if (!isPasswordCorrect) {
			return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
		}
		
		// 登录成功 (为了安全，不要返回密码等敏感信息)
		const { password: _, ...userWithoutPassword } = user;
		return new Response(JSON.stringify({ message: '登录成功', user: userWithoutPassword }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});

	} catch (e) {
		console.error('登录时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
	}
}

/**
 * 处理获取markers的请求
 * @param {Request} request 
 * @param {*} env 
 * @returns {Response}
 */
async function handleGetMarkers(request, env) {
	try {
		// 这里我们返回一些示例数据
		// 在实际应用中，您需要从数据库中查询这些数据
		const sampleMarkers = [
			{
				id: 1,
				lat: 39.9042,
				lng: 116.4074,
				title: "北京市",
				description: "中国首都",
				type: "city"
			},
			{
				id: 2,
				lat: 31.2304,
				lng: 121.4737,
				title: "上海市",
				description: "中国经济中心",
				type: "city"
			},
			{
				id: 3,
				lat: 22.5431,
				lng: 114.0579,
				title: "深圳市",
				description: "中国科技创新中心",
				type: "city"
			}
		];

		// 设置CORS头以允许跨域请求
		const headers = {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		};

		return new Response(JSON.stringify(sampleMarkers), {
			status: 200,
			headers
		});
	} catch (e) {
		console.error('获取markers时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
} 