"""Регистрация и авторизация пользователей"""
import json, os, hashlib, secrets
import psycopg2

S = 't_p56465226_real_time_messenger_'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Token',
}

def db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS {S}.sessions (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_sess_token ON {S}.sessions(token)")
    cur.execute(f"ALTER TABLE {S}.users ADD COLUMN IF NOT EXISTS password_hash TEXT")
    cur.execute(f"ALTER TABLE {S}.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE")
    conn.commit()
    cur.close()
    return conn

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    conn = db()
    cur = conn.cursor()

    # ── Регистрация
    if action == 'register':
        name  = (body.get('name') or '').strip()
        phone = (body.get('phone') or '').strip()
        pw    = (body.get('password') or '').strip()
        if not name or not phone or not pw:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
        if len(pw) < 6:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

        cur.execute(f"SELECT id FROM {S}.users WHERE phone=%s AND (is_deleted IS NULL OR is_deleted=FALSE)", (phone,))
        if cur.fetchone():
            cur.close(); conn.close()
            return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Телефон уже зарегистрирован'})}

        cur.execute(f"""
            INSERT INTO {S}.users (name, phone, password_hash, status, online, is_deleted)
            VALUES (%s, %s, %s, 'online', TRUE, FALSE) RETURNING id, name, phone, avatar_url, status
        """, (name, phone, hash_pw(pw)))
        row = cur.fetchone()
        user = {'id': row[0], 'name': row[1], 'phone': row[2], 'avatar_url': row[3], 'status': row[4]}

        token = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {S}.sessions (user_id, token) VALUES (%s,%s)", (user['id'], token))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'ok': True, 'token': token, 'user': user})}

    # ── Вход
    if action == 'login':
        phone = (body.get('phone') or '').strip()
        pw    = (body.get('password') or '').strip()
        cur.execute(f"""
            SELECT id, name, phone, avatar_url, status FROM {S}.users
            WHERE phone=%s AND password_hash=%s AND (is_deleted IS NULL OR is_deleted=FALSE)
        """, (phone, hash_pw(pw)))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный телефон или пароль'})}
        user = {'id': row[0], 'name': row[1], 'phone': row[2], 'avatar_url': row[3], 'status': row[4]}

        cur.execute(f"UPDATE {S}.users SET online=TRUE WHERE id=%s", (user['id'],))
        token = secrets.token_hex(32)
        cur.execute(f"INSERT INTO {S}.sessions (user_id, token) VALUES (%s,%s) ON CONFLICT DO NOTHING", (user['id'], token))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'ok': True, 'token': token, 'user': user})}

    # ── Проверка токена
    if action == 'me':
        token = (body.get('token') or '').strip()
        cur.execute(f"""
            SELECT u.id, u.name, u.phone, u.avatar_url, u.status, u.status_text
            FROM {S}.sessions s JOIN {S}.users u ON u.id = s.user_id
            WHERE s.token=%s AND (u.is_deleted IS NULL OR u.is_deleted=FALSE)
        """, (token,))
        row = cur.fetchone()
        cur.close(); conn.close()
        if not row:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'user': {'id': row[0], 'name': row[1], 'phone': row[2],
                                             'avatar_url': row[3], 'status': row[4], 'status_text': row[5] or ''}})}

    # ── Выход
    if action == 'logout':
        token = (body.get('token') or '').strip()
        cur.execute(f"UPDATE {S}.users SET online=FALSE WHERE id=(SELECT user_id FROM {S}.sessions WHERE token=%s)", (token,))
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Unknown action'})}
