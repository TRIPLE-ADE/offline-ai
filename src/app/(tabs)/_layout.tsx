import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { hasCompletedOnboarding } from "@/onboarding/onboarding-state";

export default function TabsLayout() {
  const theme = useTheme();

  if (!hasCompletedOnboarding()) {
    return <Redirect href="/setup" />;
  }

  return (
    <NativeTabs
      backgroundColor={theme.surfaceElevated}
      backBehavior="history"
      disableTransparentOnScrollEdge
      iconColor={{
        default: theme.textSecondary,
        selected: theme.primary,
      }}
      indicatorColor={theme.surfaceSelected}
      labelVisibilityMode="labeled"
      labelStyle={{
        default: {
          color: theme.textSecondary,
          fontFamily: Fonts.medium,
          fontSize: 12,
        },
        selected: {
          color: theme.primary,
          fontFamily: Fonts.semibold,
          fontSize: 12,
        },
      }}
      rippleColor="transparent"
      minimizeBehavior="onScrollDown"
      shadowColor={theme.shadow}
      tabBarRespectsIMEInsets
      tintColor={theme.primary}
    >
      <NativeTabs.Trigger name="home" accessibilityLabel="Home">
        <NativeTabs.Trigger.Icon
          md={{ default: "home", selected: "home" }}
          sf={{ default: "house", selected: "house.fill" }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="study" accessibilityLabel="Study">
        <NativeTabs.Trigger.Icon
          md="school"
          sf={{ default: "book.pages", selected: "book.pages.fill" }}
        />
        <NativeTabs.Trigger.Label>Study</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" accessibilityLabel="Progress">
        <NativeTabs.Trigger.Icon
          md="monitoring"
          sf={{ default: "chart.bar", selected: "chart.bar.fill" }}
        />
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" accessibilityLabel="Settings">
        <NativeTabs.Trigger.Icon
          md={{ default: "settings", selected: "settings" }}
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
