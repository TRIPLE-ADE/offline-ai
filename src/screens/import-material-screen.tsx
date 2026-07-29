import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
import { toast } from "@/utils/app-toast";

function formatSize(bytes: number | null) {
  if (bytes === null) return "Size unavailable";
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

type ImportMaterialContentProps = {
  onClose?: () => void;
  onImported: (materialId: string) => void;
  presentation?: "screen" | "sheet";
};

export function ImportMaterialContent({
  onClose,
  onImported,
  presentation = "screen",
}: ImportMaterialContentProps) {
  const db = useSQLiteContext();
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
      const message =
        caught instanceof Error
          ? caught.message
          : "This file could not be imported.";
      setError(message);
      toast.error("Could not open this file", { description: message });
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
      toast.success("Material imported", {
        description: "Your private copy is ready to prepare.",
      });
      onImported(material.id);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "The material could not be saved.";
      setError(message);
      toast.error("Material not saved", { description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        presentation === "sheet" && {
          backgroundColor: theme.surfaceElevated,
        },
      ]}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            presentation === "sheet" && styles.sheetContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {presentation === "sheet" ? (
            <View style={styles.sheetHeading}>
              <View style={styles.flex}>
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  PRIVATE IMPORT
                </ThemedText>
                <ThemedText type="title">
                  {draft ? "Confirm material" : "Import material"}
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Close import material"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    backgroundColor: pressed
                      ? theme.surfaceSelected
                      : theme.backgroundElement,
                  },
                ]}
              >
                <Ionicons name="close" color={theme.textPrimary} size={22} />
              </Pressable>
            </View>
          ) : null}
          {presentation === "screen" ? (
            <ScreenHeader
              eyebrow={draft ? "Confirm material" : "Private import"}
              title={
                draft ? "Is this the right file?" : "Import learning material"
              }
              subtitle={
                draft
                  ? "Check the details before LearnGuide prepares this material for offline study."
                  : "Choose a TXT file or a PDF with selectable text. The file never leaves this device."
              }
            />
          ) : (
            <ThemedText themeColor="textSecondary">
              {draft
                ? "Check the details before LearnGuide prepares this material for offline study."
                : "Choose a TXT file or selectable-text PDF. Your file stays on this device."}
            </ThemedText>
          )}

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
                  A private copy is stored inside LearnGuide. The original file is not
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

export default function ImportMaterialScreen() {
  const router = useRouter();

  return (
    <ImportMaterialContent
      onImported={(materialId) =>
        router.replace({
          pathname: "/material/[materialId]",
          params: { materialId },
        })
      }
    />
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
  sheetContent: {
    paddingTop: Spacing.three,
  },
  sheetHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 44,
    justifyContent: "center",
    width: 44,
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
