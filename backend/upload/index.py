"""Загрузка файлов (фото, видео, аудио, документы) в S3"""
import json, os, base64, uuid
import boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    data_b64 = body.get('data')
    filename  = body.get('filename', 'file')
    mime      = body.get('mime', 'application/octet-stream')

    if not data_b64:
        return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'no data'})}

    raw = base64.b64decode(data_b64)
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'bin'
    key = f"messenger/{uuid.uuid4().hex}.{ext}"

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)

    project_id = os.environ['AWS_ACCESS_KEY_ID']
    url = f"https://cdn.poehali.dev/projects/{project_id}/files/{key}"

    return {'statusCode': 200, 'headers': CORS,
            'body': json.dumps({'url': url, 'key': key})}