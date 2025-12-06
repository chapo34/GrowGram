// src/features/feed/components/LegalInfoSection.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '@shared/theme/ThemeProvider';
import type { RootStackParamList } from '@app/navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export const LegalInfoSection: React.FC = () => {
  const { colors } = useTheme();
  const nav = useNavigation<RootNav>();
  const panel = (colors as any).panel ?? '#0b1611';

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: panel, borderColor: '#284634' },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Rechtliches &amp; Transparenz
      </Text>
      <Text style={[styles.text, { color: colors.muted }]}>
        GrowGram ist eine Community- &amp; Content-Plattform rund um die
        Kultur von Hanfpflanzen. Es findet{' '}
        <Text style={styles.strong}>
          kein Handel, keine Vermittlung und kein Versand
        </Text>{' '}
        von verbotenen Substanzen statt.
      </Text>
      <Text style={[styles.text, { color: colors.muted }]}>
        Inhalte müssen mit der jeweils geltenden Rechtslage vereinbar,
        respektvoll und für volljährige Nutzer geeignet sein. Verstöße
        können zur Entfernung von Inhalten oder zur Einschränkung von
        Accounts führen.
      </Text>

      <View style={styles.links}>
        <Pressable
          onPress={() =>
            nav.navigate('Terms', {
              kind: 'terms',
              title: 'Nutzungsbedingungen',
            })
          }
        >
          <Text style={[styles.link, { color: colors.accent }]}>
            Nutzungsbedingungen &amp; Datenschutz
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            nav.navigate('Guidelines', {
              kind: 'guidelines',
              title: 'Community-Richtlinien',
            })
          }
        >
          <Text style={[styles.link, { color: colors.accent }]}>
            Community-Richtlinien &amp; Altersstufen
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  strong: {
    fontWeight: '800',
  },
  links: {
    marginTop: 4,
    gap: 4,
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});