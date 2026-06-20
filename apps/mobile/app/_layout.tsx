import { Stack } from "expo-router/stack";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "FC Men" }} />
      <Stack.Screen name="link-in-bio" options={{ title: "Link in Bio" }} />
      <Stack.Screen name="contactbook" options={{ title: "Contactbook" }} />
      <Stack.Screen name="conversations" options={{ title: "Conversations" }} />
    </Stack>
  );
}
