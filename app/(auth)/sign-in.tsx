import { SignInForm } from '@/components/sign-in-form';
import React from 'react';
import { ScrollView, View } from 'react-native';

export default function SignInScreen() {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="bg-background"
      contentContainerClassName="mt-safe items-center justify-center p-4 py-8 sm:flex-1 sm:p-6 sm:py-4"
      keyboardDismissMode="interactive">
      <View className="w-full max-w-sm">
        <SignInForm />
      </View>
    </ScrollView>
  );
}
