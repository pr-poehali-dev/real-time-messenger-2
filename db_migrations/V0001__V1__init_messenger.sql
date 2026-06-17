
CREATE TABLE IF NOT EXISTS t_p56465226_real_time_messenger_.users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  status TEXT DEFAULT 'online',
  status_text TEXT DEFAULT '',
  online BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p56465226_real_time_messenger_.contacts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  contact_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

CREATE TABLE IF NOT EXISTS t_p56465226_real_time_messenger_.groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p56465226_real_time_messenger_.group_members (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p56465226_real_time_messenger_.messages (
  id SERIAL PRIMARY KEY,
  chat_type TEXT NOT NULL DEFAULT 'direct',
  from_user_id INT NOT NULL,
  to_user_id INT,
  group_id INT,
  msg_type TEXT DEFAULT 'text',
  text TEXT DEFAULT '',
  file_url TEXT,
  file_name TEXT,
  voice_dur TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_direct ON t_p56465226_real_time_messenger_.messages(from_user_id, to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_group  ON t_p56465226_real_time_messenger_.messages(group_id, created_at);

INSERT INTO t_p56465226_real_time_messenger_.users (name, phone, username, avatar_url, status, online) VALUES
  ('Александр Петров', '+79001234567', 'a.petrov', 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/1c365b08-8a86-4865-ac8e-98903aa83e41.jpg', 'online', TRUE),
  ('Анна Морозова', '+79007654321', 'a.morozova', 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/9228ea6e-5004-471c-9977-feb3cdc1be44.jpg', 'online', TRUE),
  ('Дмитрий Соколов', '+79001112233', 'd.sokolov', 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/1c365b08-8a86-4865-ac8e-98903aa83e41.jpg', 'busy', FALSE),
  ('Елена Кузнецова', '+79003334455', 'e.kuznetsova', 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/9228ea6e-5004-471c-9977-feb3cdc1be44.jpg', 'away', FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO t_p56465226_real_time_messenger_.contacts (user_id, contact_id) VALUES (1,2),(1,3),(1,4) ON CONFLICT DO NOTHING;

INSERT INTO t_p56465226_real_time_messenger_.messages (chat_type, from_user_id, to_user_id, msg_type, text) VALUES
  ('direct', 2, 1, 'text', 'Привет! Как дела?'),
  ('direct', 1, 2, 'text', 'Всё отлично, готовлюсь к встрече!'),
  ('direct', 2, 1, 'text', 'Договорились, до встречи!')
ON CONFLICT DO NOTHING;
