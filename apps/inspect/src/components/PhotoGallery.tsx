/**
 * Photo gallery grid with AI validation status.
 */

import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useState } from 'react';

interface Photo {
  id: string;
  photo_url: string;
  thumbnail_url: string | null;
  phase_id: string | null;
  ai_validation_status: string | null;
  ai_validation_notes: string | null;
  created_at: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  screenWidth: number;
}

const AI_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  approved: { bg: '#DCFCE7', text: '#166534', label: 'Approved' },
  rejected: { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' },
  needs_review: { bg: '#E0E7FF', text: '#3730A3', label: 'Review' },
};

export default function PhotoGallery({ photos, screenWidth }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const numColumns = screenWidth >= 768 ? 4 : 3;
  const gap = 8;
  const padding = 0;
  const photoSize = (screenWidth - padding * 2 - gap * (numColumns - 1)) / numColumns;

  if (photos.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No photos yet. Take a photo to get started.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.grid}>
        {photos.map((photo) => {
          const aiStatus = AI_STATUS_COLORS[photo.ai_validation_status || 'pending'];

          return (
            <TouchableOpacity
              key={photo.id}
              style={[styles.photoContainer, { width: photoSize, height: photoSize }]}
              onPress={() => setSelectedPhoto(photo)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: photo.thumbnail_url || photo.photo_url }}
                style={styles.photo}
                resizeMode="cover"
              />
              {photo.ai_validation_status && (
                <View style={[styles.statusBadge, { backgroundColor: aiStatus.bg }]}>
                  <Text style={[styles.statusText, { color: aiStatus.text }]}>
                    {aiStatus.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fullscreen Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPhoto(null)}>
          <View style={styles.modalContent}>
            {selectedPhoto && (
              <>
                <Image
                  source={{ uri: selectedPhoto.photo_url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                {selectedPhoto.ai_validation_notes && (
                  <View style={styles.notesBar}>
                    <Text style={styles.notesText}>{selectedPhoto.ai_validation_notes}</Text>
                  </View>
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedPhoto(null)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
  },
  photoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '95%',
    height: '80%',
  },
  notesBar: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
