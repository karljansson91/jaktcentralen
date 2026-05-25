import { Input, Text } from '@/components/ui';
import {
  ALLOWED_GAME_GROUPS,
  CUSTOM_ALLOWED_GAME_SPECIES_ID,
  isCustomAllowedGameSpeciesId,
  type AllowedGameRule,
  type AllowedGameSpecies,
} from '@/lib/allowed-game';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type AllowedGameEditorProps = {
  disabled?: boolean;
  onChange: (rules: AllowedGameRule[]) => void;
  value: AllowedGameRule[];
};

function createSpeciesRule(species: AllowedGameSpecies): AllowedGameRule {
  return {
    mode: 'all',
    optionIds: [],
    speciesId: species.id,
  };
}

function createCustomRule(): AllowedGameRule {
  return {
    customLabel: '',
    mode: 'all',
    optionIds: [],
    speciesId: `${CUSTOM_ALLOWED_GAME_SPECIES_ID}:${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
  };
}

function Chip({
  active,
  disabled,
  label,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        active ? 'border-primary bg-primary' : 'border-border bg-card'
      } ${disabled ? 'opacity-60' : ''}`}>
      <Text className={`text-sm font-medium ${active ? 'text-primary-foreground' : 'text-foreground'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AllowedGameEditor({ disabled, onChange, value }: AllowedGameEditorProps) {
  const selectedBySpeciesId = new Map<string, { rule: AllowedGameRule; index: number }>();
  const customRules: { rule: AllowedGameRule; index: number }[] = [];

  value.forEach((rule, index) => {
    if (isCustomAllowedGameSpeciesId(rule.speciesId)) {
      customRules.push({ rule, index });
      return;
    }

    selectedBySpeciesId.set(rule.speciesId, { rule, index });
  });

  function replaceRule(index: number, nextRule: AllowedGameRule) {
    onChange(value.map((rule, candidateIndex) => (candidateIndex === index ? nextRule : rule)));
  }

  function removeRule(index: number) {
    onChange(value.filter((_, candidateIndex) => candidateIndex !== index));
  }

  function toggleSpecies(species: AllowedGameSpecies) {
    const selected = selectedBySpeciesId.get(species.id);
    if (selected) {
      removeRule(selected.index);
      return;
    }

    onChange([...value, createSpeciesRule(species)]);
  }

  return (
    <View className="gap-4">
      {ALLOWED_GAME_GROUPS.map((group) => (
        <View key={group.id} className="gap-2">
          <Text className="text-sm font-semibold text-muted-foreground">{group.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {group.species.map((species) => {
              const selected = selectedBySpeciesId.get(species.id);
              return (
                <Chip
                  key={species.id}
                  active={Boolean(selected)}
                  disabled={disabled}
                  label={species.label}
                  onPress={() => toggleSpecies(species)}
                />
              );
            })}
          </View>
          {group.species.map((species) => {
            const selected = selectedBySpeciesId.get(species.id);
            if (!selected) return null;

            const options = species.options ?? [];
            return (
              <View key={`${species.id}-details`} className="gap-2 rounded-2xl border border-border bg-card p-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-semibold text-foreground">{species.label}</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={disabled}
                    onPress={() => removeRule(selected.index)}
                    className="size-8 items-center justify-center rounded-full bg-muted">
                    <Ionicons name="close" size={16} color="#636679" />
                  </Pressable>
                </View>
                {options.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    <Chip
                      active={selected.rule.mode === 'all'}
                      disabled={disabled}
                      label="Alla"
                      onPress={() =>
                        replaceRule(selected.index, {
                          ...selected.rule,
                          mode: 'all',
                          optionIds: [],
                        })
                      }
                    />
                    {options.map((option) => (
                      <Chip
                        key={option.id}
                        active={selected.rule.optionIds.includes(option.id)}
                        disabled={disabled}
                        label={option.label}
                        onPress={() => {
                          const optionIds = selected.rule.optionIds.includes(option.id)
                            ? selected.rule.optionIds.filter((candidate) => candidate !== option.id)
                            : [...selected.rule.optionIds, option.id];

                          replaceRule(selected.index, {
                            ...selected.rule,
                            mode: optionIds.length === 0 ? 'all' : 'selected',
                            optionIds,
                          });
                        }}
                      />
                    ))}
                  </View>
                ) : null}
                <Input
                  editable={!disabled}
                  placeholder="Anteckning, t.ex. taggintervall"
                  value={selected.rule.note ?? ''}
                  onChangeText={(note) =>
                    replaceRule(selected.index, { ...selected.rule, note })
                  }
                />
              </View>
            );
          })}
        </View>
      ))}

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-muted-foreground">Annat</Text>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onChange([...value, createCustomRule()])}
            className="flex-row items-center gap-1 rounded-full bg-primary/10 px-3 py-2">
            <Ionicons name="add" size={16} color="#398048" />
            <Text className="text-sm font-semibold text-primary">Lägg till</Text>
          </Pressable>
        </View>
        {customRules.map(({ rule, index }) => (
          <View key={rule.speciesId} className="gap-2 rounded-2xl border border-border bg-card p-3">
            <View className="flex-row items-center gap-2">
              <Input
                editable={!disabled}
                placeholder="Eget vilt eller regel"
                value={rule.customLabel ?? ''}
                onChangeText={(customLabel) => replaceRule(index, { ...rule, customLabel })}
                className="flex-1"
              />
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => removeRule(index)}
                className="size-10 items-center justify-center rounded-full bg-muted">
                <Ionicons name="trash-outline" size={17} color="#636679" />
              </Pressable>
            </View>
            <Input
              editable={!disabled}
              placeholder="Anteckning"
              value={rule.note ?? ''}
              onChangeText={(note) => replaceRule(index, { ...rule, note })}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
