// Hilfsfunktionen (identisch wie in deinem Projektstil)
export function norm(s: string) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const toks = (s: string) => norm(s).split(' ').filter(Boolean);

// --- Spezies (Arten) -------------------------------------------------------
export type Species = 'sativa' | 'indica' | 'hybrid' | 'ruderalis';

export const SPECIES_ALIASES: Record<string, Species> = {
  sativa: 'sativa', 'reine sativa': 'sativa',
  indica: 'indica', 'reine indica': 'indica',
  hybrid: 'hybrid', hybride: 'hybrid', 'hybrid strain': 'hybrid',
  ruderalis: 'ruderalis', auto: 'ruderalis', autoflower: 'ruderalis', autoflowering: 'ruderalis'
};

// --- „Familien“ / Linien ---------------------------------------------------
// (bekannte Wortstämme, nach denen Leute suchen)
export const FAMILY_CANON: string[] = [
  'haze','kush','skunk','diesel','og','gelato','cookies','cheese','sherbet','glue',
  'jack','lemon','sour','purple','wedding',' zkittlez','do-si-dos','bruce','mac','runtz'
].map(norm);

// für Mapping: viele Aliase -> ein Kanon
export const FAMILY_ALIASES: Record<string,string> = {
  haze: 'haze', 'amnesia haze':'haze', 'super silver haze':'haze',
  kush: 'kush', 'og kush':'kush',
  skunk: 'skunk', 'super skunk':'skunk',
  diesel: 'diesel', 'sour diesel':'diesel',
  og: 'og', 'ogk':'og',
  gelato: 'gelato',
  cookies: 'cookies', 'girl scout cookies':'cookies','gsc':'cookies',
  cheese: 'cheese','blue cheese':'cheese',
  sherbet: 'sherbet','sunset sherbet':'sherbet','sherb':'sherbet',
  glue: 'glue','gg4':'glue','gorilla glue':'glue',
  jack: 'jack','jack herer':'jack',
  lemon:'lemon','lemon haze':'lemon',
  sour:'sour','sour og':'sour','sour kush':'sour',
  purple:'purple','granddaddy purple':'purple','gdp':'purple',
  wedding:'wedding','wedding cake':'wedding',
  'zkittlez':'zkittlez','zktlz':'zkittlez',
  'do-si-dos':'do-si-dos','dosidos':'do-si-dos','dosi':'do-si-dos',
  bruce:'bruce','bruce banner':'bruce',
  mac:'mac','miracle alien cookies':'mac',
  runtz:'runtz'
};

// --- Meta-Topics (optionale Schlagwörter) ----------------------------------
export const TOPIC_ALIASES: Record<string,string> = {
  cali: 'cali', 'exotic':'cali','exotics':'cali','cali weed':'cali',
  indoor:'indoor', outdoor:'outdoor',
  hydro:'hydro','hydroponics':'hydro', coco:'coco', soil:'soil','erde':'soil',
  organic:'organic','bio':'organic', scrog:'scrog', lst:'lst', topping:'topping'
};

// --- Matcher ---------------------------------------------------------------
export function matchSpeciesOrFamily(q: string) {
  const qn = norm(q);
  if (SPECIES_ALIASES[qn]) return { species: SPECIES_ALIASES[qn] as Species };

  // exact family alias?
  if (FAMILY_ALIASES[qn]) return { family: FAMILY_ALIASES[qn] };

  // Ein-Wort-Präfix auf Familien (z.B. "gel" → „gelato“)
  const one = qn.split(' ').filter(Boolean);
  if (one.length === 1) {
    const w = one[0];
    const hit = FAMILY_CANON.find(f => f.startsWith(w));
    if (hit) return { family: hit };
  }
  return {};
}

// Aus Text/Tags Kanon ableiten
export function extractCanonFrom(text: string, tags: string[]) {
  const bag = new Set<string>([...toks(text), ...tags.map(norm)]);
  let species: Species | undefined;
  const families: string[] = [];
  const topics: string[] = [];

  for (const w of bag) {
    if (!species && SPECIES_ALIASES[w]) species = SPECIES_ALIASES[w];
    if (FAMILY_ALIASES[w]) families.push(FAMILY_ALIASES[w]);
    if (TOPIC_ALIASES[w]) topics.push(TOPIC_ALIASES[w]);
  }
  // uniq
  const uniq = <T,>(a: T[]) => Array.from(new Set(a.filter(Boolean)));
  return { species, families: uniq(families), topics: uniq(topics) };
}