# Feature Testability Guide

This guide helps ensure that new features can be effectively tested before integration.

## Adding Debug Controls

For every new feature, consider adding debug controls to facilitate testing:

```javascript
// Debug controls for console
window.DEBUG = window.DEBUG || {};
window.DEBUG.myFeature = {
  // Feature toggles
  enabled: true,
  
  // Configuration options
  config: {
    speed: 1.0,
    intensity: 0.5
  },
  
  // Debug methods
  trigger: function() {
    // Manually trigger the feature
  },
  
  // Testing utilities
  log: function() {
    // Output current state
    console.table(this.config);
  }
};
```

## Event Monitoring

Add temporary code to monitor events related to your feature:

```javascript
// Add this during development and testing
function monitorEvents(eventNames) {
  eventNames.forEach(name => {
    EventSystem.on(name, (data) => {
      console.group(`Event: ${name}`);
      console.log('Time:', new Date().toISOString());
      console.log('Data:', data);
      console.groupEnd();
    });
  });
}

// Monitor specific events
monitorEvents(['targetHit', 'playerMoved', 'myNewFeatureEvent']);
```

## Performance Testing

For performance-sensitive features:

```javascript
// Performance testing helper
function benchmarkFeature(featureFunction, iterations = 100) {
  console.log(`Benchmarking: ${featureFunction.name}`);
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    featureFunction();
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log(`Total time: ${duration.toFixed(2)}ms`);
  console.log(`Average time per iteration: ${(duration / iterations).toFixed(2)}ms`);
}

// Usage
benchmarkFeature(() => {
  // Feature code to test
  myModule.expensiveOperation();
});
```

## Visual Debugging

For graphical features, add visual debugging helpers:

```javascript
// Visual debug helper
const VisualDebug = {
  drawPoint(position, color = 0xff0000, size = 0.2) {
    const geometry = new THREE.SphereGeometry(size);
    const material = new THREE.MeshBasicMaterial({ color });
    const point = new THREE.Mesh(geometry, material);
    point.position.copy(position);
    Graphics.scene.add(point);
    return point;
  },
  
  drawLine(start, end, color = 0x00ff00) {
    const material = new THREE.LineBasicMaterial({ color });
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, material);
    Graphics.scene.add(line);
    return line;
  },
  
  drawPath(points, color = 0x0000ff) {
    const material = new THREE.LineBasicMaterial({ color });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    Graphics.scene.add(line);
    return line;
  },
  
  clearAll() {
    // Remove all debug visuals
  }
};

// Usage
const debugObjects = [];
debugObjects.push(VisualDebug.drawPoint(target.position));
debugObjects.push(VisualDebug.drawPath(targetPath));

// Clear when done
setTimeout(() => {
  debugObjects.forEach(obj => Graphics.scene.remove(obj));
}, 5000);
```

## Testing Checklist

For each feature, test the following scenarios:

1. **Functionality Test**: Does the feature work as expected in the normal case?
2. **Edge Cases**: Does it handle extreme values or unexpected inputs?
3. **Mobile Compatibility**: Does it work properly on touch devices?
4. **Performance Impact**: Does it cause any noticeable performance issues?
5. **Event Integration**: Are events properly emitted and handled?
6. **Visual Correctness**: Does it look as expected in all conditions?
7. **Error Handling**: Does it gracefully handle errors?

## Automated Test Report

Generate a simple test report after manual testing:

```javascript
// Feature test report
const TestReport = {
  feature: "Moving Targets",
  version: "v0.1.5",
  tester: "Developer Name",
  date: new Date().toISOString(),
  tests: [
    { name: "Basic functionality", result: "PASS", notes: "Works as expected" },
    { name: "Mobile support", result: "PARTIAL", notes: "Laggy on older devices" },
    { name: "Event integration", result: "PASS", notes: "All events working" }
  ],
  issues: [
    { severity: "Medium", description: "Performance issues with > 10 targets", ticket: "#123" }
  ],
  generateReport() {
    console.group(`Test Report: ${this.feature} (${this.version})`);
    console.log(`Tester: ${this.tester}`);
    console.log(`Date: ${this.date}`);
    
    console.group("Test Results:");
    this.tests.forEach(test => {
      console.log(`${test.result}: ${test.name} - ${test.notes}`);
    });
    console.groupEnd();
    
    console.group("Issues:");
    this.issues.forEach(issue => {
      console.log(`[${issue.severity}] ${issue.description} (${issue.ticket})`);
    });
    console.groupEnd();
    
    console.groupEnd();
  }
};

// Generate the report
TestReport.generateReport();
```
