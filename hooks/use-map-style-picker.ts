import { useCallback, useEffect, useRef } from 'react';

import { showMapStylePicker } from '@/lib/map-style-picker';
import { getCachedMapStyle, getSavedMapStyle } from '@/lib/map-styles';

const DEFAULT_MAP_STYLE_PICKER_MESSAGE = 'Gäller både områden och jakter.';

export function useMapStylePicker(message = DEFAULT_MAP_STYLE_PICKER_MESSAGE) {
  const selectedMapStyleIdRef = useRef(getCachedMapStyle().id);

  useEffect(() => {
    let cancelled = false;

    void getSavedMapStyle().then((style) => {
      if (!cancelled) {
        selectedMapStyleIdRef.current = style.id;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(() => {
    showMapStylePicker({
      message,
      onSelect: (savedStyle) => {
        selectedMapStyleIdRef.current = savedStyle.id;
      },
      selectedMapStyleId: selectedMapStyleIdRef.current,
    });
  }, [message]);
}
