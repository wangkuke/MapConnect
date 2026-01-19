import requests
import sqlite3
import datetime
import os
from flask import Flask, jsonify, request, send_from_directory, redirect
from flask_cors import CORS
from functools import wraps
from urllib.parse import unquote
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev_key_for_mapconnect_12345') # Required for session cookies
# Configure session cookies to avoid browser warnings about Cross-Site requests
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True # Required when SameSite is None

# Allow CORS for all domains on all routes, supports credentials
# This is required because we are running frontend on 8000 and backend on 5000
CORS(app, supports_credentials=True)

# WeChat Configuration (Replace with real credentials or set via environment variables)
WECHAT_APP_ID = os.environ.get('WECHAT_APP_ID', 'YOUR_APP_ID')
WECHAT_APP_SECRET = os.environ.get('WECHAT_APP_SECRET', 'YOUR_APP_SECRET')

DATABASE = 'mapconnect.db'
UPLOAD_FOLDER = 'uploads/avatars'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_db_connection():
    """Creates a database connection."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    return conn

def init_db():
    """Initializes the database and creates the markers table if it doesn't exist."""
    with app.app_context():
        conn = get_db_connection()
        with conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS markers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    contact TEXT,
                    marker_type TEXT NOT NULL,
                    visibility TEXT NOT NULL,
                    lat REAL NOT NULL,
                    lng REAL NOT NULL,
                    user_username TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    status TEXT NOT NULL DEFAULT 'active'
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT,
                    contact TEXT,
                    bio TEXT,
                    gender TEXT DEFAULT 'secret',
                    age INTEGER,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    avatar_url TEXT
                )
            ''')
            
            # Simple migration: rename phone to contact if it exists
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(users)")
            columns = [row[1] for row in cursor.fetchall()]
            if 'phone' in columns and 'contact' not in columns:
                conn.execute('ALTER TABLE users RENAME COLUMN phone TO contact;')
                print("Migrated 'users' table: renamed 'phone' to 'contact'.")

            # Add avatar_url column to users table if it doesn't exist for backward compatibility
            if 'avatar_url' not in columns:
                conn.execute('ALTER TABLE users ADD COLUMN avatar_url TEXT')
                print("Added 'avatar_url' column to 'users' table.")
            
            # Add role column to users table if it doesn't exist
            if 'role' not in columns:
                # Default to 'user' role for existing users
                conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
                print("Added 'role' column to 'users' table.")
            
        conn.commit()  # Explicitly commit the changes to the database file
        conn.close()
        print("Database initialized and 'markers' and 'users' tables created.")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Expecting username in a custom header for simplicity.
        # In a real-world app, a token-based system (e.g., JWT) would be better.
        username = request.headers.get('X-User-Username')
        if not username:
            return jsonify({'error': 'Authentication required: Missing username header'}), 401

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

        if not user:
            return jsonify({'error': 'Authentication failed: User not found'}), 401
        
        # You could attach the user object to the request context if needed
        # g.user = user 
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- API Endpoints ---

@app.route('/api', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify API is online."""
    return jsonify({
        'status': 'online', 
        'timestamp': datetime.datetime.now(datetime.UTC).isoformat(),
        'version': '1.0'
    })

@app.route('/api/markers', methods=['GET'])
def get_markers():
    """API endpoint to get all markers from the database."""
    # 首先自动检查并更新过期标注的状态
    auto_update_expired_markers()
    
    conn = get_db_connection()
    markers_cursor = conn.execute('''
        SELECT m.*, u.name as user_name 
        FROM markers m
        JOIN users u ON m.user_username = u.username
        WHERE m.expires_at > ? AND m.status = ? 
        ORDER BY m.created_at DESC
    ''', (datetime.datetime.now(datetime.UTC), 'active'))
    markers = [dict(row) for row in markers_cursor.fetchall()]
    conn.close()
    return jsonify(markers)

def auto_update_expired_markers():
    """自动检查并更新过期标注的状态为inactive"""
    conn = get_db_connection()
    now = datetime.datetime.now(datetime.UTC)
    
    # 查找所有已过期但状态仍为active的标注
    expired_cursor = conn.execute('''
        SELECT id, title, user_username, expires_at 
        FROM markers 
        WHERE expires_at <= ? AND status = 'active'
    ''', (now,))
    expired_markers = expired_cursor.fetchall()
    
    updated_count = 0
    for marker in expired_markers:
        # 更新状态为inactive
        conn.execute('''
            UPDATE markers 
            SET status = 'inactive' 
            WHERE id = ?
        ''', (marker[0],))
        updated_count += 1
        print(f"自动过期: 标注ID {marker[0]} '{marker[1]}' (用户: {marker[2]}) 已过期，状态已更新为inactive")
    
    conn.commit()
    conn.close()
    
    if updated_count > 0:
        print(f"自动状态更新完成: 共更新 {updated_count} 个过期标注的状态")
    
    return updated_count

@app.route('/api/markers/<username>', methods=['GET'])
@login_required
def get_user_markers(username):
    """API endpoint to get all markers for a specific user."""
    # Security check: ensure the requester is the user whose markers are being requested
    requester_username = request.headers.get('X-User-Username')
    if requester_username != username:
        return jsonify({'error': 'Forbidden: You can only view your own markers.'}), 403

    # Ensure expired markers are updated before fetching
    auto_update_expired_markers()

    conn = get_db_connection()
    # For "my-markers" page, we want to see both active and inactive markers, so we don't filter by status here.
    # We will still filter by expiration, unless we want to show expired ones too. Let's show all for management.
    markers_cursor = conn.execute('''
        SELECT m.*, u.name as user_name
        FROM markers m
        JOIN users u ON m.user_username = u.username
        WHERE m.user_username = ? ORDER BY m.created_at DESC
    ''', (username,))
    markers = [dict(row) for row in markers_cursor.fetchall()]
    conn.close()
    return jsonify(markers)

@app.route('/api/markers', methods=['POST'])
@login_required
def add_marker():
    """API endpoint to add a new marker to the database."""
    new_marker = request.get_json()

    # Basic validation
    if not all(k in new_marker for k in ['title', 'description', 'marker_type', 'lat', 'lng', 'user_username']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    user_username = new_marker.get('user_username')
    requester_username = request.headers.get('X-User-Username')

    # Security check: Ensure the user is not posting on behalf of someone else
    if user_username != requester_username:
        return jsonify({'error': 'Forbidden: You can only create markers for yourself.'}), 403
    
    conn = get_db_connection()

    # 1. 获取当前用户角色
    user = conn.execute('SELECT role FROM users WHERE username = ?', (user_username,)).fetchone()
    user_role = user['role'] if user else 'user'

    # 2. 权限检查：仅管理员可使用 'official' 和 'charity' 类型
    marker_type = new_marker.get('marker_type')
    if marker_type in ['official', 'charity'] and user_role != 'admin':
        conn.close()
        return jsonify({'error': f'Forbidden: Only admins can create {marker_type} markers.'}), 403

    # Check active marker limit for the user
    # 3. 数量限制检查：管理员无限制，普通用户限3个
    if user_role != 'admin':
        active_markers_count_cursor = conn.execute(
            'SELECT COUNT(*) FROM markers WHERE user_username = ? AND status = ?',
            (user_username, 'active')
        )
        active_markers_count = active_markers_count_cursor.fetchone()[0]
        
        if active_markers_count >= 3:
            conn.close()
            return jsonify({'error': 'You have reached the maximum limit of 3 active markers.'}), 403 # 403 Forbidden

    visibility = new_marker.get('visibility', 'today')
    now = datetime.datetime.now(datetime.UTC)
    expires_at = None

    if visibility == 'today':
        # Expires at the end of the current UTC day
        expires_at = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif visibility == 'three_days':
        expires_at = now + datetime.timedelta(days=3)
    else:
        # Default fallback or for old types - maybe expire in 1 year?
        expires_at = now + datetime.timedelta(days=365)

    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO markers (title, description, contact, marker_type, visibility, lat, lng, user_username, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        new_marker.get('title'),
        new_marker.get('description'),
        new_marker.get('contact', ''), # Default to empty string if not provided
        new_marker.get('marker_type'),
        visibility,
        new_marker.get('lat'),
        new_marker.get('lng'),
        new_marker.get('user_username'),
        expires_at
    ))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'id': new_id, 'message': 'Marker added successfully'}), 201

@app.route('/api/register', methods=['POST'])
def register_user():
    """API endpoint for user registration."""
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username']
    email = data['email']
    password = data['password'] # In a real app, hash this!

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password, name, contact, bio, gender, age) VALUES (?, ?, ?, ?, '', '', 'secret', NULL)",
            (username, email, password, username) # Added username as default name
        )
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({'id': user_id, 'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 409 # 409 Conflict
    except Exception as e:
        print(f"Register Error: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login_user():
    """API endpoint for user login."""
    data = request.get_json()
    if not data or not (data.get('username') or data.get('email')) or not data.get('password'):
        return jsonify({'error': 'Missing credentials'}), 400
    
    identifier = data.get('username') or data.get('email')
    password = data.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?",
        (identifier, identifier, password)
    )
    user_row = cursor.fetchone()
    conn.close()

    if user_row:
        user = dict(user_row)
        # Never send the password back to the client
        del user['password']
        return jsonify({'user': user, 'message': 'Login successful'})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401 # 401 Unauthorized

@app.route('/api/wechat-login', methods=['POST'])
def wechat_login():
    """Handle WeChat Login: Exchange code for access_token and get user info."""
    data = request.get_json()
    code = data.get('code')
    
    if not code:
        return jsonify({'error': 'Missing code parameter'}), 400

    # --- MOCK MODE FOR DEV WITHOUT CREDENTIALS ---
    # Since we likely don't have a real AppID/Secret configured, allow a "mock" login
    if code.startswith('mock_code_'):
        # Simulate a successful WeChat login
        mock_openid = f"mock_openid_{code}"
        user_info = {
            'openid': mock_openid,
            'nickname': f'WeChatUser_{code[-4:]}',
            'sex': 1,
            'headimgurl': '', # Could use a placeholder
            'unionid': f'mock_unionid_{code}'
        }
        return handle_wechat_user(user_info)
    # ---------------------------------------------

    # Real WeChat Flow
    if WECHAT_APP_ID == 'YOUR_APP_ID':
         return jsonify({'error': 'WeChat AppID not configured on server'}), 500

    try:
        # 1. Exchange code for access_token
        token_url = f"https://api.weixin.qq.com/sns/oauth2/access_token?appid={WECHAT_APP_ID}&secret={WECHAT_APP_SECRET}&code={code}&grant_type=authorization_code"
        token_res = requests.get(token_url)
        token_data = token_res.json()

        if 'errcode' in token_data:
            return jsonify({'error': f"WeChat Token Error: {token_data.get('errmsg')}"}), 400

        access_token = token_data['access_token']
        openid = token_data['openid']

        # 2. Get User Info
        info_url = f"https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}"
        info_res = requests.get(info_url)
        user_info = info_res.json()

        if 'errcode' in user_info:
             return jsonify({'error': f"WeChat UserInfo Error: {user_info.get('errmsg')}"}), 400

        return handle_wechat_user(user_info)

    except Exception as e:
        print(f"WeChat Login Exception: {e}")
        return jsonify({'error': 'Internal server error during WeChat login'}), 500

def handle_wechat_user(wechat_info):
    """Helper to find or create a user based on WeChat info."""
    openid = wechat_info.get('openid')
    unionid = wechat_info.get('unionid') # Preferred if available
    
    # We use openid (or unionid) as the unique identifier linkage
    # In this simple DB, we might store it in a new column or just map it to username
    # For simplicity, we'll prefix username with 'wx_' + openid
    
    # Check if user exists
    conn = get_db_connection()
    # Ideally, we should have a `wechat_openid` column. 
    # Let's check if we can add it dynamically or just use a convention.
    # Convention: username = wx_{openid}
    
    username = f"wx_{openid}"
    
    try:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if not user:
            # Register new user
            # We need to ensure username is unique and fits schema
            nickname = wechat_info.get('nickname', 'WeChat User')
            # Handle emoji in nickname? sqlite might handle it, but safer to strip or encode
            
            avatar_url = wechat_info.get('headimgurl', '')
            gender_map = {1: 'male', 2: 'female'}
            gender = gender_map.get(wechat_info.get('sex'), 'secret')
            
            # Create a random password for this auto-created account
            import secrets
            random_password = secrets.token_urlsafe(16)
            
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (username, email, password, name, contact, bio, gender, avatar_url) VALUES (?, ?, ?, ?, '', 'WeChat Login User', ?, ?)",
                (username, f"{username}@wechat.placeholder", random_password, nickname, gender, avatar_url)
            )
            conn.commit()
            user_id = cursor.lastrowid
            
            # Fetch the newly created user
            user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
            
        # 将 row 对象转换为 dict
        user_dict = dict(user)
        if 'password' in user_dict:
            del user_dict['password']
            
        return jsonify({'user': user_dict, 'message': 'WeChat login successful'})

    except sqlite3.IntegrityError as e:
        print(f"Database Integrity Error: {e}")
        return jsonify({'error': 'Database error: User likely already exists with conflict'}), 500
    except Exception as e:
        import traceback
        traceback.print_exc() # 在控制台打印完整的错误堆栈
        print(f"WeChat Login Detailed Error: {e}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/users/<string:username>', methods=['GET'])
def get_user_profile(username):
    """API endpoint to get a user's public profile."""
    conn = get_db_connection()
    user_cursor = conn.execute(
        'SELECT username, name, bio, gender, age, created_at, avatar_url FROM users WHERE username = ?',
        (username,)
    )
    user = user_cursor.fetchone()
    conn.close()

    if user:
        return jsonify(dict(user))
    else:
        return jsonify({'error': 'User not found'}), 404

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    """API endpoint to update user profile."""
    data = request.get_json()
    username = data.get('username') # Username is used to identify the user

    if not username:
        return jsonify({'error': 'Username is required to update profile'}), 400

    # These are the fields we allow to be updated
    allowed_fields = ['name', 'contact', 'bio', 'gender', 'age']
    update_fields = {key: data[key] for key in allowed_fields if key in data}

    # Explicitly remove username from the update data if it exists
    if 'username' in update_fields:
        del update_fields['username']

    if not update_fields:
        return jsonify({'error': 'No fields to update'}), 400

    set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
    values = list(update_fields.values())
    values.append(username)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE users SET {set_clause} WHERE username = ?",
            tuple(values)
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/markers/<int:marker_id>/status', methods=['PUT'])
@login_required
def update_marker_status(marker_id):
    """API endpoint to update a marker's status (active/inactive)."""
    data = request.get_json()
    new_status = data.get('status')

    if new_status not in ['active', 'inactive']:
        return jsonify({'error': 'Invalid status value'}), 400

    requester_username = request.headers.get('X-User-Username')
    conn = get_db_connection()
    
    # Security Check: Verify that the user owns the marker they are trying to update
    marker_to_update = conn.execute('SELECT user_username FROM markers WHERE id = ?', (marker_id,)).fetchone()
    if not marker_to_update:
        conn.close()
        return jsonify({'error': 'Marker not found'}), 404
        
    if marker_to_update['user_username'] != requester_username:
        conn.close()
        return jsonify({'error': 'Forbidden: You can only update your own markers.'}), 403

    cursor = conn.cursor()
    cursor.execute('UPDATE markers SET status = ? WHERE id = ?', (new_status, marker_id))
    conn.commit()
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Marker not found'}), 404

    conn.close()
    return jsonify({'message': f'Marker {marker_id} status updated to {new_status}'}), 200

@app.route('/api/profile/avatar', methods=['POST'])
@login_required
def upload_avatar():
    username = request.headers.get('X-User-Username')
    
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['avatar']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if file and allowed_file(file.filename):
        # Get old avatar URL to delete the file later
        conn = get_db_connection()
        old_avatar_row = conn.execute('SELECT avatar_url FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

        # Create a unique filename based on username and timestamp, ensuring it's a .jpg
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        base_filename = f"{username}_{timestamp}"
        new_filename = f"{base_filename}.jpg"
        
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

        try:
            with Image.open(file.stream) as img:
                # Crop the image to a square from the center
                width, height = img.size
                if width != height:
                    short_dim = min(width, height)
                    left = (width - short_dim) / 2
                    top = (height - short_dim) / 2
                    right = (width + short_dim) / 2
                    bottom = (height + short_dim) / 2
                    img = img.crop((left, top, right, bottom))
                
                # Resize to 800x800 and convert to RGB
                img_resized = img.resize((800, 800), Image.Resampling.LANCZOS)
                if img_resized.mode != 'RGB':
                    img_resized = img_resized.convert('RGB')
                
                img_resized.save(file_path, 'JPEG', quality=90)
        except Exception as e:
            return jsonify({'error': f'Image processing failed: {str(e)}'}), 500
        
        avatar_url = f'/uploads/avatars/{new_filename}'

        # Update the database
        conn = get_db_connection()
        conn.execute('UPDATE users SET avatar_url = ? WHERE username = ?', (avatar_url, username))
        conn.commit()
        conn.close()

        # Delete the old avatar file if it existed
        if old_avatar_row and old_avatar_row['avatar_url']:
            # Construct absolute path for the old file to ensure it's found correctly
            old_avatar_path_rel = old_avatar_row['avatar_url'].lstrip('/\\')
            old_avatar_path_abs = os.path.join(os.path.dirname(os.path.abspath(__file__)), old_avatar_path_rel)
            if os.path.exists(old_avatar_path_abs):
                try:
                    os.remove(old_avatar_path_abs)
                except Exception as e:
                    print(f"Error deleting old avatar file: {e}")

        return jsonify({'message': 'Avatar updated successfully', 'avatar_url': avatar_url}), 200
    else:
        return jsonify({'error': 'File type not allowed'}), 400

# --- File Serving ---

@app.route('/uploads/avatars/<filename>')
def uploaded_avatar(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/uploads/avatars/<filename>')
def api_uploaded_avatar(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Initialize the database when the app starts
init_db()

# --- Admin-specific logic ---

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # In a real app, you'd get the current user from a session or token.
        # Here, we'll expect the client to send the admin's username for verification.
        admin_username = request.headers.get('X-Admin-Username')
        if not admin_username:
            return jsonify({"error": "Admin username required"}), 401
            
        # 解码可能编码过的用户名
        try:
            admin_username = unquote(admin_username)
        except:
            pass  # 如果解码失败，使用原始值

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ? AND role = ?', 
                            (admin_username, 'admin')).fetchone()
        conn.close()

        if user is None:
            return jsonify({"error": "Unauthorized: Not an admin"}), 403
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/admin/all-markers', methods=['GET'])
@admin_required
def get_all_markers():
    """Admin endpoint to get all markers, regardless of status or expiration."""
    conn = get_db_connection()
    markers_cursor = conn.execute('''
        SELECT m.*, u.name as user_name
        FROM markers m
        JOIN users u ON m.user_username = u.username
        ORDER BY m.created_at DESC
    ''')
    markers = [dict(row) for row in markers_cursor.fetchall()]
    conn.close()
    return jsonify(markers)

@app.route('/api/admin/markers/<int:marker_id>', methods=['PUT'])
@admin_required
def admin_update_marker(marker_id):
    """Admin endpoint to update any marker."""
    data = request.get_json()
    
    # Fields that an admin is allowed to update
    allowed_fields = ['title', 'description', 'contact', 'marker_type', 'visibility', 'status']
    update_fields = {key: data[key] for key in allowed_fields if key in data}

    if not update_fields:
        return jsonify({'error': 'No valid fields to update'}), 400

    set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
    values = list(update_fields.values())
    values.append(marker_id)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE markers SET {set_clause} WHERE id = ?", tuple(values))
    conn.commit()

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Marker not found'}), 404

    conn.close()
    return jsonify({'message': f'Marker {marker_id} updated successfully by admin.'}), 200

@app.route('/api/admin/markers/<int:marker_id>', methods=['DELETE'])
@admin_required
def admin_delete_marker(marker_id):
    """Admin endpoint to delete any marker."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM markers WHERE id = ?', (marker_id,))
    conn.commit()

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Marker not found'}), 404
        
    conn.close()
    return jsonify({'message': f'Marker {marker_id} deleted successfully by admin.'}), 200

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_admin_stats():
    """Admin endpoint to get various statistics for the dashboard."""
    conn = get_db_connection()
    total_markers = conn.execute('SELECT COUNT(*) FROM markers').fetchone()[0]
    total_users = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    
    # Calculate daily new markers
    today_start = datetime.datetime.now(datetime.timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    daily_new_markers = conn.execute('SELECT COUNT(*) FROM markers WHERE created_at >= ?', (today_start,)).fetchone()[0]
    
    # Calculate expired markers (those that have passed their expiration time)
    now = datetime.datetime.now(datetime.UTC)
    expired_markers = conn.execute('SELECT COUNT(*) FROM markers WHERE expires_at <= ?', (now,)).fetchone()[0]

    conn.close()
    return jsonify({
        'total_markers': total_markers,
        'total_users': total_users,
        'daily_new_markers': daily_new_markers,
        'expired_markers': expired_markers
    })

# --- User Management by Admin ---

@app.route('/api/admin/all-users', methods=['GET'])
@admin_required
def get_all_users():
    """Admin endpoint to get all users."""
    conn = get_db_connection()
    # Selecting fields, excluding password
    users_cursor = conn.execute('SELECT id, username, email, name, contact, role, created_at, avatar_url FROM users ORDER BY created_at DESC')
    users = [dict(row) for row in users_cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def admin_update_user(user_id):
    """Admin endpoint to update a user's details."""
    data = request.get_json()
    
    # Admins should not be able to change passwords or emails here for security.
    allowed_fields = ['name', 'contact', 'role']
    update_fields = {key: data[key] for key in allowed_fields if key in data}

    if not update_fields:
        return jsonify({'error': 'No valid fields to update'}), 400
    
    # Prevent admin from accidentally locking themselves out
    if 'role' in update_fields and update_fields['role'] != 'admin':
        admin_username = unquote(request.headers.get('X-Admin-Username'))
        conn_check = get_db_connection()
        user_to_update = conn_check.execute('SELECT username FROM users WHERE id = ?', (user_id,)).fetchone()
        is_self_demotion = user_to_update and user_to_update['username'] == admin_username
        
        if is_self_demotion:
            # Check if there are other admins
            other_admins = conn_check.execute('SELECT COUNT(*) FROM users WHERE role = ? AND id != ?', ('admin', user_id)).fetchone()[0]
            if other_admins == 0:
                conn_check.close()
                return jsonify({'error': 'Cannot demote the last admin.'}), 403
        conn_check.close()

    set_clause = ", ".join([f"{key} = ?" for key in update_fields.keys()])
    values = list(update_fields.values())
    values.append(user_id)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE users SET {set_clause} WHERE id = ?", tuple(values))
    conn.commit()

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

    conn.close()
    return jsonify({'message': f'User {user_id} updated successfully by admin.'}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def admin_delete_user(user_id):
    """Admin endpoint to delete a user."""
    admin_username = unquote(request.headers.get('X-Admin-Username'))
    
    conn = get_db_connection()
    user_to_delete = conn.execute('SELECT username FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user_to_delete:
        conn.close()
        return jsonify({'error': 'User not found'}), 404
        
    if user_to_delete['username'] == admin_username:
        conn.close()
        return jsonify({'error': 'Admin cannot delete themselves.'}), 403

    # Also delete user's markers to maintain database integrity
    conn.execute('DELETE FROM markers WHERE user_username = ?', (user_to_delete['username'],))
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()

    conn.close()
    return jsonify({'message': f'User {user_id} and their markers deleted successfully by admin.'}), 200

if __name__ == '__main__':
    # Running on port 5000 to avoid conflict with the frontend server
    app.run(debug=True, port=5000) 