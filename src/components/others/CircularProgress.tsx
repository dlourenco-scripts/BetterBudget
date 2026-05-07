import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type CircularProgressProps = {
  size?: number;
  strokeWidth?: number;
  progress: number;
  children?: React.ReactNode;
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 150,
  strokeWidth = 12,
  progress,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {duration: 800});
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const dashOffset =
      circumference - (circumference * animatedProgress.value) / 100;
    return {strokeDashoffset: dashOffset};
  });

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Svg width={size} height={size}>
        {/* FULL BACKGROUND ARC (light orange) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F4AF45"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={-circumference * 0.25}
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* PROGRESS ARC (dark red) */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#7C1500"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Content */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {justifyContent: 'center', alignItems: 'center'},
        ]}>
        {children}
      </View>
    </View>
  );
};
