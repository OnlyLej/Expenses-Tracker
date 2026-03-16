import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function LoadingScreen() {
  const pulse  = useRef(new Animated.Value(0.6)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      <View style={styles.glowRing}>
        <Animated.View style={[styles.iconWrap, { opacity: pulse, transform: [{ scale: pulse }] }]}>
          <MaterialIcons name="account-balance-wallet" size={48} color="#7c6bff" />
        </Animated.View>
      </View>
      <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
        <View style={styles.spinnerDot} />
      </Animated.View>
      <Text style={styles.title}>ExpenseTracker</Text>
      <Text style={styles.sub}>Loading your finances...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#080810', alignItems: 'center', justifyContent: 'center' },
  glowRing:   { width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: '#7c6bff44', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#7c6bff', shadowOpacity: 0.6, shadowRadius: 30, elevation: 20 },
  iconWrap:   { width: 90, height: 90, borderRadius: 45, backgroundColor: '#12121e', alignItems: 'center', justifyContent: 'center' },
  spinner:    { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  spinnerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7c6bff', position: 'absolute', top: 0, left: '50%' },
  title:      { color: '#f0eeff', fontSize: 26, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  sub:        { color: '#5a5878', fontSize: 14 },
});