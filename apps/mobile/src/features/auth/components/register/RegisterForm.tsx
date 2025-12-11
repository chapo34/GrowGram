// apps/mobile/src/features/auth/components/register/RegisterForm.tsx

import React, { useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useTheme } from "@shared/theme/ThemeProvider";
import PrimaryButton from "@shared/components/ui/PrimaryButton";
import EyeGlassButton from "@shared/components/ui/EyeGlassButton";
import AuthLiquidGlassCard from "@features/auth/theme/AuthLiquidGlassCard";
import { api } from "@shared/lib/apiClient";

import {
  registerSchema,
  type RegisterFormValues,
} from "../../schema/registerSchema";
import Field from "./Field";

const TERMS_URL = "https://growgram-app.com/terms";
const PRIVACY_URL = "https://growgram-app.com/privacy";

export type RegisterFormProps = {
  onSuccess?: () => void;
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { colors } = useTheme();
  const [showPw, setShowPw] = useState(false);
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const [focusUsername, setFocusUsername] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPw, setFocusPw] = useState(false);
  const [focusPw2, setFocusPw2] = useState(false);
  const [focusBirth, setFocusBirth] = useState(false);

  const usernameRef = useRef<TextInput | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const pwRef = useRef<TextInput | null>(null);
  const pw2Ref = useRef<TextInput | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
    setValue,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      // wird beim Öffnen des Pickers gesetzt
      birthDate: undefined as unknown as Date,
      firstName: "",
      lastName: "",
      city: "",
    },
  });

  const birthDate = watch("birthDate");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const maxLegalBirthDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const formattedBirthdate = useMemo(() => {
    if (!birthDate || Number.isNaN(birthDate.getTime())) return "";
    const dd = String(birthDate.getDate()).padStart(2, "0");
    const mm = String(birthDate.getMonth() + 1).padStart(2, "0");
    const yyyy = birthDate.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }, [birthDate]);

  const canSubmit = useMemo(
    () =>
      isValid &&
      !isSubmitting &&
      birthDate instanceof Date &&
      !Number.isNaN(birthDate.getTime()),
    [isValid, isSubmitting, birthDate],
  );

  const handleBirthChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowBirthPicker(false);
      setFocusBirth(false);
    }

    if (event.type === "set" && date) {
      setValue("birthDate", date, { shouldValidate: true });
      setBackendError(null);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setBackendError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const birth = values.birthDate;
      const yyyy = birth.getFullYear();
      const mm = String(birth.getMonth() + 1).padStart(2, "0");
      const dd = String(birth.getDate()).padStart(2, "0");
      const birthDateIso = `${yyyy}-${mm}-${dd}`;

      // ⬇️ Payload exakt wie Nexus-Backend erwartet
      const payload: Record<string, unknown> = {
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        birthDate: birthDateIso, // wichtig: camelCase wie im Backend
      };

      if (values.firstName?.trim()) payload.firstName = values.firstName.trim();
      if (values.lastName?.trim()) payload.lastName = values.lastName.trim();
      if (values.city?.trim()) payload.city = values.city.trim();

      // Debug-Log, falls irgendwas schiefgeht
      console.log("[Register] payload →", payload);

      const res = await api.post("/auth/register", payload);
      console.log("[Register] response →", res.status, res.data);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );

      onSuccess?.();
    } catch (e: any) {
      const status = e?.response?.status as number | undefined;
      const data = e?.response?.data;

      console.log("[Register] error →", status, data ?? e);

      const msgFromApi =
        (data?.message as string | undefined) ||
        (data?.error as string | undefined);

      let msg = "Registrierung fehlgeschlagen. Bitte Eingaben prüfen.";
      if (status === 409) {
        msg = "E-Mail oder Benutzername bereits vergeben.";
      } else if (status === 400 && msgFromApi) {
        msg = msgFromApi;
      } else if (e?.message?.includes("Network")) {
        msg = "Netzwerkfehler. Bitte Verbindung prüfen.";
      }

      setBackendError(msg);
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
    }
  };

  return (
    <>
      <AuthLiquidGlassCard
        style={{ marginTop: 16, marginHorizontal: 2, borderRadius: 26 }}
      >
        {/* Benutzername */}
        <Field
          label="Benutzername"
          focused={focusUsername}
          hasError={!!errors.username}
          onPress={() => usernameRef.current?.focus()}
        >
          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputRow}>
                <TextInput
                  ref={usernameRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setFocusUsername(false);
                  }}
                  onFocus={() => setFocusUsername(true)}
                  placeholder="@growlover"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            )}
          />
          {errors.username && (
            <Text style={styles.errorText}>{errors.username.message}</Text>
          )}
        </Field>

        {/* E-Mail */}
        <Field
          label="E-Mail"
          focused={focusEmail}
          hasError={!!errors.email}
          onPress={() => emailRef.current?.focus()}
        >
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputRow}>
                <TextInput
                  ref={emailRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setFocusEmail(false);
                  }}
                  onFocus={() => setFocusEmail(true)}
                  placeholder="you@growgram.app"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => pwRef.current?.focus()}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            )}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}
        </Field>

        {/* Passwort */}
        <Field
          label="Passwort"
          focused={focusPw}
          hasError={!!errors.password}
          onPress={() => pwRef.current?.focus()}
        >
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputRow} pointerEvents="box-none">
                <TextInput
                  ref={pwRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setFocusPw(false);
                  }}
                  onFocus={() => setFocusPw(true)}
                  placeholder="Mind. 8 Zeichen, Zahl & Großbuchstabe"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  secureTextEntry={!showPw}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => pw2Ref.current?.focus()}
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      paddingRight: 54,
                    },
                  ]}
                />
                <EyeGlassButton
                  visible={showPw}
                  onToggle={() => {
                    setShowPw((v) => !v);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 6,
                    zIndex: 10,
                  }}
                />
              </View>
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}
        </Field>

        {/* Passwort bestätigen */}
        <Field
          label="Passwort bestätigen"
          focused={focusPw2}
          hasError={
            !!errors.confirmPassword ||
            (!!confirmPassword && confirmPassword !== password)
          }
          onPress={() => pw2Ref.current?.focus()}
        >
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputRow}>
                <TextInput
                  ref={pw2Ref}
                  value={value}
                  onChangeText={onChange}
                  onBlur={() => {
                    onBlur();
                    setFocusPw2(false);
                  }}
                  onFocus={() => setFocusPw2(true)}
                  placeholder="Passwort wiederholen"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  secureTextEntry={!showPw}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  style={[styles.input, { color: colors.text }]}
                />
              </View>
            )}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>
              {errors.confirmPassword.message}
            </Text>
          )}
        </Field>

        {/* Geburtsdatum */}
        <Field
          label="Geburtsdatum (18+)"
          focused={focusBirth || showBirthPicker}
          hasError={!!errors.birthDate}
          onPress={() => {
            setFocusBirth(true);
            setShowBirthPicker(true);
          }}
        >
          <View style={styles.inputRow}>
            <View
              style={[
                styles.input,
                {
                  justifyContent: "center",
                },
              ]}
            >
              <Text
                style={{
                  color: formattedBirthdate
                    ? colors.text
                    : "rgba(255,255,255,0.35)",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {formattedBirthdate || "Kalender öffnen"}
              </Text>
            </View>
          </View>
          {errors.birthDate && (
            <Text style={styles.errorText}>{errors.birthDate.message}</Text>
          )}
        </Field>

        {/* Fehler vom Backend */}
        {backendError && <Text style={styles.errorText}>{backendError}</Text>}

        {/* CTA */}
        <PrimaryButton
          text="Konto erstellen"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={!canSubmit}
          style={{ marginTop: 16 }}
        />

        {/* Legal + Microtrust */}
        <Text style={styles.legal}>
          Mit der Registrierung akzeptierst du unsere{" "}
          <Text
            style={styles.linkAccent}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            Nutzungsbedingungen
          </Text>{" "}
          und{" "}
          <Text
            style={styles.linkAccent}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            Datenschutz
          </Text>
          .
        </Text>

        <Text style={styles.microTrust}>
          Wir prüfen dein Alter nur zur Sicherheit – dein Geburtsdatum ist für
          andere nicht sichtbar. Deine Daten bleiben in der EU und werden nicht
          verkauft.
        </Text>
      </AuthLiquidGlassCard>

      {/* DATE PICKER MODAL */}
      {showBirthPicker && (
        <Modal
          transparent
          animationType="fade"
          visible={showBirthPicker}
          onRequestClose={() => {
            setShowBirthPicker(false);
            setFocusBirth(false);
          }}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setShowBirthPicker(false);
              setFocusBirth(false);
            }}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Geburtsdatum wählen</Text>
              <DateTimePicker
                value={
                  birthDate instanceof Date && !Number.isNaN(birthDate.getTime())
                    ? birthDate
                    : maxLegalBirthDate
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                maximumDate={maxLegalBirthDate}
                onChange={handleBirthChange}
              />
              {Platform.OS === "ios" && (
                <Pressable
                  style={styles.modalDoneButton}
                  onPress={() => {
                    setShowBirthPicker(false);
                    setFocusBirth(false);
                  }}
                >
                  <Text style={styles.modalDoneText}>Fertig</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  inputRow: { position: "relative" },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: "#FF9A9A",
    textAlign: "left",
  },
  legal: {
    marginTop: 12,
    color: "#C8D6CF",
    fontSize: 12,
    textAlign: "center",
  },
  linkAccent: {
    color: "#FFA726",
    fontWeight: "800",
  },
  microTrust: {
    marginTop: 6,
    fontSize: 11,
    textAlign: "center",
    color: "#8FB39A",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "86%",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#111718",
  },
  modalTitle: {
    color: "#F7FFF9",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDoneButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#4CAF50",
  },
  modalDoneText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default RegisterForm;