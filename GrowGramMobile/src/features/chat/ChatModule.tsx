// src/features/Chat/ChatModule.tsx
// -----------------------------------------------------------------------------
// GrowGram – Neon Chat (List + Thread)
// - Kein Long-Press
// - Swipe-to-Reply
// - Kleine Tap-Reactions
// - Bloom sendet 🌿
// - Foto senden (expo-image-picker)
// - Voice Notes (expo-av)
// - KEIN zweites GrowDock in Screens (nur globales Dock außerhalb dieses Moduls)
// -----------------------------------------------------------------------------

import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList,
  KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View, Linking, Keyboard, type FlatListProps,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';

// ---- API contracts (du implementierst diese in utils/api.ts) ----------------
import {
  me,
  chatList,
  chatOpen,
  chatSearchUsers,
  chatGetMessages,
  chatSendMessage,
  chatMarkRead,
  // OPTIONAL: falls du Attachments trennst, mach dir chatSendAttachment(...)
  type Chat,
  type ChatMessage as ApiChatMessage,
} from '../../utils/api';

// ---- Theme ------------------------------------------------------------------
const BG = '#071c12';
const CARD = '#0e241a';
const BORDER = '#153423';
const ACCENT = '#43d26a';
const TEXT = '#eaf6ef';
const MUTED = '#9bb7a6';

const ROW_H = 78;
const HEADER_H = 28;
const MSG_H = 64;

type GetItemLayout<T> = NonNullable<FlatListProps<T>['getItemLayout']>;

// ---- Helpers ----------------------------------------------------------------
function toDate(ts: any): Date {
  if (!ts) return new Date(NaN);
  if (typeof ts?.toDate === 'function') return ts.toDate();
  if (typeof ts?.toMillis === 'function') return new Date(ts.toMillis());
  if (typeof ts === 'number') return new Date(ts);
  const d = new Date(String(ts));
  return Number.isNaN(d.getTime()) ? new Date(NaN) : d;
}
function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function timeShort(d: Date) {
  if (!Number.isFinite(d.getTime())) return '';
  const now = new Date();
  if (dateKey(d) === dateKey(now)) {
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString();
}
function linkifyChunks(text?: string): Array<{k:string;t:string;href?:string}> {
  if (!text) return [{k:'t0',t:''}];
  const rx = /\b((https?:\/\/|www\.)[^\s<>()]+)\b/gi;
  const out: Array<{k:string;t:string;href?:string}> = [];
  let last = 0, i = 0; let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) {
    const start = m.index, match = m[0];
    if (start > last) out.push({ k:`txt${i++}`, t:text.slice(last, start) });
    const href = match.startsWith('http') ? match : `https://${match}`;
    out.push({ k:`lnk${i++}`, t:match, href });
    last = start + match.length;
  }
  if (last < text.length) out.push({ k:`txt${i++}`, t:text.slice(last) });
  return out;
}

// ---- UI Primitives ----------------------------------------------------------
const Avatar = memo(function Avatar({ uri, name, size=48 }: { uri?: string; name?: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width:size, height:size, borderRadius:Math.round(size/4) }} contentFit="cover" />;
  }
  const letter = (name||'?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={{ width:size, height:size, borderRadius:Math.round(size/4), backgroundColor:'#143e27', alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:'#bdfccf', fontWeight:'900' }}>{letter}</Text>
    </View>
  );
});

const LeafGlow = () => (
  <View style={styles.leafGlow}>
    <Text style={{ fontSize:16 }}>🌿</Text>
  </View>
);

const TypingPill = () => (
  <View style={[styles.leafGlow, { backgroundColor:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.12)' }]}>
    <Text style={{ color:MUTED, fontWeight:'800', fontSize:12 }}>Schreibt…</Text>
  </View>
);

const Chip = memo(({ active, label, onPress }: { active?: boolean; label: string; onPress?: () => void }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
  </Pressable>
));

const StoryAvatar = memo(function StoryAvatar({ uri, name, onPress }: { uri?:string; name?:string; onPress?:()=>void }) {
  return (
    <Pressable onPress={onPress} style={styles.storyWrap}>
      <View style={styles.storyGlow}/>
      <View style={styles.storyAvatar}>
        <Avatar uri={uri} name={name} size={52}/>
      </View>
    </Pressable>
  );
});

const SectionHeader = memo(({ label }: { label: string }) => (
  <View style={{ paddingHorizontal:12, paddingTop:16, paddingBottom:8 }}>
    <Text style={{ color:MUTED, fontWeight:'800' }}>{label}</Text>
  </View>
));

// ==== LIST ===================================================================
const ChatRow = memo(function ChatRow({
  item, selfId, onPress,
}: { item: Chat & { typing?: boolean }; selfId: string; onPress: (c: Chat) => void }) {
  const last = (item.lastMessage || '').trim() || 'Neue Unterhaltung';
  const when = timeShort(toDate(item.updatedAt));
  const unread = (item.unread && selfId && Number(item.unread[selfId])) || 0;

  return (
    <Pressable onPress={() => onPress(item)} style={({pressed})=>[
      styles.cardRow, pressed && { opacity:0.96, transform:[{scale:0.998}] }, unread>0 && styles.cardRowUnread,
    ]}>
      <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
        <View style={{ width:58, alignItems:'center' }}>
          <Avatar uri={item.peer?.avatarUrl} name={item.peer?.username || item.peer?.firstName} size={50}/>
        </View>

        <View style={{ flex:1, marginLeft:10 }}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.peer?.username || [item.peer?.firstName, item.peer?.lastName].filter(Boolean).join(' ') || 'Chat'}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text style={styles.chatSubtitle} numberOfLines={1}>{last}</Text>
            <Text style={styles.chatWhen}>{when || ' '}</Text>
          </View>
        </View>

        {item?.typing ? <TypingPill/> : <LeafGlow/>}
      </View>
    </Pressable>
  );
});

type Row = { kind:'header'; id:string; label:string } | ({ kind:'chat' } & Chat);

export function ChatListScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<Chat[]>([]);
  const [tab, setTab] = useState<'all'|'unread'|'groups'>('all');

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const load = useCallback(async ()=>{
    setLoading(true);
    try {
      const u = await me(); setSelfId(u?.id||'');
      const list = await chatList();
      const sorted = (list||[]).sort((a,b)=>toDate(b.updatedAt).getTime()-toDate(a.updatedAt).getTime());
      setData(sorted);
    } catch (e:any) {
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Chats konnten nicht geladen werden.');
    } finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);
  useFocusEffect(useCallback(()=>{ load(); return ()=>{}; },[load]));

  const onRefresh = useCallback(async()=>{ setRefreshing(true); try{ await load(); } finally{ setRefreshing(false);} },[load]);

  // Faces
  const topFaces = useMemo(()=> {
    const src = [...data].slice(0,4);
    return src.map(c=>({ id:c.id, name: c.peer?.username || c.peer?.firstName || 'U', avatar: c.peer?.avatarUrl }));
  },[data]);

  const rows: Row[] = useMemo(()=>{
    const filtered = data.filter(c=>{
      if (tab==='unread') { const u=(c.unread && selfId && Number(c.unread[selfId])) || 0; return u>0; }
      if (tab==='groups') return (c.members?.length??0)>2;
      return true;
    });
    const sorted = filtered.sort((a,b)=>toDate(b.updatedAt).getTime()-toDate(a.updatedAt).getTime());
    const out: Row[] = [];
    if (sorted.length) out.push({ kind:'header', id:'h_fix', label:'Fixiert' });
    const todayKey = dateKey(new Date());
    let pushedEarlier = false;
    for (const c of sorted) {
      const k = dateKey(toDate(c.updatedAt));
      if (k !== todayKey && !pushedEarlier) { out.push({ kind:'header', id:'h_earlier', label:'Früher' }); pushedEarlier = true; }
      out.push({ kind:'chat', ...c });
    }
    return out;
  },[data,tab,selfId]);

  const stickyIdx = useMemo(()=> rows.map((r,i)=> r.kind==='header'?i:-1).filter(i=>i>=0),[rows]);

  // Suche (Top-Sheet)
  const onChangeQuery = useCallback((q:string)=>{
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async ()=>{
      try {
        const users = await chatSearchUsers(q.trim());
        const cleaned = (users||[]).filter((u:any)=> String(u.id) !== selfId);
        setResults(cleaned);
      } catch { setResults([]); }
      finally { setSearchLoading(false); }
    }, 220);
  },[selfId]);

  const startChatWith = useCallback(async (user:any)=>{
    try {
      Haptics.selectionAsync();
      const thr = await chatOpen(String(user.id));
      setSearchOpen(false); setQuery(''); setResults([]);
      nav.navigate('ChatThread', {
        chatId: thr.id,
        title: thr?.peer?.username || user.username || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Chat',
        peerAvatarUrl: thr?.peer?.avatarUrl || user.avatarUrl,
      });
    } catch (e:any) {
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht öffnen.');
    }
  },[nav]);

  const openChat = useCallback((c:Chat)=>{
    const title = c.peer?.username || [c.peer?.firstName, c.peer?.lastName].filter(Boolean).join(' ') || 'Chat';
    nav.navigate('ChatThread', { chatId:c.id, title, peerAvatarUrl:c.peer?.avatarUrl });
  },[nav]);

  // Haupt-GrowDock ist global – wir rendern HIER KEINS!
  const bottomPad = insets.bottom + 16;

  const searchSheet = (
    <Modal visible={searchOpen} animationType="slide" onRequestClose={()=>setSearchOpen(false)} transparent statusBarTranslucent>
      <View style={styles.modalBg}>
        <KeyboardAvoidingView style={{ flex:1, justifyContent:'flex-start' }} behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={[styles.modalCardTop, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom,12) }]}>
            <Text style={styles.modalTitle}>Neuer Chat</Text>
            <TextInput
              value={query} onChangeText={onChangeQuery}
              placeholder="Name, @username oder E-Mail" placeholderTextColor="#86a496"
              style={styles.modalInput} autoFocus returnKeyType="search" selectionColor={ACCENT}
              onSubmitEditing={()=>{ if(results[0]) startChatWith(results[0]); }}
            />
            {searchLoading ? (
              <View style={{ paddingVertical:12, alignItems:'center' }}>
                <ActivityIndicator color={ACCENT}/>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(u)=>String(u.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item })=>(
                  <Pressable onPress={()=>{ Keyboard.dismiss(); startChatWith(item); }} style={styles.userRow}>
                    <Avatar uri={item.avatarUrl} name={item.username||item.firstName} size={44}/>
                    <View style={{ flex:1 }}>
                      <Text style={{ color:TEXT, fontWeight:'800' }} numberOfLines={1}>
                        {item.username || [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unbekannt'}
                      </Text>
                      {!!item.email && <Text style={{ color:MUTED, fontSize:12, marginTop:2 }} numberOfLines={1}>{item.email}</Text>}
                    </View>
                    <View style={styles.newBtn}><Text style={styles.newBtnTxt}>Starten</Text></View>
                  </Pressable>
                )}
                ListEmptyComponent={query.trim()?<Text style={{ color:MUTED, textAlign:'center', paddingVertical:8 }}>Keine Ergebnisse</Text>:null}
                style={{ maxHeight: Math.round(Dimensions.get('window').height*0.62) }}
              />
            )}
            <Pressable onPress={()=>{ setSearchOpen(false); setQuery(''); setResults([]); }} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>Schließen</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex:1, backgroundColor:BG }}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top+6 }]}>
        <Text style={styles.h1}>Chats</Text>

        {/* Suche + Neu */}
        <View style={styles.searchRow}>
          <Pressable onPress={()=>setSearchOpen(true)} style={styles.searchField}>
            <Text style={styles.searchPlaceholder}>Suchen oder neuen Chat starten…</Text>
          </Pressable>
          <Pressable onPress={()=>setSearchOpen(true)} style={styles.newBtn}>
            <Text style={styles.newBtnTxt}>Neu</Text>
          </Pressable>
        </View>

        {/* Faces */}
        <View style={styles.facesRow}>
          <StoryAvatar name="Du" onPress={()=>setSearchOpen(true)}/>
          {topFaces.map(f=> <StoryAvatar key={f.id} uri={f.avatar} name={f.name}/>)}
          <Pressable onPress={()=>setSearchOpen(true)} style={styles.faceAdd}><Text style={{ fontSize:18, color:TEXT }}>✓</Text></Pressable>
        </View>

        {/* Segment */}
        <View style={styles.segmentWrap}>
          <Chip label="Alle"       active={tab==='all'}    onPress={()=>setTab('all')} />
          <Chip label="Ungelesen"  active={tab==='unread'} onPress={()=>setTab('unread')} />
          <Chip label="Gruppen"    active={tab==='groups'} onPress={()=>setTab('groups')} />
        </View>
      </View>

      {/* Liste */}
      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" color={ACCENT}/>
        </View>
      ) : (
        <FlatList<Row>
          data={rows}
          keyExtractor={(r)=> (r as any).id}
          renderItem={({ item }) => item.kind==='header'
            ? <SectionHeader label={item.label}/>
            : <ChatRow item={item} selfId={selfId} onPress={openChat}/>
          }
          getItemLayout={(_d, index)=>{
            const arr = rows;
            const len = arr[index]?.kind==='header' ? HEADER_H : ROW_H;
            let off = 0; for (let i=0;i<index;i++) off += arr[i]?.kind==='header' ? HEADER_H : ROW_H;
            return { length:len, offset:off, index };
          }}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal:12 }}
          ItemSeparatorComponent={()=> <View style={{ height:6 }}/>}
          stickyHeaderIndices={stickyIdx}
          refreshControl={<RefreshControl tintColor={ACCENT} refreshing={refreshing} onRefresh={onRefresh}/>}
          removeClippedSubviews initialNumToRender={14} windowSize={9}
        />
      )}

      {searchSheet}
    </View>
  );
}

// ==== THREAD =================================================================
type ThreadRoute = RouteProp<Record<'ChatThread', { chatId:string; title?:string; peerAvatarUrl?:string }>, 'ChatThread'>;
type ChatMessage = ApiChatMessage & { _status?: 'sending'|'sent'; _replyToId?: string|null; type?: 'text'|'image'|'audio' };

export function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const route = useRoute<ThreadRoute>();
  const { chatId, title, peerAvatarUrl } = route.params || ({} as any);

  const [selfId, setSelfId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<number|null>(null);
  const [input, setInput] = useState('');

  // Auswahl / Reactions
  const [selected, setSelected] = useState<ChatMessage|null>(null);
  const [dockY, setDockY] = useState<number|null>(null);
  const aDock = useRef(new Animated.Value(0)).current;

  // Reply
  const [replyTo, setReplyTo] = useState<ChatMessage|null>(null);

  // Audio
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const fetchingMoreRef = useRef(false);

  useEffect(()=>{
    nav.setOptions({
      headerShown:true,
      title: title || 'Unterhaltung',
      headerTintColor: TEXT,
      headerStyle: { backgroundColor: BG },
      headerRight: ()=> peerAvatarUrl ? <Avatar uri={peerAvatarUrl} size={28}/> : null,
    });
  },[nav,title,peerAvatarUrl]);

  const boot = useCallback(async()=>{
    setLoading(true);
    try {
      const u = await me(); setSelfId(u?.id||'');
      const { messages, nextCursor } = await chatGetMessages(chatId, 30);
      setMessages((messages||[]).map(m=>({ ...m, _status:'sent' })));
      setNextCursor(nextCursor ?? null);
      chatMarkRead(chatId).catch(()=>{});
    } catch (e:any) {
      Alert.alert('Fehler', e?.response?.data?.details || e?.message || 'Konnte Chat nicht laden.');
    } finally { setLoading(false); }
  },[chatId]);
  useEffect(()=>{ boot(); },[boot]);
  useFocusEffect(useCallback(()=>{ chatMarkRead(chatId).catch(()=>{}); },[chatId]));

  const loadMore = useCallback(async()=>{
    if (!nextCursor || fetchingMoreRef.current) return;
    fetchingMoreRef.current = true;
    try {
      const { messages: more, nextCursor:nx } = await chatGetMessages(chatId, 30, nextCursor);
      setMessages(prev => [...prev, ...((more||[]).map(m=>({ ...m, _status:'sent' })) as ChatMessage[])]);
      setNextCursor(nx ?? null);
    } finally { fetchingMoreRef.current = false; }
  },[chatId,nextCursor]);

  // ---- send text / bloom ----------------------------------------------------
  const sendText = useCallback(async (txt: string, reply?: ChatMessage | null)=>{
    const clean = txt.trim(); if (!clean) return;
    const temp: ChatMessage = {
      id:`tmp_${Date.now()}`, senderId:selfId||'me', type:'text', text:clean,
      createdAt:new Date().toISOString(), _status:'sending', _replyToId: reply?.id || null,
    };
    setMessages(prev=>[temp, ...prev]);
    try {
      const saved = (await chatSendMessage(chatId, clean, reply?.id || undefined)) as ChatMessage;
      saved._status = 'sent';
      setMessages(prev=> prev.map(m => m.id === temp.id ? saved : m));
      listRef.current?.scrollToOffset({ animated:true, offset:0 });
    } catch (e:any) {
      setMessages(prev=> prev.filter(m => m.id !== temp.id));
      Alert.alert('Senden fehlgeschlagen', e?.response?.data?.details || e?.message || 'Bitte später erneut versuchen.');
    }
  },[chatId,selfId]);

  const send = useCallback(async ()=>{
    if (sending) return;
    setSending(true);
    try { await sendText(input, replyTo); setInput(''); setReplyTo(null); }
    finally { setSending(false); }
  },[input, replyTo, sendText, sending]);

  const sendBloom = useCallback(()=> {
    Haptics.selectionAsync();
    sendText('🌿');
  },[sendText]);

  // ---- media: image ---------------------------------------------------------
  const pickImage = useCallback(async ()=>{
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Kamera', 'Keine Berechtigung.'); return; }
      const res = await ImagePicker.launchCameraAsync({ quality:0.8, base64:false });
      if (res.canceled) return;
      // Lösung A: du erweiterst chatSendMessage, um images zu akzeptieren.
      await sendText('📷 Foto'); // Platzhalter falls du noch kein Upload hast
      // TODO: upload res.assets[0].uri -> Backend -> chat message mit type:image senden
    } catch (e:any) {
      Alert.alert('Kamera', e?.message || 'Fehler beim Öffnen der Kamera.');
    }
  },[sendText]);

  // ---- media: voice ---------------------------------------------------------
  const toggleRecord = useCallback(async ()=>{
    try {
      if (!isRecording) {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) { Alert.alert('Mikrofon', 'Keine Berechtigung.'); return; }
        await Audio.setAudioModeAsync({ allowsRecordingIOS:true, playsInSilentModeIOS:true });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        recordingRef.current = recording;
        setIsRecording(true);
      } else {
        const rec = recordingRef.current;
        if (!rec) return;
        await rec.stopAndUnloadAsync();
        const uri = rec.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        // Wieder: erst mal als Text-Hinweis senden, bis du Upload implementierst:
        await sendText('🎤 Sprachnachricht');
        // TODO: Datei (uri) hochladen und echte audio-message erzeugen.
      }
    } catch (e:any) {
      setIsRecording(false);
      Alert.alert('Audio', e?.message || 'Aufnahme fehlgeschlagen.');
    }
  },[isRecording, sendText]);

  // ---- tap-reactions / swipe-to-reply --------------------------------------
  const openDock = useCallback((m:ChatMessage, pageY:number)=>{
    setSelected(m);
    const topSafe = insets.top + 90;
    const bottomSafe = Dimensions.get('window').height - (insets.bottom + 180);
    const y = Math.max(topSafe, Math.min(pageY - 90, bottomSafe));
    setDockY(y);
    Animated.spring(aDock, { toValue:1, useNativeDriver:true, bounciness:8, speed:10 }).start();
  },[aDock,insets.top,insets.bottom]);

  const closeDock = useCallback(()=>{
    Animated.timing(aDock, { toValue:0, duration:140, easing:Easing.out(Easing.quad), useNativeDriver:true }).start(()=>{
      setSelected(null); setDockY(null);
    });
  },[aDock]);

  const onSwipeReply = useCallback((m:ChatMessage)=>{
    Haptics.selectionAsync();
    setReplyTo(m);
  },[]);

  // ---- bubble ---------------------------------------------------------------
  const MsgBubble = memo(function MsgBubble({ item }: { item:ChatMessage }) {
    const mine = item.senderId === selfId;
    const t = timeShort(toDate(item.createdAt));
    const chunks = linkifyChunks(item.text);

    // Swipe links => Reply
    const startX = useRef(0);
    const onStart = (e:any)=>{ startX.current = e.nativeEvent.pageX || 0; };
    const onMove = (e:any)=>{
      const dx = (e.nativeEvent.pageX || 0) - (startX.current || 0);
      if (!mine && dx > 48) { onSwipeReply(item); startX.current = e.nativeEvent.pageX || 0; }
    };

    return (
      <Pressable
        onPressIn={(e)=> openDock(item, (e.nativeEvent as any).pageY ?? 300)}
        onTouchStart={onStart}
        onTouchMove={onMove}
        style={[styles.bubbleRow, mine ? { justifyContent:'flex-end' } : { justifyContent:'flex-start' }]}
      >
        {!mine && <View style={{ width:32 }}/>}
        <View style={[
          styles.bubble,
          mine
            ? { backgroundColor: ACCENT, borderTopRightRadius: 6 }
            : { backgroundColor: CARD, borderTopLeftRadius: 6, borderWidth: 1, borderColor: BORDER },
        ]}>
          <Text style={[styles.bubbleText, mine ? { color:'#0c1a10' } : { color:TEXT }]}>
            {chunks.map(c => c.href
              ? <Text key={c.k} style={[styles.bubbleText, { textDecorationLine:'underline' }, mine?{ color:'#0c1a10' }:{ color:TEXT }]} onPress={()=>Linking.openURL(c.href!)}>{c.t}</Text>
              : <Text key={c.k} style={[styles.bubbleText, mine?{ color:'#0c1a10' }:{ color:TEXT }]}>{c.t}</Text>
            )}
          </Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:4 }}>
            {!!t && <Text style={[styles.bubbleMeta, mine?{ color:'#0c1a10' }:{ color:MUTED }]}>{t}</Text>}
            {mine && <Text style={[styles.bubbleMeta, { fontWeight:'900' }]}>{item._status==='sending'?'…':'✓✓'}</Text>}
          </View>
        </View>
      </Pressable>
    );
  });

  if (loading) {
    return <View style={{ flex:1, backgroundColor:BG, alignItems:'center', justifyContent:'center' }}><ActivityIndicator size="large" color={ACCENT}/></View>;
  }

  const composerBottomPad = Math.max(insets.bottom, 8) + 16;
  const popStyle = {
    transform: [
      { translateY: aDock.interpolate({ inputRange:[0,1], outputRange:[10,0] }) },
      { scale:      aDock.interpolate({ inputRange:[0,1], outputRange:[0.96,1] }) },
    ],
    opacity: aDock,
  } as any;

  return (
    <View style={{ flex:1, backgroundColor:BG }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS==='ios' ? insets.top+52 : 0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m)=> String(m.id)}
          renderItem={({ item }) => <MsgBubble item={item} />}
          contentContainerStyle={{ paddingTop:8, paddingBottom:8 }}
          style={{ flex:1 }}
          inverted
          onEndReachedThreshold={0.1}
          onEndReached={loadMore}
          getItemLayout={(_d,i)=>({ length:MSG_H, offset:MSG_H*i, index:i })}
          initialNumToRender={18}
          windowSize={9}
          removeClippedSubviews
        />

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
          {replyTo && (
            <View style={styles.replyBar}>
              <View style={styles.replyStripe}/>
              <View style={{ flex:1 }}>
                <Text style={styles.replyLabel}>Antwort auf</Text>
                <Text style={styles.replyText} numberOfLines={1}>{replyTo.text}</Text>
              </View>
              <Pressable onPress={()=>setReplyTo(null)} hitSlop={10} style={styles.replyClose}>
                <Text style={{ color:MUTED, fontSize:16 }}>✕</Text>
              </Pressable>
            </View>
          )}

          <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
            <Pressable onPress={pickImage} style={styles.iconBtn}><Text style={{ fontSize:18, color:TEXT }}>📷</Text></Pressable>
            <TextInput
              style={[styles.composerInput, { flex:1 }]}
              value={input}
              onChangeText={setInput}
              placeholder="Nachricht schreiben…"
              placeholderTextColor="#86a496"
              multiline
              maxLength={2000}
            />
            <Pressable onPress={toggleRecord} style={[styles.iconBtn, isRecording && { borderColor:ACCENT, backgroundColor:'rgba(67,210,106,0.18)' }]}>
              <Text style={{ fontSize:18, color:isRecording?ACCENT:TEXT }}>🎤</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection:'row', alignItems:'center', marginTop:10 }}>
            <Pressable onPress={send} disabled={sending || !input.trim()} style={[styles.sendBtn, (sending || !input.trim()) && { opacity:0.6 }]}>
              <Text style={{ color:'#0c1a10', fontWeight:'900' }}>Senden</Text>
            </Pressable>
            <View style={{ flex:1 }}/>
            <Pressable onPress={sendBloom} style={styles.bloomBtn}>
              <Text style={styles.bloomTxt}>Bloom</Text>
            </Pressable>
          </View>
        </View>

        {/* Overlay + kleine Reactions + Mini-Toolbar */}
        {selected && (
          <>
            <Animated.View style={[styles.overlay, { opacity:aDock }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDock}/>
            </Animated.View>

            {dockY!=null && (
              <Animated.View style={[styles.reactionDock, { top:dockY }, popStyle]}>
                {['👍','🔥','🌿'].map((e,i)=>(
                  <Pressable key={i} style={styles.reactionBtn} onPress={()=>{ Haptics.selectionAsync(); closeDock(); sendText(e); }}>
                    <Text style={styles.reactionTxt}>{e}</Text>
                  </Pressable>
                ))}
              </Animated.View>
            )}

            <Animated.View style={[styles.miniToolbar, popStyle]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:8, gap:8 }}>
                {['Reply','Split','Pin','Secret','Route','Tip'].map(lbl=>(
                  <Pressable
                    key={lbl}
                    onPress={()=>{ if(lbl==='Reply') setReplyTo(selected); closeDock(); }}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionChipTxt}>{lbl}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ==== Styles =================================================================
const styles = StyleSheet.create({
  // Header
  headerWrap:{ paddingHorizontal:12, paddingBottom:8, backgroundColor:BG },
  h1:{ color:TEXT, fontWeight:'900', fontSize:30, letterSpacing:0.2 },

  searchRow:{ flexDirection:'row', gap:10, marginTop:10, alignItems:'center' },
  searchField:{ flex:1, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:16, paddingHorizontal:14, paddingVertical:12 },
  searchPlaceholder:{ color:'#86a496' },
  newBtn:{ backgroundColor:ACCENT, paddingHorizontal:14, paddingVertical:10, borderRadius:999 },
  newBtnTxt:{ color:'#0c1a10', fontWeight:'900' },

  facesRow:{ flexDirection:'row', alignItems:'center', gap:14, marginTop:12 },
  storyWrap:{ width:62, height:62 },
  storyGlow:{ position:'absolute', width:62, height:62, borderRadius:31, backgroundColor:'rgba(67,210,106,0.22)' },
  storyAvatar:{ position:'absolute', left:5, top:5, width:52, height:52, borderRadius:26, borderWidth:2, borderColor:'rgba(67,210,106,0.6)', overflow:'hidden' },
  faceAdd:{ width:58, height:58, borderRadius:29, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },

  segmentWrap:{ flexDirection:'row', gap:8, marginTop:12 },
  chip:{ backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', paddingHorizontal:14, paddingVertical:8, borderRadius:999 },
  chipActive:{ backgroundColor:ACCENT },
  chipTxt:{ color:MUTED, fontWeight:'700' },
  chipTxtActive:{ color:'#0c1a10' },

  // List rows
  cardRow:{ height:ROW_H, borderRadius:20, backgroundColor:CARD, borderWidth:1, borderColor:BORDER, paddingHorizontal:12, justifyContent:'center', overflow:'hidden' },
  cardRowUnread:{ borderColor:'rgba(67,210,106,0.55)', shadowColor:'#43d26a', shadowOpacity:0.25, shadowRadius:10, shadowOffset:{ width:0, height:2 } },
  chatTitle:{ color:TEXT, fontWeight:'900', fontSize:18, maxWidth:'82%' },
  chatSubtitle:{ color:MUTED, marginTop:3, flexShrink:1 },
  chatWhen:{ color:MUTED, marginTop:3, fontSize:12 },
  leafGlow:{ minWidth:48, height:32, paddingHorizontal:10, borderRadius:16, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(67,210,106,0.16)', borderWidth:1, borderColor:'rgba(67,210,106,0.30)' },

  // Modal
  modalBg:{ flex:1, backgroundColor:'rgba(0,0,0,0.55)' },
  modalCardTop:{ backgroundColor:BG, borderBottomLeftRadius:18, borderBottomRightRadius:18, paddingHorizontal:14, paddingTop:8, maxHeight:'85%', shadowColor:'#000', shadowOpacity:0.25, shadowRadius:10, shadowOffset:{ width:0, height:6 } },
  modalTitle:{ color:TEXT, fontWeight:'900', fontSize:18, marginBottom:8, paddingLeft:2 },
  modalInput:{ backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:12, paddingHorizontal:12, paddingVertical:10, color:TEXT, marginBottom:8 },
  userRow:{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:'rgba(255,255,255,0.06)' },
  modalClose:{ alignSelf:'center', marginTop:8, marginBottom:4, padding:8 },
  modalCloseTxt:{ color:MUTED, fontWeight:'700' },

  // Thread bubbles
  bubbleRow:{ width:'100%', flexDirection:'row', paddingHorizontal:12, marginVertical:2 },
  bubble:{ maxWidth:'78%', borderRadius:16, paddingHorizontal:12, paddingVertical:10 },
  bubbleText:{ fontSize:16, lineHeight:21 },
  bubbleMeta:{ fontSize:11, opacity:0.7 },

  // Composer
  composer:{ backgroundColor:BG, borderTopWidth:1, borderTopColor:BORDER, paddingHorizontal:10, paddingTop:10, gap:8 },
  replyBar:{ flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:12, paddingVertical:6, paddingHorizontal:8, marginBottom:6, gap:8 },
  replyStripe:{ width:3, alignSelf:'stretch', borderRadius:3, backgroundColor:ACCENT },
  replyLabel:{ color:MUTED, fontSize:11, marginBottom:2 },
  replyText:{ color:TEXT, fontSize:13 },
  replyClose:{ padding:6 },

  composerInput:{ minHeight:44, maxHeight:140, paddingHorizontal:12, paddingVertical:10, borderRadius:12, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', color:TEXT },
  iconBtn:{ width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)' },
  sendBtn:{ backgroundColor:ACCENT, borderRadius:12, paddingHorizontal:14, paddingVertical:10 },
  bloomBtn:{ backgroundColor:'rgba(67,210,106,0.22)', borderWidth:1, borderColor:'rgba(67,210,106,0.40)', borderRadius:16, paddingHorizontal:18, paddingVertical:10 },
  bloomTxt:{ color:'#dfffe9', fontWeight:'900' },

  // Overlay / Reactions / Toolbar
  overlay:{ position:'absolute', left:0, right:0, top:0, bottom:0, backgroundColor:'rgba(0,0,0,0.22)' },
  reactionDock:{ position:'absolute', right:12, width:56, borderRadius:28, paddingVertical:6, alignItems:'center', backgroundColor:'rgba(67,210,106,0.18)', borderWidth:1, borderColor:'rgba(67,210,106,0.32)' },
  reactionBtn:{ width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center', marginVertical:5, backgroundColor:'rgba(67,210,106,0.92)' },
  reactionTxt:{ color:'#0c1a10', fontSize:20, fontWeight:'900' },

  miniToolbar:{ position:'absolute', left:8, right:8, bottom:110, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:18, paddingVertical:8 },
  actionChip:{ paddingHorizontal:12, paddingVertical:8, borderRadius:999, backgroundColor:'rgba(67,210,106,0.22)' },
  actionChipTxt:{ color:'rgba(255,255,255,0.95)', fontWeight:'900' },
});

export default { ChatListScreen, ChatThreadScreen };