import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef } from 'react';

const INSTALLATION_ID_KEY = 'jaktcentralen.pushInstallationId';

type StoredPermissionStatus = 'granted' | 'denied' | 'undetermined';

type ExpoExtra = {
  eas?: {
    projectId?: string;
  };
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

function canUseRemotePushNotifications() {
  return process.env.EXPO_OS === 'ios' && Device.isDevice;
}

function getProjectId() {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

function createInstallationId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
      .toString(36)
      .slice(2)}`
  );
}

async function getExistingPushInstallationId() {
  return await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
}

async function getPushInstallationId() {
  const existing = await getExistingPushInstallationId();
  if (existing) {
    return existing;
  }

  const installationId = createInstallationId();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
  return installationId;
}

function toStoredPermissionStatus(
  status: Notifications.NotificationPermissionsStatus['status']
): StoredPermissionStatus {
  if (status === Notifications.PermissionStatus.GRANTED) {
    return 'granted';
  }
  if (status === Notifications.PermissionStatus.DENIED) {
    return 'denied';
  }
  return 'undetermined';
}

async function getNotificationPermissionStatus() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== Notifications.PermissionStatus.UNDETERMINED) {
    return current.status;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status;
}

function getNotificationHref(data: Record<string, unknown>): Href | null {
  if (data.kind === 'chat' && typeof data.eventId === 'string') {
    return `/event/${data.eventId}/chat` as Href;
  }

  if (data.kind === 'event_invite') {
    return '/profile' as Href;
  }

  return null;
}

export function useNotificationResponseRouting() {
  const handledNotificationIdRef = useRef<string | null>(null);

  const handleResponse = useCallback((response: Notifications.NotificationResponse) => {
    const notificationId = response.notification.request.identifier;
    if (handledNotificationIdRef.current === notificationId) {
      return;
    }

    const href = getNotificationHref(response.notification.request.content.data ?? {});
    if (!href) {
      return;
    }

    handledNotificationIdRef.current = notificationId;
    router.push(href);
  }, []);

  useEffect(() => {
    try {
      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse) {
        handleResponse(lastResponse);
      }
    } catch (error) {
      console.error('Failed to read last notification response:', error);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [handleResponse]);
}

export function usePushNotificationsRegistration(enabled: boolean) {
  const registerDevice = useMutation(api.notifications.registerDevice);
  const unregisterDevice = useMutation(api.notifications.unregisterDevice);
  const hasAttemptedRegistrationRef = useRef(false);

  const registerCurrentDevice = useCallback(async () => {
    if (!canUseRemotePushNotifications()) {
      return;
    }

    const installationId = await getPushInstallationId();
    const permissionStatus = await getNotificationPermissionStatus();
    const storedPermissionStatus = toStoredPermissionStatus(permissionStatus);

    if (storedPermissionStatus !== 'granted') {
      await registerDevice({
        installationId,
        permissionStatus: storedPermissionStatus,
        platform: 'ios',
      });
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.error('Missing EAS project id for Expo push token registration.');
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDevice({
      expoPushToken: token.data,
      installationId,
      permissionStatus: storedPermissionStatus,
      platform: 'ios',
    });
  }, [registerDevice]);

  const unregisterCurrentDevice = useCallback(async () => {
    if (!canUseRemotePushNotifications()) {
      return;
    }

    const installationId = await getExistingPushInstallationId();
    if (!installationId) {
      return;
    }

    await unregisterDevice({ installationId });
  }, [unregisterDevice]);

  useEffect(() => {
    if (!enabled) {
      hasAttemptedRegistrationRef.current = false;
      return;
    }
    if (hasAttemptedRegistrationRef.current) {
      return;
    }

    hasAttemptedRegistrationRef.current = true;
    registerCurrentDevice().catch((error) => {
      console.error('Failed to register push notifications:', error);
    });
  }, [enabled, registerCurrentDevice]);

  return { registerCurrentDevice, unregisterCurrentDevice };
}
