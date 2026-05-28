import { getMapHeadingDelta } from '@/lib/map-heading';
import type { CameraStop, MapState } from '@rnmapbox/maps';
import { useCallback, useState, type RefObject } from 'react';

type HeadingCameraRef = {
  setCamera: (config: CameraStop) => void;
};

export function useMapHeading<TCamera extends HeadingCameraRef>(
  cameraRef: RefObject<TCamera | null>
) {
  const [heading, setHeading] = useState(0);

  const handleCameraChanged = useCallback((state: MapState) => {
    const nextHeading = state.properties.heading;
    if (!Number.isFinite(nextHeading)) {
      return;
    }

    setHeading((currentHeading) =>
      getMapHeadingDelta(currentHeading, nextHeading) < 0.5 ? currentHeading : nextHeading
    );
  }, []);

  const resetHeading = useCallback(() => {
    cameraRef.current?.setCamera({
      animationDuration: 300,
      animationMode: 'easeTo',
      heading: 0,
    });
    setHeading(0);
  }, [cameraRef]);

  return {
    handleCameraChanged,
    heading,
    resetHeading,
  };
}
