import { Alert } from 'react-native';

import { MAP_STYLE_OPTIONS, saveMapStyle, type MapStyleOption } from '@/lib/map-styles';

type ShowMapStylePickerOptions = {
  message: string;
  onSelect: (style: MapStyleOption) => void;
  selectedMapStyleId: string;
};

export function showMapStylePicker({
  message,
  onSelect,
  selectedMapStyleId,
}: ShowMapStylePickerOptions) {
  Alert.alert(
    'Välj kartvy',
    message,
    [
      ...MAP_STYLE_OPTIONS.map((option) => ({
        text: option.id === selectedMapStyleId ? `${option.label} ✓` : option.label,
        onPress: () => {
          void saveMapStyle(option.id).then(onSelect);
        },
      })),
      { text: 'Avbryt', style: 'cancel' as const },
    ]
  );
}
