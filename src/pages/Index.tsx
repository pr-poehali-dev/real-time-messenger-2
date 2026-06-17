import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

// ─── API ──────────────────────────────────────────────────────────────────────
const API_AUTH     = 'https://functions.poehali.dev/991443ed-e49b-451f-8744-ff1194288288';
const API_MESSAGES = 'https://functions.poehali.dev/3bfdf29f-790d-495e-ba98-103014effd12';
const API_USERS    = 'https://functions.poehali.dev/1eba3279-546c-4be5-9c2a-a01195354573';
const API_UPLOAD   = 'https://functions.poehali.dev/a66e95da-bf45-4d8e-98ee-771ba6ebc6c1';

// ─── Types ────────────────────────────────────────────────────────────────────
type Nav = 'chats' | 'contacts' | 'groups' | 'profile' | 'settings';

interface User { id: number; name: string; phone: string; avatar_url: string; status: string; status_text?: string; online?: boolean }
interface Contact extends User { online: boolean }
interface Group  { id: number; name: string; desc: string; members: number }
interface Chat   { key: string; name: string; ava: string; online: boolean; chatType: 'direct'|'group'; peerId?: number; groupId?: number; lastMsg?: string; lastTime?: string }
interface Msg    { id: number; from_user_id: number; sender_name: string; sender_avatar: string; msg_type: string; text: string; file_url?: string; file_name?: string; voice_dur?: string; voiceUrl?: string; time: string; mine: boolean }

const STATUS_LABEL: Record<string,string> = { online:'В сети', busy:'Занят', away:'Нет на месте', dnd:'Не беспокоить' };
const STATUS_DOT:   Record<string,string> = { online:'bg-emerald-500', busy:'bg-yellow-400', away:'bg-blue-400', dnd:'bg-red-500' };
const STATUSES = ['online','busy','away','dnd'];

function parse(raw: unknown): unknown {
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return raw; } }
  return raw;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size=44, status }: { src?: string; name: string; size?: number; status?: string }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={name} className="w-full h-full rounded-xl object-cover" />
           : <div className="w-full h-full rounded-xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold select-none" style={{ fontSize: size/2.4 }}>{name[0]}</div>}
      {status !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${STATUS_DOT[status] ?? 'bg-muted-foreground/40'}`} />
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground"><Icon name="X" size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Voice wave ───────────────────────────────────────────────────────────────
function Wave({ mine }: { mine: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-5">
      {[4,9,6,14,8,12,5,10,7,13,6].map((h,i) => (
        <span key={i} className={`w-0.5 rounded-full ${mine ? 'bg-white/60' : 'bg-primary/50'}`} style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (user: User, token: string) => void }) {
  const [mode, setMode]       = useState<'login'|'register'>('login');
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPass]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const r   = await fetch(API_AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                               body: JSON.stringify({ action: mode, name, phone, password }) });
      const raw = await r.json();
      const d   = parse(raw) as { ok?: boolean; token?: string; user?: User; error?: string };
      if (d.error) { setError(d.error); }
      else if (d.token && d.user) {
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user));
        onAuth(d.user, d.token);
      }
    } catch { setError('Ошибка сети, попробуйте ещё раз'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Icon name="Send" size={28} className="text-white" />
          </div>
          <h1 className="font-display font-extrabold text-2xl tracking-tight">Ishgram</h1>
          <p className="text-muted-foreground text-sm mt-1">Общайтесь с близкими</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-secondary rounded-xl p-1 mb-5">
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}>
              {m === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Ваше имя</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Петров"
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/40" />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Телефон</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+79001234567" type="tel"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Пароль</label>
            <input value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" type="password"
              onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-primary/40" />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm px-4 py-2.5 rounded-xl border border-destructive/20 flex items-center gap-2">
              <Icon name="AlertCircle" size={15} /> {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md mt-1">
            {loading ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-primary font-medium hover:underline">
            {mode === 'login' ? 'Зарегистрируйтесь' : 'Войдите'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Messenger ────────────────────────────────────────────────────────────────
function Messenger({ me, token, onLogout }: { me: User; token: string; onLogout: () => void }) {
  const H = { 'Content-Type': 'application/json', 'X-Token': token };

  const [nav, setNav]                     = useState<Nav>('chats');
  const [contacts, setContacts]           = useState<Contact[]>([]);
  const [groups, setGroups]               = useState<Group[]>([]);
  const [activeChat, setActiveChat]       = useState<Chat | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [messages, setMessages]           = useState<Msg[]>([]);
  const [input, setInput]                 = useState('');
  const [dark, setDark]                   = useState(false);
  const [myStatus, setMyStatus]           = useState(me.status || 'online');
  const [myStatusText, setMyStatusText]   = useState(me.status_text || '');

  // Search
  const [searchQ, setSearchQ]             = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching]         = useState(false);

  // Modals
  const [showAddContact, setShowAddContact]   = useState(false);
  const [showAddGroup, setShowAddGroup]       = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lightbox, setLightbox]               = useState<string|null>(null);
  const [newGroupName, setNewGroupName]       = useState('');
  const [newGroupDesc, setNewGroupDesc]       = useState('');
  const [selMembers, setSelMembers]           = useState<number[]>([]);

  // Voice
  const [recording, setRecording]   = useState(false);
  const [recSec, setRecSec]         = useState(0);
  const recSecRef = useRef(0); // fix closure bug
  const mrRef     = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimer  = useRef<ReturnType<typeof setInterval>|null>(null);

  // Polling
  const lastIdRef = useRef(0);
  const pollRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const activeChatRef = useRef<Chat|null>(null);

  // Refs
  const fileRef  = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const endRef   = useRef<HTMLDivElement>(null);
  const taRef    = useRef<HTMLTextAreaElement>(null);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => { loadContacts(); loadGroups(); }, []);

  const apiGet = async (url: string) => {
    const r = await fetch(url, { headers: { 'X-Token': token } });
    return parse(await r.json());
  };

  const loadContacts = async () => {
    try {
      const d = await apiGet(`${API_USERS}/?action=contacts`) as { contacts?: Contact[] };
      setContacts(d.contacts || []);
    } catch { /* ignore */ }
  };

  const loadGroups = async () => {
    try {
      const d = await apiGet(`${API_USERS}/?action=groups`) as { groups?: Group[] };
      setGroups(d.groups || []);
    } catch { /* ignore */ }
  };

  // Build chat list
  const chatList: Chat[] = [
    ...contacts.map(c => ({ key:`d_${c.id}`, name: c.name, ava: c.avatar_url, online: c.online, chatType:'direct' as const, peerId: c.id })),
    ...groups.map(g   => ({ key:`g_${g.id}`, name: g.name, ava: '', online: false, chatType:'group' as const, groupId: g.id })),
  ];

  // Fetch messages since lastId
  const fetchMsgs = useCallback(async (chat: Chat, sinceId: number): Promise<Msg[]> => {
    let url = '';
    if (chat.chatType === 'direct')
      url = `${API_MESSAGES}/?chat_type=direct&peer_id=${chat.peerId}&since_id=${sinceId}`;
    else
      url = `${API_MESSAGES}/?chat_type=group&group_id=${chat.groupId}&since_id=${sinceId}`;
    try {
      const d = await apiGet(url) as { messages?: Msg[] };
      return (d.messages || []).map(m => ({ ...m, mine: m.from_user_id === me.id }));
    } catch { return []; }
  }, [me.id, token]);

  // Open chat → load all → start polling
  const openChat = async (chat: Chat) => {
    setActiveChat(chat);
    setShowMobileChat(true);
    setMessages([]);
    lastIdRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);

    const msgs = await fetchMsgs(chat, 0);
    setMessages(msgs);
    if (msgs.length) lastIdRef.current = msgs[msgs.length-1].id;

    // Real-time polling every 2s
    pollRef.current = setInterval(async () => {
      const cur = activeChatRef.current;
      if (!cur) return;
      const newMsgs = await fetchMsgs(cur, lastIdRef.current);
      if (newMsgs.length) {
        lastIdRef.current = newMsgs[newMsgs.length-1].id;
        setMessages(prev => [...prev, ...newMsgs]);
      }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Send message
  const sendMsg = async (text: string, extra: Partial<Msg & { file_url?: string; file_name?: string; voice_dur?: string }> = {}) => {
    if (!text.trim() && !extra.msg_type) return;
    if (!activeChat) return;
    const time = new Date().toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' });
    const opt: Msg = { id: Date.now(), from_user_id: me.id, sender_name: me.name, sender_avatar: me.avatar_url,
                       msg_type: extra.msg_type || 'text', text, time, mine: true, ...extra };
    setMessages(prev => [...prev, opt]);
    setInput('');
    if (taRef.current) taRef.current.style.height = '40px';

    const body: Record<string, unknown> = {
      chat_type: activeChat.chatType, msg_type: extra.msg_type || 'text', text,
      ...(activeChat.chatType === 'direct' ? { to_user_id: activeChat.peerId } : { group_id: activeChat.groupId }),
      ...(extra.file_url  ? { file_url: extra.file_url, file_name: extra.file_name } : {}),
      ...(extra.voice_dur ? { voice_dur: extra.voice_dur } : {}),
    };
    try {
      const r  = await fetch(API_MESSAGES, { method:'POST', headers: H, body: JSON.stringify(body) });
      const d  = parse(await r.json()) as { id?: number };
      if (d.id) {
        lastIdRef.current = Math.max(lastIdRef.current, d.id);
        setMessages(prev => prev.map(m => m.id === opt.id ? { ...m, id: d.id! } : m));
      }
    } catch { /* optimistic already shown */ }
  };

  // Upload file — snapshot activeChat to avoid stale closure
  const uploadAndSend = (f: File, kind: string) => {
    const chatSnap = activeChatRef.current;
    if (!chatSnap) { alert('Сначала откройте чат'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const b64 = (reader.result as string).split(',')[1];
        const r   = await fetch(API_UPLOAD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: b64, filename: f.name, mime: f.type }),
        });
        const d = parse(await r.json()) as { url?: string; error?: string };
        if (!d.url) { alert('Ошибка загрузки файла'); return; }
        // use sendMsg with current activeChat via ref
        const time = new Date().toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' });
        const opt: Msg = { id: Date.now(), from_user_id: me.id, sender_name: me.name,
          sender_avatar: me.avatar_url, msg_type: kind, text: '', time, mine: true,
          file_url: d.url, file_name: f.name };
        setMessages(prev => [...prev, opt]);
        const body: Record<string, unknown> = {
          chat_type: chatSnap.chatType, msg_type: kind, text: '',
          file_url: d.url, file_name: f.name,
          ...(chatSnap.chatType === 'direct' ? { to_user_id: chatSnap.peerId } : { group_id: chatSnap.groupId }),
        };
        const resp = await fetch(API_MESSAGES, { method:'POST', headers: H, body: JSON.stringify(body) });
        const rd = parse(await resp.json()) as { id?: number };
        if (rd.id) {
          lastIdRef.current = Math.max(lastIdRef.current, rd.id);
          setMessages(prev => prev.map(m => m.id === opt.id ? { ...m, id: rd.id! } : m));
        }
      } catch (e) { alert('Ошибка отправки файла'); }
    };
    reader.readAsDataURL(f);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, kind: string) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    uploadAndSend(f, kind);
  };

  // Voice recording
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // prefer webm, fallback to whatever browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')  ? 'audio/mp4'
        : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recSecRef.current = 0;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const chatSnap = activeChatRef.current;
        const durSec   = recSecRef.current;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const localUrl = URL.createObjectURL(blob);
        stream.getTracks().forEach(t => t.stop());
        const dur = fmt(durSec);

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const b64 = (reader.result as string).split(',')[1];
            const ext  = (mr.mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
            const r = await fetch(API_UPLOAD, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: b64, filename: `voice.${ext}`, mime: mr.mimeType || 'audio/webm' }),
            });
            const d = parse(await r.json()) as { url?: string };
            const voiceUrl = d.url || localUrl;

            // Build message manually using chatSnap (not stale activeChat)
            if (!chatSnap) return;
            const time = new Date().toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' });
            const opt: Msg = { id: Date.now(), from_user_id: me.id, sender_name: me.name,
              sender_avatar: me.avatar_url, msg_type:'voice', text:'', time, mine:true,
              file_url: voiceUrl, voiceUrl, voice_dur: dur };
            setMessages(prev => [...prev, opt]);

            const body: Record<string, unknown> = {
              chat_type: chatSnap.chatType, msg_type:'voice', text:'',
              file_url: voiceUrl, voice_dur: dur,
              ...(chatSnap.chatType==='direct' ? { to_user_id: chatSnap.peerId } : { group_id: chatSnap.groupId }),
            };
            const resp = await fetch(API_MESSAGES, { method:'POST', headers: H, body: JSON.stringify(body) });
            const rd = parse(await resp.json()) as { id?: number };
            if (rd.id) {
              lastIdRef.current = Math.max(lastIdRef.current, rd.id);
              setMessages(prev => prev.map(m => m.id === opt.id ? { ...m, id: rd.id! } : m));
            }
          } catch { /* use local url fallback */ }
        };
        reader.readAsDataURL(blob);
        setRecSec(0);
        recSecRef.current = 0;
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true);
      recTimer.current = setInterval(() => {
        recSecRef.current += 1;
        setRecSec(recSecRef.current);
      }, 1000);
    } catch {
      alert('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
    }
  };

  const stopRec = () => {
    mrRef.current?.stop();
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false);
  };

  const cancelRec = () => {
    if (mrRef.current) { mrRef.current.ondataavailable = null; mrRef.current.onstop = null; mrRef.current.stop(); }
    if (recTimer.current) clearInterval(recTimer.current);
    setRecording(false); setRecSec(0);
  };

  // Search users
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const d = await apiGet(`${API_USERS}/?action=search&q=${encodeURIComponent(searchQ)}`) as { users?: Contact[] };
      setSearchResults(d.users || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addContact = async (uid: number) => {
    await fetch(API_USERS, { method:'POST', headers: H, body: JSON.stringify({ action:'add_contact', contact_id: uid }) });
    setSearchQ(''); setSearchResults([]);
    await loadContacts();
    setShowAddContact(false);
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    await fetch(API_USERS, { method:'POST', headers: H,
      body: JSON.stringify({ action:'create_group', name: newGroupName, description: newGroupDesc, member_ids: selMembers }) });
    setNewGroupName(''); setNewGroupDesc(''); setSelMembers([]);
    setShowAddGroup(false);
    await loadGroups();
  };

  const saveStatus = async () => {
    await fetch(API_USERS, { method:'POST', headers: H,
      body: JSON.stringify({ action:'update_status', status: myStatus, status_text: myStatusText }) });
    setShowStatusModal(false);
  };

  const logout = async () => {
    await fetch(API_AUTH, { method:'POST', headers: H, body: JSON.stringify({ action:'logout', token }) });
    onLogout();
  };

  const navItems: { key: Nav; icon: string; label: string }[] = [
    { key:'chats',    icon:'MessageSquare', label:'Чаты'      },
    { key:'contacts', icon:'Users',         label:'Контакты'  },
    { key:'groups',   icon:'UsersRound',    label:'Группы'    },
    { key:'profile',  icon:'User',          label:'Профиль'   },
    { key:'settings', icon:'Settings',      label:'Настройки' },
  ];

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden font-sans">

      {/* ── Rail desktop */}
      <aside className="hidden md:flex flex-col items-center w-[68px] bg-primary py-5 gap-1.5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3 shadow">
          <Icon name="Send" size={18} className="text-white" />
        </div>
        {navItems.map(n => (
          <button key={n.key} onClick={() => setNav(n.key)} title={n.label}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${nav===n.key ? 'bg-white/20 text-white shadow' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
            <Icon name={n.icon} size={20} />
          </button>
        ))}
        <div className="mt-auto cursor-pointer relative" onClick={() => setShowStatusModal(true)} title="Статус">
          <Avatar src={me.avatar_url} name={me.name} size={40} status={myStatus} />
        </div>
      </aside>

      {/* ── List panel */}
      <section className={`${showMobileChat ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[310px] border-r border-border bg-card shrink-0`}>
        <header className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2 shrink-0">
          <h1 className="font-display font-extrabold text-xl tracking-tight flex-1">
            {navItems.find(n => n.key === nav)?.label}
          </h1>
          {nav === 'contacts' && (
            <button onClick={() => setShowAddContact(true)} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="UserPlus" size={13} /> Добавить
            </button>
          )}
          {nav === 'groups' && (
            <button onClick={() => setShowAddGroup(true)} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg hover:bg-primary/20">
              <Icon name="Plus" size={13} /> Создать
            </button>
          )}
        </header>

        {nav === 'chats' && (
          <div className="px-3 py-2 border-b border-border shrink-0">
            <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 h-9">
              <Icon name="Search" size={14} className="text-muted-foreground" />
              <input placeholder="Поиск чата" className="bg-transparent outline-none text-sm w-full" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

          {/* CHATS */}
          {nav === 'chats' && (
            chatList.length === 0
              ? <Empty icon="MessageSquare" text="Нет чатов" sub="Добавьте контакт, чтобы начать" action="Перейти в контакты" onAction={() => setNav('contacts')} />
              : chatList.map(c => (
                <button key={c.key} onClick={() => openChat(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeChat?.key===c.key ? 'bg-secondary' : 'hover:bg-secondary/60'}`}>
                  <Avatar src={c.ava} name={c.name} size={44} status={c.chatType==='direct' ? (contacts.find(ct=>ct.id===c.peerId)?.status ?? 'away') : undefined} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="font-semibold text-sm truncate">{c.name}</span>
                      {c.lastTime && <span className="text-[11px] text-muted-foreground ml-2 shrink-0">{c.lastTime}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMsg || 'Начните разговор'}</p>
                  </div>
                </button>
              ))
          )}

          {/* CONTACTS */}
          {nav === 'contacts' && (
            contacts.length === 0
              ? <Empty icon="Users" text="Нет контактов" sub="Найдите друзей по номеру" action="Добавить контакт" onAction={() => setShowAddContact(true)} />
              : contacts.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  <Avatar src={c.avatar_url} name={c.name} size={44} status={c.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_LABEL[c.status] ?? c.status}{c.status_text ? ` · ${c.status_text}` : ''}</p>
                  </div>
                  <button onClick={() => { const ch = chatList.find(ch => ch.peerId===c.id); if(ch) openChat(ch); }}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="MessageSquare" size={15} />
                  </button>
                </div>
              ))
          )}

          {/* GROUPS */}
          {nav === 'groups' && (
            groups.length === 0
              ? <Empty icon="UsersRound" text="Нет групп" sub="Создайте группу для общения" action="Создать группу" onAction={() => setShowAddGroup(true)} />
              : groups.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50">
                  <Avatar name={g.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.members} участников{g.desc ? ` · ${g.desc}` : ''}</p>
                  </div>
                  <button onClick={() => { const ch = chatList.find(ch => ch.groupId===g.id); if(ch) openChat(ch); }}
                    className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
                    <Icon name="MessageSquare" size={15} />
                  </button>
                </div>
              ))
          )}

          {/* PROFILE */}
          {nav === 'profile' && (
            <div className="p-5 flex flex-col items-center text-center animate-fade-in">
              <div className="relative">
                <Avatar src={me.avatar_url} name={me.name} size={88} status={myStatus} />
              </div>
              <h2 className="mt-3 font-display font-bold text-xl">{me.name}</h2>
              <p className="text-sm text-muted-foreground">{me.phone}</p>
              <p className="mt-1 text-sm font-medium text-primary">{STATUS_LABEL[myStatus] ?? myStatus}</p>
              {myStatusText && <p className="text-xs text-muted-foreground mt-0.5">«{myStatusText}»</p>}
              <button onClick={() => setShowStatusModal(true)} className="mt-3 px-4 py-1.5 bg-secondary rounded-lg text-sm font-medium hover:bg-secondary/70 transition-colors">
                Изменить статус
              </button>
              <div className="mt-5 w-full space-y-2 text-left">
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground">Контактов</p>
                  <p className="font-semibold text-sm">{contacts.length}</p>
                </div>
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <p className="text-xs text-muted-foreground">Групп</p>
                  <p className="font-semibold text-sm">{groups.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {nav === 'settings' && (
            <div className="p-4 space-y-2 animate-fade-in">
              <button onClick={() => setDark(d => !d)} className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                <Icon name={dark ? 'Moon' : 'Sun'} size={18} className="text-primary" />
                <span className="font-medium flex-1 text-left text-sm">Тёмная тема</span>
                <span className={`w-10 h-5 rounded-full p-0.5 transition-colors ${dark ? 'bg-accent' : 'bg-border'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
                </span>
              </button>
              {[{ i:'Bell', t:'Уведомления' }, { i:'Lock', t:'Конфиденциальность' }].map(r => (
                <button key={r.t} className="w-full flex items-center gap-3 bg-secondary rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors">
                  <Icon name={r.i} size={18} className="text-primary" />
                  <span className="font-medium flex-1 text-left text-sm">{r.t}</span>
                  <Icon name="ChevronRight" size={15} className="text-muted-foreground" />
                </button>
              ))}
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-destructive font-medium text-sm hover:bg-destructive/5 rounded-xl transition-colors">
                <Icon name="LogOut" size={18} /> Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Chat window */}
      <main className={`${showMobileChat ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {activeChat ? (
          <>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0">
              <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary"
                onClick={() => { setShowMobileChat(false); if(pollRef.current) clearInterval(pollRef.current); }}>
                <Icon name="ArrowLeft" size={20} />
              </button>
              <Avatar src={activeChat.ava} name={activeChat.name} size={38}
                status={activeChat.chatType==='direct' ? (contacts.find(c=>c.id===activeChat.peerId)?.status ?? 'away') : undefined} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{activeChat.name}</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  реальное время · обновление каждые 2 сек
                </p>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
              style={{ background:'radial-gradient(ellipse at 5% 0%, hsl(var(--secondary)/50%) 0%, hsl(var(--background)) 60%)' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 opacity-50">
                  <Icon name="MessageSquare" size={36} />
                  <p>Напишите первое сообщение</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} gap-2 animate-msg-in`}>
                  {!m.mine && <Avatar src={m.sender_avatar} name={m.sender_name} size={26} />}
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${m.mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border rounded-bl-sm'}`}>
                    {!m.mine && activeChat.chatType==='group' && (
                      <p className="text-[10px] font-semibold text-primary mb-0.5">{m.sender_name}</p>
                    )}

                    {/* voice */}
                    {m.msg_type==='voice' && (
                      <div className="flex items-center gap-2 py-0.5">
                        {(m.voiceUrl || m.file_url) ? (
                          <audio controls src={m.voiceUrl || m.file_url}
                            className="h-8 max-w-[200px]"
                            style={{ colorScheme: m.mine ? 'dark' : 'light' }} />
                        ) : (
                          <>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${m.mine ? 'bg-white/20' : 'bg-primary/10'}`}>
                              <Icon name="Play" size={13} className={m.mine ? 'text-white' : 'text-primary'} />
                            </div>
                            <Wave mine={m.mine} />
                            <span className="text-xs opacity-70">{m.voice_dur}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* image */}
                    {m.msg_type==='image' && m.file_url && (
                      <img src={m.file_url} alt="фото" onClick={() => setLightbox(m.file_url!)}
                        className="rounded-xl max-w-[220px] max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                    )}

                    {/* video */}
                    {m.msg_type==='video' && m.file_url && (
                      <video src={m.file_url} controls className="rounded-xl max-w-[220px] max-h-52" />
                    )}

                    {/* file */}
                    {m.msg_type==='file' && m.file_url && (
                      <a href={m.file_url} download={m.file_name} target="_blank" rel="noreferrer"
                        className={`flex items-center gap-2 text-xs underline ${m.mine ? 'text-white/90' : 'text-primary'}`}>
                        <Icon name="FileText" size={16} />
                        <span className="truncate max-w-[160px]">{m.file_name || 'Файл'}</span>
                      </a>
                    )}

                    {/* text */}
                    {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>}

                    <p className={`text-[10px] mt-0.5 ${m.mine ? 'text-white/40 text-right' : 'text-muted-foreground'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <footer className="shrink-0 border-t border-border bg-card"
              style={{ paddingBottom:'max(env(safe-area-inset-bottom), 60px)' }}>
              {recording && (
                <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
                  <span className="text-destructive text-sm font-medium flex-1">Запись {fmt(recSec)}</span>
                  <button onClick={cancelRec} className="text-xs border border-destructive/40 text-destructive px-2.5 py-1 rounded-full">Отмена</button>
                  <button onClick={stopRec}   className="text-xs bg-destructive text-white px-2.5 py-1 rounded-full font-medium">Отправить</button>
                </div>
              )}
              <div className="flex items-end gap-2 px-3 py-2">
                {/* Attach menu */}
                <div className="relative group/attach shrink-0">
                  <button className="w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground">
                    <Icon name="Paperclip" size={19} />
                  </button>
                  <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-xl p-1.5 flex flex-col gap-0.5 min-w-[130px] opacity-0 pointer-events-none group-hover/attach:opacity-100 group-hover/attach:pointer-events-auto group-focus-within/attach:opacity-100 group-focus-within/attach:pointer-events-auto transition-all z-10">
                    <button onClick={() => photoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Image" size={14} className="text-primary" /> Фото
                    </button>
                    <button onClick={() => videoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="Film" size={14} className="text-primary" /> Видео
                    </button>
                    <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary text-sm font-medium">
                      <Icon name="FileText" size={14} className="text-primary" /> Файл
                    </button>
                  </div>
                </div>
                <input type="file" ref={photoRef} accept="image/*" onChange={e => handleFile(e,'image')} className="hidden" />
                <input type="file" ref={videoRef} accept="video/*" onChange={e => handleFile(e,'video')} className="hidden" />
                <input type="file" ref={fileRef}                   onChange={e => handleFile(e,'file')}  className="hidden" />

                <textarea ref={taRef} value={input} disabled={recording}
                  onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,96)+'px'; }}
                  onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMsg(input); } }}
                  placeholder="Сообщение…" rows={1}
                  className="flex-1 resize-none bg-secondary rounded-xl px-3.5 py-2.5 text-sm outline-none overflow-hidden leading-relaxed disabled:opacity-40"
                  style={{ minHeight:40 }} />

                {input.trim() ? (
                  <button onClick={() => sendMsg(input)}
                    className="w-10 h-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow">
                    <Icon name="Send" size={17} />
                  </button>
                ) : (
                  <button onClick={recording ? stopRec : startRec}
                    className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center relative transition-all shadow ${recording ? 'bg-destructive text-white' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'}`}>
                    {recording && <span className="absolute inset-0 rounded-xl bg-destructive animate-pulse-ring opacity-50" />}
                    <Icon name={recording ? 'Square' : 'Mic'} size={17} />
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Icon name="MessageSquare" size={36} className="text-primary/25" />
            </div>
            <p className="font-display font-bold text-lg">Выберите чат</p>
            <p className="text-sm opacity-60">или начните новый разговор</p>
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav */}
      {!showMobileChat && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border flex justify-around pt-2 z-40"
          style={{ paddingBottom:'max(env(safe-area-inset-bottom),8px)' }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setNav(n.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${nav===n.key ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon name={n.icon} size={22} />
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* ── Modal: Add contact (поиск) */}
      {showAddContact && (
        <Modal title="Добавить контакт" onClose={() => { setShowAddContact(false); setSearchQ(''); setSearchResults([]); }}>
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 h-10 mb-3">
            <Icon name="Search" size={15} className="text-muted-foreground" />
            <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Имя или телефон"
              className="bg-transparent outline-none text-sm w-full" />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {searching && <p className="text-sm text-muted-foreground text-center py-3">Поиск…</p>}
            {!searching && searchQ && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">Не найдено</p>
            )}
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary">
                <Avatar src={u.avatar_url} name={u.name} size={38} status={u.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.phone}</p>
                </div>
                <button onClick={() => addContact(u.id)}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90">
                  Добавить
                </button>
              </div>
            ))}
            {!searchQ && <p className="text-sm text-muted-foreground text-center py-4 opacity-60">Введите имя или номер телефона</p>}
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
              <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="О чём эта группа"
                className="w-full bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30" />
            </div>
            {contacts.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Участники</label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {contacts.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-primary"
                        checked={selMembers.includes(c.id)}
                        onChange={e => setSelMembers(m => e.target.checked ? [...m,c.id] : m.filter(id => id!==c.id))} />
                      <Avatar src={c.avatar_url} name={c.name} size={30} />
                      <span className="text-sm font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${myStatus===s ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-secondary'}`}>
                <span className={`w-3 h-3 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
                {myStatus===s && <Icon name="Check" size={14} className="ml-auto text-primary" />}
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
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><Icon name="X" size={26} /></button>
          <img src={lightbox} alt="просмотр" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ icon, text, sub, action, onAction }: { icon: string; text: string; sub: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2 px-4">
      <Icon name={icon} size={34} className="opacity-25" />
      <p className="font-semibold text-sm">{text}</p>
      <p className="text-xs opacity-70 text-center">{sub}</p>
      <button onClick={onAction} className="mt-1 text-xs text-primary font-medium hover:underline">{action} →</button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [user, setUser]   = useState<User|null>(null);
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      // verify token is still valid
      fetch(API_AUTH, { method:'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action:'me', token: savedToken }) })
        .then(r => r.json())
        .then(raw => {
          const d = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { user?: User; error?: string };
          if (d.user) { setUser(d.user); setToken(savedToken); }
          else { localStorage.removeItem('token'); localStorage.removeItem('user'); }
        })
        .catch(() => {
          // fallback: use saved user if network fails
          try { setUser(JSON.parse(savedUser!)); setToken(savedToken); } catch { /* ignore */ }
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleAuth = (u: User, t: string) => { setUser(u); setToken(t); };
  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    setUser(null); setToken('');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Icon name="Send" size={22} className="text-primary" />
          </div>
          <p className="text-sm">Загрузка…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;
  return <Messenger me={user} token={token} onLogout={handleLogout} />;
}