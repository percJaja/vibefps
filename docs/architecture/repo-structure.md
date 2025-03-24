# Repository Structure

```
/
├── index.html                  # Version selector entry point
├── assets/                     # Shared assets directory
│   └── audio/                  # Audio resources
│       └── bgm/                # Background music files
│           ├── gameplay.mp3
│           ├── intense.mp3
│           ├── menu.mp3
│           ├── gameover.mp3
│           └── victory.mp3
├── v0.2.1/                     # Latest version of the game
│   ├── index.html              # Game main HTML
│   ├── css/
│   │   └── style.css           # Game styles
│   └── js/
│       ├── Game.js             # Core game logic and loop
│       ├── EventSystem.js      # Communication between modules
│       ├── Graphics.js         # Three.js rendering
│       ├── Physics.js          # Cannon.js physics
│       ├── InputManager.js     # User input handling
│       ├── TargetManager.js    # Target creation and scoring
│       ├── Environment.js      # Game world creation
│       ├── ParticleSystem.js   # Visual effects
│       ├── AudioManager.js     # Sound effects
│       ├── BGMManager.js       # Background music management
│       ├── GameSettings.js     # User preferences
│       ├── Localization.js     # Multi-language support
│       ├── GitHubTarget.js     # Special GitHub target feature
│       ├── PortalSystem.js     # Portal creation and management
│       ├── SpatialAudioSystem.js # Audio system loader
│       └── audio/              # Modular audio components
│           └── SpatialAudio/
│               ├── SpatialAudioSystem.js   # Main spatial audio controller
│               ├── RoomAnalyzer.js         # Environment analysis
│               ├── ReverbCalculator.js     # Audio reflection calculations
│               ├── DirectionalAudio.js     # Directional sound effects
│               └── AudioDebugVisualizer.js # Debugging tools
├── docs/                       # Project documentation
│   ├── architecture/           # System design documents
│   │   ├── event-system-guide.md
│   │   ├── module-interfaces.md
│   │   └── repo-structure.md
│   ├── collaboration/          # Collaboration guidelines
│   │   └── ai-collaboration.md
│   ├── planning/               # Project planning
│   │   ├── development-strategy.md
│   │   ├── roadmap.md
│   │   ├── technical-debt.md
│   │   └── archive/            # Historical documents
│   ├── process/                # Development process
│   │   ├── code-integration-checklist.md
│   │   ├── code-request-template.md
│   │   └── feature-testability.md
│   ├── requirements/           # Project requirements
│   │   └── contest-rules.md
│   ├── images/                 # Documentation images
│   │   └── game-screenshot.png
│   ├── feature-checklist.md    # Feature implementation tracking
│   ├── step-by-step-refactoring.md # Refactoring guide
│   └── system-architecture.md  # System architecture documentation
└── [older versions...]         # Previous game versions (v0.0.1 through v0.2.0)
```

## Key Module Relationships

```
                            +---------------+
                            | EventSystem.js|
                            | (Message Bus) |
                            +---------------+
                                   |
                                   | (Events)
                 +------------------+-------------------+
                 |                  |                   |
    +------------v---------+ +------v------+    +-------v-------+
    |      Game.js         | |  Audio      |    |  Graphics     |
    | (Central Coordinator)| |  System     |    |  System       |
    +---------------------+| +-------------+    +---------------+
          |        |       | |                         |
          |        |       | | +--------------+        |
+---------v-+ +----v----+  | | |AudioManager.js|       |
|Physics.js | |InputMgr.js| | | +--------------+       |
+-----------+ +---------+  | | |                       |
      |            |       | | | +-----------+         |
+-----v------+     |       | | | |BGMManager |         |
|Environment | +---v------++ | | +-----------+         |
+------------+ |TargetMgr.js| | |                      |
      |        +------------+ | | +-----------------+  |
+-----v------+      |         | | |SpatialAudioSystem| |
|PortalSystem|      |         | | +-----------------+  |
+------------+      |         | | |                    |
                    |         | | | +-------------+    |
                    |         | | | |RoomAnalyzer |    |
                    |         | | | +-------------+    |
                    |         | | |                    |
                    |         | | | +----------------+ |
                    |         | | | |ReverbCalculator| |
                    |         | | | +----------------+ |
                    |         | | |                    |
                    |         | | | +----------------+ |
                    |         | | | |DirectionalAudio| |
                    |         | | | +----------------+ |
                    |         | | |                    |
                    |         | | | +-----------------+|
                    |         | | | |AudioDebugVisualiz|
                    |         | | | +-----------------+|
                    |         | | |                    |
                    |         | +-+                    |
                    |         |                        |
                    |     Rendering/Feedback           |
                    +--------->+---------------------+ |
                              |ParticleSystem.js     | |
                              +---------------------++ |
                                                     | |
                              +---------------------++ |
                              |GitHubTarget.js       | |
                              +---------------------++ |
                                                     | |
                    +---------------------------+    | |
                    |      Support Services     |    | |
                    |+-------------------------+|    | |
                    ||GameSettings.js          ||    | |
                    |+-------------------------+|    | |
                    |                           |    | |
                    |+-------------------------+|    | |
                    ||Localization.js          ||    | |
                    |+-------------------------+|    | |
                    +---------------------------+    | |
                                                     | |
                                                     v v
```

## Module Descriptions

### Core Modules
- **Game.js**: Central coordinator for the game loop, player state, and game state management.
- **EventSystem.js**: Provides a publish-subscribe (pub/sub) pattern for module communication.
- **Graphics.js**: Manages Three.js rendering, camera, and visual effects.
- **Physics.js**: Handles Cannon.js physics integration and collision detection.
- **InputManager.js**: Processes keyboard, mouse, and touch input.
- **TargetManager.js**: Manages creation, behavior, and scoring of game targets.

### Environment Modules
- **Environment.js**: Creates the game world including floor, walls, and obstacles.
- **ParticleSystem.js**: Generates visual particle effects for explosions and impacts.
- **PortalSystem.js**: Manages entry and exit portals for game transitions.

### Audio System
- **AudioManager.js**: Handles sound effects and procedural audio generation.
- **BGMManager.js**: Manages background music tracks and dynamic transitions.
- **SpatialAudioSystem.js**: Modular spatial audio system with enhanced realism:
  - **RoomAnalyzer.js**: Analyzes the player's environment for audio calculations.
  - **ReverbCalculator.js**: Computes realistic reverb effects based on room size.
  - **DirectionalAudio.js**: Creates direction-based audio perception.
  - **AudioDebugVisualizer.js**: Tools for debugging spatial audio.

### Support Modules
- **GameSettings.js**: Manages user preferences and game configurations.
- **Localization.js**: Provides multi-language support (English, Korean).
- **GitHubTarget.js**: Implements special target that links to the project repository.

## Version Evolution

The repository maintains all historical versions from v0.0.1 through the current v0.2.1, allowing players to experience the game's evolution. Each version builds upon the previous one, with significant features added in:

- v0.0.6: Target variety, combo system
- v0.0.8: Particle effects
- v0.0.9: GitHub special target
- v0.1.0: Localization system
- v0.1.2: Event system 
- v0.1.6: Spatial audio system
- v0.1.8: Background music manager
- v0.2.0: Modular audio system
- v0.2.1: Portal system
