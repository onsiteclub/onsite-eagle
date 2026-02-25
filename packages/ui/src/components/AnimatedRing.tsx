/**
 * AnimatedRing - Spinning ring indicator for timer
 *
 * States (Enterprise Theme v3):
 * - idle: Neutral gray (#98A2B3), no animation
 * - active: Green (#0F766E), smooth spinning
 * - paused: Amber (#C58B1B), slower spinning
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

type RingState = 'idle' | 'active' | 'paused';

interface AnimatedRingProps {
  state: RingState;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

const COLORS = {
  idle: '#98A2B3',
  active: '#0F766E',
  paused: '#C58B1B',
};

const SPEEDS = {
  idle: 0,
  active: 2000,
  paused: 4000,
};

const TRACK_COLOR = '#E3E7EE';

export function AnimatedRing({
  state,
  size = 200,
  strokeWidth = 8,
  children,
}: AnimatedRingProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    if (state === 'idle') {
      rotateAnim.setValue(0);
      return;
    }

    const duration = SPEEDS[state];

    const spin = () => {
      rotateAnim.setValue(0);
      animationRef.current = Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      });

      animationRef.current.start(({ finished }) => {
        if (finished) spin();
      });
    };

    spin();

    return () => {
      if (animationRef.current) animationRef.current.stop();
    };
  }, [state, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const color = COLORS[state];
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        pointerEvents="none"
        style={[styles.backgroundRing, {
          width: size, height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: TRACK_COLOR,
        }]}
      />
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: rotation }] }}
      >
        <View style={{
          width: size, height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          opacity: 0.5,
        }} />
      </Animated.View>
      <View style={[styles.content, { width: innerSize, height: innerSize }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  backgroundRing: { position: 'absolute' },
  content: { justifyContent: 'center', alignItems: 'center' },
});
