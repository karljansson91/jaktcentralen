import { AreaFeatureCategory } from '@/lib/area-features';
import { Ionicons } from '@expo/vector-icons';

export const MAX_MARKER_IMAGES = 5;

export const CATEGORY_ICONS: Record<AreaFeatureCategory, keyof typeof Ionicons.glyphMap> = {
  pass: 'flag-outline',
  parking: 'car-outline',
  meeting: 'people-outline',
};
