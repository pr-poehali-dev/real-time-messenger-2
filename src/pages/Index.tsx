import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

// ─── API URLs ─────────────────────────────────────────────────────────────────
const API_MESSAGES = 'https://functions.poehali.dev/3bfdf29f-790d-495e-ba98-103014effd12';
const API_USERS    = 'https://functions.poehali.dev/1eba3279-546c-4be5-9c2a-a01195354573';
const API_UPLOAD   = 'https://functions.poehali.dev/a66e95da-bf45-4d8e-98ee-771ba6ebc6c1';

const MY_USER_ID = 1; // текущий пользователь (Александр Петров)

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = 'chats' | 'contacts' | 'groups' | 'profile' | 'settings';
type MsgType = 'text' | 'voice' | 'image' | 'video' | 'file';

interface Msg {
  id: number;
  from_user_id: number;
  sender_name: string;
  sender_avatar: string;
  msg_type: MsgType;
  text: string;
  file_url?: string;
  file_name?: string;
  voice_dur?: string;
  time: string;
  mine: boolean;
  // локальные поля для голоса
  voiceUrl?: string;
}

interface Contact {
  id: number;
  name: string;
  phone?: string;
  avatar_url: string;
  status: string;
  status_text: string;
  online: boolean;
}

interface Group {
  id: number;
  name: string;
  desc: string;
  members: number;
  avatar_url?: string;
}

interface Chat {
  id: number;
  name: string;
  ava: string;
  last: string;
  time: string;
  unread: number;
  online: boolean;
  chatType: 'direct' | 'group';
  peerId?: number;
  groupId?: number;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  online: 'В сети', busy: 'Занят', away: 'Нет на месте', dnd: 'Не беспокоить',
};
const STATUS_EMOJI: Record<string, string> = {
  online: '🟢', busy: '🟡', away: '🌙', dnd: '🔴',
};
const STATUSES = ['online', 'busy', 'away', 'dnd'];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 48, online }: { src?: string; name: string; size?: number; online?: boolean }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-xl object-cover" />
      ) : (
        <div className="w-full h-full rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold select-none"
          style={{ fontSize: size / 2.4 }}>
          {name.slice(0, 1)}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${online ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 animate-fade-in px-0 sm:px-4"
      onClick={onClose}>
      <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 animate-fade-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <Icon name="X" size={18} className="text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Wave decoration ──────────────────────────────────────────────────────────
function VoiceWave({ mine }: { mine: boolean }) {
  const h = [5, 10, 7, 15, 9, 13, 6, 11, 8];
  return (
    <div className="flex items-center gap-0.5 h-5">
      {h.map((v, i) => (
        <span key={i} className={`w-0.5 rounded-full ${mine ? 'bg-white/70' : 'bg-primary/50'}`} style={{ height: v }} />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Index() {
  const [nav, setNav] = useState<Nav>('chats');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [input, setInput] = useState('');
  const [dark, setDark] = useState(false);

  // Data
  const [messages, setMessages]   = useState<Msg[]>([]);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [groups, setGroups]       = useState<Group[]>([]);
  const [chatList, setChatList]   = useState<Chat[]>([]);

  // Polling
  const lastMsgIdRef = useRef(0);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Status
  const [myStatus, setMyStatus]     = useState('online');
  const [myStatusText, setMyStatusText] = useState('');
  const [myProfile, setMyProfile]   = useState<Contact | null>(null);

  // Modals
  const [showAddContact, setShowAddContact]   = useState(false);
  const [showAddGroup, setShowAddGroup]       = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lightboxUrl, setLightboxUrl]         = useState<string | null>(null);
  const [newName, setNewName]   = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Voice
  const [recording, setRecording]   = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const recTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Call
  const [call, setCall]         = useState<{ type: 'audio' | 'video'; name: string; ava: string } | null>(null);
  const [callSec, setCallSec]   = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const fileRef  = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const endRef   = useRef<HTMLDivElement>(null);
  const taRef    = useRef<HTMLTextAreaElement>(null);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Dark mode
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  // ── Call timer
  useEffect(() => {
    if (call) {
      setCallSec(0);
      callTimerRef.current = setInterval(() => setCallSec(s => s + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [call]);

  // ── Load contacts & groups on mount
  useEffect(() => {
    loadContacts();
    loadGroups();
  }, []);

  // ── Scroll to bottom
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Build chat list from contacts + groups
  useEffect(() => {
    const directChats: Chat[] = contacts.map(c => ({
      id: c.id * 1000,
      name: c.name,
      ava: c.avatar_url,
      last: '',
      time: '',
      unread: 0,
      online: c.online,
      chatType: 'direct',
      peerId: c.id,
    }));
    const groupChats: Chat[] = groups.map(g => ({
      id: g.id * 1000 + 1,
      name: g.name,
      ava: g.avatar_url || '',
      last: '',
      time: '',
      unread: 0,
      online: false,
      chatType: 'group',
      groupId: g.id,
    }));
    setChatList([...directChats, ...groupChats]);
  }, [contacts, groups]);

  // ── Load contacts from backend
  const loadContacts = async () => {
    const r = await fetch(`${API_USERS}/?action=contacts&user_id=${MY_USER_ID}`);
    const raw = await r.json();
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    setContacts(data.contacts || []);
    const me = data.contacts?.find((c: Contact) => c.id === MY_USER_ID);
    if (!me) {
      // fetch my own profile
      const r2 = await fetch(`${API_USERS}/?action=all`);
      const raw2 = await r2.json();
      const d2 = typeof raw2 === 'string' ? JSON.parse(raw2) : raw2;
      const meFull = (d2.users || []).find((u: Contact) => u.id === MY_USER_ID);
      if (meFull) setMyProfile(meFull);
    }
  };

  const loadGroups = async () => {
    const r = await fetch(`${API_USERS}/?action=groups&user_id=${MY_USER_ID}`);
    const raw = await r.json();
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    setGroups(data.groups || []);
  };

  // ── Load messages for active chat
  const loadMessages = useCallback(async (chat: Chat, sinceId = 0) => {
    let url = '';
    if (chat.chatType === 'direct') {
      url = `${API_MESSAGES}/?chat_type=direct&user_a=${MY_USER_ID}&user_b=${chat.peerId}&since_id=${sinceId}`;
    } else {
      url = `${API_MESSAGES}/?chat_type=group&group_id=${chat.groupId}&since_id=${sinceId}`;
    }
    const r = await fetch(url);
    const raw = await r.json();
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const msgs: Msg[] = (data.messages || []).map((m: Omit<Msg, 'mine'>) => ({
      ...m,
      mine: m.from_user_id === MY_USER_ID,
    }));
    return msgs;
  }, []);

  // ── Open chat → load history → start polling
  const openChat = async (chat: Chat) => {
    setActiveChat(chat);
    setShowChatMobile(true);
    lastMsgIdRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    setMessages([]);

    const msgs = await loadMessages(chat, 0);
    setMessages(msgs);
    if (msgs.length > 0) lastMsgIdRef.current = msgs[msgs.length - 1].id;

    // Poll every 2.5s for new messages
    pollRef.current = setInterval(async () => {
      const newMsgs = await loadMessages(chat, lastMsgIdRef.current);
      if (newMsgs.length > 0) {
        lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
        setMessages(prev => [...prev, ...newMsgs]);
        // Update chat list last message
        setChatList(prev => prev.map(c =>
          c.id === chat.id
            ? { ...c, last: newMsgs[newMsgs.length - 1].text || '📎 медиа', time: newMsgs[newMsgs.length - 1].time }
            : c
        ));
      }
    }, 2500);
  };

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Send text message
  const sendMsg = async (text: string, extra?: Partial<Msg>) => {
    if (!text.trim() && !extra) return;
    if (!activeChat) return;
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

    // Optimistic UI
    const optimistic: Msg = {
      id: Date.now(),
      from_user_id: MY_USER_ID,
      sender_name: myProfile?.name || 'Я',
      sender_avatar: myProfile?.avatar_url || '',
      msg_type: 'text',
      text,
      time,
      mine: true,
      ...extra,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    // Send to backend
    const body: Record<string, unknown> = {
      from_user_id: MY_USER_ID,
      chat_type: activeChat.chatType,
      msg_type: extra?.msg_type || 'text',
      text,
    };
    if (activeChat.chatType === 'direct') body.to_user_id = activeChat.peerId;
    else body.group_id = activeChat.groupId;
    if (extra?.file_url) { body.file_url = extra.file_url; body.file_name = extra.file_name; }
    if (extra?.voice_dur) body.voice_dur = extra.voice_dur;

    const r = await fetch(API_MESSAGES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const raw = await r.json();
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // Update optimistic message with real id
    if (data.id) {
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, data.id);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: data.id } : m));
      setChatList(prev => prev.map(c =>
        c.id === activeChat.id ? { ...c, last: text || '📎 медиа', time } : c
      ));
    }
  };

  // ── Upload file to S3 then send
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, kind: 'image' | 'video' | 'file') => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';

    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = (reader.result as string).split(',')[1];
      const r = await fetch(API_UPLOAD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: b64, filename: f.name, mime: f.type }),
      });
      const raw = await r.json();
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.url) {
        sendMsg('', { msg_type: kind, file_url: data.url, file_name: f.name });
      }
    };
    reader.readAsDataURL(f);
  };

  // ── Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        stream.getTracks().forEach(t => t.stop());
        const dur = fmt(recSeconds);

        // Upload audio blob to S3
        const reader = new FileReader();
        reader.onload = async () => {
          const b64 = (reader.result as string).split(',')[1];
          const r = await fetch(API_UPLOAD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: b64, filename: 'voice.webm', mime: 'audio/webm' }),
          });
          const raw = await r.json();
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          sendMsg('', { msg_type: 'voice', file_url: data.url || localUrl, voice_dur: dur, voiceUrl: data.url || localUrl });
        };
        reader.readAsDataURL(blob);
        setRecSeconds(0);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      alert('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.ondataavailable = null;
      mediaRecRef.current.onstop = null;
      mediaRecRef.current.stop();
    }
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
    setRecSeconds(0);
  };

  // ── Add contact
  const addContact = async () => {
    if (!newName.trim()) return;
    await fetch(API_USERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_contact', user_id: MY_USER_ID, name: newName, phone: newPhone }),
    });
    setNewName(''); setNewPhone('');
    setShowAddContact(false);
    loadContacts();
  };

  // ── Create group
  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    await fetch(API_USERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_group', user_id: MY_USER_ID, name: newGroupName, description: newGroupDesc, member_ids: selectedMembers }),
    });
    setNewGroupName(''); setNewGroupDesc(''); setSelectedMembers([]);
    setShowAddGroup(false);
    loadGroups();
  };

  // ── Update status
  const saveStatus = async () => {
    await fetch(API_USERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_status', user_id: MY_USER_ID, status: myStatus, status_text: myStatusText }),
    });
    setShowStatusModal(false);
  };

  const navItems: { key: Nav; icon: string; label: string }[] = [
    { key: 'chats',    icon: 'MessageSquare', label: 'Чаты' },
    { key: 'contacts', icon: 'Users',         label: 'Контакты' },
    { key: 'groups',   icon: 'UsersRound',    label: 'Группы' },
    { key: 'profile',  icon: 'User',          label: 'Профиль' },
    { key: 'settings', icon: 'Settings',      label: 'Настройки' },
  ];

  const myAva = 'https://cdn.poehali.dev/projects/749d4a4a-7c28-4976-bac7-d694745deb4f/files/1c365b08-8a86-4865-ac8e-98903aa83e41.jpg';

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden font-sans">

      {/* ── Desktop rail */}
      <aside className="hidden md:flex flex-col items-center w-[72px] bg-primary py-5 gap-1.5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4 text-white shadow">
          <Icon name="Send" size={19} />
        </div>
        {navItems.map(n => (
          <button key={n.key} onClick={() => setNav(n.key)} title={n.label}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${nav === n.key ? 'bg-white/20 text-white shadow' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <Icon name={n.icon} size={21} />
          </button>
        ))}
        <div className="mt-auto cursor-pointer relative" onClick={() => setShowStatusModal(true)}>
          <Avatar src={myAva} name="Я" size={42} online={myStatus === 'online'} />
          <span className="absolute -top-1 -right-1 text-sm">{STATUS_EMOJI[myStatus]}</span>
        </div>
      </aside>

      {/* ── List panel */}
      <section className={`${showChatMobile ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[320px] border-r border-border bg-card shrink-0`}>
        <header className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
          <h1 className="font-display font-extrabold text-xl tracking-tight flex-1">{navItems.find(n => n.key === nav)?.label}</h1>
          {nav === 'contacts' && (
            <button onClick={() => setShowAddContact(true)} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="UserPlus" size={14} /> Добавить
            </button>
          )}
          {nav === 'groups' && (
            <button onClick={() => setShowAddGroup(true)} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="Plus" size={14} /> Создать
            </button>
          )}
        </header>

        {nav === 'chats' && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 h-9">
              <Icon name="Search" size={15} className="text-muted-foreground" />
              <input placeholder="Поиск" className="bg-transparent outline-none text-sm w-full" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* CHATS */}
          {nav === 'chats' && (
            chatList.length === 0
              ? <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                  <Icon name="MessageSquare" size={32} className="opacity-30" />
                  <p>Нет чатов</p>
                  <button onClick={() => setNav('contacts')} className="text-primary text-xs font-medium">Перейти к контактам →</button>
                </div>
              : chatList.map(c => (
                <button key={c.id} onClick={() => openChat(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeChat?.id === c.id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}>
                  <Avatar src={c.ava} name={c.name} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-semibold text-sm truncate">{c.name}</span>
                      {c.time && <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{c.time}</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground truncate">{c.last || 'Начните разговор'}</span>
                      {c.unread > 0 && <span className="shrink-0 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </button>
              ))
          )}

          {/* CONTACTS */}
          {nav === 'contacts' && (
            contacts.length === 0
              ? <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                  <Icon name="Users" size={32} className="opacity-30" />
                  <p>Нет контактов</p>
                  <button onClick={() => setShowAddContact(true)} className="text-primary text-xs font-medium">Добавить первый →</button>
                </div>
              : contacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  <Avatar src={c.avatar_url} name={c.name} online={c.online} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {STATUS_EMOJI[c.status] ?? '⚪'} {STATUS_LABELS[c.status] ?? c.status}
                      {c.status_text && <span className="opacity-60 truncate">· {c.status_text}</span>}
                    </div>
                  </div>
                  <button onClick={() => { const chat = chatList.find(ch => ch.peerId === c.id); if (chat) openChat(chat); else setNav('chats'); }}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="MessageSquare" size={15} />
                  </button>
                  <button onClick={() => setCall({ type: 'audio', name: c.name, ava: c.avatar_url })}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="Phone" size={15} />
                  </button>
                  <button onClick={() => setCall({ type: 'video', name: c.name, ava: c.avatar_url })}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="Video" size={15} />
                  </button>
                </div>
              ))
          )}

          {/* GROUPS */}
          {nav === 'groups' && (
            groups.length === 0
              ? <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                  <Icon name="UsersRound" size={32} className="opacity-30" />
                  <p>Нет групп</p>
                  <button onClick={() => setShowAddGroup(true)} className="text-primary text-xs font-medium">Создать первую →</button>
                </div>
              : groups.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  <Avatar name={g.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.members} участников · {g.desc}</div>
                  </div>
                  <button onClick={() => { const chat = chatList.find(ch => ch.groupId === g.id); if (chat) openChat(chat); }}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="MessageSquare" size={15} />
                  </button>
                </div>
              ))
          )}

          {/* PROFILE */}
          {nav === 'profile' && (
            <div className="p-6 flex flex-col items-center text-center animate-fade-in">
              <div className="relative">
                <Avatar src={myAva} name="Я" size={96} />
                <span className="absolute -top-1 -right-1 text-2xl">{STATUS_EMOJI[myStatus]}</span>
              </div>
              <h2 className="mt-4 font-display font-bold text-xl">Александр Петров</h2>
              <p className="text-sm text-muted-foreground">@a.petrov</p>
              <p className="mt-1 text-sm font-medium text-primary">{STATUS_LABELS[myStatus]}</p>
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
                  <div className="text-xs text-muted-foreground">Контактов</div>
                  <div className="font-medium text-sm">{contacts.length}</div>
                </div>
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground">Групп</div>
                  <div className="font-medium text-sm">{groups.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {nav === 'settings' && (
            <div className="p-4 space-y-2 animate-fade-in">
              {[
                { i: 'Bell',        t: 'Уведомления' },
                { i: 'Lock',        t: 'Конфиденциальность' },
                { i: 'Palette',     t: 'Оформление' },
                { i: 'CircleHelp',  t: 'Помощь и поддержка' },
              ].map(r => (
                <button key={r.t} onClick={() => alert(`Раздел: ${r.t}`)}
                  className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                  <Icon name={r.i} size={19} className="text-primary" />
                  <span className="font-medium flex-1 text-left text-sm">{r.t}</span>
                  <Icon name="ChevronRight" size={15} className="text-muted-foreground" />
                </button>
              ))}
              <button onClick={() => setDark(d => !d)}
                className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                <Icon name={dark ? 'Moon' : 'Sun'} size={19} className="text-primary" />
                <span className="font-medium flex-1 text-left text-sm">Тёмная тема</span>
                <span className={`w-10 h-5 rounded-full p-0.5 transition-colors ${dark ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
                </span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-destructive font-medium text-sm hover:bg-destructive/5 rounded-xl">
                <Icon name="LogOut" size={19} /> Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Chat window */}
      <main className={`${showChatMobile ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {activeChat ? (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
              <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary"
                onClick={() => { setShowChatMobile(false); if (pollRef.current) clearInterval(pollRef.current); }}>
                <Icon name="ArrowLeft" size={20} />
              </button>
              <Avatar src={activeChat.ava} name={activeChat.name} size={40} online={activeChat.online} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{activeChat.name}</div>
                <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  {activeChat.online ? 'в сети · реальное время' : 'обновляется каждые 3 сек'}
                </div>
              </div>
              <button onClick={() => setCall({ type: 'audio', name: activeChat.name, ava: activeChat.ava })}
                className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Phone" size={18} />
              </button>
              <button onClick={() => setCall({ type: 'video', name: activeChat.name, ava: activeChat.ava })}
                className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                <Icon name="Video" size={18} />
              </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
              style={{ background: 'radial-gradient(ellipse at 10% 0%, hsl(var(--secondary)/60%) 0%, hsl(var(--background)) 65%)' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 opacity-60">
                  <Icon name="MessageSquare" size={36} />
                  <p>Начните разговор</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-msg-in`}>
                  {!m.mine && <Avatar src={m.sender_avatar} name={m.sender_name} size={28} />}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ml-2 mr-1 ${m.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    {!m.mine && <p className="text-[10px] font-semibold text-primary mb-0.5">{m.sender_name}</p>}

                    {/* Voice */}
                    {m.msg_type === 'voice' && (
                      <div className="flex items-center gap-2">
                        {(m.voiceUrl || m.file_url) ? (
                          <audio controls src={m.voiceUrl || m.file_url} className="h-8 max-w-[180px]" />
                        ) : (
                          <>
                            <button className={`w-7 h-7 rounded-full flex items-center justify-center ${m.mine ? 'bg-white/20' : 'bg-primary/10'}`}>
                              <Icon name="Play" size={13} className={m.mine ? 'text-white' : 'text-primary'} />
                            </button>
                            <VoiceWave mine={m.mine} />
                            <span className="text-xs opacity-70">{m.voice_dur}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Image */}
                    {m.msg_type === 'image' && m.file_url && (
                      <img src={m.file_url} alt="фото" onClick={() => setLightboxUrl(m.file_url!)}
                        className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity mb-1" />
                    )}

                    {/* Video */}
                    {m.msg_type === 'video' && m.file_url && (
                      <video src={m.file_url} controls className="rounded-lg max-w-full max-h-48 mb-1" />
                    )}

                    {/* File */}
                    {m.msg_type === 'file' && m.file_url && (
                      <a href={m.file_url} download={m.file_name} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-2 text-xs underline mb-1 ${m.mine ? 'text-white/90' : 'text-primary'}`}>
                        <Icon name="FileText" size={16} />
                        <span className="truncate max-w-[150px]">{m.file_name || 'Файл'}</span>
                      </a>
                    )}

                    {/* Text */}
                    {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>}

                    <p className={`text-[10px] mt-0.5 ${m.mine ? 'text-white/50 text-right' : 'text-muted-foreground'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input bar */}
            <footer className="shrink-0 border-t border-border bg-card"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 56px)' }}>

              {/* Recording bar */}
              {recording && (
                <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                  <span className="text-destructive text-sm font-medium flex-1">Запись… {fmt(recSeconds)}</span>
                  <button onClick={cancelRecording} className="text-xs border border-destructive/40 text-destructive px-3 py-1 rounded-full">Отмена</button>
                  <button onClick={stopRecording} className="text-xs bg-destructive text-white px-3 py-1 rounded-full font-medium">Отправить</button>
                </div>
              )}

              <div className="flex items-end gap-2 px-3 py-2">
                {/* Attach */}
                <div className="relative group/attach">
                  <button className="w-10 h-10 shrink-0 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <Icon name="Paperclip" size={19} />
                  </button>
                  <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 opacity-0 pointer-events-none group-focus-within/attach:opacity-100 group-focus-within/attach:pointer-events-auto group-hover/attach:opacity-100 group-hover/attach:pointer-events-auto transition-opacity z-10 min-w-[140px]">
                    <button onClick={() => photoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Image" size={15} className="text-primary" /> Фото
                    </button>
                    <button onClick={() => videoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Film" size={15} className="text-primary" /> Видео
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="FileText" size={15} className="text-primary" /> Файл
                    </button>
                  </div>
                </div>
                <input type="file" ref={photoRef} accept="image/*"  onChange={e => handleFile(e, 'image')} className="hidden" />
                <input type="file" ref={videoRef} accept="video/*"  onChange={e => handleFile(e, 'video')} className="hidden" />
                <input type="file" ref={fileRef}                    onChange={e => handleFile(e, 'file')}  className="hidden" />

                {/* Textarea */}
                <textarea ref={taRef} value={input}
                  onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input); } }}
                  placeholder="Сообщение…" rows={1} disabled={recording}
                  className="flex-1 resize-none bg-secondary rounded-xl px-3.5 py-2.5 text-sm outline-none overflow-hidden leading-relaxed disabled:opacity-40"
                  style={{ minHeight: 40 }} />

                {/* Send / Mic */}
                {input.trim() ? (
                  <button onClick={() => sendMsg(input)}
                    className="w-10 h-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow">
                    <Icon name="Send" size={17} />
                  </button>
                ) : (
                  <button onClick={recording ? stopRecording : startRecording}
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all shadow relative ${recording ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'}`}>
                    {recording && <span className="absolute inset-0 rounded-xl bg-destructive animate-pulse-ring opacity-60" />}
                    <Icon name={recording ? 'Square' : 'Mic'} size={17} />
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="MessageSquare" size={38} className="text-primary/30" />
            </div>
            <p className="font-display font-semibold text-lg">Выберите чат</p>
            <p className="text-sm opacity-60">или начните новый разговор</p>
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav */}
      {!showChatMobile && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border flex justify-around pt-2 z-40"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
          {navItems.map(n => (
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
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
          style={{ background: 'linear-gradient(155deg, hsl(var(--primary)) 0%, hsl(217 71% 15%) 100%)' }}>
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-white/10 animate-pulse-ring scale-125" />
            <Avatar src={call.ava} name={call.name} size={120} />
          </div>
          <h2 className="font-display font-bold text-white text-2xl">{call.name}</h2>
          <p className="text-white/60 mt-1 text-sm">{call.type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} · {fmt(callSec)}</p>
          <div className="flex gap-5 mt-12">
            {[
              { icon: 'MicOff',   label: 'Микрофон' },
              ...(call.type === 'video' ? [{ icon: 'VideoOff', label: 'Камера' }] : []),
              { icon: 'Volume2',  label: 'Звук' },
            ].map(b => (
              <button key={b.icon} className="flex flex-col items-center gap-1.5">
                <span className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                  <Icon name={b.icon} size={22} className="text-white" />
                </span>
                <span className="text-white/60 text-xs">{b.label}</span>
              </button>
            ))}
            <button onClick={() => setCall(null)} className="flex flex-col items-center gap-1.5">
              <span className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center hover:opacity-90 shadow-lg">
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
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Анна Иванова"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Номер телефона</label>
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+7 900 000-00-00" type="tel"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddContact(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Отмена</button>
              <button onClick={addContact} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Добавить</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Create group */}
      {showAddGroup && (
        <Modal title="Создать группу" onClose={() => setShowAddGroup(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Название *</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Семья"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="О чём группа"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Участники</label>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {contacts.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-primary"
                      checked={selectedMembers.includes(c.id)}
                      onChange={e => setSelectedMembers(m => e.target.checked ? [...m, c.id] : m.filter(id => id !== c.id))} />
                    <Avatar src={c.avatar_url} name={c.name} size={30} />
                    <span className="text-sm font-medium">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddGroup(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Отмена</button>
              <button onClick={createGroup} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Создать</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Status */}
      {showStatusModal && (
        <Modal title="Мой статус" onClose={() => setShowStatusModal(false)}>
          <div className="space-y-1.5 mb-4">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setMyStatus(s)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${myStatus === s ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary'}`}>
                <span className="text-lg">{STATUS_EMOJI[s]}</span>
                {STATUS_LABELS[s]}
                {myStatus === s && <Icon name="Check" size={15} className="ml-auto text-primary" />}
              </button>
            ))}
          </div>
          <label className="text-xs text-muted-foreground mb-1 block">Текст статуса</label>
          <input value={myStatusText} onChange={e => setMyStatusText(e.target.value)} placeholder="Что происходит?"
            className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30 mb-3" />
          <button onClick={saveStatus} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
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