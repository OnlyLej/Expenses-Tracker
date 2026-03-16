import { useAnimatedColor } from '@/context/ThemeContext';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

type Props = {
  children:  React.ReactNode;
  routeName: string;
};

export default function ScreenWrapper({ children, routeName }: Props) {
  const animBg     = useAnimatedColor(t => t.bg);
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale      = useRef(new Animated.Value(0.97)).current;

  // Fires every time this tab comes into focus — works with animation: 'none'
  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(18);
      scale.setValue(0.97);

      const anim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 280, useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0, useNativeDriver: true, tension: 90, friction: 12,
        }),
        Animated.spring(scale, {
          toValue: 1, useNativeDriver: true, tension: 90, friction: 12,
        }),
      ]);
      anim.start();
      return () => anim.stop();
    }, [routeName])
  );

  return (
    <Animated.View style={[styles.container, { backgroundColor: animBg }]}>
      <Animated.View
        style={[
          styles.inner,
          { opacity, transform: [{ translateY }, { scale }] },
        ]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner:     { flex: 1 },
});