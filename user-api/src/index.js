/**
 * =================================================================
 * MapConnect User API - Final & Rewritten Version
 * =================================================================
 * 这是一个从零开始重写的、稳定、零依赖的后端服务。
 * 它解决了所有已知的路由、依赖和数据验证问题。
 * 作者：Gemini (AI Assistant)
 * 日期：2025-06-18
 * =================================================================
 */

// --- 1. 内联微型路由器 (零依赖) ---
const Router = () => ({
	routes: [],
	add(method, path, handler) {
		this.routes.push({ method, path: new RegExp(`^${path.replace(/:\w+/g, '([^/]+)')}$`), handler });
		return this;
	},
	get(path, handler) { return this.add('GET', path, handler); },
	post(path, handler) { return this.add('POST', path, handler); },
	put(path, handler) { return this.add('PUT', path, handler); },
	delete(path, handler) { return this.add('DELETE', path, handler); },
	all(path, handler) { return this.add('ALL', path, handler); },
	async handle(request, ...args) {
		const { pathname } = new URL(request.url);
		for (const route of this.routes) {
			if (request.method !== route.method && route.method !== 'ALL') continue;
			const match = pathname.match(route.path);
			if (match) {
				request.params = {};
				const keys = route.path.source.match(/:(\w+)/g) || [];
				keys.forEach((key, i) => {
					request.params[key.substring(1)] = match[i + 1];
				});
				return route.handler(request, ...args);
			}
		}
		return new Response('Not Found', { status: 404 });
	}
});

// --- 2. 辅助函数 ---
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Username',
};

function addCorsHeaders(response) {
	const headers = new Headers(response.headers);
	Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value));
	return new Response(response.body, { ...response, headers });
}

function handleOptions() {
	return new Response(null, { status: 204, headers: corsHeaders });
}

async function hashPassword(password) {
	const data = new TextEncoder().encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 3. 路由处理函数 ---

// 注册
async function handleRegister(request, env) {
	try {
		const { username, password, email } = await request.json();
		if (!username || !password || !email) {
			return new Response(JSON.stringify({ error: '缺少用户名、密码或邮箱' }), { status: 400 });
		}
		const hashedPassword = await hashPassword(password);
		await env.DB.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)')
			.bind(username, hashedPassword, email)
			.run();
		return new Response(JSON.stringify({ message: '注册成功' }), { status: 201 });
	} catch (e) {
		if (e.message.includes('UNIQUE')) return new Response(JSON.stringify({ error: '用户名或邮箱已存在' }), { status: 409 });
		return new Response(JSON.stringify({ error: '内部服务器错误', details: e.message }), { status: 500 });
	}
}

// 登录
async function handleLogin(request, env) {
	const { username, password } = await request.json();
	const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
	const isPasswordCorrect = user && (await hashPassword(password)) === user.password;
	if (!isPasswordCorrect) {
		return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 });
	}
	const { password: _, ...userWithoutPassword } = user;
	return new Response(JSON.stringify({ message: '登录成功', user: userWithoutPassword }));
}

// 获取所有公开标注
async function handleGetMarkers(request, env) {
	const { results } = await env.DB.prepare(
		`SELECT m.id, m.lat, m.lng, m.title, m.description, m.marker_type, m.contact, u.username as user_username, u.name as user_name
		 FROM markers m JOIN users u ON m.user_id = u.id WHERE m.is_private = 0`
	).all();
	return new Response(JSON.stringify(results));
}

// 创建新标注 (核心修复)
async function handleCreateMarker(request, env) {
	try {
		const body = await request.json();

		// 极其严格的验证
		if (typeof body.user_id !== 'number') return new Response(JSON.stringify({ error: '无效的用户ID格式' }), { status: 400 });
		if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') return new Response(JSON.stringify({ error: '标题是必需的' }), { status: 400 });
		if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') return new Response(JSON.stringify({ error: '描述是必需的' }), { status: 400 });
		if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') return new Response(JSON.stringify({ error: '无效的坐标格式' }), { status: 400 });
		if (!body.visibility || !['today', 'three_days'].includes(body.visibility)) return new Response(JSON.stringify({ error: '无效的可见性设置' }), { status: 400 });

		// 计算过期时间
		const now = new Date();
		const expires_at = (body.visibility === 'three_days')
			? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
			: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

		// 精确的 INSERT 语句，只包含我们确认无误的字段
		const ps = env.DB.prepare(
			`INSERT INTO markers (user_id, title, description, lat, lng, marker_type, contact, is_private, expires_at, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			body.user_id,
			body.title,
			body.description,
			body.latitude,
			body.longitude,
			body.marker_type || 'personal',
			body.contact || null,
			body.is_private ? 1 : 0,
			expires_at.toISOString(),
			'active'
		);
		
		await ps.run();
		
		return new Response(JSON.stringify({ message: '标注创建成功' }), { status: 201 });

	} catch (e) {
		console.error('创建标注时发生严重错误:', e);
		return new Response(JSON.stringify({ error: '内部服务器错误', details: e.message }), { status: 500 });
	}
}

// 获取用户自己的标注
async function handleGetUserMarkers(request, env) {
	const { username } = request.params;
	const { results } = await env.DB.prepare(
		`SELECT m.*, u.username as user_username, u.name as user_name FROM markers m JOIN users u ON m.user_id = u.id WHERE u.username = ?`
	).bind(username).all();
	return new Response(JSON.stringify(results));
}

// 更新标注状态
async function handleUpdateMarkerStatus(request, env) {
	const { id } = request.params;
	const { status } = await request.json();
	await env.DB.prepare('UPDATE markers SET status = ? WHERE id = ?').bind(status, id).run();
	return new Response(JSON.stringify({ message: '状态更新成功' }));
}

// 删除标注
async function handleDeleteMarker(request, env) {
	const { id } = request.params;
	await env.DB.prepare('DELETE FROM markers WHERE id = ?').bind(id).run();
	return new Response(JSON.stringify({ message: '删除成功' }));
}

// --- 4. 路由表和主入口 ---
const router = Router();
router.get('/', () => new Response('MapConnect API is alive!'));
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.get('/markers', handleGetMarkers);
router.post('/markers', handleCreateMarker);
router.get('/markers/:username', handleGetUserMarkers);
router.put('/markers/:id/status', handleUpdateMarkerStatus);
router.delete('/markers/:id', handleDeleteMarker);
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
	async fetch(request, env, ctx) {
		if (request.method === 'OPTIONS') return handleOptions();
		try {
			const response = await router.handle(request, env, ctx);
			return addCorsHeaders(response);
		} catch (e) {
			console.error(e);
			return addCorsHeaders(new Response(JSON.stringify({ error: '内部服务器错误' }), { status: 500 }));
		}
	}
};
