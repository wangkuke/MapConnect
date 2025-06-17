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

const routes = {
	'GET /health': handleHealthCheck,
	'POST /register': handleRegister,
	'POST /login': handleLogin,
	'GET /markers': handleGetMarkers,
	'POST /markers': handleCreateMarker,
	// ... 其他路由
};

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		// Handle pre-flight requests for CORS
		if (method === 'OPTIONS') {
			return handleOptions();
		}

		try {
			let response;

			// --- API Routing ---

			// Health Check
			if (path === '/health' && method === 'GET') {
				response = await handleHealthCheck(request, env);
			}
			// Auth
			else if (path === '/register' && method === 'POST') {
				response = await handleRegister(request, env);
			} else if (path === '/login' && method === 'POST') {
				response = await handleLogin(request, env);
			}
			// Marker Routes
			else if (path.startsWith('/markers')) {
				const statusMatch = path.match(/^\/markers\/(\d+)\/status$/);
				const idMatch = path.match(/^\/markers\/(\d+)$/);
				const userMatch = path.match(/^\/markers\/([^\/]+)$/);

				if (statusMatch && method === 'PUT') {
					response = await handleUpdateMarkerStatus(request, env, statusMatch[1]);
				} else if (idMatch && method === 'PUT') {
					response = await handleUpdateMarker(request, env, idMatch[1]);
				} else if (idMatch && method === 'DELETE') {
					response = await handleDeleteMarker(request, env, idMatch[1]);
				} else if (userMatch && method === 'GET' && isNaN(parseInt(userMatch[1], 10))) {
					// Route for getting a user's markers, ensuring it's not a numeric ID
					response = await handleGetUserMarkers(request, env, userMatch[1]);
				} else if (path === '/markers' && method === 'GET') {
					response = await handleGetMarkers(request, env);
				} else if (path === '/markers' && method === 'POST') {
					response = await handleCreateMarker(request, env);
				}
			}
			// User/Profile Routes
			else if (path.startsWith('/users/')) {
				const userProfileMatch = path.match(/^\/users\/([^\/]+)$/);
				if (userProfileMatch && method === 'GET') {
					response = await handleGetUserProfile(request, env, userProfileMatch[1]);
				}
			} else if (path === '/profile' && method === 'PUT') {
				response = await handleUpdateProfile(request, env);
			} else if (path === '/avatar' && method === 'POST') {
				response = await handleAvatarUpload(request, env);
			}
			// Root
			else if (path === '/') {
				response = new Response('Hello from your User API! Database is connected.');
			}

			// If no route was matched, return 404
			if (!response) {
				response = new Response('Not Found', { status: 404 });
			}

			// Add CORS headers to the response
			return addCorsHeaders(response);

		} catch (error) {
			// Global error handler for any unhandled exceptions
			console.error('Unhandled API Error:', error);
			const errorResponse = new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
			return addCorsHeaders(errorResponse);
		}
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
		// 从数据库中查询所有公开的、有效的markers
		const ps = env.DB.prepare(
			`SELECT m.id, m.lat, m.lng, m.title, m.description, m.marker_type, m.contact,
			        u.name as user_name, u.username as user_username
			 FROM markers m
			 JOIN users u ON m.user_id = u.id
			 WHERE m.is_private = 0`
		);
		const { results } = await ps.all();

		return new Response(JSON.stringify(results), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});

	} catch (e) {
		console.error('获取markers时发生错误:', e);
		return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

/**
 * 处理创建marker的请求
 * @param {Request} request
 * @param {*} env
 * @returns {Response}
 */
async function handleCreateMarker(request, env) {
    let markerData;
    try {
        markerData = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: '无效的JSON格式' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const {
        user_id, title, description, lat, lng, latitude, longitude, type,
        marker_type, start_time, end_time, contact, cost, is_private, visibility
    } = markerData;

    // 支持两种参数格式：lat/lng 或 latitude/longitude
    const finalLat = latitude !== undefined ? latitude : lat;
    const finalLng = longitude !== undefined ? longitude : lng;

    // 更严格的验证
    if (!user_id) {
        return new Response(JSON.stringify({ error: '验证失败: 缺少 user_id' }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }
    if (!title || title.trim() === '') {
        return new Response(JSON.stringify({ error: '缺少必需字段: 标题' }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }
    if (!description || description.trim() === '') {
        return new Response(JSON.stringify({ error: '缺少必需字段: 详细描述' }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }
    if (finalLat === undefined || finalLng === undefined) {
        return new Response(JSON.stringify({ 
            error: '缺少坐标信息' 
        }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 根据visibility计算expires_at
    const now = new Date();
    let expires_at;
    if (visibility === 'three_days') {
        expires_at = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else { // 默认为 'today'
        expires_at = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    }

    try {
        const ps = env.DB.prepare(
            `INSERT INTO markers (user_id, title, description, lat, lng, type, marker_type, start_time, end_time, contact, cost, is_private, status, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            user_id, title, description || null, finalLat, finalLng, type || null,
            marker_type || 'personal', start_time || null, end_time || null,
            contact || null, cost || null, is_private ? 1 : 0, 'active', expires_at.toISOString()
        );

        await ps.run();

        return new Response(JSON.stringify({ 
            message: '标注创建成功',
            status: 'success',
            marker: {
                user_id,
                title,
                description,
                lat: finalLat,
                lng: finalLng,
                type,
                marker_type: marker_type || 'personal',
                contact: contact || null,
                is_private: is_private ? 1 : 0,
                expires_at: expires_at.toISOString()
            }
        }), { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error('创建标注时发生错误:', e);
        return new Response(JSON.stringify({ error: '发生内部服务器错误', details: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 处理获取单个用户所有markers的请求
 * @param {Request} request
 * @param {*} env
 * @param {string} username
 * @returns {Response}
 */
async function handleGetUserMarkers(request, env, username) {
    if (!username) {
        return new Response(JSON.stringify({ error: '必须提供用户名' }), { status: 400 });
    }
    try {
        const ps = env.DB.prepare(
            `SELECT m.*, u.username as user_username, u.name as user_name
             FROM markers m
             JOIN users u ON m.user_id = u.id
             WHERE u.username = ?`
        ).bind(username);
        const { results } = await ps.all();
        
        // 为每个标记添加一个默认的过期时间（如果它不存在）
        // 这是一个临时修复，理想情况下，应该在创建标记时就设置好它
        const markersWithExpiry = results.map(marker => {
            if (!marker.expires_at) {
                const createdAt = new Date(marker.created_at || Date.now());
                // 默认设置为创建后的3天过期
                marker.expires_at = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
            }
            return marker;
        });

        return new Response(JSON.stringify(markersWithExpiry), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error(`获取用户 ${username} 的markers时发生错误:`, e);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), { status: 500 });
    }
}

/**
 * 处理获取用户公开信息的请求
 * @param {Request} request
 * @param {*} env
 * @param {string} username
 * @returns {Response}
 */
async function handleGetUserProfile(request, env, username) {
    if (!username) {
        return new Response(JSON.stringify({ error: '必须提供用户名' }), { status: 400 });
    }
    try {
        const ps = env.DB.prepare(
            `SELECT id, username, name, avatar_url, bio, gender, age, created_at
             FROM users
             WHERE username = ?`
        ).bind(username);
        const user = await ps.first();

        if (!user) {
            return new Response(JSON.stringify({ error: '用户不存在' }), { status: 404 });
        }

        return new Response(JSON.stringify(user), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e) {
        console.error(`获取用户 ${username} 的资料时发生错误:`, e);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), { status: 500 });
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

// 健康检查端点处理函数
async function handleHealthCheck(request, env) {
    try {
        // 尝试对数据库执行简单查询，确认数据库连接正常
        const dbTest = await env.DB.prepare("SELECT 1 AS test").first();

        const response = {
            status: dbTest && dbTest.test === 1 ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            version: env.API_VERSION || '1.0.0',
            database: dbTest && dbTest.test === 1 ? 'connected' : 'error',
            // 如果环境变量中有备用API地址，则返回给客户端
            backup_api_url: env.BACKUP_API_URL || null
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            }
        });
    } catch (error) {
        const response = {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            version: env.API_VERSION || '1.0.0',
            database: 'error',
            // 即使出错也尝试返回备用API地址
            backup_api_url: env.BACKUP_API_URL || null
        };

        return new Response(JSON.stringify(response), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
            }
        });
    }
}

/**
 * 处理更新标记状态的请求
 * @param {Request} request
 * @param {*} env
 * @param {string} markerId 标记ID
 * @returns {Response}
 */
async function handleUpdateMarkerStatus(request, env, markerId) {
    if (!markerId) {
        return new Response(JSON.stringify({ error: '缺少标记ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let statusData;
    try {
        statusData = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: '无效的JSON格式' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { status } = statusData;
    if (!status) {
        return new Response(JSON.stringify({ error: '缺少状态信息' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 验证状态值是否有效
    const validStatuses = ['active', 'inactive', 'expired', 'pending', 'deleted'];
    if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({
            error: `无效的状态值。有效值为: ${validStatuses.join(', ')}`
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 先检查标记是否存在
        const checkPs = env.DB.prepare('SELECT * FROM markers WHERE id = ?').bind(markerId);
        const marker = await checkPs.first();

        if (!marker) {
            return new Response(JSON.stringify({ error: '找不到指定ID的标记' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 更新标记状态
        const updatePs = env.DB.prepare('UPDATE markers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                           .bind(status, markerId);
        const result = await updatePs.run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: '更新失败，标记可能不存在或状态未变更' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回更新后的标记信息
        const getUpdatedPs = env.DB.prepare('SELECT * FROM markers WHERE id = ?').bind(markerId);
        const updatedMarker = await getUpdatedPs.first();

        return new Response(JSON.stringify({
            message: '标记状态已更新',
            marker: updatedMarker
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('更新标记状态时出错:', error);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 处理更新标记信息的请求
 * @param {Request} request
 * @param {*} env
 * @param {string} markerId 标记ID
 * @returns {Response}
 */
async function handleUpdateMarker(request, env, markerId) {
    if (!markerId) {
        return new Response(JSON.stringify({ error: '缺少标记ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let markerData;
    try {
        markerData = await request.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: '无效的JSON格式' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 检查要更新的字段
    const {
        title, description, lat, lng, type,
        marker_type, start_time, end_time, contact, cost, is_private
    } = markerData;

    // 构建更新语句
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (lat !== undefined) { fields.push('lat = ?'); values.push(lat); }
    if (lng !== undefined) { fields.push('lng = ?'); values.push(lng); }
    if (type !== undefined) { fields.push('type = ?'); values.push(type); }
    if (marker_type !== undefined) { fields.push('marker_type = ?'); values.push(marker_type); }
    if (start_time !== undefined) { fields.push('start_time = ?'); values.push(start_time); }
    if (end_time !== undefined) { fields.push('end_time = ?'); values.push(end_time); }
    if (contact !== undefined) { fields.push('contact = ?'); values.push(contact); }
    if (cost !== undefined) { fields.push('cost = ?'); values.push(cost); }
    if (is_private !== undefined) { fields.push('is_private = ?'); values.push(is_private ? 1 : 0); }

    // 如果没有需要更新的字段
    if (fields.length === 0) {
        return new Response(JSON.stringify({ error: '没有提供需要更新的字段' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 添加更新时间和ID条件
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(markerId);

    const sql = `UPDATE markers SET ${fields.join(', ')} WHERE id = ?`;

    try {
        // 先检查标记是否存在
        const checkPs = env.DB.prepare('SELECT * FROM markers WHERE id = ?').bind(markerId);
        const marker = await checkPs.first();

        if (!marker) {
            return new Response(JSON.stringify({ error: '找不到指定ID的标记' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 更新标记
        const updatePs = env.DB.prepare(sql).bind(...values);
        const result = await updatePs.run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: '更新失败，标记可能不存在或数据未变更' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回更新后的标记信息
        const getUpdatedPs = env.DB.prepare('SELECT * FROM markers WHERE id = ?').bind(markerId);
        const updatedMarker = await getUpdatedPs.first();

        return new Response(JSON.stringify({
            message: '标记已更新',
            marker: updatedMarker
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('更新标记时出错:', error);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * 处理删除标记的请求
 * @param {Request} request
 * @param {*} env
 * @param {string} markerId 标记ID
 * @returns {Response}
 */
async function handleDeleteMarker(request, env, markerId) {
    if (!markerId) {
        return new Response(JSON.stringify({ error: '缺少标记ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 先检查标记是否存在
        const checkPs = env.DB.prepare('SELECT * FROM markers WHERE id = ?').bind(markerId);
        const marker = await checkPs.first();

        if (!marker) {
            return new Response(JSON.stringify({ error: '找不到指定ID的标记' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 可以选择真正删除或者标记为已删除
        // 选项1：真正删除记录
        const deletePs = env.DB.prepare('DELETE FROM markers WHERE id = ?').bind(markerId);
        const result = await deletePs.run();

        // 选项2：将状态标记为已删除（软删除）
        // const deletePs = env.DB.prepare('UPDATE markers SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(markerId);
        // const result = await deletePs.run();

        if (result.meta.changes === 0) {
            return new Response(JSON.stringify({ error: '删除失败，标记可能不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: '标记已成功删除',
            id: markerId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('删除标记时出错:', error);
        return new Response(JSON.stringify({ error: '发生内部服务器错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 
