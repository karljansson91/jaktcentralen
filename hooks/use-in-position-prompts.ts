import { IN_POSITION_PROMPT_DELAY_MS } from '@/lib/hunt-in-position';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

type PromptTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

type UseInPositionPromptsArgs = {
  isNearUnmarkedAssignment: boolean;
  isPastInPositionRadius: boolean;
  onClearInPosition: () => void;
  onMarkInPosition: () => void;
};

function clearPromptTimer(timerRef: PromptTimerRef) {
  if (!timerRef.current) {
    return;
  }

  clearTimeout(timerRef.current);
  timerRef.current = null;
}

export function useInPositionPrompts({
  isNearUnmarkedAssignment,
  isPastInPositionRadius,
  onClearInPosition,
  onMarkInPosition,
}: UseInPositionPromptsArgs) {
  const movedAwayPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedAwayPromptShownRef = useRef(false);
  const nearAssignmentPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearAssignmentPromptShownRef = useRef(false);

  useEffect(() => {
    if (!isPastInPositionRadius) {
      clearPromptTimer(movedAwayPromptTimerRef);
      movedAwayPromptShownRef.current = false;
      return;
    }

    if (movedAwayPromptShownRef.current || movedAwayPromptTimerRef.current) {
      return;
    }

    movedAwayPromptTimerRef.current = setTimeout(() => {
      movedAwayPromptTimerRef.current = null;
      movedAwayPromptShownRef.current = true;
      Alert.alert(
        'Du verkar ha lämnat passet',
        'Vill du ta bort din på plats-status?',
        [
          { text: 'Behåll', style: 'cancel' },
          {
            text: 'Ta bort',
            style: 'destructive',
            onPress: onClearInPosition,
          },
        ]
      );
    }, IN_POSITION_PROMPT_DELAY_MS);
  }, [isPastInPositionRadius, onClearInPosition]);

  useEffect(() => {
    if (!isNearUnmarkedAssignment) {
      clearPromptTimer(nearAssignmentPromptTimerRef);
      nearAssignmentPromptShownRef.current = false;
      return;
    }

    if (nearAssignmentPromptShownRef.current || nearAssignmentPromptTimerRef.current) {
      return;
    }

    nearAssignmentPromptTimerRef.current = setTimeout(() => {
      nearAssignmentPromptTimerRef.current = null;
      nearAssignmentPromptShownRef.current = true;
      Alert.alert(
        'Du är vid ditt pass',
        'Vill du markera dig som på plats?',
        [
          { text: 'Inte nu', style: 'cancel' },
          {
            text: 'Markera',
            onPress: onMarkInPosition,
          },
        ]
      );
    }, IN_POSITION_PROMPT_DELAY_MS);
  }, [isNearUnmarkedAssignment, onMarkInPosition]);

  useEffect(
    () => () => {
      clearPromptTimer(movedAwayPromptTimerRef);
      clearPromptTimer(nearAssignmentPromptTimerRef);
    },
    []
  );
}
