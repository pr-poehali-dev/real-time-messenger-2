import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const AVA_M = 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/1c365b08-8a86-4865-ac8e-98903aa83e41.jpg';
const AVA_W = 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/9228ea6e-5004-471c-9977-feb3cdc1be44.jpg';

type Nav = 'chats' | 'contacts' | 'groups' | 'profile' | 'settings';

type MediaMsg = { kind: 'image' | 'video' | 'file'; url: string; name: string };
type Msg = {
  id: number; text: string; mine: boolean; time: string;
  voice?: boolean; voiceDur?: string; voiceUrl?: string;
  media?: MediaMsg;
};

type Contact = { id: number; name: string; ava: string; status: string; online: boolean; statusText?: string };
type Group = { id: number; name: string; members: number; desc: string; memberIds: number[] };

const STATUS_ICONS: Record<string, string> = {
  'В сети': '🟢', 'Не беспокоить': '🔴', 'Нет на месте': '🌙', 'Занят': '🟡',
};
const STATUSES = ['В сети', 'Не беспокоить', 'Нет на месте', 'Занят'];

const INIT_CONTACTS: Contact[] = [
  { id: 1, name: 'Анна Морозова', ava: AVA_W, status: 'В сети', online: true },
  { id: 2, name: 'Дмитрий Соколов', ava: AVA_M, status: 'Занят', online: true },
  { id: 3, name: 'Елена Кузнецова', ava: AVA_W, status: 'Нет на месте', online: false },
  { id: 4, name: 'Игорь Васильев', ava: AVA_M, status: 'Не беспокоить', online: false },
];

const INIT_GROUPS: Group[] = [
  { id: 1, name: 'Семья', members: 4, desc: 'Самые близкие', memberIds: [1, 2, 3] },
  { id: 2, name: 'Рабочий чат', members: 12, desc: 'Команда проекта', memberIds: [2, 4] },
];

const INIT_CHATS = [
  { id: 1, name: 'Анна Морозова', ava: AVA_W, last: 'Договорились, до встречи!', time: '12:40', unread: 2, online: true },
  { id: 2, name: 'Дмитрий Соколов', ava: AVA_M, last: '🎤 Голосовое', time: '11:15', unread: 0, online: true },
  { id: 3, name: 'Семья 👨‍👩‍👧', ava: '', last: 'Мама: купи хлеб 🍞', time: '10:02', unread: 5, online: false },
];

const INIT_MSGS: Msg[] = [
  { id: 1, text: 'Привет! Как дела?', mine: false, time: '12:30' },
  { id: 2, text: 'Всё отлично, готовлюсь к встрече!', mine: true, time: '12:31' },
  { id: 3, text: '', mine: false, time: '12:35', voice: true, voiceDur: '0:12' },
  { id: 4, text: 'Договорились, до встречи!', mine: false, time: '12:40' },
];

// ─── Avatar ─────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 48, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-xl object-cover" />
      ) : (
        <div className="w-full h-full rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold select-none" style={{ fontSize: size / 2.4 }}>
          {name.slice(0, 1)}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
      )}
    </div>
  );
}

// ─── VoiceWave ───────────────────────────────────────────────────────────────
function VoiceWave({ mine }: { mine: boolean }) {
  const heights = [5, 11, 7, 15, 9, 13, 6, 11, 8, 14, 7, 10];
  return (
    <div className="flex items-center gap-0.5 h-5">
      {heights.map((h, i) => (
        <span key={i} className={`w-0.5 rounded-full ${mine ? 'bg-primary-foreground/70' : 'bg-primary/50'}`} style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground">
            <Icon name="X" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Index() {
  const [nav, setNav] = useState<Nav>('chats');
  const [activeChat, setActiveChat] = useState<number | null>(1);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [input, setInput] = useState('');
  const [dark, setDark] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(INIT_CONTACTS);
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [chatList, setChatList] = useState(INIT_CHATS);
  const [messages, setMessages] = useState<Msg[]>(INIT_MSGS);

  // Statuses
  const [myStatus, setMyStatus] = useState('В сети');
  const [myStatusText, setMyStatusText] = useState('');

  // Modals
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Add contact form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Add group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Call
  const [call, setCall] = useState<{ type: 'audio' | 'video'; name: string } | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // File input
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  // Call timer
  useEffect(() => {
    if (call) {
      setCallSeconds(0);
      callTimerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [call]);

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Send text
  const send = useCallback((text: string, extra?: Partial<Msg>) => {
    if (!text.trim() && !extra) return;
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    const msg: Msg = { id: Date.now(), text, mine: true, time, ...extra };
    setMessages((m) => [...m, msg]);
    setInput('');
    // simulate reply
    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, text: 'Получил, спасибо! 👍', mine: false, time }]);
    }, 1400);
  }, []);

  // ── Media files
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'file') => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    send('', { media: { kind, url, name: f.name } });
    e.target.value = '';
  };

  // ── Voice recording via MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const dur = `0:${String(recSeconds).padStart(2, '0')}`;
        stream.getTracks().forEach((t) => t.stop());
        send('', { voice: true, voiceDur: dur, voiceUrl: url });
        setRecSeconds(0);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert('Нет доступа к микрофону');
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
  };

  // ── Add contact
  const addContact = () => {
    if (!newName.trim()) return;
    const nc: Contact = { id: Date.now(), name: newName, ava: AVA_M, status: 'В сети', online: true };
    setContacts((c) => [...c, nc]);
    setChatList((l) => [...l, { id: nc.id, name: nc.name, ava: nc.ava, last: 'Напишите первым!', time: 'Сейчас', unread: 0, online: true }]);
    setNewName(''); setNewPhone('');
    setShowAddContact(false);
  };

  // ── Add group
  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const ng: Group = { id: Date.now(), name: newGroupName, members: selectedMembers.length + 1, desc: newGroupDesc || 'Новая группа', memberIds: selectedMembers };
    setGroups((g) => [...g, ng]);
    setChatList((l) => [...l, { id: ng.id, name: ng.name, ava: '', last: 'Группа создана', time: 'Сейчас', unread: 0, online: false }]);
    setNewGroupName(''); setNewGroupDesc(''); setSelectedMembers([]);
    setShowAddGroup(false);
  };

  const chat = chatList.find((c) => c.id === activeChat);
  const chatContact = contacts.find((c) => c.name === chat?.name);

  const navItems: { key: Nav; icon: string; label: string }[] = [
    { key: 'chats', icon: 'MessageSquare', label: 'Чаты' },
    { key: 'contacts', icon: 'Users', label: 'Контакты' },
    { key: 'groups', icon: 'UsersRound', label: 'Группы' },
    { key: 'profile', icon: 'User', label: 'Профиль' },
    { key: 'settings', icon: 'Settings', label: 'Настройки' },
  ];

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden font-sans">

      {/* ── Desktop rail */}
      <aside className="hidden md:flex flex-col items-center w-[76px] bg-primary py-5 gap-1.5 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-4 text-white shadow-lg">
          <Icon name="Send" size={20} />
        </div>
        {navItems.map((n) => (
          <button key={n.key} onClick={() => setNav(n.key)} title={n.label}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${nav === n.key ? 'bg-white/20 text-white shadow' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <Icon name={n.icon} size={22} />
          </button>
        ))}
        <div className="mt-auto relative cursor-pointer" onClick={() => setShowStatusModal(true)}>
          <Avatar src={AVA_M} name="Я" size={44} online />
          <span className="absolute -top-1 -right-1 text-sm leading-none">{STATUS_ICONS[myStatus]}</span>
        </div>
      </aside>

      {/* ── List panel */}
      <section className={`${showChatMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[340px] border-r border-border bg-card shrink-0`}>
        <header className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between gap-2">
          <h1 className="font-display font-extrabold text-xl tracking-tight">{navItems.find((n) => n.key === nav)?.label}</h1>
          {nav === 'contacts' && (
            <button onClick={() => setShowAddContact(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="UserPlus" size={15} /> Добавить
            </button>
          )}
          {nav === 'groups' && (
            <button onClick={() => setShowAddGroup(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="Plus" size={15} /> Создать
            </button>
          )}
        </header>

        {nav === 'chats' && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 h-9">
              <Icon name="Search" size={16} className="text-muted-foreground" />
              <input placeholder="Поиск" className="bg-transparent outline-none text-sm w-full" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* CHATS */}
          {nav === 'chats' && chatList.map((c) => (
            <button key={c.id} onClick={() => { setActiveChat(c.id); setShowChatMobile(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeChat === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}>
              <Avatar src={c.ava} name={c.name} online={c.online} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold truncate text-sm">{c.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground truncate">{c.last}</span>
                  {c.unread > 0 && <span className="shrink-0 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}

          {/* CONTACTS */}
          {nav === 'contacts' && contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 animate-fade-in">
              <Avatar src={c.ava} name={c.name} online={c.online} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{STATUS_ICONS[c.status] ?? '⚪'}</span> {c.status}
                  {c.statusText && <span className="text-muted-foreground/70">· {c.statusText}</span>}
                </div>
              </div>
              <button onClick={() => { setActiveChat(c.id); setNav('chats'); setShowChatMobile(true); }}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="MessageSquare" size={16} />
              </button>
              <button onClick={() => setCall({ type: 'audio', name: c.name })}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Phone" size={16} />
              </button>
              <button onClick={() => setCall({ type: 'video', name: c.name })}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Video" size={16} />
              </button>
            </div>
          ))}

          {/* GROUPS */}
          {nav === 'groups' && groups.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 animate-fade-in">
              <Avatar name={g.name} size={48} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{g.name}</div>
                <div className="text-xs text-muted-foreground">{g.members} участников · {g.desc}</div>
              </div>
              <button onClick={() => { setActiveChat(g.id); setNav('chats'); setShowChatMobile(true); }}
                className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="MessageSquare" size={16} />
              </button>
            </div>
          ))}

          {/* PROFILE */}
          {nav === 'profile' && (
            <div className="p-6 flex flex-col items-center text-center animate-fade-in">
              <div className="relative">
                <Avatar src={AVA_M} name="Я" size={100} />
                <span className="absolute -top-1 -right-1 text-2xl">{STATUS_ICONS[myStatus]}</span>
              </div>
              <h2 className="mt-4 font-display font-bold text-xl">Александр Петров</h2>
              <p className="text-sm text-muted-foreground">@a.petrov</p>
              <div className="mt-2 text-sm text-primary font-medium">{myStatus}</div>
              {myStatusText && <p className="text-xs text-muted-foreground mt-0.5">«{myStatusText}»</p>}
              <button onClick={() => setShowStatusModal(true)}
                className="mt-3 px-4 py-1.5 bg-secondary rounded-lg text-sm font-medium hover:bg-secondary/70">
                Изменить статус
              </button>
              <div className="mt-5 w-full space-y-2 text-left">
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground">Телефон</div>
                  <div className="font-medium text-sm">+7 900 123-45-67</div>
                </div>
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground">О себе</div>
                  <div className="font-medium text-sm">Всегда на связи с близкими</div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {nav === 'settings' && (
            <div className="p-4 space-y-2 animate-fade-in">
              {[
                { i: 'Bell', t: 'Уведомления' },
                { i: 'Lock', t: 'Конфиденциальность' },
                { i: 'Palette', t: 'Оформление' },
                { i: 'CircleHelp', t: 'Помощь и поддержка' },
              ].map((r) => (
                <button key={r.t} onClick={() => alert(`Раздел: ${r.t}`)}
                  className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                  <Icon name={r.i} size={20} className="text-primary" />
                  <span className="font-medium flex-1 text-left text-sm">{r.t}</span>
                  <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                </button>
              ))}
              <button onClick={() => setDark((d) => !d)}
                className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                <Icon name={dark ? 'Moon' : 'Sun'} size={20} className="text-primary" />
                <span className="font-medium flex-1 text-left text-sm">Тёмная тема</span>
                <span className={`w-10 h-5 rounded-full p-0.5 transition-colors ${dark ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
                </span>
              </button>
              <button onClick={() => alert('Выход из аккаунта')}
                className="w-full flex items-center gap-3 px-4 py-3 text-destructive font-medium text-sm hover:bg-destructive/5 rounded-xl">
                <Icon name="LogOut" size={20} /> Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Chat window */}
      <main className={`${showChatMobile ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {chat ? (
          <>
            {/* Chat header */}
            <header className="flex items-center gap-3 px-4 h-15 py-2.5 border-b border-border bg-card shrink-0">
              <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary"
                onClick={() => setShowChatMobile(false)}>
                <Icon name="ArrowLeft" size={20} />
              </button>
              <Avatar src={chat.ava} name={chat.name} size={40} online={chat.online} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{chat.name}</div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  {chatContact ? `${STATUS_ICONS[chatContact.status]} ${chatContact.status}` : (chat.online ? '🟢 в сети' : 'был(а) недавно')}
                </div>
              </div>
              <button onClick={() => setCall({ type: 'audio', name: chat.name })}
                className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Phone" size={18} />
              </button>
              <button onClick={() => setCall({ type: 'video', name: chat.name })}
                className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Video" size={18} />
              </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
              style={{ background: 'radial-gradient(ellipse at 10% 0%, hsl(var(--secondary)/60%) 0%, hsl(var(--background)) 65%)' }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-msg-in`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm ${m.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    {/* Voice */}
                    {m.voice && (
                      <div className="flex items-center gap-2">
                        {m.voiceUrl ? (
                          <audio controls src={m.voiceUrl} className="h-8 w-36 opacity-90" />
                        ) : (
                          <>
                            <button className={`w-7 h-7 rounded-full flex items-center justify-center ${m.mine ? 'bg-white/20' : 'bg-primary/10'}`}>
                              <Icon name="Play" size={14} className={m.mine ? 'text-white' : 'text-primary'} />
                            </button>
                            <VoiceWave mine={m.mine} />
                            <span className="text-xs opacity-70">{m.voiceDur}</span>
                          </>
                        )}
                      </div>
                    )}
                    {/* Media */}
                    {m.media && (
                      <div className="mb-1">
                        {m.media.kind === 'image' && (
                          <img src={m.media.url} alt="фото" onClick={() => setLightboxUrl(m.media!.url)}
                            className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                        )}
                        {m.media.kind === 'video' && (
                          <video src={m.media.url} controls className="rounded-lg max-w-full max-h-48" />
                        )}
                        {m.media.kind === 'file' && (
                          <a href={m.media.url} download={m.media.name}
                            className={`flex items-center gap-2 text-xs ${m.mine ? 'text-primary-foreground/90' : 'text-foreground'}`}>
                            <Icon name="FileText" size={18} />
                            <span className="underline truncate max-w-[160px]">{m.media.name}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {/* Text */}
                    {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                    <div className={`text-[10px] mt-0.5 ${m.mine ? 'text-primary-foreground/50 text-right' : 'text-muted-foreground'}`}>{m.time}</div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* ── Input bar — поднята выше ватермарки */}
            <footer className="shrink-0 border-t border-border bg-card" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 52px)' }}>
              {recording && (
                <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Запись… {fmtTime(recSeconds)}
                  <button onClick={stopRecording} className="ml-auto text-xs bg-destructive text-white px-3 py-1 rounded-full">Отправить</button>
                  <button onClick={() => { mediaRecRef.current?.stop(); if (recTimerRef.current) clearInterval(recTimerRef.current); setRecording(false); setRecSeconds(0); }} className="text-xs border border-destructive px-3 py-1 rounded-full">Отменить</button>
                </div>
              )}
              <div className="flex items-end gap-2 px-3 py-2.5">
                {/* Attach menu */}
                <div className="relative group">
                  <button className="w-10 h-10 shrink-0 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <Icon name="Paperclip" size={20} />
                  </button>
                  <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 opacity-0 pointer-events-none group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 min-w-[150px]">
                    <button onClick={() => photoRef.current?.click()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Image" size={16} className="text-primary" /> Фото
                    </button>
                    <button onClick={() => videoRef.current?.click()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Film" size={16} className="text-primary" /> Видео
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="FileText" size={16} className="text-primary" /> Файл
                    </button>
                  </div>
                </div>

                {/* Hidden inputs */}
                <input type="file" ref={photoRef} accept="image/*" onChange={(e) => handleFile(e, 'image')} className="hidden" />
                <input type="file" ref={videoRef} accept="video/*" onChange={(e) => handleFile(e, 'video')} className="hidden" />
                <input type="file" ref={fileRef} onChange={(e) => handleFile(e, 'file')} className="hidden" />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Сообщение…"
                  rows={1}
                  disabled={recording}
                  className="flex-1 resize-none bg-secondary rounded-xl px-3.5 py-2.5 text-sm outline-none overflow-hidden leading-relaxed disabled:opacity-40"
                  style={{ minHeight: 40 }}
                />

                {/* Send / Mic */}
                {input.trim() ? (
                  <button onClick={() => send(input)}
                    className="w-10 h-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md">
                    <Icon name="Send" size={18} />
                  </button>
                ) : (
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all shadow-md relative ${recording ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'}`}>
                    {recording && <span className="absolute inset-0 rounded-xl bg-destructive animate-pulse-ring opacity-60" />}
                    <Icon name={recording ? 'Square' : 'Mic'} size={18} />
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="MessageSquare" size={40} className="text-primary/30" />
            </div>
            <p className="font-display font-semibold text-lg">Выберите чат</p>
            <p className="text-sm">или начните новый разговор</p>
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav */}
      {!showChatMobile && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border flex justify-around pt-2 pb-safe z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          {navItems.map((n) => (
            <button key={n.key} onClick={() => setNav(n.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${nav === n.key ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon name={n.icon} size={22} />
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Call overlay */}
      {call && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-0 animate-fade-in"
          style={{ background: 'linear-gradient(160deg, hsl(var(--primary)) 0%, hsl(217 71% 18%) 100%)' }}>
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-white/15 animate-pulse-ring scale-125" />
            <Avatar src={AVA_W} name={call.name} size={120} />
          </div>
          <h2 className="font-display font-bold text-white text-2xl">{call.name}</h2>
          <p className="text-white/60 mt-1 text-sm">
            {call.type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} · {fmtTime(callSeconds)}
          </p>
          <div className="flex gap-4 mt-12">
            <button className="flex flex-col items-center gap-1.5">
              <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                <Icon name="MicOff" size={22} className="text-white" />
              </span>
              <span className="text-white/60 text-xs">Микрофон</span>
            </button>
            {call.type === 'video' && (
              <button className="flex flex-col items-center gap-1.5">
                <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                  <Icon name="VideoOff" size={22} className="text-white" />
                </span>
                <span className="text-white/60 text-xs">Камера</span>
              </button>
            )}
            <button className="flex flex-col items-center gap-1.5">
              <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                <Icon name="Volume2" size={22} className="text-white" />
              </span>
              <span className="text-white/60 text-xs">Звук</span>
            </button>
            <button onClick={() => setCall(null)} className="flex flex-col items-center gap-1.5">
              <span className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg">
                <Icon name="PhoneOff" size={22} className="text-white" />
              </span>
              <span className="text-white/60 text-xs">Завершить</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Add contact */}
      {showAddContact && (
        <Modal title="Добавить контакт" onClose={() => setShowAddContact(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Имя и фамилия *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Например: Анна Иванова"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Номер телефона</label>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+7 900 000-00-00" type="tel"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddContact(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">
                Отмена
              </button>
              <button onClick={addContact}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                Добавить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Create group */}
      {showAddGroup && (
        <Modal title="Создать группу" onClose={() => setShowAddGroup(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название группы *</label>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Например: Семья"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Самые близкие"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Участники</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-primary"
                      checked={selectedMembers.includes(c.id)}
                      onChange={(e) => setSelectedMembers((m) => e.target.checked ? [...m, c.id] : m.filter((id) => id !== c.id))} />
                    <Avatar src={c.ava} name={c.name} size={32} />
                    <span className="text-sm font-medium">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddGroup(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">
                Отмена
              </button>
              <button onClick={addGroup}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
                Создать
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Status */}
      {showStatusModal && (
        <Modal title="Мой статус" onClose={() => setShowStatusModal(false)}>
          <div className="space-y-2 mb-4">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setMyStatus(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${myStatus === s ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary'}`}>
                <span className="text-xl">{STATUS_ICONS[s]}</span> {s}
                {myStatus === s && <Icon name="Check" size={16} className="ml-auto text-primary" />}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Текст статуса (необязательно)</label>
            <input value={myStatusText} onChange={(e) => setMyStatusText(e.target.value)}
              placeholder="Что происходит?"
              className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
          </div>
          <button onClick={() => setShowStatusModal(false)}
            className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            Сохранить
          </button>
        </Modal>
      )}

      {/* ── Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><Icon name="X" size={28} /></button>
          <img src={lightboxUrl} alt="просмотр" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
