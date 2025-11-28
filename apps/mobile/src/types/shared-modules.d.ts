// types/shared-modules.d.ts
// Globale Deklarationen für Assets, JSON, Lottie etc. + require()

declare module '*.png' {
  const uri: string;
  export default uri;
}

declare module '*.jpg' {
  const uri: string;
  export default uri;
}

declare module '*.jpeg' {
  const uri: string;
  export default uri;
}

declare module '*.webp' {
  const uri: string;
  export default uri;
}

declare module '*.gif' {
  const uri: string;
  export default uri;
}

declare module '*.svg' {
  import type React from 'react';
  const content: React.FC<any>;
  export default content;
}

declare module '*.json' {
  const value: any;
  export default value;
}

// Medien (Videos / Audio)
declare module '*.mp4' {
  const uri: string;
  export default uri;
}

declare module '*.mov' {
  const uri: string;
  export default uri;
}

declare module '*.m4a' {
  const uri: string;
  export default uri;
}

declare module '*.mp3' {
  const uri: string;
  export default uri;
}

declare module '*.wav' {
  const uri: string;
  export default uri;
}

// Lottie (z.B. grow.json im Login)
declare module '*.lottie' {
  const src: any;
  export default src;
}

// Falls irgendwo noch plain require() genutzt wird (z.B. in ChatThreadScreen)
declare function require(path: string): any;