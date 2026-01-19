DROP TABLE IF EXISTS markers;
DROP TABLE IF EXISTS users;
CREATE TABLE users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    contact TEXT,
    bio TEXT,
    gender TEXT CHECK(gender IN ('male', 'female', 'secret')),
    age INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'user'
);
INSERT INTO users VALUES(1,'1','6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b','1@1.com','张三','/uploads/default_avatar.png','1234567890','我是张三，一个热爱编程的开发者。','male',25,'2024-06-16 11:24:26','2024-06-16 11:24:26','user');
INSERT INTO users VALUES(2,'2','d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35','2@2.com','李四',NULL,NULL,NULL,'female',30,'2024-06-16 11:24:26','2024-06-16 11:24:26','user');
INSERT INTO users VALUES(3,'admin','8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918','admin@example.com','管理员',NULL,NULL,NULL,'secret',99,'2024-06-16 11:24:26','2024-06-16 11:24:26','admin');
CREATE TABLE markers(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    type TEXT,
    marker_type TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    contact TEXT,
    cost REAL,
    is_private BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
