import type { Request, Response } from 'express';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

function isEmail(v: string){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export async function addToWaitlist(req: Request, res: Response){
  try{
    const { email, name } = (req.body ?? {}) as { email?: string; name?: string };
    if (!email || !isEmail(email)) return res.status(400).json({ error:'invalid_email' });

    const docRef = db.collection('waitlist').doc(email.toLowerCase());
    await docRef.set({
      email: email.toLowerCase(),
      name: (name || '').trim() || null,
      createdAt: FieldValue.serverTimestamp(),
      src: 'web',
    }, { merge: true });

    // optionaler Discord Webhook
    const hook = process.env.DISCORD_WEBHOOK_URL || (process as any).env.DISCORD_WEBHOOK_URL;
    if (hook){
      const content = `📝 Neue Warteliste: **${email.toLowerCase()}**${name ? ` (${name})` : ''}`;
      const embed = {
        title: 'Waitlist-Signup',
        description: 'GrowGram Warteliste (Web)',
        color: 0x4CAF50,
        fields: [
          { name: 'E-Mail', value: email, inline: true },
          { name: 'Name',  value: name || '—', inline: true },
        ],
        timestamp: new Date().toISOString(),
      };
      // Node 20 hat global fetch
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ content, embeds: [embed] }),
      }).catch(()=>{ /* still OK */ });
    }

    return res.status(200).json({ ok:true });
  }catch(err:any){
    console.error('waitlist error', err);
    return res.status(500).json({ error:'internal', details: err?.message || 'unknown' });
  }
}