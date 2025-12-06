// apps/mobile/src/features/onboarding/screens/WaitlistStatusScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';

import { useTheme } from '@shared/theme/ThemeProvider';
import type { RootStackParamList } from '@app/navigation/RootNavigator';
import { hasTicket } from '@shared/utils/waitlist';

type Route = RouteProp<RootStackParamList, 'WaitlistStatus'>;

type TicketInfo = {
  publicId?: string;
  viewerToken?: string;
  state?: 'waiting' | 'invited' | 'denied';
};

const WaitlistStatusScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<Route>();

  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 1) Route-Parameter (falls direkt nach Signup navigiert wurde)
        const fromRoute: TicketInfo = {
          publicId: route.params?.publicId,
          viewerToken: route.params?.viewerToken,
        };

        // 2) Fallback: nur checken, ob irgendein Ticket lokal existiert
        const anyTicket = await hasTicket().catch(() => false);

        if (fromRoute.publicId || fromRoute.viewerToken) {
          setTicket({
            ...fromRoute,
            state: 'waiting',
          });
        } else if (anyTicket) {
          // Wir wissen nur: es existiert eins → generischer Status
          setTicket({
            state: 'waiting',
          });
        } else {
          setTicket(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Dein Wartelisten-Status
      </Text>

      <Text style={[styles.subtitle, { color: colors.muted }]}>
        Diese Ansicht ist nur für dich sichtbar. Deine Wartelisten-Daten
        werden nicht öffentlich angezeigt.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.panel, borderColor: colors.border },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : ticket ? (
          <>
            {ticket.publicId ? (
              <>
                <Text
                  style={[styles.label, { color: colors.muted }]}
                >
                  Ticket-ID
                </Text>
                <Text
                  style={[styles.value, { color: colors.text }]}
                  selectable
                >
                  {ticket.publicId}
                </Text>
              </>
            ) : null}

            {ticket.viewerToken ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: colors.muted, marginTop: 12 },
                  ]}
                >
                  Viewer-Token
                </Text>
                <Text
                  style={[styles.value, { color: colors.text }]}
                  selectable
                >
                  {ticket.viewerToken}
                </Text>
              </>
            ) : null}

            <Text
              style={[
                styles.label,
                { color: colors.muted, marginTop: 12 },
              ]}
            >
              Status
            </Text>
            <Text
              style={[
                styles.value,
                {
                  color:
                    ticket.state === 'invited'
                      ? colors.accent
                      : colors.text,
                },
              ]}
            >
              {ticket.state === 'waiting' && 'Wartend auf Einladung'}
              {ticket.state === 'invited' &&
                'Eingeladen – check deine E-Mails 🚀'}
              {ticket.state === 'denied' && 'Nicht eingeladen'}
              {!ticket.state && 'Ticket gespeichert – Details folgen.'}
            </Text>
          </>
        ) : (
          <Text style={{ color: colors.muted }}>
            Kein Ticket gefunden. Bitte trag dich zuerst über die Warteliste
            ein.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default WaitlistStatusScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '700',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});