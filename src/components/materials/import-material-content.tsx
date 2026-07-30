import { Ionicons } from "@expo/vector-icons";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/foundation/primary-button";
import { StatePanel } from "@/components/foundation/state-panel";
import { ThemedText } from "@/components/themed-text";
import { Elevation, Radius, Spacing } from "@/constants/theme";
import { MaterialRepository } from "@/db/repositories/material-repository";
import { useTheme } from "@/hooks/use-theme";
import {
  commitStagedMaterial,
  discardStagedMaterial,
  importMaterial,
  type StagedMaterialImport,
} from "@/materials/import-material";
import { refreshLearningOverview } from "@/stores/learning-overview-store";
import { toast } from "@/utils/app-toast";

function formatSize(bytes: number | null) {
  if (bytes === null) return "Size unavailable";
  if (bytes < 1_048_576) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

type ImportMaterialContentProps = {
  onBusyChange?: (busy: boolean) => void;
  onImported: (materialId: string) => void;
};

export function ImportMaterialContent({
  onBusyChange,
  onImported,
}: ImportMaterialContentProps) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [draft, setDraft] = useState<StagedMaterialImport | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftRef = useRef<StagedMaterialImport | null>(null);
  const mountedRef = useRef(true);
  const choosingRef = useRef(false);
  const savingRef = useRef(false);

  useEffect(
    () => () => {
      mountedRef.current = false;
      discardStagedMaterial(draftRef.current);
      draftRef.current = null;
    },
    []
  );

  useEffect(() => {
    onBusyChange?.(choosing || saving);
  }, [choosing, onBusyChange, saving]);

  const replaceDraft = (next: StagedMaterialImport | null) => {
    const previous = draftRef.current;
    draftRef.current = next;
    setDraft(next);
    if (previous?.stagedUri !== next?.stagedUri) {
      discardStagedMaterial(previous);
    }
  };

  const choose = async () => {
    if (choosingRef.current || savingRef.current) {
      return;
    }
    choosingRef.current = true;
    setError(null);
    setChoosing(true);
    try {
      const selected = await importMaterial();
      if (!mountedRef.current) {
        discardStagedMaterial(selected);
        return;
      }
      if (selected) {
        replaceDraft(selected);
      }
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }
      const message =
        caught instanceof Error
          ? caught.message
          : "This file could not be imported.";
      setError(message);
      toast.error("Could not open this file", { description: message });
    } finally {
      choosingRef.current = false;
      if (mountedRef.current) {
        setChoosing(false);
      }
    }
  };

  const confirm = async () => {
    if (!draft || choosingRef.current || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const material = await commitStagedMaterial(
        new MaterialRepository(db),
        draft
      );
      draftRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      setDraft(null);
      await refreshLearningOverview();
      toast.success("Material imported", {
        description: "Your private copy is ready to prepare.",
      });
      onImported(material.id);
    } catch (caught) {
      draftRef.current = null;
      if (!mountedRef.current) {
        return;
      }
      setDraft(null);
      const message =
        caught instanceof Error
          ? caught.message
          : "The material could not be saved.";
      setError(message);
      toast.error("Material not saved", { description: message });
    } finally {
      savingRef.current = false;
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sheetHeading}>
        <View style={styles.flex}>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            {draft ? "CONFIRM FILE" : "IMPORT MATERIAL"}
          </ThemedText>
          <ThemedText type="title">
            {draft ? "Review file details" : "Choose a file to study"}
          </ThemedText>
        </View>
      </View>

      <ThemedText themeColor="textSecondary">
        {draft
          ? "Check the details before LearnGuide prepares this material for offline study."
          : "Choose a TXT file or selectable-text PDF. Your file stays on this device."}
      </ThemedText>

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
              borderColor: theme.border,
              borderTopColor: theme.secondary,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View
            style={[styles.fileIcon, { backgroundColor: theme.secondarySoft }]}
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
            style={[styles.privacyNote, { backgroundColor: theme.primarySoft }]}
          >
            <Ionicons
              name="lock-closed-outline"
              color={theme.primary}
              size={20}
            />
            <ThemedText type="small" style={styles.flex}>
              A private copy is stored inside LearnGuide. The original file is
              not changed.
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

      {draft ? (
        <View
          style={[
            styles.bottomActions,
            {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.four,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  sheetHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
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
  flex: { 
    flex: 1 
  },
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
