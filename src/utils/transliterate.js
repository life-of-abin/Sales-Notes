// High-accuracy Bidirectional Transliteration and Localization Engine for Tamil <-> English

// Common Clothes & Product Name Mappings (English <-> Tamil)
const PRODUCT_MAP_EN_TO_TA = {
  jeans: 'ஜீன்ஸ்',
  jean: 'ஜீன்ஸ்',
  tops: 'டாப்ஸ்',
  top: 'டாப்ஸ்',
  sarees: 'புடவை',
  saree: 'புடவை',
  sari: 'புடவை',
  chudis: 'சுடிதார்',
  chudi: 'சுடிதார்',
  chudidars: 'சுடிதார்',
  chudidar: 'சுடிதார்',
  inners: 'உள்ளாடைகள்',
  inner: 'உள்ளாடைகள்',
  innerwear: 'உள்ளாடைகள்',
  shirts: 'சட்டை',
  shirt: 'சட்டை',
  pants: 'பேன்ட்',
  pant: 'பேன்ட்',
  tshirts: 'டி-ஷர்ட்',
  tshirt: 'டி-ஷர்ட்',
  't-shirts': 'டி-ஷர்ட்',
  't-shirt': 'டி-ஷர்ட்',
  nighties: 'நைட்டி',
  nighty: 'நைட்டி',
  leggings: 'லெக்கின்ஸ்',
  legging: 'லெக்கின்ஸ்',
  kurtis: 'குர்தி',
  kurti: 'குர்தி',
  kurtas: 'குர்தா',
  kurta: 'குர்தா',
  dhotis: 'வேஷ்டி',
  dhoti: 'வேஷ்டி',
  towels: 'துண்டு',
  towel: 'துண்டு',
  bedsheets: 'பெட்ஷீட்',
  bedsheet: 'பெட்ஷீட்',
  frocks: 'பிராக்',
  frock: 'பிராக்',
  kids: 'குழந்தைகள் ஆடை',
  other: 'மற்றவை',
};

const PRODUCT_MAP_TA_TO_EN = {
  'ஜீன்ஸ்': 'Jeans',
  'டாப்ஸ்': 'Tops',
  'புடவை': 'Sarees',
  'சேலை': 'Sarees',
  'சுடிதார்': 'Chudidars',
  'சுடி': 'Chudidars',
  'உள்ளாடை': 'Inners',
  'உள்ளாடைகள்': 'Inners',
  'சட்டை': 'Shirts',
  'பேன்ட்': 'Pants',
  'டி-ஷர்ட்': 'T-Shirts',
  'டி ஷர்ட்': 'T-Shirts',
  'நைட்டி': 'Nighties',
  'லெக்கின்ஸ்': 'Leggings',
  'குர்தி': 'Kurtis',
  'குர்தா': 'Kurtas',
  'வேஷ்டி': 'Dhotis',
  'துண்டு': 'Towels',
  'பெட்ஷீட்': 'Bedsheet',
  'பிராக்': 'Frocks',
  'மற்றவை': 'Other',
};

// Comprehensive Customer Names Dictionary (English <-> Tamil)
const NAME_MAP_EN_TO_TA = {
  kumar: 'குமார்',
  ram: 'ராம்',
  ramesh: 'ரமேஷ்',
  suresh: 'சுரேஷ்',
  raj: 'ராஜ்',
  raja: 'ராஜா',
  rajesh: 'ராஜேஷ்',
  ravi: 'ரவி',
  mani: 'மணி',
  murugan: 'முருகன்',
  ganesh: 'கணேஷ்',
  vijay: 'விஜய்',
  ajith: 'அஜித்',
  siva: 'சிவா',
  shiva: 'சிவா',
  selvam: 'செல்வம்',
  saravanan: 'சரவணன்',
  saravananan: 'சரவணன்',
  prakash: 'பிரகாஷ்',
  karthik: 'கார்த்திக்',
  karthi: 'கார்த்தி',
  arun: 'அருண்',
  anbu: 'அன்பு',
  lakshmi: 'லக்ஷ்மி',
  priya: 'பிரியா',
  devi: 'தேவி',
  radha: 'ராதா',
  geetha: 'கீதா',
  gita: 'கீதா',
  kavitha: 'கவிதா',
  meena: 'மீனா',
  shanthi: 'சாந்தி',
  santhi: 'சாந்தி',
  sudha: 'சுதா',
  deepa: 'தீபா',
  anitha: 'அனிதா',
  balaji: 'பாலாஜி',
  shankar: 'சங்கர்',
  sankar: 'சங்கர்',
  vignesh: 'விக்னேஷ்',
  vigneshwaran: 'விக்னேஸ்வரன்',
  senthil: 'செந்தில்',
  mohan: 'மோகன்',
  dinesh: 'தினேஷ்',
  kannan: 'கண்ணன்',
  velu: 'வேலு',
  pandian: 'பாண்டியன்',
  krishnan: 'கிருஷ்ணன்',
  krishna: 'கிருஷ்ணா',
  subramani: 'சுப்பிரமணி',
  venkat: 'வெங்கட்',
  venkatesh: 'வெங்கடேஷ்',
  anand: 'ஆனந்த்',
  babu: 'பாபு',
  ashok: 'அசோக்',
  selvi: 'செல்வி',
  kala: 'கலா',
  sumathi: 'சுமதி',
  kamala: 'கமலா',
  sangeetha: 'சங்கீதா',
  pooja: 'பூஜா',
  bhavani: 'பவானி',
  renuka: 'ரேணுகா',
  gowri: 'கௌரி',
  divya: 'திவ்யா',
  swetha: 'ஸ்வேதா',
  sandhya: 'சந்தியா',
  sujitha: 'சுஜிதா',
  suji: 'சுஜி',
  saritha: 'சரிதா',
  sunitha: 'சுனிதா',
  suganya: 'சுகன்யா',
  sudhakar: 'சுதாகர்',
  surya: 'சூர்யா',
  subash: 'சுபாஷ்',
  subha: 'சுபா',
  soundar: 'சௌந்தர்',
  sowmya: 'சௌமியா',
  swathi: 'ஸ்வாதி',
  sharanya: 'சரண்யா',
  sindhu: 'சிந்து',
  sneha: 'ஸ்நேகா',
  praveen: 'பிரவீன்',
  prabhu: 'பிரபு',
  pradeep: 'பிரதீப்',
  raghav: 'ராகவ்',
  manoj: 'மனோஜ்',
  naveen: 'நவீன்',
  gokul: 'கோகுல்',
  keerthi: 'கீர்த்தி',
  keerthana: 'கீர்த்தனா',
  harini: 'ஹரிணி',
  harish: 'ஹரிஷ்',
  hema: 'ஹேமா',
  indhu: 'இந்து',
  ilango: 'இளங்கோ',
  jayanth: 'ஜெயந்த்',
  janani: 'ஜனனி',
  jagan: 'ஜெகன்',
  kavya: 'காவ்யா',
  kanmani: 'கண்மணி',
  kalyani: 'கல்யாணி',
  kiruthika: 'கிருத்திகா',
  latha: 'லதா',
  lavanya: 'லாவண்யா',
  madhavan: 'மாதவன்',
  malathi: 'மாலதி',
  manikandan: 'மணிகண்டன்',
  meenakshi: 'மீனாட்சி',
  mithun: 'மிதுன்',
  mohanraj: 'மோகன்ராஜ்',
  muthu: 'முத்து',
  nandhini: 'நந்தினி',
  natarajan: 'நடராஜன்',
  nirmala: 'நிர்மலா',
  nisha: 'நிஷா',
  nithya: 'நித்யா',
  pavithra: 'பவித்ரா',
  ponmudi: 'பொன்முடி',
  poongodi: 'பூங்கொடி',
  punitha: 'புனிதா',
  pushpa: 'புஷ்பா',
  raghu: 'ரகு',
  rajendran: 'ராஜேந்திரன்',
  rajkumar: 'ராஜ்குமார்',
  ramani: 'ரமணி',
  rani: 'ராணி',
  revathi: 'ரேவதி',
  rohini: 'ரோகிணி',
  sakthi: 'சக்தி',
  sampath: 'சம்பத்',
  santhosh: 'சந்தோஷ்',
  sasikumar: 'சசிகுமார்',
  sathya: 'சத்யா',
  selvakumar: 'செல்வகுமார்',
  sharmila: 'ஷர்மிளா',
  shobana: 'ஷோபனா',
  soundarya: 'சௌந்தர்யா',
  sudharsan: 'சுதர்சன்',
  sugumar: 'சுகுமார்',
  sundar: 'சுந்தர்',
  surendran: 'சுரேந்திரன்',
  thangavel: 'தங்கவேல்',
  thirumal: 'திருமால்',
  uma: 'உமா',
  umamaheswari: 'உமாமகேஸ்வரி',
  usha: 'உஷா',
  valli: 'வள்ளி',
  vanitha: 'வனிதா',
  vasanth: 'வசந்த்',
  velmurugan: 'வேல்முருகன்',
  venkatesan: 'வெங்கடேசன்',
  vidhya: 'வித்யா',
  vijayakumar: 'விஜயகுமார்',
  vimal: 'விமல்',
  vinoth: 'வினோத்',
  viswanathan: 'விஸ்வநாதன்',
  yamuna: 'யமுனா',
  yuvan: 'யுவன்',
  yuvashree: 'யுவஸ்ரீ',
};

// Build reverse dictionary dynamically
const NAME_MAP_TA_TO_EN = {};
for (const [enKey, taVal] of Object.entries(NAME_MAP_EN_TO_TA)) {
  const cap = enKey.charAt(0).toUpperCase() + enKey.slice(1);
  NAME_MAP_TA_TO_EN[taVal] = cap;
}

/**
 * Checks if a string contains Tamil script characters.
 */
export function isTamil(text) {
  if (!text) return false;
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Tamil-to-English character phonetic mapping
 */
const TA_CONSONANTS = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'ny', 'ட': 't', 'ண': 'n',
  'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh', 'ஸ்ரீ': 'Sri',
};

const TA_VOWELS = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
  'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oe', 'ஔ': 'au',
};

const TA_SIGNS = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
  'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oe', 'ஔ': 'au',
  '்': '',
};

export function transliterateTamilToEnglish(tamilText) {
  if (!tamilText || typeof tamilText !== 'string') return '';
  const trimmed = tamilText.trim();
  if (NAME_MAP_TA_TO_EN[trimmed]) {
    return NAME_MAP_TA_TO_EN[trimmed];
  }
  if (PRODUCT_MAP_TA_TO_EN[trimmed]) {
    return PRODUCT_MAP_TA_TO_EN[trimmed];
  }

  // General character-by-character conversion
  let result = '';
  const chars = Array.from(trimmed);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (TA_VOWELS[ch]) {
      result += TA_VOWELS[ch];
    } else if (TA_CONSONANTS[ch]) {
      const base = TA_CONSONANTS[ch];
      if (next === '்') {
        result += base;
        i++; // skip virama
      } else if (next && TA_SIGNS[next]) {
        result += base + TA_SIGNS[next];
        i++; // skip vowel sign
      } else {
        result += base + 'a';
      }
    } else if (ch === ' ') {
      result += ' ';
    } else {
      result += ch;
    }
  }

  return result
    .split(' ')
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/**
 * Phonetic English-to-Tamil parser for any arbitrary English name
 */
const EN_STANDALONE_VOWELS = [
  ['aa', 'ஆ'], ['a', 'அ'],
  ['ee', 'ஈ'], ['ii', 'ஈ'], ['i', 'இ'],
  ['oo', 'ஊ'], ['uu', 'ஊ'], ['u', 'உ'],
  ['ea', 'ஏ'], ['ae', 'ஏ'], ['e', 'எ'],
  ['ai', 'ஐ'],
  ['oa', 'ஓ'], ['o', 'ஒ'],
  ['au', 'ஔ'], ['ou', 'ஔ'],
];

const EN_CONSONANTS = [
  ['ksh', 'க்ஷ'], ['shree', 'ஸ்ரீ'], ['sri', 'ஸ்ரீ'],
  ['sh', 'ஷ'], ['ch', 'ச'], ['th', 'த'], ['dh', 'த'],
  ['zh', 'ழ'], ['ng', 'ங'], ['gn', 'ஞ'], ['ny', 'ஞ'],
  ['nj', 'ஞ்ச'], ['nd', 'ண்ட'], ['nt', 'ந்த'],
  ['k', 'க'], ['g', 'க'], ['c', 'ச'],
  ['j', 'ஜ'], ['t', 'ட'], ['d', 'ட'],
  ['p', 'ப'], ['b', 'ப'], ['m', 'ம'],
  ['y', 'ய'], ['r', 'ர'], ['l', 'ல'],
  ['v', 'வ'], ['w', 'வ'], ['s', 'ச'],
  ['h', 'ஹ'], ['z', 'ஜ'], ['n', 'ன'],
];

const EN_VOWEL_SIGNS = [
  ['aa', 'ா'], ['a', 'ா'],
  ['ee', 'ீ'], ['ii', 'ீ'], ['i', 'ி'],
  ['oo', 'ூ'], ['uu', 'ூ'], ['u', 'ு'],
  ['ae', 'ே'], ['ea', 'ே'], ['e', 'ே'],
  ['ai', 'ை'],
  ['oa', 'ோ'], ['o', 'ோ'],
  ['au', 'ௌ'], ['ou', 'ௌ'],
];

export function transliterateEnglishToTamil(englishText) {
  if (!englishText || typeof englishText !== 'string') return '';
  const trimmed = englishText.trim();
  if (isTamil(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (NAME_MAP_EN_TO_TA[lower]) {
    return NAME_MAP_EN_TO_TA[lower];
  }

  let pos = 0;
  let result = '';
  const len = lower.length;

  while (pos < len) {
    // Check spaces / non-alpha
    if (lower[pos] === ' ') {
      result += ' ';
      pos++;
      continue;
    }

    // At word start or after space, check standalone vowel
    const isStart = pos === 0 || lower[pos - 1] === ' ';
    if (isStart) {
      let matchedVowel = false;
      for (const [vKey, vChar] of EN_STANDALONE_VOWELS) {
        if (lower.startsWith(vKey, pos)) {
          result += vChar;
          pos += vKey.length;
          matchedVowel = true;
          break;
        }
      }
      if (matchedVowel) continue;
    }

    // Try to match a consonant
    let matchedConsonant = false;
    for (const [cKey, cChar] of EN_CONSONANTS) {
      if (lower.startsWith(cKey, pos)) {
        pos += cKey.length;
        matchedConsonant = true;

        // Base consonant without implicit halant
        const base = cChar.replace('்', '');

        // Check if next is vowel
        let matchedSign = false;
        for (const [sKey, sChar] of EN_VOWEL_SIGNS) {
          if (lower.startsWith(sKey, pos)) {
            // If short 'a', just base consonant
            if (sKey === 'a') {
              // Special case: word-final 'a' usually lengthens in Tamil names (e.g. Sujitha -> சுஜிதா, Priya -> பிரியா)
              const isEnd = pos + 1 >= len || lower[pos + 1] === ' ';
              result += base + (isEnd ? 'ா' : '');
            } else {
              result += base + sChar;
            }
            pos += sKey.length;
            matchedSign = true;
            break;
          }
        }

        if (!matchedSign) {
          // Consonant followed by another consonant or end of word -> add pulli (virama)
          // Exception: word-final 'n', 'r', 'l', 'm', 'y' gets pulli
          result += base + '்';
        }
        break;
      }
    }

    if (!matchedConsonant) {
      // Just copy character
      result += lower[pos];
      pos++;
    }
  }

  return result;
}

/**
 * Transliterates or maps a name to Tamil script.
 */
export function toTamilName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (isTamil(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (NAME_MAP_EN_TO_TA[lower]) {
    return NAME_MAP_EN_TO_TA[lower];
  }

  return transliterateEnglishToTamil(trimmed);
}

/**
 * Transliterates or maps a name to English script.
 */
export function toEnglishName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!isTamil(trimmed)) return trimmed;

  if (NAME_MAP_TA_TO_EN[trimmed]) {
    return NAME_MAP_TA_TO_EN[trimmed];
  }

  return transliterateTamilToEnglish(trimmed);
}

/**
 * Formats a customer name for display based on active language.
 */
export function formatCustomerDisplayName(name, language = 'en') {
  if (!name) return '';
  if (typeof name !== 'string') return String(name);
  
  const trimmed = name.trim();
  if (language === 'ta') {
    return toTamilName(trimmed);
  }
  return toEnglishName(trimmed);
}

/**
 * Formats product / cloth category names based on active language.
 */
export function formatProductDisplayName(name, language = 'en') {
  if (!name) return '';
  if (typeof name !== 'string') return String(name);

  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (language === 'ta') {
    if (isTamil(trimmed)) return trimmed;
    if (PRODUCT_MAP_EN_TO_TA[lower]) return PRODUCT_MAP_EN_TO_TA[lower];
    for (const [k, v] of Object.entries(PRODUCT_MAP_EN_TO_TA)) {
      if (lower.includes(k)) return v;
    }
    return toTamilName(trimmed);
  } else {
    if (!isTamil(trimmed)) return trimmed;
    if (PRODUCT_MAP_TA_TO_EN[trimmed]) return PRODUCT_MAP_TA_TO_EN[trimmed];
    for (const [k, v] of Object.entries(PRODUCT_MAP_TA_TO_EN)) {
      if (trimmed.includes(k)) return v;
    }
    return toEnglishName(trimmed);
  }
}
