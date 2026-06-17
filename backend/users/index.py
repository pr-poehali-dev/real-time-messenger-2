"""API: контакты, группы, статусы, поиск пользователей"""
import json, os
import psycopg2

S = 't_p56465226_real_time_messenger_'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Token',
}

def db():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    c = conn.cursor()
    c.execute(f"CREATE TABLE IF NOT EXISTS {S}.sessions (id SERIAL PRIMARY KEY, user_id INT NOT NULL, token TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW())")
    conn.commit(); c.close()
    return conn

def auth(cur, token):
    cur.execute(f"SELECT user_id FROM {S}.sessions WHERE token=%s", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method  = event.get('httpMethod', 'GET')
    params  = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    token   = headers.get('X-Token') or headers.get('x-token') or params.get('token', '')

    conn = db(); cur = conn.cursor()
    me = auth(cur, token)
    if not me:
        cur.close(); conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # ── GET contacts
    if method == 'GET' and params.get('action') == 'contacts':
        cur.execute(f"""
            SELECT u.id, u.name, u.phone, u.avatar_url, u.status, u.status_text, u.online
            FROM {S}.contacts c
            JOIN {S}.users u ON u.id = c.contact_id
            WHERE c.user_id=%s AND (u.is_deleted IS NULL OR u.is_deleted=FALSE)
            ORDER BY u.online DESC, u.name
        """, (me,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'contacts': [
                    {'id': r[0], 'name': r[1], 'phone': r[2] or '', 'avatar_url': r[3] or '',
                     'status': r[4] or 'online', 'status_text': r[5] or '', 'online': bool(r[6])}
                    for r in rows]})}

    # ── GET groups
    if method == 'GET' and params.get('action') == 'groups':
        cur.execute(f"""
            SELECT g.id, g.name, g.description, COUNT(gm2.user_id) as members
            FROM {S}.groups g
            JOIN {S}.group_members gm ON gm.group_id=g.id AND gm.user_id=%s
            JOIN {S}.group_members gm2 ON gm2.group_id=g.id
            GROUP BY g.id ORDER BY g.name
        """, (me,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'groups': [
                    {'id': r[0], 'name': r[1], 'desc': r[2] or '', 'members': r[3]}
                    for r in rows]})}

    # ── GET search
    if method == 'GET' and params.get('action') == 'search':
        q = params.get('q', '').strip()
        cur.execute(f"""
            SELECT id, name, phone, avatar_url, status, online
            FROM {S}.users
            WHERE (is_deleted IS NULL OR is_deleted=FALSE) AND id != %s
              AND (name ILIKE %s OR phone ILIKE %s)
            LIMIT 20
        """, (me, f'%{q}%', f'%{q}%'))
        rows = cur.fetchall()
        cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'users': [
                    {'id': r[0], 'name': r[1], 'phone': r[2] or '', 'avatar_url': r[3] or '',
                     'status': r[4] or 'online', 'online': bool(r[5])}
                    for r in rows]})}

    # ── POST
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        act  = body.get('action')

        if act == 'add_contact':
            cid = body.get('contact_id')
            cur.execute(f"INSERT INTO {S}.contacts (user_id, contact_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (me, cid))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        if act == 'create_group':
            name = body.get('name', '').strip()
            desc = body.get('description', '')
            mids = body.get('member_ids', [])
            cur.execute(f"INSERT INTO {S}.groups (name, description, created_by) VALUES (%s,%s,%s) RETURNING id",
                        (name, desc, me))
            gid = cur.fetchone()[0]
            for uid in list(set([me] + mids)):
                cur.execute(f"INSERT INTO {S}.group_members (group_id, user_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (gid, uid))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True, 'group_id': gid})}

        if act == 'update_status':
            cur.execute(f"UPDATE {S}.users SET status=%s, status_text=%s WHERE id=%s",
                        (body.get('status', 'online'), body.get('status_text', ''), me))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown'})}