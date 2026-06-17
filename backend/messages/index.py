"""API сообщений: получение и отправка в реальном времени"""
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

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    token = headers.get('X-Token') or headers.get('x-token') or params.get('token', '')

    conn = db()
    cur = conn.cursor()
    me = auth(cur, token)
    if not me:
        cur.close(); conn.close()
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    # GET — получить сообщения чата
    if method == 'GET':
        chat_type = params.get('chat_type', 'direct')
        peer_id   = params.get('peer_id')
        group_id  = params.get('group_id')
        since_id  = int(params.get('since_id', '0'))

        if chat_type == 'direct' and peer_id:
            cur.execute(f"""
                SELECT m.id, m.from_user_id, u.name, u.avatar_url,
                       m.msg_type, m.text, m.file_url, m.file_name, m.voice_dur,
                       to_char(m.created_at, 'HH24:MI') as t
                FROM {S}.messages m
                JOIN {S}.users u ON u.id = m.from_user_id
                WHERE m.chat_type='direct'
                  AND ((m.from_user_id=%s AND m.to_user_id=%s)
                    OR (m.from_user_id=%s AND m.to_user_id=%s))
                  AND m.id > %s
                ORDER BY m.created_at ASC LIMIT 200
            """, (me, peer_id, peer_id, me, since_id))
        elif chat_type == 'group' and group_id:
            cur.execute(f"""
                SELECT m.id, m.from_user_id, u.name, u.avatar_url,
                       m.msg_type, m.text, m.file_url, m.file_name, m.voice_dur,
                       to_char(m.created_at, 'HH24:MI') as t
                FROM {S}.messages m
                JOIN {S}.users u ON u.id = m.from_user_id
                WHERE m.chat_type='group' AND m.group_id=%s AND m.id > %s
                ORDER BY m.created_at ASC LIMIT 200
            """, (group_id, since_id))
        else:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'bad params'})}

        rows = cur.fetchall()
        cur.close(); conn.close()
        msgs = [{'id': r[0], 'from_user_id': r[1], 'sender_name': r[2],
                 'sender_avatar': r[3], 'msg_type': r[4], 'text': r[5] or '',
                 'file_url': r[6], 'file_name': r[7], 'voice_dur': r[8], 'time': r[9]}
                for r in rows]
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'messages': msgs})}

    # POST — отправить сообщение
    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        chat_type  = body.get('chat_type', 'direct')
        to_user_id = body.get('to_user_id')
        group_id   = body.get('group_id')
        msg_type   = body.get('msg_type', 'text')
        text       = body.get('text', '')
        file_url   = body.get('file_url')
        file_name  = body.get('file_name')
        voice_dur  = body.get('voice_dur')

        cur.execute(f"""
            INSERT INTO {S}.messages
              (chat_type, from_user_id, to_user_id, group_id, msg_type, text, file_url, file_name, voice_dur)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, to_char(created_at,'HH24:MI')
        """, (chat_type, me, to_user_id, group_id, msg_type, text, file_url, file_name, voice_dur))
        row = cur.fetchone()
        conn.commit(); cur.close(); conn.close()
        return {'statusCode': 200, 'headers': CORS,
                'body': json.dumps({'id': row[0], 'time': row[1]})}

    cur.close(); conn.close()
    return {'statusCode': 405, 'headers': CORS, 'body': json.dumps({'error': 'method not allowed'})}