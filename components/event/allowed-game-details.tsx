import { Text } from '@/components/ui';
import {
  formatAllowedGameDetails,
  formatAllowedGameSummary,
  type AllowedGameRule,
} from '@/lib/allowed-game';
import { View } from 'react-native';

type AllowedGameDetailsProps = {
  rules?: AllowedGameRule[] | null;
};

export function AllowedGameDetails({ rules }: AllowedGameDetailsProps) {
  const summary = formatAllowedGameSummary(rules, 8);

  return (
    <View className="gap-2">
      <Text className="text-sm leading-5 text-muted-foreground">
        {summary ?? 'Inget angivet'}
      </Text>
      {summary ? (
        <Text className="text-sm leading-5 text-foreground">
          {formatAllowedGameDetails(rules)}
        </Text>
      ) : null}
    </View>
  );
}
