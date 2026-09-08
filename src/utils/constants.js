export const DEFAULT_CATEGORIES = [
  { id: 'jeans', name: 'Jeans', nameTa: 'ஜீன்ஸ்', emoji: '👖', color: '#3B82F6' },
  { id: 'tops', name: 'Tops', nameTa: 'டாப்ஸ்', emoji: '👚', color: '#EC4899' },
  { id: 'sarees', name: 'Sarees', nameTa: 'புடவை', emoji: '🥻', color: '#F97316' },
  { id: 'chudis', name: 'Chudidars', nameTa: 'சுடிதார்', emoji: '👗', color: '#8B5CF6' },
  { id: 'inners', name: 'Inners', nameTa: 'உள்ளாடைகள்', emoji: '🧥', color: '#14B8A6' },
  { id: 'other', name: 'Other', nameTa: 'மற்றவை', emoji: '👔', color: '#6B7280' },
];

export const EXPENSE_TYPES = [
  'Transport',
  'Packaging',
  'Shop rent',
  'Phone/Internet',
  'Food',
  'Labour',
  'Other',
];

export const EXPENSE_TYPE_LABELS = {
  en: {
    'Transport': 'Transport',
    'Packaging': 'Packaging',
    'Shop rent': 'Shop rent',
    'Phone/Internet': 'Phone/Internet',
    'Food': 'Food',
    'Labour': 'Labour',
    'Other': 'Other',
  },
  ta: {
    'Transport': 'போக்குவரத்து / வண்டி',
    'Packaging': 'பேக்கிங் / கவர்',
    'Shop rent': 'கடை வாடகை',
    'Phone/Internet': 'போன் / இன்டர்நெட்',
    'Food': 'உணவு / டீ செலவு',
    'Labour': 'கூலி / சம்பளம்',
    'Other': 'மற்றவை',
  },
};

export function getExpenseTypeLabel(type, language = 'en') {
  const lang = language === 'ta' ? 'ta' : 'en';
  return EXPENSE_TYPE_LABELS[lang]?.[type] || type;
}

export function getCategoryByName(name) {
  if (!name) return DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
  const lower = name.toLowerCase();
  return (
    DEFAULT_CATEGORIES.find(
      (c) => lower.includes(c.id) || lower.includes(c.name.toLowerCase())
    ) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}

export function getProductEmoji(name) {
  return getCategoryByName(name).emoji;
}

export function getProductColor(name) {
  return getCategoryByName(name).color;
}
