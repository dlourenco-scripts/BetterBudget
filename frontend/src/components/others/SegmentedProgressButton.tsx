import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {Entypo} from '@expo/vector-icons';
import {colors} from '@/constants/colors';

interface SegmentedProgressButtonProps {
  totalSteps: number;
  currentIndex: number;
  onPress: () => void;
  size?: number;
  strokeWidth?: number;
  activeColor?: string;
  inactiveColor?: string;
  iconColor?: string;
}

export const SegmentedProgressButton: React.FC<
  SegmentedProgressButtonProps
> = ({
  totalSteps,
  currentIndex,
  onPress,
  size = 55,
  strokeWidth = 5,
  activeColor = '#F5D9A8',
  inactiveColor = '#3A2A1A',
  iconColor = colors.light.black,
}) => {
  const center = size / 2;
  const radius = size / 2 - strokeWidth / 2;
  const gap = 18; // gap in degrees
  const anglePerSegment = 360 / totalSteps;
  const segmentAngle = anglePerSegment - gap;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number,
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    r: number,
    startAngle: number,
    endAngle: number,
  ) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    const d = [
      'M',
      start.x,
      start.y,
      'A',
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(' ');
    return d;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Svg width={size} height={size}>
        {Array.from({length: totalSteps}).map((_, index) => {
          const startAngle = index * anglePerSegment + gap / 2;
          const endAngle = startAngle + segmentAngle;
          const isCompleted = index <= currentIndex;
          const color = isCompleted ? inactiveColor : activeColor;

          return (
            <Path
              key={index}
              d={describeArc(center, center, radius, startAngle, endAngle)}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View
        style={{
          position: 'absolute',
          backgroundColor: '#F4A836',
          borderRadius: 100,
          padding: 6,
        }}>
        <Entypo name="chevron-right" size={27} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
};
