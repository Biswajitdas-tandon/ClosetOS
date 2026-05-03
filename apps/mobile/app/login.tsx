import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setStatus('sending');
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'closetos://auth/callback' },
    });
    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.body}>We&apos;ll email a one-tap magic link.</Text>

      {status === 'sent' ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Check {email} for your sign-in link.
          </Text>
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Back to library</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={theme.color.text.muted}
            style={styles.input}
          />
          <Pressable
            style={[styles.cta, status === 'sending' && { opacity: 0.6 }]}
            disabled={status === 'sending' || !email}
            onPress={send}
          >
            <Text style={styles.ctaText}>
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </Text>
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: theme.color.bg.base },
  title: { fontSize: 28, fontWeight: '600', color: theme.color.text.primary },
  body: { fontSize: 14, color: theme.color.text.secondary, marginBottom: 16 },
  label: { fontSize: 12, color: theme.color.text.secondary, fontWeight: '500' },
  input: {
    backgroundColor: theme.color.bg.surface,
    borderWidth: 1,
    borderColor: theme.color.border.subtle,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.color.text.primary,
  },
  cta: {
    backgroundColor: theme.color.accent.DEFAULT,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaText: { color: theme.color.text.onAccent, fontWeight: '500', fontSize: 15 },
  notice: {
    backgroundColor: theme.color.bg.surface,
    borderColor: theme.color.border.subtle,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  noticeText: { fontSize: 14, color: theme.color.text.primary },
  secondary: { paddingVertical: 8 },
  secondaryText: { color: theme.color.text.secondary, fontSize: 14 },
  error: { color: theme.color.status.sold, fontSize: 13, marginTop: 4 },
});
