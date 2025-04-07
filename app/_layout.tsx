import { Stack } from 'expo-router';
import { AppProvider } from './src/contexts/AppContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { useTheme } from './src/hooks/useTheme';
import { AuthProvider } from './src/contexts/AuthContext';

function RootLayoutNav() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="src/screens/SplashScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/LoginScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/RegisterScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/ForgotPasswordScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/HomeScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/NewTaskScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/TaskDetailScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/TaskListScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/ProfileScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="src/screens/SettingsScreen"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <RootLayoutNav />
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
} 