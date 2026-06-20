import { ScrollView, Text, View } from "react-native";

const contacts = [
  ["New guest follow-up", "First-time FC Men connection", "Today"],
  ["Table host list", "Event leaders and hosts", "Active"],
  ["Serve team", "Volunteers and setup crew", "Ready"]
];

export default function Contactbook() {
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
          Contactbook
        </Text>
        <Text selectable style={{ color: "#625d55", fontSize: 17, lineHeight: 25 }}>
          Starter lists for contacts, outreach, and next-step follow-up.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {contacts.map(([name, role, status]) => (
          <View
            key={name}
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
              {name}
            </Text>
            <Text selectable style={{ color: "#625d55", fontSize: 14 }}>
              {role}
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
