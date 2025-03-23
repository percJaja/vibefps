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
  isGameOver(): boolean;
  sendGameState(state: string): void;
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
  showPenetrationEffect(hitTargets: Array): void;
  showPenetrationBonus(targetCount: number, bonusPoints: number): void;
}

// Events Emitted
// 'targetHit' - { totalPoints: number, hitTargets: Array, comboCount: number, 
//                comboMultiplier: number, penetrationBonus: number }

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
  handleGameStateChange(data: { state: string }): void;
}

// Events Handled
// 'gameStateChanged' - { state: string }
```

## AudioManager

```typescript
interface AudioManager {
  // Properties
  context: AudioContext;
  sounds: Record<string, Function|HTMLAudioElement>;
  music: any;
  reverbCache: {
    position: THREE.Vector3|null;
    timestamp: number;
    reverbs: any;
    ttl: number;
  };
  
  // Methods
  init(): void;
  initProceduralSounds(): void;
  initBackgroundMusic(): void;
  
  // Sound generation methods
  createGunSoundGenerator(): Function;
  createImpactSoundGenerator(): Function;
  createReloadSoundGenerator(): Function;
  createJumpSoundGenerator(): Function;
  createEmptyGunSoundGenerator(): Function;
  createBonusHitSoundGenerator(): Function;
  createPenaltyHitSoundGenerator(): Function;
  
  // Utility methods
  createNoiseBuffer(duration?: number): AudioBuffer;
  createSimpleReverb(resonance?: number): ConvolverNode;
  
  // Playback methods
  play(name: string, options?: any): AudioBufferSourceNode|HTMLAudioElement|null;
  playMusic(): void;
  pauseMusic(): void;
  setVolume(type: 'music'|'sfx', volume: number): void;
  
  // Spatial audio methods
  getReverbQualitySettings(): { wallCount: number, maxDelay: number, ttl: number };
  createCachedReverb(position: THREE.Vector3): any;
  playSpatialGunshot(soundName: string, position: THREE.Vector3): void;
}

// Events (Planned)
// Should emit: 'audioEffectPlayed' - { type: string, position: Vector3 }
```

## SpatialAudioSystem

```typescript
interface SpatialAudioSystem {
  // Properties
  settings: {
    enabled: boolean;
    maxReflections: number;
    maxReflectionDistance: number;
    maxRaycastDistance: number;
    reflectionCoefficient: number;
    rayDirections: number;
    roomSizeFallback: string;
  };
  reverbPresets: Record<string, number[]>;
  cachedAnalysis: {
    position: THREE.Vector3;
    roomCharacteristics: any;
    lastUpdateTime: number;
  };
  
  // Methods
  init(): void;
  getReverbQualitySettings(): { wallCount: number, maxDelay: number, ttl: number };
  analyzeSpace(playerPosition: THREE.Vector3, forceUpdate?: boolean): any;
  performSpaceAnalysis(playerPosition: THREE.Vector3): any;
  castRayForReflection(origin: THREE.Vector3, direction: THREE.Vector3): number|null;
  getDefaultRoomCharacteristics(): any;
  
  // Debug methods
  showDebugInfo(systemName: string, data?: any): boolean;
  
  // Audio effect generation
  createGunSoundWithEnvironment(position: THREE.Vector3, options?: any): any;
  enhanceAudioManager(): void;
  restoreOriginalAudioManager(): void;
  
  // Advanced spatial audio methods
  createDirectionalReverb(soundName: string, position: THREE.Vector3): any;
  create3DReverb(soundName: string, position: THREE.Vector3): any;
  calculatePanning(playerDir: THREE.Vector3, wallDir: THREE.Vector3): number;
  createGunSoundWithReverb(soundName?: string, position?: THREE.Vector3, options?: any): any;
  
  // Visualization methods
  visualizeEnvironment(playerPosition: THREE.Vector3): void;
  visualizeRay(origin: THREE.Vector3, direction: THREE.Vector3, color: number): void;
  clearVisualization(): void;
}

// No explicit events, interfaces with AudioManager directly
```

## Physics

```typescript
interface Physics {
  // Properties
  world: CANNON.World;
  playerBody: CANNON.Body;
  
  // Methods
  init(): void;
  update(delta: number): void;
}

// Events (Planned)
// Should emit: 'collisionDetected' - { bodies: Array, contact: Object }
```

## Environment

```typescript
interface Environment {
  // Properties
  obstacles: Array<{mesh: THREE.Mesh, body: CANNON.Body}>;
  
  // Methods
  init(): void;
  createFloor(): void;
  createWalls(): void;
  addWallBody(position: CANNON.Vec3, halfExtents: CANNON.Vec3): void;
  createObstacles(count: number): void;
}
```

## ParticleSystem

```typescript
interface ParticleSystem {
  // Properties
  particles: Array<THREE.Mesh>;
  particleSystems: Array<any>;
  
  // Methods
  init(): void;
  createExplosion(position: THREE.Vector3, color: number, count?: number, size?: number, speed?: number): THREE.Group;
  createTargetExplosion(position: THREE.Vector3, targetType: string): THREE.Group;
  update(delta: number): void;
  cleanupParticleSystem(system: any, index: number): void;
}
```

## Localization

```typescript
interface Localization {
  // Properties
  currentLanguage: string;
  supportedLanguages: string[];
  strings: Record<string, Record<string, string>>;
  
  // Methods
  init(): void;
  getText(key: string): string;
  setLanguage(lang: string): boolean;
  updateAllTexts(): void;
  applyToElement(element: HTMLElement, key: string): void;
}
```

## GameSettings

```typescript
interface GameSettings {
  // Properties
  keyBindings: Record<string, string>;
  volumes: {
    music: number;
    sfx: number;
  };
  audio: {
    spatialReverb: boolean;
    reverbQuality: 'low' | 'medium' | 'high';
  };
  debug: boolean;
  
  // Methods
  saveSettings(): void;
  loadSettings(): void;
  saveToLocalStorage(): void;
  loadFromLocalStorage(): void;
  initAudioTestUI(): void;
  addAudioTestUI(): void;
  testDirectionalAudio(): void;
  test3DAudio(): void;
  testLegacyAudio(): void;
  showErrorMessage(message: string): void;
  getPlayerPosition(): THREE.Vector3;
}
```

## Standard Event Names

To ensure consistency across modules, use these standardized event names:

| Event Name | Data Format | Description |
|------------|-------------|-------------|
| `gameStateChanged` | `{ state: string }` | Game state transitions |
| `targetHit` | `{ totalPoints: number, hitTargets: Array, comboCount: number, comboMultiplier: number, penetrationBonus: number }` | Target hit information |
| `playerMoved` | `{ position: Vector3, velocity: Vector3 }` | Player movement |
| `ammoChanged` | `{ current: number, max: number }` | Ammo state change |
| `settingsUpdated` | `{ settings: Object }` | User settings changed |
| `healthChanged` | `{ current: number, max: number }` | Player health change |
| `effectRequest` | `{ type: string, position: Vector3, ... }` | Request for visual/audio effect |
| `audioEffectPlayed` | `{ type: string, position: Vector3, options: Object }` | Audio effect played |
| `spatialAnalysisCompleted` | `{ position: Vector3, characteristics: Object }` | Spatial audio analysis results |
