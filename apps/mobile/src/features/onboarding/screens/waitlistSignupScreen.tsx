// src/screens/WaitlistSignupScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert } from 'react-native';
import { joinWaitlist, hasTicket } from '@shared/utils/waitlist';
export default function WaitlistSignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('DE');
  const [discord, setDiscord] = useState('');
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ publicId?: string; viewerToken?: string } | null>(null);

  async function onSubmit() {
    try {
      setLoading(true);
      const json = await joinWaitlist({ name, email, country, discord, consent });
      setResult(json);
      Alert.alert('Erfolg', 'Warteliste: Ticket gespeichert (falls neu).');
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || 'Signup fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  async function goStatus() {
    if (await hasTicket()) navigation.navigate('WaitlistStatus');
    else Alert.alert('Hinweis', 'Kein lokales Ticket gefunden.');
  }

  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>GrowGram Warteliste</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth:1, padding:10, borderRadius:8 }} />
      <TextInput placeholder="E-Mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ borderWidth:1, padding:10, borderRadius:8 }} />
      <TextInput placeholder="Land (z.B. DE)" value={country} onChangeText={setCountry} style={{ borderWidth:1, padding:10, borderRadius:8 }} />
      <TextInput placeholder="Discord @handle (optional)" value={discord} onChangeText={setDiscord} style={{ borderWidth:1, padding:10, borderRadius:8 }} />
      <Button title={loading ? 'Sende…' : 'Warteliste beitreten'} onPress={onSubmit} disabled={loading} />
      <Button title="Status anzeigen" onPress={goStatus} />
      {result?.publicId ? <Text>Deine ID: {result.publicId}</Text> : null}
      {result?.viewerToken ? <Text>Viewer-Token (einmalig): {result.viewerToken}</Text> : null}
    </View>
  );
}