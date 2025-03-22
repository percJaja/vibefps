# Repository Structure

```
/
├── index.html                  # Version selector entry point
├── v0.1.4/                     # Latest version of the game
│   ├── index.html              # Game main HTML
│   ├── css/
│   │   └── style.css           # Game styles
│   ├── js/
│       ├── Game.js             # Core game logic and loop
│       ├── EventSystem.js      # Communication between modules
│       ├── Graphics.js         # Three.js rendering
│       ├── Physics.js          # Cannon.js physics
│       ├── InputManager.js     # User input handling
│       ├── TargetManager.js    # Target creation and scoring
│       ├── Environment.js      # Game world creation
│       ├── ParticleSystem.js   # Visual effects
│       ├── AudioManager.js     # Sound effects and music
│       ├── GameSettings.js     # User preferences
│       ├── Localization.js     # Multi-language support
│       └── GitHubTarget.js     # Special GitHub target feature
├── docs/
│   ├── feature-checklist.md    # Feature implementation tracking
│   ├── step-by-step-refactoring.md  # Refactoring guide
│   └── system-architecture.md  # System architecture documentation
└── [older versions...]         # Previous game versions
```

## Key Module Relationships

```
Game.js (Central Coordinator)
 ├── EventSystem.js (Communication Bus)
 ├── Graphics.js (Rendering)
 ├── Physics.js (Game Physics)
 ├── InputManager.js (User Input)
 ├── TargetManager.js (Game Objects)
 ├── Environment.js (Game World)
 ├── ParticleSystem.js (Effects)
 ├── AudioManager.js (Sound)
 ├── GameSettings.js (Configuration)
 ├── Localization.js (Translation)
 └── GitHubTarget.js (Special Feature)
```
