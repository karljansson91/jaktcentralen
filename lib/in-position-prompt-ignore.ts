import * as SecureStore from 'expo-secure-store';

const IN_POSITION_PROMPT_IGNORE_PREFIX = 'in-position-prompt-ignore';

function getSecureStoreKeyPart(value: string) {
  return Array.from(value, (character) =>
    character.charCodeAt(0).toString(16).padStart(4, '0')
  ).join('');
}

export function getInPositionPromptIgnoreKey(eventId: string, targetKey: string) {
  return [
    IN_POSITION_PROMPT_IGNORE_PREFIX,
    getSecureStoreKeyPart(eventId),
    getSecureStoreKeyPart(targetKey),
  ].join('.');
}

export async function getInPositionPromptIgnored(ignoreKey: string | null) {
  if (!ignoreKey) {
    return false;
  }

  try {
    return (await SecureStore.getItemAsync(ignoreKey)) === '1';
  } catch {
    return false;
  }
}

export async function setInPositionPromptIgnored(ignoreKey: string | null) {
  if (!ignoreKey) {
    return;
  }

  try {
    await SecureStore.setItemAsync(ignoreKey, '1');
  } catch {
    // Prompt ignores are only a local convenience; failing open keeps the hunt usable.
  }
}

export async function clearInPositionPromptIgnored(ignoreKey: string | null) {
  if (!ignoreKey) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(ignoreKey);
  } catch {
    // Prompt ignores are only a local convenience; failing open keeps the hunt usable.
  }
}
