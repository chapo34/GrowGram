// src/app/navigation/navigationRef.ts

import { createNavigationContainerRef } from '@react-navigation/native';
import type { DockTarget } from '@shared/components/dock/config/dockConfig';

// 👉 bewusst schlank: any, damit keine Ref/never-Fehler mehr kommen
export const navigationRef: any = createNavigationContainerRef();

/**
 * Generic navigate – falls du irgendwo global navigieren willst.
 */
export function navigate(name: string, params?: any) {
  if (navigationRef?.isReady?.()) {
    // als any aufrufen → kein "[never, any]" mehr
    (navigationRef as any).navigate(name, params);
  }
}

/**
 * Spezielle Navigation für den GrowDock:
 * DockTarget = 'Home' | 'Explore' | 'PostCreate' | 'Chat' | 'Profile'
 * und entspricht direkt den Screen-Namen im MainStack.
 */
export function navigateByDockTarget(target: DockTarget) {
  if (!navigationRef?.isReady?.()) return;

  (navigationRef as any).navigate(target);
}

/**
 * Stub, damit AppShell import sauber ist.
 * Wenn du später den aktuellen Route-Namen im MenuContext brauchst,
 * können wir hier Listener/State einbauen.
 */
export function notifyCurrentRouteChanged(_routeName?: string) {
  // aktuell: bewusst leer
}