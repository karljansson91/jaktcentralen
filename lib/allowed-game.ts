export type AllowedGameMode = 'all' | 'selected';

export type AllowedGameRule = {
  customLabel?: string;
  mode: AllowedGameMode;
  note?: string;
  optionIds: string[];
  speciesId: string;
};

export type AllowedGameOption = {
  id: string;
  label: string;
};

export type AllowedGameSpecies = {
  groupId: string;
  id: string;
  label: string;
  notePlaceholder?: string;
  options?: AllowedGameOption[];
};

export type AllowedGameGroup = {
  id: string;
  label: string;
  species: AllowedGameSpecies[];
};

export const CUSTOM_ALLOWED_GAME_SPECIES_ID = 'custom';

export function isCustomAllowedGameSpeciesId(speciesId: string) {
  return speciesId === CUSTOM_ALLOWED_GAME_SPECIES_ID || speciesId.startsWith(`${CUSTOM_ALLOWED_GAME_SPECIES_ID}:`);
}

const GENERIC_ALLOWED_GAME_NOTE_PLACEHOLDER = 'Anteckning';
const ANTLER_ALLOWED_GAME_NOTE_PLACEHOLDER = 'Anteckning, t.ex. taggintervall';

export function getAllowedGameNotePlaceholder(
  species: Pick<AllowedGameSpecies, 'notePlaceholder'>
) {
  return species.notePlaceholder ?? GENERIC_ALLOWED_GAME_NOTE_PLACEHOLDER;
}

export const ALLOWED_GAME_GROUPS: AllowedGameGroup[] = [
  {
    id: 'hoofed',
    label: 'Klövvilt',
    species: [
      {
        groupId: 'hoofed',
        id: 'elk',
        label: 'Älg',
        notePlaceholder: ANTLER_ALLOWED_GAME_NOTE_PLACEHOLDER,
        options: [
          { id: 'calf', label: 'Kalv' },
          { id: 'cow', label: 'Ko' },
          { id: 'bull', label: 'Tjur' },
          { id: 'bull_antler_range', label: 'Tjur taggintervall' },
          { id: 'adult_any', label: 'Valfri vuxen' },
        ],
      },
      {
        groupId: 'hoofed',
        id: 'roe_deer',
        label: 'Rådjur',
        options: [
          { id: 'kid', label: 'Kid' },
          { id: 'doe', label: 'Get' },
          { id: 'buck', label: 'Bock' },
          { id: 'adult_any', label: 'Valfri vuxen' },
        ],
      },
      {
        groupId: 'hoofed',
        id: 'fallow_deer',
        label: 'Dovhjort',
        options: [
          { id: 'calf', label: 'Kalv' },
          { id: 'hind', label: 'Hind' },
          { id: 'stag', label: 'Hjort' },
          { id: 'young_stag', label: 'Spets/ung hjort' },
          { id: 'adult_any', label: 'Valfri vuxen' },
        ],
      },
      {
        groupId: 'hoofed',
        id: 'red_deer',
        label: 'Kronhjort',
        options: [
          { id: 'calf', label: 'Kalv' },
          { id: 'hind', label: 'Hind' },
          { id: 'stag', label: 'Hjort' },
          { id: 'young_stag', label: 'Spets/ung hjort' },
          { id: 'adult_any', label: 'Valfri vuxen' },
        ],
      },
      {
        groupId: 'hoofed',
        id: 'boar',
        label: 'Vildsvin',
        options: [
          { id: 'piglet', label: 'Årsgris' },
          { id: 'young', label: 'Unggris' },
          { id: 'boar', label: 'Galt' },
          { id: 'sow', label: 'Sugga' },
        ],
      },
    ],
  },
  {
    id: 'small_game',
    label: 'Småvilt / övrigt',
    species: [
      { groupId: 'small_game', id: 'fox', label: 'Räv' },
      { groupId: 'small_game', id: 'hare', label: 'Hare' },
      { groupId: 'small_game', id: 'badger', label: 'Grävling' },
    ],
  },
  {
    id: 'birds',
    label: 'Fågel',
    species: [
      { groupId: 'birds', id: 'forest_bird', label: 'Skogsfågel' },
      { groupId: 'birds', id: 'waterfowl', label: 'Sjöfågel' },
      { groupId: 'birds', id: 'corvid', label: 'Kråkfågel' },
      { groupId: 'birds', id: 'other_bird', label: 'Annan fågel' },
    ],
  },
];

const SPECIES_BY_ID = new Map(
  ALLOWED_GAME_GROUPS.flatMap((group) =>
    group.species.map((species) => [species.id, species] as const)
  )
);

function getAllowedGameSpecies(rule: Pick<AllowedGameRule, 'speciesId'>) {
  return SPECIES_BY_ID.get(rule.speciesId);
}

export function getAllowedGameSpeciesLabel(rule: AllowedGameRule) {
  if (isCustomAllowedGameSpeciesId(rule.speciesId)) {
    return rule.customLabel?.trim() || 'Annat';
  }

  return getAllowedGameSpecies(rule)?.label ?? rule.speciesId;
}

function getAllowedGameOptionLabels(rule: AllowedGameRule) {
  if (rule.mode === 'all') {
    return ['Alla'];
  }

  const species = getAllowedGameSpecies(rule);
  const options = new Map(species?.options?.map((option) => [option.id, option.label]) ?? []);
  return rule.optionIds.map((optionId) => options.get(optionId) ?? optionId);
}

export function formatAllowedGameSummary(rules?: AllowedGameRule[] | null, maxItems = 3) {
  if (!rules || rules.length === 0) {
    return null;
  }

  const labels = rules.map(getAllowedGameSpeciesLabel).filter(Boolean);
  if (labels.length <= maxItems) {
    return labels.join(', ');
  }

  return `${labels.slice(0, maxItems).join(', ')} +${labels.length - maxItems}`;
}

export function formatAllowedGameDetails(rules?: AllowedGameRule[] | null) {
  if (!rules || rules.length === 0) {
    return 'Inget tillåtet vilt angivet.';
  }

  return rules
    .map((rule) => {
      const parts = [
        getAllowedGameSpeciesLabel(rule),
        getAllowedGameOptionLabels(rule).join(', '),
        rule.note?.trim(),
      ].filter(Boolean);

      return parts.join(' · ');
    })
    .join('\n');
}
