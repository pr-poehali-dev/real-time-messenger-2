"""API пользователей: контакты, статусы, группы"""
import json, os
import psycopg2

SCHEMA = 't_p56465226_real_time_messenger_'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    path   = event.get('path', '/')

    conn = db(); cur = conn.cursor()

    # GET /users/ — список контактов пользователя
    if method == 'GET' and params.get('action') == 'contacts':
        user_id = params.get('user_id', '1')
        cur.execute(f"""
            SELECT u.id, u.name, u.phone, u.avatar_url, u.status, u.status_text, u.online
            FROM {SCHEMA}.contacts c
            JOIN {SCHEMA}.users u ON u.id = c.contact_id
            WHERE c.user_id = %s
            ORDER BY u.online DESC, u.name
        """, (user_id,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        contacts = [{'id': r[0], 'name': r[1], 'phone': r[2], 'avatar_url': r[3],
                     'status': r[4], 'status_text': r[5] or '', 'online': r[6]} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'contacts': contacts})}

    # GET /users/ — все пользователи (для поиска)
    if method == 'GET' and params.get('action') == 'all':
        cur.execute(f"SELECT id, name, phone, avatar_url, status, online FROM {SCHEMA}.users ORDER BY name")
        rows = cur.fetchall()
        cur.close(); conn.close()
        users = [{'id': r[0], 'name': r[1], 'phone': r[2], 'avatar_url': r[3],
                  'status': r[4], 'online': r[5]} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

    # GET /users/ — группы пользователя
    if method == 'GET' and params.get('action') == 'groups':
        user_id = params.get('user_id', '1')
        cur.execute(f"""
            SELECT g.id, g.name, g.description, g.avatar_url,
                   COUNT(gm2.user_id) as members
            FROM {SCHEMA}.groups g
            JOIN {SCHEMA}.group_members gm ON gm.group_id = g.id AND gm.user_id = %s
            JOIN {SCHEMA}.group_members gm2 ON gm2.group_id = g.id
            GROUP BY g.id ORDER BY g.name
        """, (user_id,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        groups = [{'id': r[0], 'name': r[1], 'desc': r[2] or '', 'avatar_url': r[3], 'members': r[4]} for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'groups': groups})}

    # POST — добавить контакт
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'add_contact':
            user_id = body.get('user_id', 1)
            name    = body.get('name', '')
            phone   = body.get('phone', '')
            # создаём нового пользователя если не существует
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE phone = %s", (phone,))
            existing = cur.fetchone()
            if existing:
                contact_id = existing[0]
            else:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.users (name, phone, status, online)
                    VALUES (%s, %s, 'online', FALSE) RETURNING id
                """, (name, phone))
                contact_id = cur.fetchone()[0]
            cur.execute(f"""
                INSERT INTO {SCHEMA}.contacts (user_id, contact_id)
                VALUES (%s, %s) ON CONFLICT DO NOTHING
            """, (user_id, contact_id))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'contact_id': contact_id, 'ok': True})}

        if action == 'create_group':
            user_id     = body.get('user_id', 1)
            name        = body.get('name', '')
            description = body.get('description', '')
            member_ids  = body.get('member_ids', [])
            cur.execute(f"""
                INSERT INTO {SCHEMA}.groups (name, description, created_by)
                VALUES (%s, %s, %s) RETURNING id
            """, (name, description, user_id))
            group_id = cur.fetchone()[0]
            all_members = list(set([user_id] + member_ids))
            for mid in all_members:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.group_members (group_id, user_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                """, (group_id, mid))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS,
                    'body': json.dumps({'group_id': group_id, 'ok': True})}

        if action == 'update_status':
            user_id     = body.get('user_id', 1)
            status      = body.get('status', 'online')
            status_text = body.get('status_text', '')
            cur.execute(f"""
                UPDATE {SCHEMA}.users
                SET status=%s, status_text=%s, online=TRUE, last_seen=NOW()
                WHERE id=%s
            """, (status, status_text, user_id))
            conn.commit(); cur.close(); conn.close()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    cur.close(); conn.close()
    return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'unknown action'})}
