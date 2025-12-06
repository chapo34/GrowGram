// shared/components/dock/components/DockBackground.tsx

import React from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';

import { DOCK_HEIGHT } from '../config/dockConfig';

const { width } = Dimensions.get('window');

type Props = {
  animValue: Animated.Value;
  bgColor: string;
};

const DockBackground: React.FC<Props> = ({ animValue, bgColor }) => {
  const fanPath = `
    M0,${DOCK_HEIGHT + 40}
    L0,${DOCK_HEIGHT - 40}
    Q${width / 2},-10 ${width},${DOCK_HEIGHT - 40}
    L${width},${DOCK_HEIGHT + 40}
    Z
  `;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: animValue }]}
      pointerEvents="none"
    >
      <Svg height="100%" width="100%">
        <Defs>
          <RadialGradient id="grad" cx="50%" cy="100%" rx="80%" ry="70%">
            <Stop offset="0"    stopColor="#020b06" stopOpacity={1} />
            <Stop offset="0.55" stopColor="#04130b" stopOpacity={1} />
            <Stop offset="1"    stopColor="#020b06" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Bodenplatte unter dem Dock */}
        <Path
          d={`
            M0,${DOCK_HEIGHT}
            L${width},${DOCK_HEIGHT}
            L${width},${DOCK_HEIGHT + 120}
            L0,${DOCK_HEIGHT + 120}
            Z
          `}
          fill={bgColor}
        />

        {/* Fan-Glow */}
        <Path d={fanPath} fill="url(#grad)" />
      </Svg>
    </Animated.View>
  );
};

export default DockBackground;