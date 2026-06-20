import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

const links = [
  {
    title: "FC Men Link in Bio",
    subtitle: "Registration, Facebook, and Instagram links",
    href: "/link-in-bio"
  },
  {
    title: "Contactbook FC Men",
    subtitle: "Starter contact lists and next actions",
    href: "/contactbook"
  },
  {
    title: "Conversations FC Men",
    subtitle: "Follow-up flows and message status",
    href: "/conversations"
  }
];

export default function Index() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        padding: 20,
        paddingBottom: 40
      }}
    >
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: "#6b6258",
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 0.8,
            textTransform: "uppercase"
          }}
        >
          contacts.church
        </Text>
        <Text selectable style={{ color: "#171717", fontSize: 44, fontWeight: "800" }}>
          FC Men
        </Text>
        <Text selectable style={{ color: "#625d55", fontSize: 17, lineHeight: 25 }}>
          Mobile starter for the FC Men contact and conversation workspace.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {links.map((item) => (
          <Link href={item.href} asChild key={item.href}>
            <Pressable
              style={({ pressed }) => ({
                borderColor: "rgba(25, 21, 15, 0.12)",
                borderCurve: "continuous",
                borderRadius: 14,
                borderWidth: 1,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
                backgroundColor: pressed ? "#eee7d8" : "#fffaf0",
                gap: 5,
                padding: 18
              })}
            >
              <Text selectable style={{ color: "#171717", fontSize: 17, fontWeight: "700" }}>
                {item.title}
              </Text>
              <Text selectable style={{ color: "#625d55", fontSize: 14, lineHeight: 20 }}>
                {item.subtitle}
              </Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
