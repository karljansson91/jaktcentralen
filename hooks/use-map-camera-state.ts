import { getMapHeadingDelta } from '@/lib/map-heading';
import type { CameraStop, MapState } from '@rnmapbox/maps';
import { useCallback, useState, type RefObject } from 'react';

type HeadingCameraRef = {
  setCamera: (config: CameraStop) => void;
};

type MapScale = {
  latitude: number;
  zoom: number;
};

export function useMapCameraState<TCamera extends HeadingCameraRef>(
  cameraRef: RefObject<TCamera | null>
) {
  const [heading, setHeading] = useState(0);
  const [scale, setScale] = useState<MapScale | null>(null);

  const handleCameraChanged = useCallback((state: MapState) => {
    const nextHeading = state.properties.heading;
    if (Number.isFinite(nextHeading)) {
      setHeading((currentHeading) =>
        getMapHeadingDelta(currentHeading, nextHeading) < 0.5 ? currentHeading : nextHeading
      );
    }

    const latitude = state.properties.center[1];
    const zoom = state.properties.zoom;
    if (!Number.isFinite(latitude) || !Number.isFinite(zoom)) {
      return;
    }

    setScale((currentScale) => {
      if (
        currentScale &&
        Math.abs(currentScale.latitude - latitude) < 0.01 &&
        Math.abs(currentScale.zoom - zoom) < 0.05
      ) {
        return currentScale;
      }

      return { latitude, zoom };
    });
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
    scale,
  };
}
