import sqlite3
import datetime

conn = sqlite3.connect('mapconnect.db')
cursor = conn.execute('SELECT id, title, status, expires_at, created_at FROM markers')
rows = cursor.fetchall()

print(f'总标注数: {len(rows)}')
print('\n标注详情:')
for row in rows:
    print(f'ID: {row[0]}, 标题: {row[1]}, 状态: {row[2]}, 过期时间: {row[3]}, 创建时间: {row[4]}')

# 检查当前时间
now = datetime.datetime.now(datetime.UTC)
print(f'\n当前时间: {now}')

# 检查哪些标注已过期
print('\n过期标注:')
for row in rows:
    if row[3]:  # expires_at 不为空
        expires_at = datetime.datetime.fromisoformat(row[3].replace('Z', '+00:00'))
        if expires_at < now:
            print(f'ID: {row[0]}, 标题: {row[1]} - 已过期')

conn.close() 