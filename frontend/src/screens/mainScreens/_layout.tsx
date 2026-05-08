import React from 'react';
import {Stack} from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      initialRouteName="SharingBudget"
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#FFFFFF'},
        gestureEnabled: false,
      }}
    />
  );
}
