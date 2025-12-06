declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import * as THREE from 'three';

  export class GLTFLoader extends THREE.Loader {
    loadAsync(
      url: string,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
    ): Promise<{
      scene: THREE.Group;
      animations: THREE.AnimationClip[];
      [key: string]: any;
    }>;
  }
}