import { Linking, Pressable, ScrollView, Text, View } from "react-native";

const links = [
  {
    title: "Event Registration",
    subtitle: "subsplash.com",
    url: "https://subsplash.com/detroitmetrodistrict/lb/ev/+n7t52y4"
  },
  {
    title: "Facebook Event",
    subtitle: "facebook.com/events",
    url: "https://www.facebook.com/events/1343711197620110/?post_id=1343720624285834&acontext=%7B%22event_action_history%22%3A%5B%7B%22mechanism%22%3A%22footer_attachment%22%2C%22surface%22%3A%22newsfeed%22%7D%5D%2C%22ref_notif_type%22%3Anull%7D"
  },
  {
    title: "Share on Facebook",
    subtitle: "facebook.com/share",
    url: "https://www.facebook.com/share/1FKVYQz38t/?mibextid=wwXIfr"
  },
  {
    title: "Detroit Metro Men on Instagram",
    subtitle: "@detroitmetromen",
    url: "https://www.instagram.com/detroitmetromen"
  }
];

export default function LinkInBio() {
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
          Link in Bio
        </Text>
        <Text selectable style={{ color: "#625d55", fontSize: 17, lineHeight: 25 }}>
          Registration, event details, Facebook, and Instagram in one place.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {links.map((item) => (
          <Pressable
            key={item.url}
            onPress={() => Linking.openURL(item.url)}
            style={({ pressed }) => ({
              borderColor: "rgba(25, 21, 15, 0.12)",
              borderCurve: "continuous",
              borderRadius: 14,
              borderWidth: 1,
              backgroundColor: pressed ? "#eee7d8" : "#fffaf0",
              gap: 5,
              padding: 18
            })}
          >
            <Text selectable style={{ color: "#171717", fontSize: 17, fontWeight: "700" }}>
              {item.title}
            </Text>
            <Text selectable style={{ color: "#625d55", fontSize: 14 }}>
              {item.subtitle}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
