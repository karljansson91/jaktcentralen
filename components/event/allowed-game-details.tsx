import { Text } from '@/components/ui';
import {
  formatAllowedGameDetails,
  getAllowedGameSpeciesLabel,
  type AllowedGameRule,
} from '@/lib/allowed-game';
import { View } from 'react-native';

type AllowedGameDetailsProps = {
  rules?: AllowedGameRule[] | null;
};

export function AllowedGameDetails({ rules }: AllowedGameDetailsProps) {
  const allowedRules = rules ?? [];

  return (
    <View className="gap-3">
      {allowedRules.length > 0 ? (
        <>
          <View className="flex-row flex-wrap gap-2">
            {allowedRules.map((rule) => (
              <View
                key={rule.speciesId}
                className="rounded-full border border-border bg-card px-3 py-2">
                <Text className="text-sm font-semibold text-foreground">
                  {getAllowedGameSpeciesLabel(rule)}
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-sm leading-5 text-foreground">
            {formatAllowedGameDetails(rules)}
          </Text>
        </>
      ) : (
        <Text className="text-sm leading-5 text-foreground">
          Inget angivet
        </Text>
      )}
    </View>
  );
}
