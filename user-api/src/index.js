// CORS头，允许所有域的请求
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Username',
};

// 添加CORS头到响应中
function addCorsHeaders(response) {
	const newHeaders = new Headers(response.headers);
	Object.keys(corsHeaders).forEach(key => {
		newHeaders.set(key, corsHeaders[key]);
	});
	
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

// 处理OPTIONS请求
function handleOptions() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

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
    
		// 处理预检请求
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		if (url.pathname === '/register' && request.method === 'POST') {
			return addCorsHeaders(await handleRegister(request, env));
		}

		if (url.pathname === '/login' && request.method === 'POST') {
			return addCorsHeaders(await handleLogin(request, env));
		}

		if (url.pathname === '/markers' && request.method === 'GET') {
			return addCorsHeaders(await handleGetMarkers(request, env));
		}

		if (url.pathname === '/profile' && request.method === 'PUT') {
			return addCorsHeaders(await handleUpdateProfile(request, env));
		}

		if (url.pathname === '/avatar' && request.method === 'POST') {
			return addCorsHeaders(await handleAvatarUpload(request, env));
		}

		if (url.pathname === '/') {
			return addCorsHeaders(new Response('Hello from your User API! Database is connected.'));
		}

		return addCorsHeaders(new Response('Not Found', { status: 404 }));
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
	if (!username || !password || !email) {
		const missingFields = ['username', 'password', 'email'].filter(field => !userData[field]);
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
		).bind(username, hashedPassword, email, gender || 'secret'); // 如果gender未提供，则默认为'secret'

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
				type: "city",
				marker_type: "official",
				user_name: "系统管理员",
				user_username: "admin",
				contact: "admin@example.com"
			},
			{
				id: 2,
				lat: 31.2304,
				lng: 121.4737,
				title: "上海市",
				description: "中国经济中心",
				type: "city",
				marker_type: "business",
				user_name: "系统管理员",
				user_username: "admin",
				contact: "admin@example.com"
			},
			{
				id: 3,
				lat: 22.5431,
				lng: 114.0579,
				title: "深圳市",
				description: "中国科技创新中心",
				type: "city",
				marker_type: "personal",
				user_name: "系统管理员",
				user_username: "admin",
				contact: "admin@example.com"
			}
		];

		return new Response(JSON.stringify(sampleMarkers), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('获取markers时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

/**
 * 处理更新个人资料的请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
async function handleUpdateProfile(request, env) {
	let profileData;
	try {
		profileData = await request.json();
	} catch (e) {
		return new Response(JSON.stringify({ error: '无效的JSON格式' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { username, name, contact, bio, gender, age } = profileData;

	if (!username) {
		return new Response(JSON.stringify({ error: '缺少识别用户所需的`username`字段' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const fields = [];
	const values = [];

	if (name !== undefined) { fields.push('name = ?'); values.push(name); }
	if (contact !== undefined) { fields.push('contact = ?'); values.push(contact); }
	if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
	if (gender !== undefined) { fields.push('gender = ?'); values.push(gender); }
	if (age !== undefined) { fields.push('age = ?'); values.push(age); }

	if (fields.length === 0) {
		return new Response(JSON.stringify({ error: '没有提供任何可更新的资料' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
	values.push(username);

	const sql = `UPDATE users SET ${fields.join(', ')} WHERE username = ?`;

	try {
		const ps = env.DB.prepare(sql).bind(...values);
		const { success, meta } = await ps.run();

		if (!success || meta.changes === 0) {
			return new Response(JSON.stringify({ error: '找不到要更新的用户或数据未发生变化' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ message: '个人资料更新成功' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error('更新个人资料时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * 处理上传头像的请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
async function handleAvatarUpload(request, env) {
    const username = request.headers.get('x-user-username');
    if (!username) {
        return new Response(JSON.stringify({ error: '缺少 X-User-Username 请求头' }), { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('avatar');
        
        if (!file || typeof file === 'string') {
            return new Response(JSON.stringify({ error: '未找到头像文件' }), { status: 400 });
        }
        
        // 真实应用中，您会在这里将文件上传到R2等存储服务。
        // 为简化，我们仅在数据库中记录一个路径。
        const avatarPath = `/uploads/avatars/${username}_${Date.now()}.jpg`;

        const ps = env.DB.prepare('UPDATE users SET avatar_url = ? WHERE username = ?')
                         .bind(avatarPath, username);
        await ps.run();

        return new Response(JSON.stringify({
            message: '头像上传成功',
            avatar_url: avatarPath 
        }), { status: 200 });

    } catch(e) {
        console.error('上传头像时出错:', e);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), { status: 500 });
    }
} 
