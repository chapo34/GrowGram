// apps/mobile/src/features/auth/components/register/RegisterHero.tsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import LottieView from "lottie-react-native";

type Variant = "lottie" | "logo";

const REGISTER_ANIM = require("../../../../assets/animations/registerPlant.json");
const LOGO_IMG = require("../../../../assets/images/growgram-logo.png");

interface RegisterHeroProps {
  variant?: Variant;
}

const phrases = [
  "anonyme Cannabis-Community",
  "nur für 18+ Erwachsene",
  "gehostet in der EU",
  "kein Verkauf deiner Daten",
];

const RegisterHero: React.FC<RegisterHeroProps> = ({ variant = "lottie" }) => {
  const heroScale = useRef(new Animated.Value(0.98)).current;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");

  // Hero-Bounce
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(heroScale, {
          toValue: 0.985,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [heroScale]);

  // Schreibmaschinen-Effekt
  useEffect(() => {
    const current = phrases[phraseIndex];

    if (charIndex < current.length) {
      const t = setTimeout(() => {
        setDisplayText(current.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 40);
      return () => clearTimeout(t);
    }

    const pause = setTimeout(() => {
      setCharIndex(0);
      setDisplayText("");
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 1200);

    return () => clearTimeout(pause);
  }, [charIndex, phraseIndex]);

  return (
    <>
      {/* Brand Row */}
      <View style={styles.brandRow}>
        <Image source={LOGO_IMG} style={styles.brandLogo} />
        <View style={styles.brandTextWrap}>
          <Text style={styles.brandTitle}>GrowGram</Text>
          <View style={styles.betaPill}>
            <Text style={styles.betaText}>BETA</Text>
          </View>
        </View>
      </View>
      <Text style={styles.brandTagline}>
        Cannabis Community • 18+ • Sicher &amp; EU-Hosting
      </Text>

      {/* Hero */}
      <Animated.View
        style={[styles.hero, { transform: [{ scale: heroScale }] }]}
        pointerEvents="none"
      >
        {variant === "lottie" && (
          <LottieView source={REGISTER_ANIM} autoPlay loop style={styles.lottie} />
        )}
        <Text style={styles.kicker}>Lass wachsen, was du liebst 🌿</Text>
        <Text style={styles.title}>Konto erstellen</Text>
        <Text style={styles.subtitle}>
          Nur 4 Angaben – dann schicken wir dir deinen Bestätigungslink.
        </Text>

        {/* Schreibmaschine */}
        <Text style={styles.typewriter} numberOfLines={1}>
          <Text style={styles.typewriterPrefix}>Für dich:&nbsp;</Text>
          {displayText}
          <Text style={styles.cursor}>▌</Text>
        </Text>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 30,
    height: 30,
    marginRight: 8,
    borderRadius: 8,
  },
  brandTextWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandTitle: {
    color: "#F7FFF9",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.9,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginRight: 8,
  },
  betaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(168,255,176,0.22)",
    borderWidth: 1,
    borderColor: "rgba(168,255,176,0.55)",
  },
  betaText: {
    color: "#A8FFB0",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  brandTagline: {
    color: "#C3D7CB",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.9,
  },
  hero: { alignItems: "center", paddingTop: 2, paddingBottom: 6 },
  lottie: { width: 160, height: 160 },
  kicker: {
    color: "#A8FFB0",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: -6,
    textShadowColor: "rgba(168,255,176,0.35)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  title: {
    color: "#F3F6F4",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginTop: 2,
  },
  subtitle: {
    color: "#C8D6CF",
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
  },
  typewriter: {
    marginTop: 6,
    fontSize: 12,
    color: "#C8D6CF",
    textAlign: "center",
  },
  typewriterPrefix: {
    fontWeight: "700",
    color: "#A8FFB0",
  },
  cursor: {
    color: "#A8FFB0",
    fontWeight: "900",
  },
});

export default RegisterHero;