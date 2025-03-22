# Event System Implementation Guide

## Overview

The EventSystem is a publisher-subscriber (pub/sub) pattern implementation that enables loose coupling between game modules. This allows components to communicate without direct dependencies.

## Core Functionality

```javascript
// Basic usage pattern
// 1. Subscribe to events
EventSystem.on('eventName', callback, context);

// 2. Publish events
EventSystem.emit('eventName', data);

// 3. Unsubscribe from events
EventSystem.off('eventName', callback, context);
```

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

### Current Implementation Status

Currently, these modules have been updated to use the event system:

- Game.js - Listens for 'targetHit' events
- InputManager.js - Listens for 'gameStateChanged' events
- TargetManager.js - Emits 'targetHit' events

### Next Modules to Update

Priority order for updating remaining modules:

1. Graphics.js - For visual feedback events
2. AudioManager.js - For sound effect events
3. Physics.js - For collision events

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
```
