import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.color.bg.base }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.color.bg.base },
            headerTitleStyle: { fontWeight: '600', color: theme.color.text.primary },
            headerTintColor: theme.color.text.primary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.color.bg.base },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'ClosetOS' }} />
          <Stack.Screen name="library/add" options={{ title: 'Add item', presentation: 'modal' }} />
          <Stack.Screen name="library/[id]" options={{ title: 'Item' }} />
          <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
