import { ScrollView, Text, View } from "react-native";

const conversations = [
  ["Event reminder sequence", "Registered attendees", "Draft"],
  ["First-time guest check-in", "New FC Men contacts", "Due today"],
  ["Volunteer thank-you", "Serve team", "Ready"]
];

export default function Conversations() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 18, padding: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: "#6b6258", fontSize: 13, fontWeight: "700" }}>
          FC Men
        </Text>
        <Text selectable style={{ color: "#171717", fontSize: 38, fontWeight: "800" }}>
          Conversations
        </Text>
        <Text selectable style={{ color: "#625d55", fontSize: 17, lineHeight: 25 }}>
          Follow-up flows for event reminders, guests, and volunteer care.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {conversations.map(([title, audience, status]) => (
          <View
            key={title}
            style={{
              borderColor: "rgba(25, 21, 15, 0.12)",
              borderCurve: "continuous",
              borderRadius: 14,
              borderWidth: 1,
              backgroundColor: "#fffaf0",
              gap: 6,
              padding: 18
            }}
          >
            <Text selectable style={{ color: "#171717", fontSize: 17, fontWeight: "700" }}>
              {title}
            </Text>
            <Text selectable style={{ color: "#625d55", fontSize: 14 }}>
              {audience}
            </Text>
            <Text selectable style={{ color: "#1d5f58", fontSize: 13, fontWeight: "700" }}>
              {status}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
