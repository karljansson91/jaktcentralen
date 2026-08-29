import type { Dispatch, SetStateAction } from 'react';

export async function withLoadingState<T>(
  setLoading: Dispatch<SetStateAction<boolean>>,
  operation: () => Promise<T>
) {
  setLoading(true);
  try {
    return await operation();
  } finally {
    setLoading(false);
  }
}
