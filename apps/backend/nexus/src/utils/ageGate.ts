// src/utils/ageGate.ts
//
// Zentrale Logik für Alters- / Jugendschutz-Entscheidungen.
// - Berechnet AgeTier eines Users (z.B. "18+ verifiziert")
// - Entscheidet, ob ein User 18+ Bereiche sehen darf
// - Entscheidet, ob ein Post für einen User sichtbar sein darf
//
// WICHTIG:
// - Diese Datei hat KEINE Firebase-Imports → reine Business-Logik.
// - Integration passiert in Services/Controllern, z.B. Feed, Posts, Profile.

/**
 * AgeTier = wie stark wir dem Alter vertrauen.
 *
 * UNKNOWN           → wir wissen nichts; Default: nur „safe“ Content, wie 16+ ohne Hardcore
 * U16               → unter 16 (nur sehr softer Content)
 * AGE16             → 16+ (Standard-Feed, keine harten Adult-Bereiche)
 * AGE18_UNVERIFIED  → User behauptet 18+, aber ohne harte Prüfung (Self-Angabe)
 * AGE18_VERIFIED    → 18+ + starke Prüfung (z.B. KJM/ID/Video-Check)
 *
 * Wichtig: Das ist UNSERE interne Klassifikation, nicht das gesetzliche Alter.
 */
export type AgeTier =
  | "UNKNOWN"
  | "U16"
  | "AGE16"
  | "AGE18_UNVERIFIED"
  | "AGE18_VERIFIED";

/**
 * Minimaler User-Typ, den wir für Altersentscheidungen brauchen.
 *
 * Passt zu deinem aktuellen `users`-Doc:
 * - birthDate: string (z.B. "2005-04-20")
 * - isVerified: bool (E-Mail-Verifizierung)
 * - compliance:
 *     - over16: bool
 *     - over18: bool
 *     - agree : bool (AGB/Community-Guidelines akzeptiert)
 *     - accepted: bool (Legacy-Alias, wird wie agree behandelt)
 * - ageVerifiedAt: ISO-String, wenn KJM/ID/Check bestanden wurde
 */
export interface UserAgeSource {
  birthDate?: string | null;
  isVerified?: boolean | null;
  compliance?:
    | {
        over16?: boolean | null;
        over18?: boolean | null;
        agree?: boolean | null;
        /** legacy alias für agree – Tests & alte Daten */
        accepted?: boolean | null;
        version?: string | null;
        acceptedAt?: unknown;
      }
    | null;
  /** kommt z.B. aus ageVerification.verifiedAt */
  ageVerifiedAt?: string | null;
}

/**
 * Meta-Infos zu einem Post, die für Age-Gate wichtig sind.
 *
 * - minAge: 16 oder 18
 * - adultOnly: true → explizit HARTE 18+ Only Bereiche
 * - audience: '16+' | '18+' | 'ALL'
 * - tags: später für feinere Filter (#bong, #dab, etc.)
 */
export interface PostAgeMeta {
  minAge?: number | null; // 16 | 18 | undefined
  adultOnly?: boolean | null; // true → nur 18+ VERIFIED
  audience?: "ALL" | "16+" | "18+" | null;
  tags?: string[] | null;
}

/**
 * Helper: Alter aus Geburtsdatum als Ganzzahl berechnen.
 * Erwartet "YYYY-MM-DD". Bei Fehler: null.
 */
export function calculateAgeFromBirthDate(
  birthDate: string | null | undefined,
  today: Date = new Date()
): number | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]) - 1; // JS-Monat 0..11
  const day = Number(m[3]);

  const dob = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(dob.getTime())) return null;

  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  const dayDiff = today.getUTCDate() - dob.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null; // offensichtlich falsch
  return age;
}

/**
 * Aus den User-Feldern ein AgeTier ableiten.
 *
 * ⚠️ Deine gewünschte Policy:
 *  - Selbst wenn User im Compliance-Screen „18+“ klickt,
 *    bekommt er maximal AGE18_UNVERIFIED → Content bleibt faktisch 16+.
 *  - Wirklich 18+ (Hardcore / Adult / geschlossene Benutzergruppe)
 *    gibt es NUR bei AGE18_VERIFIED (also nach Ausweis/KJM-Check).
 */
export function deriveAgeTier(user: UserAgeSource | null | undefined): AgeTier {
  if (!user) return "UNKNOWN";

  const age = calculateAgeFromBirthDate(user.birthDate);
  const over18Flag = !!user.compliance?.over18;
  const over16Flag = !!user.compliance?.over16;

  // accept = agree (neu) ODER accepted (legacy)
  const acceptedCompliance =
    user.compliance?.agree === true || user.compliance?.accepted === true;

  const emailVerified = !!user.isVerified;
  const hasStrongAgeVerification = !!user.ageVerifiedAt;

  // 1) Harte KJM-/ID-Verifikation → unabhängig vom Geburtsdatum
  if (hasStrongAgeVerification) {
    return "AGE18_VERIFIED";
  }

  // 2) Wenn wir ein plausibles Alter haben:
  if (typeof age === "number") {
    if (age < 16) {
      return "U16";
    }

    // 16–17:
    if (age >= 16 && age < 18) {
      return "AGE16";
    }

    // 18+:
    if (age >= 18) {
      // Selbstdeklaration 18+ + Compliance akzeptiert
      // → wir glauben ihm, dass er erwachsen ist,
      // → aber OHNE Ausweis trotzdem wie 16+ behandeln, was Content angeht.
      if (over18Flag && acceptedCompliance) {
        return "AGE18_UNVERIFIED";
      }

      // Nur 16+ Häkchen / E-Mail-Verifizierung → sicherer Basisfall 16+
      if (over16Flag || emailVerified) {
        return "AGE16";
      }

      // Fallback: auch hier konservativ 16+
      return "AGE16";
    }
  }

  // 3) Kein Alter eingetragen, aber User hat 18+ + Compliance bestätigt
  //    → AgeTier = AGE18_UNVERIFIED
  //    → 18+ Hardcore-Content wird TROTZDEM über isPostVisibleForAgeTier
  //      hart auf AGE18_VERIFIED beschränkt.
  if (over18Flag && acceptedCompliance) {
    return "AGE18_UNVERIFIED";
  }

  // 4) Kein Alter, nur 16+ + agree/accepted → mindestens 16+
  if (over16Flag && acceptedCompliance) {
    return "AGE16";
  }

  // 5) Default fallback → wir wissen nichts, lieber "UNKNOWN"
  return "UNKNOWN";
}

/**
 * Darf dieser User prinzipiell 18+ Only Bereiche (geschlossene Benutzergruppe) sehen?
 *
 * → Nur AGE18_VERIFIED, alles andere NEIN.
 */
export function canAccessAdult18PlusAreas(tier: AgeTier): boolean {
  return tier === "AGE18_VERIFIED";
}

/**
 * Darf der User diesen Post sehen?
 *
 * Konservative Logik:
 * - adultOnly=true → nur AGE18_VERIFIED
 * - minAge >= 18 oder audience='18+' → ebenfalls nur AGE18_VERIFIED (!)
 *   → also KEIN 18+ Content nur wegen Self-Angabe.
 * - U16 → später optionale Tag-Blacklist (#bong, #dab, etc.)
 * - Sonst: 16+ Standard-Content erlaubt.
 */
export function isPostVisibleForAgeTier(
  post: PostAgeMeta,
  tier: AgeTier
): boolean {
  const minAge = typeof post.minAge === "number" ? post.minAge : null;
  const adultOnly = !!post.adultOnly;
  const audience = post.audience;

  // 1) Explizit 18+ Only → NUR 18-verifizierte User
  if (adultOnly) {
    return tier === "AGE18_VERIFIED";
  }

  // 2) Audience oder minAge signalisiert 18+
  const postIs18Plus =
    (typeof minAge === "number" && minAge >= 18) || audience === "18+";

  if (postIs18Plus) {
    // ⚠️ Deine harte Policy:
    // 18+ Content NUR für AGE18_VERIFIED – NICHT für AGE18_UNVERIFIED
    return tier === "AGE18_VERIFIED";
  }

  // 3) U16 → Optional: bestimmte Tags blocken (noch nicht aktiv)
  if (tier === "U16") {
    // future: Tags wie #bong, #dab etc. blocken
  }

  // 4) Rest (16+ kompatibel)
  return true;
}

/**
 * Hilfsfunktion: Sanitizer für Post-Metadaten beim Speichern.
 * Du kannst sie in deinem Post-Service benutzen, um zu erzwingen:
 * - minAge ∈ {16, 18}
 * - adultOnly konsistent mit audience
 */
export function normalizePostAgeMeta(input: PostAgeMeta): PostAgeMeta {
  const out: PostAgeMeta = {};

  // minAge: nur 16 oder 18
  if (typeof input.minAge === "number") {
    if (input.minAge >= 18) out.minAge = 18;
    else if (input.minAge >= 16) out.minAge = 16;
  }

  // adultOnly
  out.adultOnly = !!input.adultOnly;

  // audience
  if (input.audience === "18+") {
    out.audience = "18+";
    if (!out.minAge || out.minAge < 18) out.minAge = 18;
  } else if (input.audience === "16+") {
    out.audience = "16+";
    if (!out.minAge) out.minAge = 16;
  } else {
    out.audience = "ALL";
  }

  // tags normalisieren
  if (Array.isArray(input.tags)) {
    out.tags = input.tags
      .map((t) => String(t).trim())
      .filter((t) => t.length > 0);
  }

  return out;
}