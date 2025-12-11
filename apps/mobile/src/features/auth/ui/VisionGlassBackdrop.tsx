import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Group,
  RoundedRect,
  Circle,
  LinearGradient,
  RadialGradient,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';

/**
 * VisionGlassBackdrop
 *
 * Repliziert die Apple-Referenz:
 * - großes rounded square in der Mitte
 * - drei überlappende Linsen
 * - harte weiße Kante + softer Shadow
 */
const VisionGlassBackdrop: React.FC = () => {
  const { width, height } = useWindowDimensions();

  // Basis-Größe an Screen anpassen
  const baseSize = Math.min(width * 0.72, 320);
  const centerX = width / 2;
  const centerY = height / 2;

  const mainRectX = centerX - baseSize / 2;
  const mainRectY = centerY - baseSize / 2.1;
  const mainRadius = baseSize * 0.27;

  const lensRadius = baseSize * 0.26;

  // linke Linse
  const leftCircleX = mainRectX - lensRadius * 0.2;
  const leftCircleY = mainRectY + baseSize * 0.45;

  // obere rechte Linse
  const topRightCircleX = mainRectX + baseSize * 0.98;
  const topRightCircleY = mainRectY + baseSize * 0.12;

  // untere rechte „Capsule“-Linse (ellipse-ish)
  const bottomCapsuleWidth = baseSize * 0.85;
  const bottomCapsuleHeight = baseSize * 0.48;
  const bottomCapsuleX = mainRectX + baseSize * 0.45;
  const bottomCapsuleY = mainRectY + baseSize * 0.78;
  const bottomCapsuleRadius = bottomCapsuleHeight * 0.5;

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {/* Sehr softer globaler Shadow unter allem */}
      <Group>
        <RoundedRect
          x={mainRectX}
          y={mainRectY}
          width={baseSize}
          height={baseSize}
          r={mainRadius}
          color="rgba(255,255,255,0.0)"
        >
          <BlurMask blur={34} style="normal" />
        </RoundedRect>
      </Group>

      {/* Haupt-Quadrat */}
      <Group>
        {/* Füllung */}
        <RoundedRect
          x={mainRectX}
          y={mainRectY}
          width={baseSize}
          height={baseSize}
          r={mainRadius}
        >
          <LinearGradient
            start={vec(mainRectX, mainRectY)}
            end={vec(mainRectX + baseSize, mainRectY + baseSize)}
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)']}
          />
        </RoundedRect>

        {/* Harte Kante (Diamond Edge) */}
        <RoundedRect
          x={mainRectX}
          y={mainRectY}
          width={baseSize}
          height={baseSize}
          r={mainRadius}
          style="stroke"
          strokeWidth={1}
        >
          <LinearGradient
            start={vec(mainRectX, mainRectY)}
            end={vec(mainRectX + baseSize, mainRectY + baseSize)}
            colors={[
              'rgba(255,255,255,0.9)', // oben/links fast weiß
              'rgba(255,255,255,0.0)', // unten/rechts unsichtbar
            ]}
          />
        </RoundedRect>
      </Group>

      {/* Linke runde Linse */}
      <Group>
        <Circle
          cx={leftCircleX}
          cy={leftCircleY}
          r={lensRadius}
        >
          <LinearGradient
            start={vec(leftCircleX - lensRadius, leftCircleY - lensRadius)}
            end={vec(leftCircleX + lensRadius, leftCircleY + lensRadius)}
            colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.03)']}
          />
        </Circle>

        {/* harte Kante */}
        <Circle
          cx={leftCircleX}
          cy={leftCircleY}
          r={lensRadius}
          style="stroke"
          strokeWidth={1}
        >
          <LinearGradient
            start={vec(leftCircleX - lensRadius, leftCircleY - lensRadius)}
            end={vec(leftCircleX + lensRadius, leftCircleY + lensRadius)}
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.0)']}
          />
        </Circle>
      </Group>

      {/* Obere rechte Linse */}
      <Group>
        <Circle
          cx={topRightCircleX}
          cy={topRightCircleY}
          r={lensRadius}
        >
          <LinearGradient
            start={vec(topRightCircleX - lensRadius, topRightCircleY - lensRadius)}
            end={vec(topRightCircleX + lensRadius, topRightCircleY + lensRadius)}
            colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.03)']}
          />
        </Circle>

        <Circle
          cx={topRightCircleX}
          cy={topRightCircleY}
          r={lensRadius}
          style="stroke"
          strokeWidth={1}
        >
          <LinearGradient
            start={vec(topRightCircleX - lensRadius, topRightCircleY - lensRadius)}
            end={vec(topRightCircleX + lensRadius, topRightCircleY + lensRadius)}
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.0)']}
          />
        </Circle>

        {/* kleiner innerer Highlight-Spot (Reflexion) */}
        <Circle
          cx={topRightCircleX - lensRadius * 0.25}
          cy={topRightCircleY - lensRadius * 0.15}
          r={lensRadius * 0.55}
        >
          <RadialGradient
            c={vec(
              topRightCircleX - lensRadius * 0.40,
              topRightCircleY - lensRadius * 0.35
            )}
            r={lensRadius * 0.9}
            colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.0)']}
          />
        </Circle>
      </Group>

      {/* Untere rechte Capsule-Linse */}
      <Group>
        <RoundedRect
          x={bottomCapsuleX}
          y={bottomCapsuleY}
          width={bottomCapsuleWidth}
          height={bottomCapsuleHeight}
          r={bottomCapsuleRadius}
        >
          <LinearGradient
            start={vec(bottomCapsuleX, bottomCapsuleY)}
            end={vec(
              bottomCapsuleX + bottomCapsuleWidth,
              bottomCapsuleY + bottomCapsuleHeight
            )}
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)']}
          />
        </RoundedRect>

        <RoundedRect
          x={bottomCapsuleX}
          y={bottomCapsuleY}
          width={bottomCapsuleWidth}
          height={bottomCapsuleHeight}
          r={bottomCapsuleRadius}
          style="stroke"
          strokeWidth={1}
        >
          <LinearGradient
            start={vec(bottomCapsuleX, bottomCapsuleY)}
            end={vec(
              bottomCapsuleX + bottomCapsuleWidth,
              bottomCapsuleY + bottomCapsuleHeight
            )}
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.0)']}
          />
        </RoundedRect>
      </Group>
    </Canvas>
  );
};

export default VisionGlassBackdrop;