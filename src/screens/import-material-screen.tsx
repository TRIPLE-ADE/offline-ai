import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/foundation/primary-button";
import { ScreenHeader } from "@/components/foundation/screen-header";
import { StatePanel } from "@/components/foundation/state-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Elevation, Radius, Spacing } from "@/constants/theme";
import { MaterialRepository } from "@/db/repositories/material-repository";
import type { CreateMaterialInput } from "@/db/types";
import { useTheme } from "@/hooks/use-theme";
import { importMaterial } from "@/materials/import-material";

function formatSize(bytes: number | null) {
  if (bytes === null) return "Size unavailable";
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export default function ImportMaterialScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [draft, setDraft] = useState<CreateMaterialInput | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    setChoosing(true);
    try {
      const selected = await importMaterial();
      if (selected) setDraft(selected);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This file could not be imported.",
      );
    } finally {
      setChoosing(false);
    }
  };

  const confirm = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const material = await new MaterialRepository(db).create(draft);
      router.replace({
        pathname: "/material/[materialId]",
        params: { materialId: material.id },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The material could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["bottom", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            eyebrow={draft ? "Confirm material" : "Private import"}
            title={
              draft ? "Is this the right file?" : "Import learning material"
            }
            subtitle={
              draft
                ? "Check the details before Soma prepares this material for offline study."
                : "Choose a TXT file or a PDF with selectable text. The file never leaves this device."
            }
          />

          {!draft ? (
            <StatePanel
              actionLabel={choosing ? "Opening files…" : "Choose a file"}
              body="Supported: TXT and text-based PDF. Scanned or password-protected PDFs cannot be read in this version."
              icon="document-text-outline"
              onAction={() => void choose()}
              title="Select notes, a handout, or a course PDF"
            />
          ) : (
            <View
              style={[
                styles.fileCard,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                  borderTopColor: theme.secondary,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.fileIcon,
                  { backgroundColor: theme.secondarySoft },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  color={theme.secondary}
                  size={30}
                />
              </View>
              <View style={styles.flex}>
                <ThemedText type="heading" numberOfLines={3}>
                  {draft.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {draft.fileType.toUpperCase()} · {formatSize(draft.fileSize)}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.privacyNote,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  color={theme.primary}
                  size={20}
                />
                <ThemedText type="small" style={styles.flex}>
                  A private copy is stored inside Soma. The original file is not
                  changed.
                </ThemedText>
              </View>
            </View>
          )}

          {error ? (
            <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
              <Ionicons
                name="alert-circle-outline"
                color={theme.danger}
                size={22}
              />
              <View style={styles.flex}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Import needs attention
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {draft ? (
          <View
            style={[
              styles.bottomActions,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.divider,
              },
            ]}
          >
            <PrimaryButton
              label={saving ? "Saving material…" : "Import and continue"}
              leading={
                saving ? (
                  <ActivityIndicator color={theme.textOnPrimary} />
                ) : undefined
              }
              disabled={saving}
              onPress={() => void confirm()}
            />
            <PrimaryButton
              label="Choose a different file"
              disabled={saving || choosing}
              onPress={() => void choose()}
              variant="tertiary"
            />
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  fileCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderTopWidth: 4,
    gap: Spacing.three,
    padding: Spacing.four,
    ...Elevation.card,
  },
  fileIcon: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  flex: { flex: 1 },
  privacyNote: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  error: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    padding: Spacing.three,
  },
  bottomActions: {
    borderTopWidth: 1,
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
});
