import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import SvgOriginal, { Rect as RectOriginal, Text as SvgTextOriginal, G as GOriginal } from 'react-native-svg';
import type { House, HouseStatus } from '@onsite/shared';
import type { FC } from 'react';

// Type workaround for React 18/19 type mismatch with react-native-svg
const Svg = SvgOriginal as unknown as FC<any>;
const Rect = RectOriginal as unknown as FC<any>;
const SvgText = SvgTextOriginal as unknown as FC<any>;
const G = GOriginal as unknown as FC<any>;

interface SiteMapNativeProps {
  houses: House[];
  onHousePress: (house: House) => void;
}

// Status colors for dark theme
const STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: '#6B7280',
  in_progress: '#F59E0B',
  delayed: '#EF4444',
  completed: '#10B981',
  on_hold: '#8B5CF6',
};

export default function SiteMapNative({ houses, onHousePress }: SiteMapNativeProps) {
  const screenWidth = Dimensions.get('window').width - 32; // padding
  const lotSize = 80;
  const lotMargin = 8;
  const lotsPerRow = Math.floor(screenWidth / (lotSize + lotMargin));

  // Calculate grid positions for houses without coordinates
  const housesWithPositions = houses.map((house, index) => {
    if (house.coordinates && house.coordinates.x !== undefined) {
      return house;
    }
    // Auto-grid layout
    const row = Math.floor(index / lotsPerRow);
    const col = index % lotsPerRow;
    return {
      ...house,
      coordinates: {
        x: col * (lotSize + lotMargin) + lotMargin,
        y: row * (lotSize + lotMargin) + lotMargin,
        width: lotSize,
        height: lotSize,
      },
    };
  });

  const rows = Math.ceil(houses.length / lotsPerRow);
  const svgHeight = rows * (lotSize + lotMargin) + lotMargin * 2;
  const svgWidth = screenWidth;

  if (houses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Nenhum lote cadastrado</Text>
        <Text style={styles.emptySubtext}>Adicione lotes para ver o mapa</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {housesWithPositions.map((house) => {
          const baseCoords = house.coordinates || { x: 0, y: 0 };
          const coords = {
            x: baseCoords.x,
            y: baseCoords.y,
            width: baseCoords.width ?? lotSize,
            height: baseCoords.height ?? lotSize,
          };
          const color = STATUS_COLORS[house.status] || STATUS_COLORS.not_started;
          const centerX = coords.x + coords.width / 2;
          const centerY = coords.y + coords.height / 2;

          return (
            <G key={house.id} onPress={() => onHousePress(house)}>
              <Rect
                x={coords.x}
                y={coords.y}
                width={coords.width}
                height={coords.height}
                fill={color}
                rx={8}
                ry={8}
                stroke="#374151"
                strokeWidth={1}
              />
              <SvgText
                x={centerX}
                y={centerY}
                textAnchor="middle"
                alignmentBaseline="central"
                fill="#FFFFFF"
                fontSize={14}
                fontWeight="600"
              >
                {house.lot_number}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.completed }]} />
            <Text style={styles.legendText}>Completo</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.in_progress }]} />
            <Text style={styles.legendText}>Em Progresso</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.delayed }]} />
            <Text style={styles.legendText}>Atrasado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.on_hold }]} />
            <Text style={styles.legendText}>Pausado</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.not_started }]} />
            <Text style={styles.legendText}>Nao Iniciado</Text>
          </View>
        </View>
      </View>

      {/* Tap hint */}
      <Text style={styles.hint}>Toque em um lote para ver detalhes</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  legend: {
    marginTop: 20,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  hint: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 20,
  },
});
