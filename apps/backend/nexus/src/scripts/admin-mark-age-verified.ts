// src/scripts/admin-mark-age-verified.ts
//
// Kleines Admin-CLI-Tool, um einen User als 18+ verifiziert zu markieren.
// Nutzung (nach Build):
//   npm run admin:age-verify -- <userId> [provider] [method] [reference]
//
// Beispiel:
//   npm run admin:age-verify -- 64RY9WSAsDgBBaeIxZ1Rk1vrb3k2 DEV_MANUAL manual_flag "local-dev-test"

await import("dotenv/config"); // .env lokal laden

/**
 * Liest den Admin-Token aus der Umgebung.
 * Erwartet:
 *   NEXUS_ADMIN_TASK_TOKEN=...
 */
function getAdminTokenFromEnv(): string {
  const token = (process.env.NEXUS_ADMIN_TASK_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      "NEXUS_ADMIN_TASK_TOKEN ist nicht gesetzt. Bitte in .env oder Umgebung definieren.",
    );
  }
  return token;
}

/**
 * Liest die Basis-URL der Nexus-API.
 * Default: produktive Cloud Functions URL.
 * Optional überschreibbar via NEXUS_API_BASE.
 */
function getApiBase(): string {
  const fromEnv = (process.env.NEXUS_API_BASE || "").trim();
  if (fromEnv) return fromEnv;

  // Default: deine produktive nexusApi-URL
  return "https://europe-west3-growgram-backend.cloudfunctions.net/nexusApi";
}

/**
 * Minimale Args:
 *   argv[2] = userId
 * optionale:
 *   argv[3] = provider (default: DEV_MANUAL)
 *   argv[4] = method   (default: manual_flag)
 *   argv[5] = reference (default: cli)
 */
function parseArgs(argv: string[]) {
  const [, , userId, providerArg, methodArg, referenceArg] = argv;

  if (!userId) {
    console.error(
      "Usage: npm run admin:age-verify -- <userId> [provider] [method] [reference]",
    );
    process.exitCode = 1;
    process.exit();
  }

  const provider = providerArg || "DEV_MANUAL";
  const method = methodArg || "manual_flag";
  const reference = referenceArg || "cli";

  return { userId, provider, method, reference };
}

async function main(): Promise<void> {
  try {
    const { userId, provider, method, reference } = parseArgs(process.argv);
    const adminToken = getAdminTokenFromEnv();
    const baseUrl = getApiBase();

    const url = `${baseUrl.replace(/\/$/, "")}/api/auth/age/mark-verified`;

    const fetchFn = (globalThis as any).fetch as
      | ((input: any, init?: any) => Promise<any>)
      | undefined;

    if (!fetchFn) {
      throw new Error(
        "Global fetch ist nicht verfügbar. Bitte Node.js 18+ oder 20+ verwenden.",
      );
    }

    console.log("🔐 Sende Admin-Request:");
    console.log("  URL      :", url);
    console.log("  userId   :", userId);
    console.log("  provider :", provider);
    console.log("  method   :", method);
    console.log("  reference:", reference);

    const res = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-task-token": adminToken,
      },
      body: JSON.stringify({
        userId,
        provider,
        method,
        reference,
      }),
    });

    const text = await res.text();

    console.log("\n📥 Response:");
    console.log("  Status :", res.status);
    console.log("  Body   :", text);

    if (!res.ok) {
      process.exitCode = 1;
      return;
    }

    console.log("\n✅ Altersverifikation erfolgreich markiert.");
  } catch (err: any) {
    console.error("\n❌ Admin-Age-Verify fehlgeschlagen:");
    console.error(err?.message || err);
    process.exitCode = 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();