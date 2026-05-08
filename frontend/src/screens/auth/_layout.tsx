import React from 'react';
import {Stack} from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      initialRouteName="Onboarding"
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#FFFFFF'},
        gestureEnabled: false,
      }}
    />
  );
}
