import { Stack } from "expo-router/stack";

import { useTheme } from "@/hooks/use-theme";

export default function HomeLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
