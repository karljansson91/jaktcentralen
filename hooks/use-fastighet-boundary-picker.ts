import {
  FASTIGHETS_FILL_LAYER_ID,
  findFastighetFeature,
  getFastighetGeometry,
  getMapPressLngLat,
  getPolygonApplyPoints,
  readSelectedFastighet,
  type FastighetGeometry,
  type SelectedFastighet,
} from '@/lib/fastighetsindelning';
import type { LngLat } from '@/lib/geo';
import type { MapView } from '@rnmapbox/maps';
import { useReducer, useRef, type RefObject } from 'react';

type BoundaryPickerState = {
  active: boolean;
  error: string | null;
  geometry: FastighetGeometry | null;
  loading: boolean;
  selection: SelectedFastighet | null;
};

type BoundaryPickerAction =
  | { type: 'activate' }
  | { type: 'deactivate' }
  | { type: 'selection-start' }
  | {
      type: 'selection-success';
      geometry: FastighetGeometry;
      selection: SelectedFastighet;
    }
  | { type: 'selection-error'; message: string };

type UseFastighetBoundaryPickerOptions = {
  mapRef: RefObject<MapView | null>;
  onApply: (points: LngLat[]) => void;
};

const INACTIVE_STATE: BoundaryPickerState = {
  active: false,
  error: null,
  geometry: null,
  loading: false,
  selection: null,
};

function boundaryPickerReducer(
  state: BoundaryPickerState,
  action: BoundaryPickerAction
): BoundaryPickerState {
  switch (action.type) {
    case 'activate':
      return { ...INACTIVE_STATE, active: true };
    case 'deactivate':
      return INACTIVE_STATE;
    case 'selection-start':
      return { ...state, error: null, loading: true };
    case 'selection-success':
      return {
        ...state,
        error: null,
        geometry: action.geometry,
        loading: false,
        selection: action.selection,
      };
    case 'selection-error':
      return {
        ...state,
        error: action.message,
        geometry: null,
        loading: false,
        selection: null,
      };
  }
}

export function useFastighetBoundaryPicker({ mapRef, onApply }: UseFastighetBoundaryPickerOptions) {
  const [state, dispatch] = useReducer(boundaryPickerReducer, INACTIVE_STATE);
  const selectionRequestRef = useRef(0);
  const applyState = state.geometry
    ? getPolygonApplyPoints(state.geometry)
    : { limitation: null, points: null };

  const deactivate = () => {
    selectionRequestRef.current += 1;
    dispatch({ type: 'deactivate' });
  };

  const handleMapPress = async (feature: GeoJSON.Feature) => {
    if (!state.active) {
      return;
    }

    const map = mapRef.current;
    const coordinate = getMapPressLngLat(feature);
    if (!map || !coordinate) {
      dispatch({
        type: 'selection-error',
        message: 'Kunde inte läsa kartpositionen.',
      });
      return;
    }

    const requestId = selectionRequestRef.current + 1;
    selectionRequestRef.current = requestId;
    dispatch({ type: 'selection-start' });

    try {
      const screenPoint = await map.getPointInView(coordinate);
      if (requestId !== selectionRequestRef.current) {
        return;
      }
      const result = await map.queryRenderedFeaturesAtPoint(
        screenPoint,
        [],
        [FASTIGHETS_FILL_LAYER_ID]
      );
      if (requestId !== selectionRequestRef.current) {
        return;
      }
      const featureAtPoint = findFastighetFeature(result?.features ?? []);
      if (!featureAtPoint) {
        dispatch({
          type: 'selection-error',
          message: 'Ingen fastighetsgräns hittades här.',
        });
        return;
      }

      const geometry = getFastighetGeometry(featureAtPoint);
      if (!geometry) {
        dispatch({
          type: 'selection-error',
          message: 'Den valda kartträffen saknar polygongeometri.',
        });
        return;
      }

      dispatch({
        type: 'selection-success',
        geometry,
        selection: readSelectedFastighet(featureAtPoint),
      });
    } catch {
      if (requestId !== selectionRequestRef.current) {
        return;
      }
      dispatch({
        type: 'selection-error',
        message: 'Kunde inte läsa fastighetsgränsen från kartan.',
      });
    }
  };

  const apply = () => {
    if (!applyState.points) {
      dispatch({
        type: 'selection-error',
        message: applyState.limitation ?? 'Fastighetsgränsen kan inte användas.',
      });
      return;
    }

    onApply(applyState.points);
    deactivate();
  };

  return {
    activate: () => {
      selectionRequestRef.current += 1;
      dispatch({ type: 'activate' });
    },
    apply,
    canApply: Boolean(applyState.points),
    deactivate,
    errorText: state.error ?? applyState.limitation,
    geometry: state.geometry,
    handleMapPress,
    isActive: state.active,
    selection: state.selection,
    statusText: state.loading
      ? 'Hämtar gräns…'
      : state.selection
        ? 'Fastighetsgräns vald'
        : 'Ingen gräns vald',
  };
}
