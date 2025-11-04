import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Animated,
  Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getGrowDockSpace } from '../components/GrowDock';
import { createPost, pingApi } from '../utils/api';

type Visibility = 'public' | 'private';

const BG = '#0b1f14';
const CARD = '#0f2219';
const BORDER = '#224434';
const ACCENT = '#4CAF50';
const TEXT = '#E6EAEF';
const MUTED = '#9fb7a5';

const MAX_TEXT = 280;
const SUGGEST_DEFAULT = ['cannabis', 'homegrow', 'indica', 'sativa', 'hybrid'];

export default function PostCreateScreen() {
  const insets = useSafeAreaInsets();
  useEffect(() => { pingApi(); }, []);

  // --- state
  const [img, setImg] = useState<{ uri: string; w: number; h: number } | null>(null);
  const [text, setText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [vis, setVis] = useState<Visibility>('public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canPost = !!img && text.trim().length > 0 && !busy;

  // --- anim für picker card
  const pulse = useRef(new Animated.Value(0)).current;
  const doPulse = () => {
    pulse.setValue(0);
    Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: false }).start();
  };

  // ⚠️ Lokale URIs niemals verändern!
  function normalizeImageUri(u: string): string {
    if (u.startsWith('file://') || u.startsWith('content://')) return u;
    try {
      const url = new URL(u);
      url.searchParams.delete('auto');
      if (!url.searchParams.get('fm')) url.searchParams.set('fm', 'jpg');
      if (!url.searchParams.get('q')) url.searchParams.set('q', '85');
      if (!url.searchParams.get('w')) url.searchParams.set('w', '1600');
      return url.toString();
    } catch {
      return u;
    }
  }

  async function pickImage(source: 'library' | 'camera') {
    setError('');
    try {
      if (source === 'library') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return setError('Keine Berechtigung für die Fotomediathek.');
        const r = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
          allowsMultipleSelection: false,
          exif: true,
        });
        if (r.canceled) return;
        await take(r.assets[0].uri);
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setError('Kamera-Berechtigung benötigt.');
        const r = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
        if (r.canceled) return;
        await take(r.assets[0].uri);
      }
    } catch {
      setError('Konnte Bild nicht laden.');
    }
  }

  async function take(uri: string) {
    Haptics.selectionAsync();
    // EXIF-Orientation fix + Resize
    const out = await ImageManipulator.manipulateAsync(
      uri,
      [{ rotate: 0 }, { resize: { width: 1600 } }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    setImg({ uri: normalizeImageUri(out.uri), w: out.width ?? 0, h: out.height ?? 0 });
    doPulse();
  }

  function addTagFromInput() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!t) return;
    if (t.length < 2 || t.length > 32) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  const suggestions = useMemo(() => {
    const words = Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s#-]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && w.length <= 16)
      )
    );
    const pool = Array.from(new Set([...SUGGEST_DEFAULT, ...words]));
    return pool.filter((t) => !tags.includes(t)).slice(0, 8);
  }, [text, tags]);

  async function onSubmit() {
    if (!canPost || !img) return;
    setBusy(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createPost({
        text: text.trim(),
        tags,
        visibility: vis,
        imageUri: img.uri, // file:// unverändert
      });
      // reset
      setText('');
      setTags([]);
      setImg(null);
      setVis('public');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          'Upload fehlgeschlagen. Bitte später erneut versuchen.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setBusy(false);
    }
  }

  const growDockSpace = getGrowDockSpace(insets.bottom);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: BG }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: growDockSpace + 32 }}
        bounces
      >
        {/* Picker / Preview */}
        <Animated.View
          style={[
            styles.card,
            {
              borderColor: 'rgba(168,255,176,0.25)',
              transform: [
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.01],
                  }),
                },
              ],
            },
          ]}
        >
          {img ? (
            <View>
              <Image
                source={{ uri: img.uri }}
                style={{ width: '100%', height: 320, borderRadius: 14 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
              <View style={styles.previewActions}>
                <Pressable style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={() => setImg(null)}>
                  <Text style={styles.pillTxt}>Entfernen</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={() => pickImage('library')}>
                  <Text style={styles.pillTxt}>Ersetzen</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => pickImage('library')}
              onLongPress={() => pickImage('camera')}
              style={[styles.drop, { borderColor: 'rgba(255,255,255,0.12)' }]}
            >
              <Text style={{ color: MUTED, fontWeight: '700' }}>Bild auswählen</Text>
              <Text style={{ color: MUTED, marginTop: 6, fontSize: 12 }}>
                Tippen = Galerie • Lang drücken = Kamera
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* Text */}
        <View style={styles.card}>
          <TextInput
            value={text}
            onChangeText={(t) => setText(t.slice(0, MAX_TEXT))}
            placeholder="Schreib etwas…"
            placeholderTextColor="#7fa18f"
            style={styles.textArea}
            multiline
            maxLength={MAX_TEXT}
          />
          <View style={styles.counterRow}>
            <View style={styles.progressWrap}>
              <View
                style={[
                  styles.progressInner,
                  { width: `${(text.length / MAX_TEXT) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.counter}>{text.length}/{MAX_TEXT}</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Tags (ohne #)…"
              placeholderTextColor="#7fa18f"
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={addTagFromInput}
            />
            <Pressable onPress={addTagFromInput} style={[styles.btn, { paddingHorizontal: 14 }]}>
              <Text style={[styles.btnTxt, { paddingHorizontal: 2 }]}>＋</Text>
            </Pressable>
          </View>

          {/* aktive Tags */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((t) => (
                <Pressable key={t} onPress={() => removeTag(t)} style={[styles.tag, styles.tagActive]}>
                  <Text style={[styles.tagTxt, styles.tagTxtActive]}>#{t} ✕</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Vorschläge */}
          {suggestions.length > 0 && (
            <>
              <Text style={styles.suggestTitle}>Vorschläge</Text>
              <View style={styles.tagsRow}>
                {suggestions.map((t) => (
                  <Pressable key={t} onPress={() => setTags((prev) => (prev.includes(t) ? prev : [...prev, t]))} style={styles.tag}>
                    <Text style={styles.tagTxt}>#{t}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Sichtbarkeit */}
        <View style={[styles.card, { paddingVertical: 10 }]}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setVis('public')}
              style={[styles.segBtn, vis === 'public' && styles.segActive]}
            >
              <Text style={[styles.segTxt, vis === 'public' && styles.segTxtActive]}>Öffentlich</Text>
            </Pressable>
            <Pressable
              onPress={() => setVis('private')}
              style={[styles.segBtn, vis === 'private' && styles.segActive]}
            >
              <Text style={[styles.segTxt, vis === 'private' && styles.segTxtActive]}>Privat</Text>
            </Pressable>
          </View>
        </View>

        {/* Fehler */}
        {!!error && (
          <View style={[styles.card, { borderColor: '#ff5252', backgroundColor: 'rgba(255,82,82,0.08)' }]}>
            <Text style={{ color: '#ff9a9a' }}>{error}</Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={onSubmit}
          disabled={!canPost}
          style={[styles.cta, !canPost && { opacity: 0.5 }]}
        >
          {busy ? <ActivityIndicator color="#0c1a10" /> : <Text style={styles.ctaTxt}>Posten</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  drop: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  previewActions: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    backgroundColor: 'rgba(76,175,80,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillTxt: { color: '#0c1a10', fontWeight: '800' },

  textArea: {
    minHeight: 110,
    color: TEXT,
    padding: 0,
  },
  counterRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressWrap: { flex: 1, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  progressInner: { height: 6, borderRadius: 999, backgroundColor: ACCENT },
  counter: { color: MUTED, fontSize: 12 },

  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagTxt: { color: '#cfe4d6', fontWeight: '700' },
  tagActive: { backgroundColor: 'rgba(76,175,80,0.18)', borderColor: 'rgba(168,255,176,0.35)' },
  tagTxtActive: { color: '#A8FFB0' },

  suggestTitle: { color: MUTED, marginTop: 6 },

  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  segActive: { backgroundColor: 'rgba(76,175,80,0.22)' },
  segTxt: { color: '#cfe4d6', fontWeight: '700' },
  segTxtActive: { color: '#A8FFB0' },

  btn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnTxt: { color: '#0c1a10', fontWeight: '900', fontSize: 16 },

  cta: {
    marginTop: 6,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaTxt: { color: '#0c1a10', fontWeight: '900', letterSpacing: 0.2 },
});