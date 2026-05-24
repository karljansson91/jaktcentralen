import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type ColorSwatchProps = {
  color: string;
  selected: boolean;
  onPress: () => void;
};

export function ColorSwatch({ color, selected, onPress }: ColorSwatchProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`size-11 items-center justify-center rounded-full border-2 ${
        selected ? 'border-foreground bg-card' : 'border-transparent'
      }`}
      style={{ boxShadow: selected ? '0 5px 12px rgba(49, 52, 68, 0.12)' : undefined }}>
      <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
        {selected && <Ionicons name="checkmark" size={18} color="white" />}
      </View>
    </Pressable>
  );
}
