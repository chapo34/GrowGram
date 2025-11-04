// functions/src/utils/cannabis.ts

export type Species = 'sativa' | 'indica' | 'hybrid' | 'ruderalis';
export type StrainInfo = { name: string; family?: string };

export const SPECIES_ALIASES: Record<string, Species> = {
  sativa: 'sativa',
  indica: 'indica',
  hybrid: 'hybrid',
  ruderalis: 'ruderalis',
  auto: 'ruderalis',
  autoflower: 'ruderalis',
  'auto-flower': 'ruderalis',
  autoflowering: 'ruderalis',
};

export const FAMILY_ALIASES: Record<string, string> = {
  // Haze
  haze: 'haze',
  amnesia: 'haze',
  'super silver haze': 'haze',
  'silver haze': 'haze',
  'purple haze': 'haze',
  'lemon haze': 'haze',

  // Kush
  kush: 'kush',
  og: 'kush',
  ogk: 'kush',
  'og-kush': 'kush',
  ogkush: 'kush',

  // Diesel
  diesel: 'diesel',
  'sour diesel': 'diesel',
  'nyc diesel': 'diesel',

  // Skunk / AK
  skunk: 'skunk',
  'ak 47': 'skunk',
  'ak-47': 'skunk',
  ak47: 'skunk',

  // Cookies / Gelato
  cookies: 'cookies',
  gsc: 'cookies',
  'girl scout cookies': 'cookies',
  'wedding cake': 'cookies',
  gelato: 'gelato',
  'gelato 41': 'gelato',
  gelato41: 'gelato',

  // Klassiker
  'white widow': 'widow',
  widow: 'widow',
  'blue dream': 'dream',
  dream: 'dream',
  'northern lights': 'lights',
  lights: 'lights',
  'critical mass': 'critical',
  critical: 'critical',

  // Weitere
  cheese: 'cheese',
  chemdog: 'diesel',
  chemdawg: 'diesel',
  zkittlez: 'cookies',
  zkit: 'cookies',
  runtz: 'cookies',
};

export const CANON_TAG_ALIASES: Record<string, string> = {
  indoor: 'indoor',
  outdoor: 'outdoor',
  greenhouse: 'greenhouse',
  cali: 'california',
  california: 'california',

  // Medium
  soil: 'soil',
  erde: 'soil',
  coco: 'coco',
  'coco coir': 'coco',
  hydro: 'hydro',
  hydroponic: 'hydro',
  dwc: 'hydro',
  nft: 'hydro',

  // Bio/Organisch
  bio: 'organic',
  organic: 'organic',
  'organic soil': 'organic',

  // Seeds
  fem: 'feminized',
  feminized: 'feminized',
  feminised: 'feminized',
  reg: 'regular',
  regular: 'regular',
  photo: 'photoperiod',
  photoperiod: 'photoperiod',
  auto: 'autoflower',
  autoflower: 'autoflower',
  autoflowering: 'autoflower',

  // Spiegeln (für Suche)
  sativa: 'sativa',
  indica: 'indica',
  hybrid: 'hybrid',
  haze: 'haze',
  kush: 'kush',
  diesel: 'diesel',
  cookies: 'cookies',
  gelato: 'gelato',
  skunk: 'skunk',
};

export const STRAIN_ALIASES: Record<string, StrainInfo> = {
  // Haze
  'amnesia haze': { name: 'Amnesia Haze', family: 'haze' },
  amnesia: { name: 'Amnesia', family: 'haze' },
  'super silver haze': { name: 'Super Silver Haze', family: 'haze' },
  'silver haze': { name: 'Silver Haze', family: 'haze' },
  'purple haze': { name: 'Purple Haze', family: 'haze' },
  'lemon haze': { name: 'Lemon Haze', family: 'haze' },

  // Kush
  'og kush': { name: 'OG Kush', family: 'kush' },
  'master kush': { name: 'Master Kush', family: 'kush' },
  'bubba kush': { name: 'Bubba Kush', family: 'kush' },
  'banana kush': { name: 'Banana Kush', family: 'kush' },

  // Diesel
  'sour diesel': { name: 'Sour Diesel', family: 'diesel' },
  'nyc diesel': { name: 'NYC Diesel', family: 'diesel' },

  // Cookies/Gelato
  'girl scout cookies': { name: 'Girl Scout Cookies', family: 'cookies' },
  gsc: { name: 'Girl Scout Cookies', family: 'cookies' },
  'wedding cake': { name: 'Wedding Cake', family: 'cookies' },
  gelato: { name: 'Gelato', family: 'gelato' },
  'gelato 41': { name: 'Gelato 41', family: 'gelato' },

  // Klassiker
  'blue dream': { name: 'Blue Dream', family: 'dream' },
  'white widow': { name: 'White Widow', family: 'widow' },
  'northern lights': { name: 'Northern Lights', family: 'lights' },
  'critical mass': { name: 'Critical Mass', family: 'critical' },

  // Skunk / AK
  'ak 47': { name: 'AK-47', family: 'skunk' },
  'ak-47': { name: 'AK-47', family: 'skunk' },
  ak47: { name: 'AK-47', family: 'skunk' },

  // Chem/Z
  chemdog: { name: 'Chemdog', family: 'diesel' },
  chemdawg: { name: 'Chemdog', family: 'diesel' },
  zkittlez: { name: 'Zkittlez', family: 'cookies' },
  zkit: { name: 'Zkittlez', family: 'cookies' },
  runtz: { name: 'Runtz', family: 'cookies' },

  // Weitere Beispiele
  'strawberry cough': { name: 'Strawberry Cough' },
  'green crack': { name: 'Green Crack' },
};

const slug = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '-')
    .trim();

export const ALL_SPECIES: Species[] =
  Array.from(new Set(Object.values(SPECIES_ALIASES))).sort();

export const ALL_FAMILIES: string[] =
  Array.from(new Set(Object.values(FAMILY_ALIASES))).sort();

export const ALL_CANON_TAGS: string[] =
  Array.from(new Set(Object.values(CANON_TAG_ALIASES))).sort();

export type StrainEntry = { name: string; family: string | null; slug: string };

export const ALL_STRAINS: StrainEntry[] = Array.from(
  Object.values(STRAIN_ALIASES).reduce<Map<string, StrainEntry>>((m, v) => {
    const key = v.name;
    if (!m.has(key)) m.set(key, { name: v.name, family: v.family ?? null, slug: slug(v.name) });
    return m;
  }, new Map<string, StrainEntry>()).values()
).sort((a, b) => a.name.localeCompare(b.name));