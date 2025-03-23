# Event System Implementation Guide

## Overview

The EventSystem is a publisher-subscriber (pub/sub) pattern implementation that enables loose coupling between game modules. This allows components to communicate without direct dependencies, making the codebase more maintainable and extensible.

## Core Functionality

```javascript
// Basic usage pattern
// 1. Subscribe to events
EventSystem.on('eventName', callback, context);

// 2. Publish events
EventSystem.emit('eventName', data);

// 3. Unsubscribe from events
EventSystem.off('eventName', callback, context);

// 4. One-time event subscription
EventSystem.once('eventName', callback, context);
```

## Key Events in the Game

| Event Name | Emitted By | Handled By | Purpose |
|------------|------------|------------|---------|
| `targetHit` | TargetManager | Game | Notify about target hits and scoring |
| `gameStateChanged` | Game | InputManager, UI components | Broadcast game state transitions |
| `playerMoved` | Game | SpatialAudioSystem | Track player movement for audio system |
| `audioEffectPlayed` | AudioManager | Various | Inform about audio events for synchronization |
| `effectRequest` | Various | Graphics | Request visual effects |

## Integration Examples

### Proper Implementation Pattern

When upgrading a module to use the event system:

1. **Replace direct references with event subscriptions**

   ```javascript
   // BEFORE: Direct reference
   const hit = TargetManager.checkHit(raycaster);
   Game.addScore(10);
   
   // AFTER: Event-based communication
   EventSystem.emit('projectileFired', { raycaster });
   // TargetManager subscribes to 'projectileFired' events
   // TargetManager emits 'targetHit' events when hits occur
   ```

2. **Initialize subscriptions in module's init function**

   ```javascript
   const MyModule = {
     init() {
       // Subscribe to relevant events
       EventSystem.on('gameStateChanged', this.handleGameStateChange.bind(this));
       EventSystem.on('settingsUpdated', this.applySettings.bind(this));
     },
     
     handleGameStateChange(data) {
       // Handle state change
     }
   };
   ```

### Score Handling Example

One of the core implementations now using the event system is the target hit scoring mechanism:

```javascript
// In TargetManager.js
checkHit(raycaster) {
  // ... target hit detection logic ...
  
  if (hitTargets.length > 0) {
    // Instead of directly calling Game.addScore()
    EventSystem.emit('targetHit', {
      totalPoints: totalPoints,
      hitTargets: hitTargets,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      penetrationBonus: penetrationBonus
    });
    
    return true;
  }
  
  return false;
}

// In Game.js
init() {
  // ... other initialization code ...
  
  // Subscribe to target hit events
  EventSystem.on('targetHit', (data) => {
    this.addScore(data.totalPoints);
    // Could also handle other aspects like achievements, special effects, etc.
  });
}
```

### Game State Management Example

Game state changes are now broadcast through events:

```javascript
// In Game.js when changing state
startGame() {
  this.gameStarted = true;
  
  // Notify all interested modules about the state change
  EventSystem.emit('gameStateChanged', { state: 'playing' });
  
  // ... other start game logic ...
}

gameOver() {
  this.gameStarted = false;
  
  // Notify all interested modules about the state change
  EventSystem.emit('gameStateChanged', { state: 'gameOver' });
  
  // ... other game over logic ...
}

// In InputManager.js or other modules that need to react to game state
init() {
  // ... other initialization code ...
  
  // Register for game state events
  EventSystem.on('gameStateChanged', this.handleGameStateChange.bind(this));
}

handleGameStateChange(data) {
  // React to game state changes
  switch (data.state) {
    case 'playing':
      // Enable controls, etc.
      break;
    case 'gameOver':
      // Disable controls, etc.
      break;
  }
}
```

### Audio System Integration Example

The audio system now uses events for coordinating spatial audio effects:

```javascript
// In Game.js
shoot() {
  // ... other shooting logic ...
  
  // Get player position
  const playerPosition = Physics.playerBody.position.clone();
  
  // Emit event for audio effect
  EventSystem.emit('shootEvent', {
    position: playerPosition,
    type: 'powerful'
  });
}

// In AudioManager.js
init() {
  // ... other initialization ...
  
  // Subscribe to shoot events
  EventSystem.on('shootEvent', (data) => {
    this.play('shoot', { 
      type: data.type,
      volume: 1.0
    });
    
    // If spatial audio system exists, use it
    if (typeof SpatialAudioSystem !== 'undefined') {
      SpatialAudioSystem.createGunSoundWithReverb('shoot', data.position);
    }
  });
}
```

### Current Implementation Status

The following modules have been updated to use the event system:

- **Game.js**
  - Emits `gameStateChanged` events during game state transitions
  - Listens for `targetHit` events to update score
  - Integrated with audio events for gunshots and effects

- **InputManager.js**
  - Listens for `gameStateChanged` events to manage controls appropriately
  - Updates button states based on game state events

- **TargetManager.js**
  - Emits `targetHit` events when targets are successfully hit
  - Provides detailed hit data through event payload

- **AudioManager.js**
  - Partially integrated with events for sound triggering
  - Works with SpatialAudioSystem for enhanced audio experiences
  - Listening for gameplay events to trigger appropriate sounds

- **SpatialAudioSystem.js**
  - Beginning integration with player movement events
  - Coordinating with AudioManager for spatial effects

- **UI Components**
  - React to various events to update display
  - Settings button visibility controlled by game state events

### Remaining Modules to Update

Priority order for completing event system integration:

1. **Graphics.js** - Fully implement `effectRequest` event handling
   - Allow other modules to request visual effects through events
   - Decouple visual feedback from game logic

2. **Physics.js** - Implement collision event emitting
   - Send collision events that other modules can react to
   - Replace direct references with event communication

## Common Pitfalls

1. **Circular Event Dependencies**
   - Problem: Module A emits event that triggers Module B, which emits an event that triggers Module A again
   - Solution: Implement state tracking to prevent infinite loops

2. **Missing Event Unsubscription**
   - Problem: Event listeners remain active even when no longer needed
   - Solution: Use EventSystem.off() when appropriate, especially for one-time listeners

3. **Overuse of Events**
   - Problem: Using events for every interaction creates unnecessary complexity
   - Solution: Only use events for cross-module communication, not for internal module logic

4. **Large Event Payloads**
   - Problem: Passing too much data in events can lead to performance issues
   - Solution: Keep event payloads focused and minimal, only including necessary data

## Testing Events

```javascript
// Debug utility to monitor events
function monitorEvent(eventName) {
  EventSystem.on(eventName, (data) => {
    console.log(`Event '${eventName}' fired with data:`, data);
  });
}

// Usage
monitorEvent('targetHit');
monitorEvent('gameStateChanged');
monitorEvent('shootEvent');
```

## Migration Roadmap

When migrating a module to use the event system:

1. **Identify direct dependencies** - Look for places where the module directly calls methods on other modules
2. **Replace with events** - Substitute direct calls with event emissions
3. **Update dependent modules** - Ensure they listen for the new events
4. **Test thoroughly** - Events introduce asynchronous behavior that can be harder to debug

## Best Practices

1. **Standard Event Names** - Follow naming conventions (e.g., past tense for completed actions)
2. **Document Events** - Maintain a registry of all events with their purpose and data format
3. **Context Binding** - Always use `.bind(this)` when needed to preserve context in event handlers
4. **Error Handling** - Wrap event handlers in try/catch to prevent one broken handler from affecting others

## Advanced Usage

### Conditional Events

For performance optimization, you can use conditional event emission:

```javascript
// Only emit if there are listeners
if (EventSystem.listenerCount('specialEvent') > 0) {
  // Prepare potentially expensive data
  const complexData = prepareComplexData();
  EventSystem.emit('specialEvent', complexData);
}
```

### Event Grouping

For related events, consider using namespaces:

```javascript
// Emitting grouped events
EventSystem.emit('audio:play', { sound: 'explosion' });
EventSystem.emit('audio:stop', { channel: 'music' });

// Listening for all audio events
EventSystem.on('audio:', (data) => {
  console.log('Audio event occurred:', data);
});
```

## Next Steps for Full Integration

As we approach the submission deadline, the following steps will complete our event system integration:

1. **Complete Graphics module integration** (Day 1)
   - Implement standardized effect request events
   - Decouple visual feedback from game logic

2. **Finalize Physics-Event integration** (Day 1-2)
   - Add collision event emissions
   - Replace remaining direct references

3. **Test complete event flow** (Day 2)
   - Verify all critical paths use event communication
   - Check for any missed direct dependencies

4. **Final performance optimization** (Day 2)
   - Analyze event usage patterns
   - Optimize frequent events to minimize overhead
