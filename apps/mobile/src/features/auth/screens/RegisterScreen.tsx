// apps/mobile/src/features/auth/screens/RegisterScreen.tsx

import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import AuthBackgroundVideo from "../components/register/AuthBackgroundVideo";
import RegisterHero from "../components/register/RegisterHero";
import RegisterForm from "../components/register/RegisterForm";
import SecondaryButton from "@shared/components/ui/SecondaryButton";

type Nav = NativeStackNavigationProp<any>;

const RegisterScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const handleSuccess = () => {
    // Nach erfolgreicher Registrierung zurück zum Login
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" as never }],
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Video + Gradient-Overlay im Hintergrund */}
      <AuthBackgroundVideo />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroller,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* Logo + Lottie + Schreibmaschine */}
          <RegisterHero onSuccess={function (): void {
            throw new Error("Function not implemented.");
          } } />

          {/* Formular (Username, Mail, PW, Geburtsdatum) */}
          <RegisterForm onSuccess={handleSuccess} />

          {/* FOOTER: Zurück zum Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Schon ein Konto?</Text>
            <SecondaryButton
              text="Zum Login"
              onPress={() => navigation.goBack()}
              style={{ width: 220 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020805",
  },
  kav: {
    flex: 1,
  },
  scroller: {
    paddingHorizontal: 18,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#C8D6CF",
    marginBottom: 6,
  },
});

export default RegisterScreen;