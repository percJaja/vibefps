# Module Interface Reference

This document defines the public interfaces for each module and how they should interact.

## EventSystem

```typescript
interface EventSystem {
  // Register an event listener
  on(eventName: string, callback: Function, context?: any): EventSystem;
  
  // Register a one-time event listener
  once(eventName: string, callback: Function, context?: any): EventSystem;
  
  // Remove event listener(s)
  off(eventName: string, callback?: Function, context?: any): EventSystem;
  
  // Trigger an event
  emit(eventName: string, ...args: any[]): EventSystem;
  
  // Remove all listeners for an event or all events
  clear(eventName?: string): EventSystem;
  
  // Get listener count for an event
  listenerCount(eventName: string): number;
  
  // Get all registered event names
  eventNames(): string[];
  
  // Log event debug information
  debug(): EventSystem;
}
```

## Game

```typescript
interface Game {
  // Properties
  gameStarted: boolean;
  score: number;
  ammo: number;
  maxAmmo: number;
  timeLeft: number;
  health: number;
  isSettingsOpen: boolean;
  
  // Methods
  init(): void;
  startGame(): void;
  gameOver(): void;
  shoot(): void;
  reload(): void;
  addScore(points: number): void;
  takeDamage(amount: number): void;
  showSettings(): void;
  closeSettings(): void;
  animate(): void;
}

// Events Emitted
// 'gameStateChanged' - { state: 'initialized' | 'playing' | 'gameOver' }

// Events Handled
// 'targetHit' - { totalPoints: number, hitTargets: Array, ... }
```

## TargetManager

```typescript
interface TargetManager {
  // Properties
  targets: Array<TargetObject>;
  comboCount: number;
  comboMultiplier: number;
  
  // Methods
  init(): void;
  createTargets(): void;
  createStandardTargets(count: number): void;
  createBonusTargets(count: number): void;
  createPenaltyTargets(count: number): void;
  update(): void;
  checkHit(raycaster: THREE.Raycaster): boolean;
  incrementCombo(): void;
  resetCombo(): void;
  updateComboUI(): void;
}

// Events Emitted
// 'targetHit' - { totalPoints: number, hitTargets: Array, ... }

// Events Handled
// None currently
```

## Graphics

```typescript
interface Graphics {
  // Properties
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;
  
  // Methods
  init(): void;
  setupLights(): void;
  onWindowResize(): void;
  createGunFlash(): void;
  showHitMarker(): void;
  showBonusEffect(): void;
  showPenaltyEffect(): void;
  showScoreText(points: number, position: THREE.Vector3): void;
}

// Events (Planned)
// Should handle: 'effectRequest' - { type: string, position: Vector3, ... }
```

## InputManager

```typescript
interface InputManager {
  // Properties
  keys: {
    moveForward: boolean;
    moveBackward: boolean;
    moveLeft: boolean;
    moveRight: boolean;
  };
  cameraPitch: number;
  cameraYaw: number;
  pointerLocked: boolean;
  isMobile: boolean;
  
  // Methods
  init(): void;
  checkMobile(): void;
  setupMobileControls(): void;
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;
  onMouseMove(event: MouseEvent): void;
  onClick(event: MouseEvent): void;
  updateCameraRotation(): void;
}

// Events Handled
// 'gameStateChanged' - { state: string }
```

## Standard Event Names

To ensure consistency across modules, use these standardized event names:

| Event Name | Data Format | Description |
|------------|-------------|-------------|
| `gameStateChanged` | `{ state: string }` | Game state transitions |
| `targetHit` | `{ totalPoints: number, hitTargets: Array, ... }` | Target hit information |
| `playerMoved` | `{ position: Vector3, velocity: Vector3 }` | Player movement |
| `ammoChanged` | `{ current: number, max: number }` | Ammo state change |
| `settingsUpdated` | `{ settings: Object }` | User settings changed |
| `healthChanged` | `{ current: number, max: number }` | Player health change |
| `effectRequest` | `{ type: string, position: Vector3, ... }` | Request for visual/audio effect |
