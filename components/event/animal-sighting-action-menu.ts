import type { AnimalSightingMapItem } from '@/lib/animal-sightings';
import { formatAnimalSightingMapLabel } from '@/lib/animal-sightings';
import { ActionSheetIOS, Alert } from 'react-native';

type AnimalSightingActionMenuOptions = {
  currentTime: number;
  onHide: () => void;
  sighting: AnimalSightingMapItem;
};

export function showAnimalSightingActionMenu({
  currentTime,
  onHide,
  sighting,
}: AnimalSightingActionMenuOptions) {
  const label = formatAnimalSightingMapLabel(sighting, currentTime);

  if (process.env.EXPO_OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 1,
        options: ['Dölj på kartan', 'Avbryt'],
        title: label,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          onHide();
        }
      }
    );
    return;
  }

  Alert.alert(label, undefined, [
    { text: 'Dölj på kartan', onPress: onHide },
    { text: 'Avbryt', style: 'cancel' },
  ]);
}
