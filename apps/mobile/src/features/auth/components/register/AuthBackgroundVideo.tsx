// apps/mobile/src/features/auth/components/register/AuthBackgroundVideo.tsx
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Video, ResizeMode } from "expo-av";

const AUTH_VIDEO = require("../../../../../assets/auth/video/growgram-login-loop.mp4");

const AuthBackgroundVideo: React.FC = () => {
  const videoRef = useRef<Video | null>(null);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Video
        ref={videoRef}
        source={AUTH_VIDEO}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.95)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export default AuthBackgroundVideo;