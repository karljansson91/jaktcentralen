# Jaktcentralen

Minimal Expo + Clerk starter based on Clerk's current Expo quickstart, trimmed down so the app starts with authentication only.

## What's included

- Expo Router app structure
- Clerk wired at the root with `@clerk/expo` and `expo-secure-store`
- A custom email/password sign-in screen
- A protected signed-in placeholder screen with sign out

## Before you run it

1. In the Clerk Dashboard, enable the Native API for your application.
2. Copy `.env.example` to `.env`.
3. Add your publishable key:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Run the app

```bash
npm install
npm start
```

Then open it with Expo Go, iOS simulator, Android emulator, or web.

## Notes

- This starter intentionally only includes sign-in.
- Users need to already exist in Clerk, or you can add sign-up later.
- If you enable MFA or other advanced flows in Clerk, you will need to add those screens yourself.
