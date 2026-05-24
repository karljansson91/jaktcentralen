import { Text } from "@/components/ui";
import { APP_COLORS } from "@/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

export function ChoiceChip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`relative min-h-12 items-center justify-center rounded-2xl border p-3 ${
        selected ? "border-primary bg-primary" : "border-border bg-card"
      }`}
      style={{ width: "48%" }}
    >
      {icon ? (
        <View className="absolute left-3">
          <Ionicons
            name={icon}
            size={17}
            color={selected ? "#ffffff" : APP_COLORS.textMuted}
          />
        </View>
      ) : null}
      <Text
        className={`w-full px-5 text-center text-sm font-semibold ${
          selected ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
