import { Text } from '@/components/ui';
import { getUserInitials } from '@/lib/user-profile';
import { APP_COLORS } from '@/lib/theme';
import { Image } from 'expo-image';
import { View } from 'react-native';

type UserAvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  size?: number;
};

export function UserAvatar({ imageUrl, name, size = 44 }: UserAvatarProps) {
  const borderRadius = size / 2;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{
          backgroundColor: 'rgba(57, 128, 72, 0.1)',
          borderRadius,
          height: size,
          width: size,
        }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center bg-primary/10"
      style={{
        borderRadius,
        height: size,
        width: size,
      }}>
      <Text
        className="font-semibold text-primary"
        style={{ color: APP_COLORS.primary, fontSize: Math.max(12, size * 0.32) }}>
        {getUserInitials(name)}
      </Text>
    </View>
  );
}
