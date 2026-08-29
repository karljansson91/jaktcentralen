import {
  getInPositionPromptIgnored,
  setInPositionPromptIgnored,
} from '@/lib/in-position-prompt-ignore';
import { IN_POSITION_PROMPT_DELAY_MS } from '@/lib/hunt-in-position';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

type PromptTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

type PromptIgnoreState = {
  ignored: boolean;
  key: string | null;
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
  const [promptIgnoreState, setPromptIgnoreState] = useState<PromptIgnoreState>({
    ignored: false,
    key: null,
  });
  const promptIgnored =
    promptIgnoreState.key === promptIgnoreKey ? promptIgnoreState.ignored : false;

  useEffect(() => {
    let cancelled = false;
    clearPromptTimer(movedAwayPromptTimerRef);
    clearPromptTimer(nearAssignmentPromptTimerRef);
    movedAwayPromptShownRef.current = false;
    nearAssignmentPromptShownRef.current = false;

    void getInPositionPromptIgnored(promptIgnoreKey).then((ignored) => {
      if (!cancelled) {
        setPromptIgnoreState({ ignored, key: promptIgnoreKey });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [promptIgnoreKey]);

  useEffect(() => {
    function ignorePrompt() {
      setPromptIgnoreState({ ignored: true, key: promptIgnoreKey });
      void setInPositionPromptIgnored(promptIgnoreKey);
    }

    if (!isPastInPositionRadius || promptIgnored) {
      clearPromptTimer(movedAwayPromptTimerRef);
      if (!promptIgnored) {
        movedAwayPromptShownRef.current = false;
      }
    } else if (!movedAwayPromptShownRef.current && !movedAwayPromptTimerRef.current) {
      movedAwayPromptTimerRef.current = setTimeout(() => {
        movedAwayPromptTimerRef.current = null;
        movedAwayPromptShownRef.current = true;
        Alert.alert('Du verkar ha lämnat passet', 'Vill du ta bort din på plats-status?', [
          { text: 'Ignorera', style: 'cancel', onPress: ignorePrompt },
          {
            text: 'Ta bort från pass',
            style: 'destructive',
            onPress: onClearInPosition,
          },
        ]);
      }, IN_POSITION_PROMPT_DELAY_MS);
    }

    return () => {
      clearPromptTimer(movedAwayPromptTimerRef);
    };
  }, [isPastInPositionRadius, onClearInPosition, promptIgnoreKey, promptIgnored]);

  useEffect(() => {
    function ignorePrompt() {
      setPromptIgnoreState({ ignored: true, key: promptIgnoreKey });
      void setInPositionPromptIgnored(promptIgnoreKey);
    }

    if (!isNearUnmarkedAssignment || promptIgnored) {
      clearPromptTimer(nearAssignmentPromptTimerRef);
      if (!promptIgnored) {
        nearAssignmentPromptShownRef.current = false;
      }
    } else if (!nearAssignmentPromptShownRef.current && !nearAssignmentPromptTimerRef.current) {
      nearAssignmentPromptTimerRef.current = setTimeout(() => {
        nearAssignmentPromptTimerRef.current = null;
        nearAssignmentPromptShownRef.current = true;
        Alert.alert('Du är vid ditt pass', 'Vill du markera dig som på plats?', [
          { text: 'Ignorera', style: 'cancel', onPress: ignorePrompt },
          {
            text: 'Markera på plats',
            onPress: onMarkInPosition,
          },
        ]);
      }, IN_POSITION_PROMPT_DELAY_MS);
    }

    return () => {
      clearPromptTimer(nearAssignmentPromptTimerRef);
    };
  }, [isNearUnmarkedAssignment, onMarkInPosition, promptIgnoreKey, promptIgnored]);

  useEffect(
    () => () => {
      clearPromptTimer(movedAwayPromptTimerRef);
      clearPromptTimer(nearAssignmentPromptTimerRef);
    },
    []
  );
}
