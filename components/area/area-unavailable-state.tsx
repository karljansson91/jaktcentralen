import { Button, Text } from '@/components/ui';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

type AreaUnavailableStateProps = {
  message?: string;
};

export function AreaUnavailableState({
  message = 'Området hittades inte.',
}: AreaUnavailableStateProps) {
  const { replace } = useRouter();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
      <View className="gap-2">
        <Text variant="h3" className="text-center">
          Området hittades inte
        </Text>
        <Text className="text-center text-muted-foreground">{message}</Text>
      </View>
      <Button className="h-12 rounded-xl px-5" onPress={() => replace('/')}>
        <Text>Till startsidan</Text>
      </Button>
    </View>
  );
}
