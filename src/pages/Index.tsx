import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const AVA_M = 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/1c365b08-8a86-4865-ac8e-98903aa83e41.jpg';
const AVA_W = 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/9228ea6e-5004-471c-9977-feb3cdc1be44.jpg';

type Nav = 'chats' | 'contacts' | 'groups' | 'profile' | 'settings';
type Msg = { id: number; text: string; mine: boolean; time: string; voice?: boolean };

const chats = [
  { id: 1, name: 'Анна Морозова', ava: AVA_W, last: 'Договорились, до встречи!', time: '12:40', unread: 2, online: true },
  { id: 2, name: 'Дмитрий Соколов', ava: AVA_M, last: 'Голосовое сообщение', time: '11:15', unread: 0, online: true },
  { id: 3, name: 'Семья', ava: '', last: 'Мама: купи хлеб 🍞', time: '10:02', unread: 5, online: false, group: true },
  { id: 4, name: 'Елена Кузнецова', ava: AVA_W, last: 'Отправила документы', time: 'Вчера', unread: 0, online: false },
  { id: 5, name: 'Рабочий чат', ava: '', last: 'Иван: совещание в 15:00', time: 'Вчера', unread: 0, online: false, group: true },
];

const contacts = [
  { id: 1, name: 'Анна Морозова', ava: AVA_W, status: 'В сети', online: true },
  { id: 2, name: 'Дмитрий Соколов', ava: AVA_M, status: 'В сети', online: true },
  { id: 3, name: 'Елена Кузнецова', ava: AVA_W, status: 'Был(а) 10 мин назад', online: false },
  { id: 4, name: 'Игорь Васильев', ava: AVA_M, status: 'Не беспокоить', online: false },
];

const groups = [
  { id: 1, name: 'Семья', members: 4, desc: 'Самые близкие' },
  { id: 2, name: 'Рабочий чат', members: 12, desc: 'Команда проекта' },
  { id: 3, name: 'Друзья', members: 8, desc: 'Встречи по выходным' },
];

const statuses = ['В сети', 'Не беспокоить', 'Нет на месте', 'Занят'];

export default function Index() {
  const [nav, setNav] = useState<Nav>('chats');
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [call, setCall] = useState<{ type: 'audio' | 'video'; name: string } | null>(null);
  const [myStatus, setMyStatus] = useState('В сети');
  const [dark, setDark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, text: 'Привет! Как дела?', mine: false, time: '12:30' },
    { id: 2, text: 'Привет! Всё отлично, готовлюсь к встрече.', mine: true, time: '12:32' },
    { id: 3, text: 'Голосовое сообщение · 0:12', mine: false, time: '12:35', voice: true },
    { id: 4, text: 'Договорились, до встречи!', mine: false, time: '12:40' },
  ]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const send = (text: string, voice = false) => {
    if (!text.trim() && !voice) return;
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { id: Date.now(), text, mine: true, time, voice }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, text: 'Принято! 👍', mine: false, time }]);
    }, 1200);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) send(`📎 ${f.name}`);
    e.target.value = '';
  };

  const toggleRec = () => {
    if (recording) { setRecording(false); send('Голосовое сообщение · 0:05', true); }
    else setRecording(true);
  };

  const chat = chats.find((c) => c.id === activeChat);

  const navItems: { key: Nav; icon: string; label: string }[] = [
    { key: 'chats', icon: 'MessageSquare', label: 'Чаты' },
    { key: 'contacts', icon: 'Users', label: 'Контакты' },
    { key: 'groups', icon: 'UsersRound', label: 'Группы' },
    { key: 'profile', icon: 'User', label: 'Профиль' },
    { key: 'settings', icon: 'Settings', label: 'Настройки' },
  ];

  const Avatar = ({ src, name, size = 48, online }: { src?: string; name: string; size?: number; online?: boolean }) => (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-xl object-cover" />
      ) : (
        <div className="w-full h-full rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold" style={{ fontSize: size / 2.6 }}>
          {name.slice(0, 1)}
        </div>
      )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />}
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden font-sans">
      {/* Rail */}
      <aside className="hidden md:flex flex-col items-center w-[76px] bg-primary py-5 gap-2 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-4 text-white">
          <Icon name="Send" size={22} />
        </div>
        {navItems.map((n) => (
          <button key={n.key} onClick={() => setNav(n.key)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${nav === n.key ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white hover:bg-white/10'}`}
            title={n.label}>
            <Icon name={n.icon} size={22} />
          </button>
        ))}
        <div className="mt-auto">
          <Avatar src={AVA_M} name="Я" size={44} online />
        </div>
      </aside>

      {/* List column */}
      <section className={`${showChatMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[360px] border-r border-border bg-card shrink-0`}>
        <header className="px-5 pt-5 pb-4 border-b border-border">
          <h1 className="font-display font-extrabold text-2xl tracking-tight">{navItems.find((n) => n.key === nav)?.label}</h1>
          {nav === 'chats' && (
            <div className="mt-3 flex items-center gap-2 bg-secondary rounded-xl px-3 h-10">
              <Icon name="Search" size={18} className="text-muted-foreground" />
              <input placeholder="Поиск" className="bg-transparent outline-none text-sm w-full" />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {nav === 'chats' && chats.map((c) => (
            <button key={c.id} onClick={() => { setActiveChat(c.id); setShowChatMobile(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors animate-fade-in ${activeChat === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}>
              <Avatar src={c.ava} name={c.name} online={c.online} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm text-muted-foreground truncate">{c.last}</span>
                  {c.unread > 0 && <span className="shrink-0 bg-accent text-accent-foreground text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}

          {nav === 'contacts' && (
            <>
              <button onClick={() => alert('Добавление контакта')} className="w-full flex items-center gap-3 px-4 py-3.5 text-primary font-semibold hover:bg-secondary/60">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon name="UserPlus" size={22} /></div>
                Добавить контакт
              </button>
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 animate-fade-in">
                  <Avatar src={c.ava} name={c.name} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.name}</div>
                    <div className="text-sm text-muted-foreground">{c.status}</div>
                  </div>
                  <button onClick={() => setCall({ type: 'audio', name: c.name })} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary"><Icon name="Phone" size={18} /></button>
                  <button onClick={() => setCall({ type: 'video', name: c.name })} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary"><Icon name="Video" size={18} /></button>
                </div>
              ))}
            </>
          )}

          {nav === 'groups' && (
            <>
              <button onClick={() => alert('Создание группы')} className="w-full flex items-center gap-3 px-4 py-3.5 text-primary font-semibold hover:bg-secondary/60">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon name="Plus" size={22} /></div>
                Создать группу
              </button>
              {groups.map((g) => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 animate-fade-in">
                  <Avatar name={g.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.name}</div>
                    <div className="text-sm text-muted-foreground">{g.members} участников · {g.desc}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {nav === 'profile' && (
            <div className="p-6 flex flex-col items-center text-center animate-fade-in">
              <Avatar src={AVA_M} name="Я" size={96} online />
              <h2 className="mt-4 font-display font-bold text-xl">Александр Петров</h2>
              <p className="text-muted-foreground text-sm">@a.petrov</p>
              <div className="mt-6 w-full space-y-3 text-left">
                <div className="bg-secondary rounded-xl px-4 py-3"><div className="text-xs text-muted-foreground">Телефон</div><div className="font-medium">+7 900 123-45-67</div></div>
                <div className="bg-secondary rounded-xl px-4 py-3"><div className="text-xs text-muted-foreground">О себе</div><div className="font-medium">Всегда на связи с близкими</div></div>
              </div>
              <div className="mt-5 w-full">
                <div className="text-xs text-muted-foreground mb-2 text-left">Статус</div>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => (
                    <button key={s} onClick={() => setMyStatus(s)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${myStatus === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {nav === 'settings' && (
            <div className="p-4 space-y-2 animate-fade-in">
              {[
                { i: 'Bell', t: 'Уведомления' },
                { i: 'Lock', t: 'Конфиденциальность' },
                { i: 'Palette', t: 'Оформление' },
                { i: 'CircleHelp', t: 'Помощь' },
              ].map((r) => (
                <button key={r.t} onClick={() => alert(r.t)} className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70">
                  <Icon name={r.i} size={20} className="text-primary" />
                  <span className="font-medium flex-1 text-left">{r.t}</span>
                  <Icon name="ChevronRight" size={18} className="text-muted-foreground" />
                </button>
              ))}
              <button onClick={() => setDark((d) => !d)} className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70">
                <Icon name={dark ? 'Moon' : 'Sun'} size={20} className="text-primary" />
                <span className="font-medium flex-1 text-left">Тёмная тема</span>
                <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${dark ? 'bg-accent' : 'bg-muted-foreground/30'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${dark ? 'translate-x-5' : ''}`} />
                </span>
              </button>
              <button onClick={() => alert('Выход')} className="w-full flex items-center gap-3 text-destructive font-medium px-4 py-3 mt-2">
                <Icon name="LogOut" size={20} /> Выйти
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Conversation */}
      <main className={`${showChatMobile ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {chat ? (
          <>
            <header className="flex items-center gap-3 px-4 h-16 border-b border-border bg-card shrink-0">
              <button className="md:hidden" onClick={() => setShowChatMobile(false)}><Icon name="ArrowLeft" size={22} /></button>
              <Avatar src={chat.ava} name={chat.name} size={42} online={chat.online} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{chat.name}</div>
                <div className="text-xs text-emerald-600">{chat.online ? 'в сети' : 'был(а) недавно'}</div>
              </div>
              <button onClick={() => setCall({ type: 'audio', name: chat.name })} className="w-10 h-10 rounded-lg hover:bg-secondary flex items-center justify-center text-primary"><Icon name="Phone" size={20} /></button>
              <button onClick={() => setCall({ type: 'video', name: chat.name })} className="w-10 h-10 rounded-lg hover:bg-secondary flex items-center justify-center text-primary"><Icon name="Video" size={20} /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2" style={{ background: 'radial-gradient(circle at 20% 0%, hsl(var(--secondary)) 0%, hsl(var(--background)) 70%)' }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-msg-in`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border rounded-bl-md'}`}>
                    {m.voice ? (
                      <div className="flex items-center gap-2.5">
                        <Icon name="Play" size={18} className={m.mine ? 'text-primary-foreground' : 'text-primary'} />
                        <div className="flex items-center gap-0.5 h-5">
                          {[6, 12, 8, 16, 10, 14, 7, 12, 9].map((h, i) => <span key={i} className={`w-0.5 rounded-full ${m.mine ? 'bg-primary-foreground/70' : 'bg-primary/50'}`} style={{ height: h }} />)}
                        </div>
                        <span className="text-xs opacity-80">{m.text.split('·')[1]}</span>
                      </div>
                    ) : <span className="text-sm leading-relaxed">{m.text}</span>}
                    <div className={`text-[10px] mt-1 ${m.mine ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground'}`}>{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <footer className="p-3 border-t border-border bg-card shrink-0">
              <div className="flex items-end gap-2">
                <input type="file" ref={fileRef} onChange={onFile} className="hidden" />
                <button onClick={() => fileRef.current?.click()} className="w-11 h-11 shrink-0 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground"><Icon name="Paperclip" size={22} /></button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder={recording ? 'Идёт запись…' : 'Сообщение'}
                  rows={1}
                  className="flex-1 resize-none bg-secondary rounded-xl px-4 py-3 text-sm outline-none max-h-28"
                />
                {input.trim() ? (
                  <button onClick={() => send(input)} className="w-11 h-11 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"><Icon name="Send" size={20} /></button>
                ) : (
                  <button onClick={toggleRec} className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center relative ${recording ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
                    {recording && <span className="absolute inset-0 rounded-xl bg-destructive animate-pulse-ring" />}
                    <Icon name="Mic" size={20} />
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Icon name="MessageSquare" size={56} />
            <p className="mt-3 font-display font-semibold">Выберите чат</p>
          </div>
        )}
      </main>

      {/* Mobile bottom nav */}
      {!showChatMobile && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex justify-around py-2 z-40">
          {navItems.map((n) => (
            <button key={n.key} onClick={() => setNav(n.key)} className={`flex flex-col items-center gap-0.5 px-2 ${nav === n.key ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon name={n.icon} size={22} />
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Call overlay */}
      {call && (
        <div className="fixed inset-0 z-50 bg-primary text-white flex flex-col items-center justify-center animate-fade-in">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-white/20 animate-pulse-ring" />
            <Avatar src={AVA_W} name={call.name} size={120} />
          </div>
          <h2 className="mt-6 font-display font-bold text-2xl">{call.name}</h2>
          <p className="text-white/70 mt-1">{call.type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} · соединение…</p>
          <div className="flex gap-5 mt-12">
            <button className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center"><Icon name="MicOff" size={24} /></button>
            {call.type === 'video' && <button className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center"><Icon name="Video" size={24} /></button>}
            <button onClick={() => setCall(null)} className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center"><Icon name="PhoneOff" size={24} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
