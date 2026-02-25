/**
 * PlanDetail — Fullscreen viewer for a construction plan (PDF or image).
 *
 * For images: displays in a scrollable, zoomable view.
 * For PDFs: opens in system browser / WebView (Expo Linking).
 *
 * Back button returns to PlansViewer.
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@onsite/tokens';
import type { ConstructionPlan } from '@onsite/media';

interface Props {
  plan: ConstructionPlan;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function PlanDetail({ plan, onClose }: Props) {
  const [imageLoading, setImageLoading] = useState(true);
  const isImage = ['png', 'jpg', 'jpeg'].includes(plan.file_type);
  const isPdf = plan.file_type === 'pdf';

  const handleOpenExternal = useCallback(async () => {
    try {
      await Linking.openURL(plan.file_url);
    } catch {
      // Silently fail — URL might not be reachable
    }
  }, [plan.file_url]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{plan.name}</Text>
        <TouchableOpacity onPress={handleOpenExternal} style={styles.openBtn}>
          <Text style={styles.openText}>Open</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isImage ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.imageContainer}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
        >
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
          <Image
            source={{ uri: plan.file_url }}
            style={styles.image}
            resizeMode="contain"
            onLoadEnd={() => setImageLoading(false)}
          />
        </ScrollView>
      ) : isPdf ? (
        <View style={styles.pdfFallback}>
          <View style={styles.pdfIconBox}>
            <Text style={styles.pdfIcon}>PDF</Text>
          </View>
          <Text style={styles.pdfTitle}>{plan.name}</Text>
          <Text style={styles.pdfHint}>
            Tap "Open" to view this PDF in your browser.
          </Text>
          <TouchableOpacity style={styles.openExternalBtn} onPress={handleOpenExternal}>
            <Text style={styles.openExternalText}>Open PDF</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.pdfFallback}>
          <Text style={styles.pdfTitle}>{plan.name}</Text>
          <Text style={styles.pdfHint}>
            This file type ({plan.file_type.toUpperCase()}) cannot be previewed.
          </Text>
          <TouchableOpacity style={styles.openExternalBtn} onPress={handleOpenExternal}>
            <Text style={styles.openExternalText}>Open File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  openBtn: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  openText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  image: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_WIDTH - 16,
  },
  pdfFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pdfIconBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pdfIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  pdfHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  openExternalBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  openExternalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
