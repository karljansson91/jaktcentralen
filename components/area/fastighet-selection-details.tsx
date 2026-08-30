import { Text } from '@/components/ui';
import type { SelectedFastighet } from '@/lib/fastighetsindelning';
import { View } from 'react-native';

function SelectionInfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="shrink-0 text-xs font-medium uppercase text-muted-foreground">{label}</Text>
      <Text selectable className="min-w-0 flex-1 text-right text-sm font-medium">
        {value}
      </Text>
    </View>
  );
}

export function FastighetSelectionDetails({ selection }: { selection: SelectedFastighet }) {
  return (
    <View className="gap-1 rounded-2xl bg-muted p-3">
      <SelectionInfoRow label="Beteckning" value={selection.etikett} />
      <SelectionInfoRow label="Kommun" value={selection.kommunnamn} />
      <SelectionInfoRow label="Trakt" value={selection.trakt} />
    </View>
  );
}
