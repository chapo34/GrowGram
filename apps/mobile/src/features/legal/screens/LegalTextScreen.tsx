// src/features/legal/screens/LegalTextScreen.tsx
import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@shared/theme/ThemeProvider';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import type { RootStackParamList } from '@app/navigation/RootNavigator';

type LegalRoute = RouteProp<RootStackParamList, 'Terms' | 'Guidelines'>;

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const LegalTextScreen: React.FC = () => {
  const { colors } = useTheme();
  const route = useRoute<LegalRoute>();

  const kind: 'terms' | 'guidelines' =
    (route.params?.kind as any) || 'terms';

  const bg = (colors as any).bg ?? '#020806';
  const panel = (colors as any).panel ?? '#0b1611';

  const { title, sections } = useMemo(() => {
    if (kind === 'guidelines') {
      return {
        title: route.params?.title ?? 'Community-Richtlinien & Altersstufen',
        sections: buildGuidelinesSections(),
      };
    }
    return {
      title: route.params?.title ?? 'Nutzungsbedingungen & Datenschutz',
      sections: buildTermsSections(),
    };
  }, [kind, route.params?.title]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 32 },
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Kopfbox */}
        <View
          style={[
            styles.headerCard,
            { backgroundColor: panel, borderColor: '#284634' },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.lead, { color: colors.muted }]}>
            Diese Informationen dienen der Transparenz und Orientierung.
            Sie ersetzen keine individuelle Rechtsberatung. Bitte lassen
            Sie Ihre finale Fassung von qualifizierten Jurist:innen
            prüfen.
          </Text>
        </View>

        {/* Inhaltliche Sektionen */}
        {sections.map((sec) => (
          <View
            key={sec.title}
            style={[
              styles.sectionCard,
              { backgroundColor: panel, borderColor: '#213629' },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {sec.title}
            </Text>

            {sec.paragraphs.map((p, idx) => (
              <Text
                key={idx}
                style={[styles.paragraph, { color: colors.muted }]}
              >
                {p}
              </Text>
            ))}

            {sec.bullets && sec.bullets.length > 0 && (
              <View style={styles.bulletList}>
                {sec.bullets.map((b, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={[styles.bulletDot, { color: colors.muted }]}>
                      •
                    </Text>
                    <Text
                      style={[
                        styles.bulletText,
                        { color: colors.muted },
                      ]}
                    >
                      {b}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Hinweis-Footer */}
        <Text
          style={[
            styles.footerHint,
            { color: colors.muted, marginTop: 8 },
          ]}
        >
          Hinweis: GrowGram ist eine Community- &amp; Content-Plattform
          rund um Hanfkultur. Es findet kein Handel, keine Vermittlung
          und kein Versand von verbotenen Substanzen statt. Diese
          Darstellung ist ein technischer Entwurf und stellt keine
          Rechtsberatung dar.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen für Inhalte                                        */
/* ------------------------------------------------------------------ */

function buildTermsSections(): Section[] {
  return [
    {
      title: '1. Zweck von GrowGram',
      paragraphs: [
        'GrowGram ist eine spezialisierte Community- & Content-Plattform rund um die Kultur von Hanfpflanzen. Im Vordergrund stehen Austausch, Erfahrung, Bildung, Harm-Reduction und verantwortungsbewusster Umgang.',
        'Über GrowGram können keine Käufe, Verkäufe, Bestellungen oder Lieferungen von Cannabis oder anderen Betäubungsmitteln abgewickelt werden. Funktionen der App sind nicht auf Handel, Versand oder Vermittlung ausgelegt.',
      ],
    },
    {
      title: '2. Registrierung, Konto & Altersanforderungen',
      paragraphs: [
        'Die Nutzung des vollwertigen GrowGram-Angebots ist grundsätzlich für volljährige Personen (18+) vorgesehen. Nutzer:innen bestätigen bei Registrierung und Compliance-Screen, dass sie die geltenden Altersvoraussetzungen erfüllen.',
        'Ein optionaler, gesonderter 16+-Informationsbereich kann – soweit rechtlich zulässig und technisch umgesetzt – ausschließlich zu Bildungs- und Informationzwecken bereitgestellt werden. In diesem Bereich werden keine Konsumanreize, keine Kaufaufrufe und keine Handels- oder Versandhinweise angezeigt.',
      ],
      bullets: [
        'Nutzer:innen sind verpflichtet, die Richtigkeit ihrer Angaben sicherzustellen.',
        'Konten dürfen nicht an Dritte weitergegeben werden.',
        'GrowGram behält sich vor, Konten bei Verdacht auf Missbrauch, Falschangaben oder Regelverstöße vorübergehend oder dauerhaft einzuschränken.',
      ],
    },
    {
      title: '3. Verbotene Inhalte & Nutzungen',
      paragraphs: [
        'Auf GrowGram sind insbesondere folgende Inhalte und Handlungen untersagt:',
      ],
      bullets: [
        'Angebote, Gesuche oder Vermittlung zu Kauf, Verkauf, Tausch, Versand oder Lagerung von Cannabis, anderen Betäubungsmitteln oder entsprechenden Dienstleistungen.',
        'Konkrete Handlungsanleitungen, die auf rechtswidrigen Anbau, Verarbeitung, Handel oder Export/Import abzielen.',
        'Gewaltverherrlichende, diskriminierende, hasserfüllte oder belästigende Inhalte.',
        'Veröffentlichung von Adressen, Treffpunkten, Telefonnummern oder vergleichbaren Kontaktdaten, die auf Handel, Deals oder strafbare Handlungen hindeuten.',
        'Umgehung von Alters- oder Jugendschutzmechanismen.',
      ],
    },
    {
      title: '4. Inhalte, Rechte & Moderation',
      paragraphs: [
        'Von Nutzer:innen eingestellte Inhalte verbleiben grundsätzlich im Eigentum der jeweiligen Urheber:innen. Durch das Hochladen wird GrowGram jedoch eine einfache, nicht-exklusive, weltweit gültige Lizenz eingeräumt, die Inhalte im Rahmen der Plattform darzustellen, technisch zu verarbeiten und für Moderationszwecke zu speichern.',
        'GrowGram behält sich vor, Inhalte zu prüfen, zu kennzeichnen, zu verschieben, zu sperren oder zu löschen, wenn Anhaltspunkte für Verstöße gegen Gesetze, diese Nutzungsbedingungen oder die Community-Richtlinien vorliegen.',
      ],
    },
    {
      title: '5. Datenschutz & Datensicherheit (Kurzüberblick)',
      paragraphs: [
        'GrowGram verarbeitet personenbezogene Daten ausschließlich im Rahmen der geltenden Datenschutzvorschriften. Zu den verarbeiteten Daten können u.a. Login-Daten, Profildaten, Geräteinformationen sowie in der App erzeugte Inhalte gehören.',
        'Konkrete Informationen zu Kategorien von Daten, Rechtsgrundlagen, Speicherdauer, Betroffenenrechten (Auskunft, Löschung, Widerspruch etc.) und Kontaktoptionen zur verantwortlichen Stelle enthält die gesonderte Datenschutzerklärung.',
      ],
    },
    {
      title: '6. Haftungsbeschränkung',
      paragraphs: [
        'GrowGram übernimmt keine Gewähr für jederzeitige Verfügbarkeit, Richtigkeit oder Vollständigkeit der von Nutzer:innen bereitgestellten Inhalte.',
        'Nutzer:innen bleiben selbst dafür verantwortlich, ihr Verhalten an der jeweils geltenden Rechtslage auszurichten. Hinweise innerhalb der App ersetzen keine individuelle Rechtsberatung.',
      ],
    },
    {
      title: '7. Änderungen der Bedingungen',
      paragraphs: [
        'GrowGram kann diese Nutzungsbedingungen anpassen, wenn technische, rechtliche oder organisatorische Gründe dies erfordern.',
        'Über wesentliche Änderungen werden Nutzer:innen in geeigneter Form informiert. Eine fortgesetzte Nutzung der Plattform nach Information kann als Zustimmung zur aktualisierten Fassung gewertet werden, soweit dies rechtlich zulässig ist.',
      ],
    },
  ];
}

function buildGuidelinesSections(): Section[] {
  return [
    {
      title: '1. Grundprinzipien der Community',
      paragraphs: [
        'GrowGram versteht sich als respektvolle, sichere und gesetzeskonforme Community rund um Hanfkultur und verwandte Themen. Der Fokus liegt auf Information, Austausch, Harm-Reduction und verantwortungsvollem Umgang.',
        'Alle Nutzer:innen tragen Mitverantwortung dafür, dass Inhalte nicht zu rechtswidrigen Handlungen motivieren oder Jugendschutzvorgaben verletzen.',
      ],
    },
    {
      title: '2. 18+ Bereich & optionaler 16+ Informationsmodus',
      paragraphs: [
        'Der Kernbereich von GrowGram ist auf volljährige Nutzer:innen (18+) ausgerichtet. Inhalte können Erfahrungsberichte, Setups, Anbauumgebungen oder rechtliche Einordnungen betreffen – jedoch ohne Kaufaufrufe oder konkrete Deal-Vermittlung.',
        'Ein optionaler 16+ Informationsmodus kann – wenn rechtlich zulässig – ausschließlich für verständlich aufbereitete, sachliche Informationen zu Risiken, Prävention und rechtlichem Rahmen genutzt werden.',
      ],
      bullets: [
        'Im 16+ Bereich werden keine Anleitungen für Konsum oder Erwerb angeboten.',
        'Es werden keine Anreize zum Konsum geschaffen; der Schwerpunkt liegt auf Aufklärung und Risikominimierung.',
        'Der Übergang in eindeutig 18+ Inhalte erfolgt nur mit zusätzlicher Kennzeichnung und Altersbestätigung.',
      ],
    },
    {
      title: '3. Kein Handel, keine Vermittlung, kein Versand',
      paragraphs: [
        'GrowGram ist ausdrücklich keine Plattform für Handel, Versand oder Vermittlung von Cannabis oder anderen Betäubungsmitteln.',
      ],
      bullets: [
        'Keine Angebote oder Gesuche zu Kauf, Verkauf, Tausch, Versand oder Lagerung.',
        'Keine Postings mit Kontaktangaben, die auf illegale Geschäfte zielen (z.B. „nur serious buyers“, Telegram-Handles, Abholpunkte).',
        'Keine Werbung für Shops, Versandhändler oder Lieferdienste, sofern diese rechtlich nicht eindeutig zulässig sind und zuvor freigegeben wurden.',
      ],
    },
    {
      title: '4. Respekt, Sprache & Inhalte',
      paragraphs: [
        'Alle Inhalte sollen respektvoll, nicht diskriminierend und frei von Gewaltverherrlichung sein.',
      ],
      bullets: [
        'Keine Beleidigungen, Hassrede, Diskriminierung oder gezielte Belästigung.',
        'Keine Verherrlichung von Gewalt, Selbstgefährdung oder strafbaren Handlungen.',
        'Sensibler Umgang mit Bildern von Personen; Veröffentlichung nur, wenn Rechte geklärt sind.',
      ],
    },
    {
      title: '5. Sicherheit, Harm-Reduction & Verantwortungsbewusstsein',
      paragraphs: [
        'Wo Inhalte sich mit Konsumrisiken, Setups oder rechtlichen Graubereichen befassen, soll stets auf verantwortungsvollen Umgang und Einhaltung der Gesetze hingewiesen werden.',
      ],
      bullets: [
        'Hinweise auf rechtliche Rahmenbedingungen und mögliche strafrechtliche Konsequenzen.',
        'Keine Darstellung riskanter Handlungen ohne klaren Risikohinweis oder Kontext.',
        'Ermutigung zu legalen, risikoarmen Alternativen und zu eigenständiger Information aus verlässlichen Quellen.',
      ],
    },
    {
      title: '6. Moderation, Meldung & Konsequenzen',
      paragraphs: [
        'GrowGram behält sich vor, Inhalte ohne Vorankündigung zu entfernen oder zu verstecken, wenn ein Verstoß gegen Gesetze, diese Richtlinien oder die Nutzungsbedingungen naheliegt.',
        'Nutzer:innen können Inhalte melden, um das Moderationsteam zu unterstützen.',
      ],
      bullets: [
        'Mögliche Maßnahmen sind u.a. Verwarnungen, Einschränkung von Funktionen, zeitweise Sperren oder dauerhafte Kontoschließung.',
        'Wiederholte oder besonders schwere Verstöße können an zuständige Stellen gemeldet werden, wenn eine rechtliche Pflicht oder ein berechtigtes Interesse besteht.',
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  lead: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  bulletList: {
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    width: 14,
    fontSize: 13,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footerHint: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default LegalTextScreen;