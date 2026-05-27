import {
  getInPositionPromptIgnored,
  setInPositionPromptIgnored,
} from '@/lib/in-position-prompt-ignore';
import { IN_POSITION_PROMPT_DELAY_MS } from '@/lib/hunt-in-position';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

type PromptTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

type UseInPositionPromptsArgs = {
  isNearUnmarkedAssignment: boolean;
  isPastInPositionRadius: boolean;
  onClearInPosition: () => void;
  onMarkInPosition: () => void;
  promptIgnoreKey: string | null;
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
  promptIgnoreKey,
}: UseInPositionPromptsArgs) {
  const movedAwayPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedAwayPromptShownRef = useRef(false);
  const nearAssignmentPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearAssignmentPromptShownRef = useRef(false);
  const [promptIgnored, setPromptIgnored] = useState(false);

  const ignorePrompt = useCallback(() => {
    setPromptIgnored(true);
    void setInPositionPromptIgnored(promptIgnoreKey);
  }, [promptIgnoreKey]);

  useEffect(() => {
    let cancelled = false;
    setPromptIgnored(false);
    clearPromptTimer(movedAwayPromptTimerRef);
    clearPromptTimer(nearAssignmentPromptTimerRef);
    movedAwayPromptShownRef.current = false;
    nearAssignmentPromptShownRef.current = false;

    void getInPositionPromptIgnored(promptIgnoreKey).then((ignored) => {
      if (!cancelled) {
        setPromptIgnored(ignored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [promptIgnoreKey]);

  useEffect(() => {
    if (!isPastInPositionRadius || promptIgnored) {
      clearPromptTimer(movedAwayPromptTimerRef);
      if (!promptIgnored) {
        movedAwayPromptShownRef.current = false;
      }
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
          { text: 'Ignorera', style: 'cancel', onPress: ignorePrompt },
          {
            text: 'Ta bort från pass',
            style: 'destructive',
            onPress: onClearInPosition,
          },
        ]
      );
    }, IN_POSITION_PROMPT_DELAY_MS);
  }, [ignorePrompt, isPastInPositionRadius, onClearInPosition, promptIgnored]);

  useEffect(() => {
    if (!isNearUnmarkedAssignment || promptIgnored) {
      clearPromptTimer(nearAssignmentPromptTimerRef);
      if (!promptIgnored) {
        nearAssignmentPromptShownRef.current = false;
      }
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
          { text: 'Ignorera', style: 'cancel', onPress: ignorePrompt },
          {
            text: 'Markera på plats',
            onPress: onMarkInPosition,
          },
        ]
      );
    }, IN_POSITION_PROMPT_DELAY_MS);
  }, [ignorePrompt, isNearUnmarkedAssignment, onMarkInPosition, promptIgnored]);

  useEffect(
    () => () => {
      clearPromptTimer(movedAwayPromptTimerRef);
      clearPromptTimer(nearAssignmentPromptTimerRef);
    },
    []
  );
}
