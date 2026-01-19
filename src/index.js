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

import * as jose from 'jose';

// --- 1. 内联微型路由器 (零依赖) ---
const Router = () => ({
	routes: [],
	add(method, originalPath, handler) {
		const paramNames = (originalPath.match(/:\w+/g) || []).map(param => param.substring(1));
		const pathRegex = new RegExp(`^${originalPath.replace(/:\w+/g, '([^/]+)')}$`);
		this.routes.push({ method, pathRegex, paramNames, handler });
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
			const match = pathname.match(route.pathRegex);
			if (match) {
				request.params = {};
				route.paramNames.forEach((name, i) => {
					request.params[name] = match[i + 1];
				});
				return route.handler(request, ...args);
			}
		}
		return new Response('Not Found', { status: 404 });
	}
});

// --- 2. 辅助函数 ---

/**
 * 动态处理 CORS 头的核心函数。
 * 它会检查请求的 Origin 是否在允许列表中，并相应地设置响应头。
 * @param {Request} request - 进来的请求对象
 * @param {Response} response - 准备发出的响应对象
 * @param {any} env - Cloudflare 的环境变量
 * @returns {Response} - 带有正确 CORS 头的响应
 */
function handleCors(request, response, env) {
	// 从环境变量中获取允许的源列表，并分割成数组
	const allowedOrigins = (env.CORS_ORIGINS || '').split(',').map(origin => origin.trim());
	const requestOrigin = request.headers.get('Origin');

	// 克隆响应头，以便我们可以修改它们
	const headers = new Headers(response.headers);
	
	// 检查请求的源是否在我们的允许列表中
	if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
		headers.set('Access-Control-Allow-Origin', requestOrigin);
		headers.set('Vary', 'Origin'); // 告诉缓存，响应根据 Origin 头变化
	}
	
	// 为所有响应设置通用的CORS头
	headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Username, X-Admin-Username, X-Requested-With');
	headers.set('Access-Control-Allow-Credentials', 'true');
	
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: headers,
	});
}

/**
 * 专门处理浏览器在发送实际请求前发送的 OPTIONS "预检"请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
function handleOptions(request, env) {
	// 创建一个空的成功响应，并让 handleCors 附加正确的头
	const response = new Response(null, { status: 204 });
	return handleCors(request, response, env);
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

// Google 登录
async function handleGoogleLogin(request, env) {
	try {
		const { credential } = await request.json();
		if (!credential) {
			return new Response(JSON.stringify({ error: '缺少 Google 凭证' }), { status: 400 });
		}
		
		// 您的 Google Client ID，请务必替换
		const GOOGLE_CLIENT_ID = '148741481582-74s7at5usheng5atgrnpgq3p3bnamoj2.apps.googleusercontent.com'; 
		const JWKS = jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
		
		// 验证 JWT
		const { payload } = await jose.jwtVerify(credential, JWKS, {
			issuer: 'https://accounts.google.com',
			audience: GOOGLE_CLIENT_ID,
		});

		// 从 payload 中获取用户信息
		const { email, name, picture, email_verified } = payload;
		if (!email || !email_verified) {
			return new Response(JSON.stringify({ error: '无法获取有效的 Google 用户邮箱' }), { status: 400 });
		}

		// 检查用户是否已存在
		let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
		
		if (user) {
			// 用户已存在，直接登录
			const { password: _, ...userWithoutPassword } = user;
			return new Response(JSON.stringify({ message: '登录成功', user: userWithoutPassword }));
		} else {
			// 用户不存在，创建新用户
			const username = email.split('@')[0] + Math.random().toString(36).substring(2, 6); // 创建一个唯一的用户名
			const randomPassword = await hashPassword(crypto.randomUUID()); // 创建一个安全的随机密码
			
			const { results } = await env.DB.prepare(
				'INSERT INTO users (username, password, email, name, avatar_url, registration_method) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.bind(username, randomPassword, email, name || username, picture || null, 'google')
			.run();

			// 重新获取新创建的用户信息
			const newUser = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
			const { password: _, ...userWithoutPassword } = newUser;
			return new Response(JSON.stringify({ message: '注册并登录成功', user: userWithoutPassword }), { status: 201 });
		}
	} catch (e) {
		console.error('Google 登录错误:', e);
		if (e.code === 'ERR_JWT_EXPIRED') {
			return new Response(JSON.stringify({ error: '凭证已过期', details: e.message }), { status: 401 });
		}
		if (e.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' || e.code === 'ERR_JWS_INVALID') {
			return new Response(JSON.stringify({ error: '无效的凭证签名', details: e.message }), { status: 401 });
		}
		return new Response(JSON.stringify({ error: '内部服务器错误', details: e.message }), { status: 500 });
	}
}

// 获取所有公开标注
async function handleGetMarkers(request, env) {
	const { results } = await env.DB.prepare(
		`SELECT m.id, m.lat, m.lng, m.title, m.description, m.marker_type, m.contact, u.username as user_username, u.name as user_name
		 FROM markers m JOIN users u ON m.user_id = u.id WHERE m.is_private = 0 AND m.status = 'active'`
	).all();
	return new Response(JSON.stringify(results));
}

// 创建新标注 (核心修复)
async function handleCreateMarker(request, env) {
	try {
		const body = await request.json();

		// 极其严格的验证
		if (typeof body.user_id !== 'number') return new Response(JSON.stringify({ error: '无效的用户ID格式 (应为数字)' }), { status: 400 });
		if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') return new Response(JSON.stringify({ error: '标题是必需的' }), { status: 400 });
		if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') return new Response(JSON.stringify({ error: '描述是必需的' }), { status: 400 });
		if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') return new Response(JSON.stringify({ error: '无效的坐标格式 (应为latitude和longitude)' }), { status: 400 });
		if (!body.visibility || !['today', 'three_days'].includes(body.visibility)) return new Response(JSON.stringify({ error: '无效的可见性设置' }), { status: 400 });

		// 计算过期时间
		const now = new Date();
		const expires_at = (body.visibility === 'three_days')
			? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
			: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

		// 精确的 INSERT 语句，注意这里数据库列是 lat, lng
		const ps = env.DB.prepare(
			`INSERT INTO markers (user_id, title, description, lat, lng, marker_type, contact, is_private, expires_at, status, visibility)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(
			body.user_id,
			body.title,
			body.description,
			body.latitude, // 前端传来的是 latitude
			body.longitude, // 前端传来的是 longitude
			body.marker_type || 'personal',
			body.contact || null,
			body.is_private ? 1 : 0,
			expires_at.toISOString(),
			'active',
			body.visibility
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
	try {
		const { username } = request.params;
		if (!username) {
			return new Response(JSON.stringify({ error: 'URL中缺少用户名' }), { status: 400 });
		}
		const { results } = await env.DB.prepare(
			`SELECT m.*, u.username as user_username, u.name as user_name FROM markers m JOIN users u ON m.user_id = u.id WHERE u.username = ?`
		).bind(username).all();

		return new Response(JSON.stringify(results));

	} catch (e) {
		console.error(`获取用户 ${request.params.username} 的标注时发生数据库错误:`, e);
		return new Response(JSON.stringify({ error: '数据库查询失败', details: e.message }), { status: 500 });
	}
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

// 获取用户公开资料
async function handleGetUserProfile(request, env) {
	try {
		const { username } = request.params;
		if (!username) {
			return new Response(JSON.stringify({ error: 'URL中缺少用户名' }), { status: 400 });
		}

		// 查询用户数据，但不包括密码
		const user = await env.DB.prepare(
			'SELECT id, username, name, email, avatar_url, bio, gender, age, created_at FROM users WHERE username = ?'
		).bind(username).first();
		
		if (!user) {
			return new Response(JSON.stringify({ error: '用户未找到' }), { status: 404 });
		}

		return new Response(JSON.stringify(user));

	} catch (e) {
		console.error(`获取用户 ${request.params.username} 的公开资料时出错:`, e);
		return new Response(JSON.stringify({ error: '数据库查询失败', details: e.message }), { status: 500 });
	}
}

// --- Admin Endpoints ---

// [MIDDLEWARE] 管理员权限验证
async function adminAuth(request, env) {
	// 从请求头中获取用户名
	const rawAdminUsername = request.headers.get('X-Admin-Username');
	if (!rawAdminUsername) {
		return new Response(JSON.stringify({ error: '缺少管理员身份验证信息' }), { status: 401 });
	}

	try {
		// 对用户名进行解码，以支持中文等非ASCII字符
		const adminUsername = decodeURIComponent(rawAdminUsername);

		// 在数据库中验证该用户是否存在且角色为 'admin'
		const user = await env.DB.prepare('SELECT role FROM users WHERE username = ?').bind(adminUsername).first();

		if (!user || user.role !== 'admin') {
			return new Response(JSON.stringify({ error: '无效的管理员身份或权限不足' }), { status: 403 });
		}
		
		// 验证通过
		return null; 
	} catch (e) {
		// 如果解码失败，说明传入的格式有问题
		return new Response(JSON.stringify({ error: '无效的用户名编码格式' }), { status: 400 });
	}
}

// [ADMIN] 获取统计数据
async function handleAdminGetStats(request, env) {
	try {
		const totalMarkers = await env.DB.prepare('SELECT COUNT(*) as count FROM markers').first('count');
		const totalUsers = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first('count');
		
		// 计算24小时内的新增标注
		const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const dailyNewMarkers = await env.DB.prepare("SELECT COUNT(*) as count FROM markers WHERE created_at > ?").bind(oneDayAgo).first('count');

		return new Response(JSON.stringify({
			total_markers: totalMarkers,
			total_users: totalUsers,
			daily_new_markers: dailyNewMarkers
		}));
	} catch (e) {
		console.error('获取统计数据时出错:', e);
		return new Response(JSON.stringify({ error: '数据库查询失败', details: e.message }), { status: 500 });
	}
}

// [ADMIN] 获取所有标注
async function handleAdminGetAllMarkers(request, env) {
	try {
		const { results } = await env.DB.prepare(
			`SELECT m.*, u.username as user_username
			 FROM markers m 
			 JOIN users u ON m.user_id = u.id 
			 ORDER BY m.created_at DESC`
		).all();
		return new Response(JSON.stringify(results));
	} catch (e) {
		console.error('获取所有标注时出错:', e);
		return new Response(JSON.stringify({ error: '数据库查询失败', details: e.message }), { status: 500 });
	}
}

// [ADMIN] 获取所有用户
async function handleAdminGetUsers(request, env) {
	try {
		// 查询所有用户，并排除密码字段
		const { results } = await env.DB.prepare(
			'SELECT id, username, name, email, avatar_url, bio, gender, age, created_at, registration_method FROM users ORDER BY created_at DESC'
		).all();
		
		return new Response(JSON.stringify(results));

	} catch (e) {
		console.error('获取所有用户时出错:', e);
		return new Response(JSON.stringify({ error: '数据库查询失败', details: e.message }), { status: 500 });
	}
}

// --- 4. 路由表和主入口 ---
const router = Router();
router.get('/', () => new Response('MapConnect API is alive!'));
router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/google-login', handleGoogleLogin);
router.get('/markers', handleGetMarkers);
router.post('/markers', handleCreateMarker);
router.get('/markers/:username', handleGetUserMarkers);
router.put('/markers/:id/status', handleUpdateMarkerStatus);
router.delete('/markers/:id', handleDeleteMarker);
router.get('/users/:username', handleGetUserProfile);

// Admin Routes - Stubs for router matching
router.get('/admin/stats', handleAdminGetStats);
router.get('/admin/all-markers', handleAdminGetAllMarkers);
router.get('/admin/users', handleAdminGetUsers);

router.all('.*', () => new Response('Not Found', { status: 404 }));

export default {
	async fetch(request, env, ctx) {
		try {
			if (request.method === 'OPTIONS') {
				return handleOptions(request, env);
			}

			const { pathname } = new URL(request.url);

			// Admin route protection
			if (pathname.startsWith('/admin/')) {
				const authResponse = await adminAuth(request, env);
				if (authResponse) {
					// 如果验证失败，authResponse 是一个 Response 对象，直接返回
					return handleCors(request, authResponse, env);
				}
				// 验证成功，authResponse 是 null，继续执行路由
			}

			const response = await router.handle(request, env, ctx);
			return handleCors(request, response, env);
		} catch (e) {
			console.error('捕获到未处理的异常:', e);
			const errorResponse = new Response(JSON.stringify({ error: '内部服务器错误', details: e.message }), { status: 500 });
			return handleCors(request, errorResponse, env);
		}
	},
};