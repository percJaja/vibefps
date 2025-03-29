/**
 * @file BulletPhysics.js
 * @description Advanced bullet physics simulation system for 3D games.
 *
 * Handles realistic bullet trajectory, collisions, material interactions,
 * ricochets, penetration checks, and object destruction. Optimized for performance
 * using object pooling and prepared for integration with a full physics engine.
 *
 * @requires three
 */

import * as THREE from 'three';

/**
 * Placeholder/Interface definition for a Material Properties Manager.
 * !!! IMPORTANT: This needs to be implemented externally and provided
 *     during BulletPhysicsSystem.init() !!!
 * It should return material properties based on a name.
 */
const MaterialManager = {
    /**
     * @typedef {object} MaterialEffectData
     * @property {number} particleColor - Default hex color for particles.
     * @property {string} decal - Name/ID of the decal texture/type.
     * @property {string} sound - Name/ID of the hit sound effect.
     * @property {boolean} [sparks] - If true, generate spark particles.
     * @property {boolean} [splinters] - If true, generate splinter particles.
     * @property {boolean} [noDecal] - If true, don't generate a decal.
     * @property {boolean} [splash] - If true, generate a water splash effect.
     * @property {boolean} [shatter] - If true, generate a glass shatter effect.
     */

    /**
     * @typedef {object} MaterialProperties
     * @property {number} hardness - Resistance to penetration/ricochet (0-1). Higher is harder.
     * @property {number} density - Material density (used for penetration, potentially).
     * @property {number} friction - Surface friction (affects ricochet indirectly).
     * @property {MaterialEffectData} effects - Defines visual/audio effects on hit.
     * @property {number} [penetrationMultiplier=1.0] - Modifies ease of penetration (e.g., >1 for foliage).
     * @property {number} [dragMultiplier=1.0] - Modifies air/water drag when inside (e.g., >1 for water).
     * @property {boolean} [brittle=false] - If true, fractures/destroys more easily.
     * @property {string} [name='default'] - The name of the material.
     */

    /**
     * Gets properties for a given material name.
     * @param {string} [materialName='default'] - The name identifier of the material.
     * @returns {MaterialProperties} The properties of the material.
     */
    getMaterialProperties: (materialName = 'default') => {
        // console.warn("Using placeholder MaterialManager.getMaterialProperties. Implement and provide externally!");
        // Default implementation (replace with your actual manager)
        const properties = {
            default: { name: 'default', hardness: 0.5, density: 1.0, friction: 0.5, effects: { particleColor: 0xaaaaaa, decal: 'generic_hole', sound: 'hit_generic' } },
            concrete: { name: 'concrete', hardness: 0.8, density: 2.4, friction: 0.7, effects: { particleColor: 0x888888, decal: 'concrete_hole', sound: 'hit_concrete' } },
            metal: { name: 'metal', hardness: 0.9, density: 7.8, friction: 0.3, effects: { particleColor: 0xcccccc, sparks: true, decal: 'metal_hole', sound: 'hit_metal' } },
            wood: { name: 'wood', hardness: 0.4, density: 0.7, friction: 0.6, effects: { particleColor: 0x8B4513, splinters: true, decal: 'wood_hole', sound: 'hit_wood' } },
            foliage: { name: 'foliage', hardness: 0.1, density: 0.1, friction: 0.9, effects: { particleColor: 0x00cc00, noDecal: true, sound: 'hit_foliage'}, penetrationMultiplier: 1.5 },
            water: { name: 'water', hardness: 0.2, density: 1.0, friction: 0.9, effects: { particleColor: 0x0088ff, splash: true, noDecal: true, sound: 'hit_water'}, dragMultiplier: 5.0 },
            glass: { name: 'glass', hardness: 0.6, density: 2.5, friction: 0.1, effects: { particleColor: 0xeeeeff, shatter: true, decal: 'glass_shatter', sound: 'hit_glass'}, brittle: true },
        };
        return properties[materialName] || properties.default;
    },

    /**
     * Determines the material name from a THREE.js object.
     * Checks userData first, then material name.
     * @param {THREE.Object3D} object - The scene object that was hit.
     * @returns {string} The determined material name.
     */
    getMaterialNameFromObject: (object) => {
        if (!object) return 'default';
        // Prioritize userData for explicit type setting
        if (object.userData && object.userData.materialType) return object.userData.materialType;
        // Fallback to THREE.Material name property
        if (object.material && object.material.name && typeof object.material.name === 'string') {
            return object.material.name.toLowerCase();
        }
        // Add more sophisticated checks if needed (e.g., object name patterns)
        return 'default';
    }
};


/**
 * Represents a single simulated bullet. Reused via object pooling.
 */
class PooledBullet {
    constructor() {
        this.active = false;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.initialPosition = new THREE.Vector3();
        this.initialVelocityMagnitude = 0;
        this.traveledDistance = 0;
        this.creationTime = 0;
        this.lastPosition = new THREE.Vector3();
        this.mass = 0.01;
        this.dragCoefficient = 0.47;
        this.gravityFactor = 1.0;
        this.energy = 1.0;
        this.penetrationPower = 1.0;
        this.weaponType = 'standard';
        this.maxBounces = 0;
        this.bounceEnergyLossFactor = 0.4;
        this.maxDistance = 1000;
        this.destructionPower = 0.3;
        this.bulletCaliber = 7.62;
        this.bounceCount = 0;
        this.mesh = null;
        this.trail = null;
        this.trailVertices = [];
        this.isTracer = false;
        this._poolId = -1; // Internal ID for tracking within the pool
    }

    reset() {
        this.active = false;
        this.position.set(0, 0, 0);
        this.velocity.set(0, 0, 0);
        this.initialPosition.set(0, 0, 0);
        this.initialVelocityMagnitude = 0;
        this.traveledDistance = 0;
        this.creationTime = 0;
        this.lastPosition.set(0, 0, 0);
        this.mass = 0.01;
        this.dragCoefficient = 0.47;
        this.gravityFactor = 1.0;
        this.energy = 1.0;
        this.penetrationPower = 1.0;
        this.weaponType = 'standard';
        this.maxBounces = 0;
        this.bounceEnergyLossFactor = 0.4;
        this.maxDistance = 1000;
        this.destructionPower = 0.3;
        this.bulletCaliber = 7.62;
        this.bounceCount = 0;
        // Visuals are reset/released by BulletPhysicsSystem
        this.mesh = null;
        this.trail = null;
        this.trailVertices = [];
        this.isTracer = false;
        // Keep _poolId
        return this;
    }

    activate(id, origin, direction, weaponConfig) {
        this.reset();
        this._poolId = id;
        this.active = true;

        this.position.copy(origin);
        this.initialPosition.copy(origin);
        this.lastPosition.copy(origin);

        this.weaponType = weaponConfig.id || 'standard';
        this.initialVelocityMagnitude = weaponConfig.speed;
        this.velocity.copy(direction).normalize().multiplyScalar(this.initialVelocityMagnitude);

        this.maxBounces = weaponConfig.maxBounces;
        this.bounceEnergyLossFactor = weaponConfig.bounceEnergyLoss;
        this.maxDistance = weaponConfig.maxDistance;
        this.destructionPower = weaponConfig.destructionPower;
        this.penetrationPower = weaponConfig.penetrationPower;
        this.bulletCaliber = weaponConfig.caliber;
        this.mass = weaponConfig.mass;
        this.dragCoefficient = weaponConfig.dragCoefficient;
        this.gravityFactor = weaponConfig.gravityFactor ?? 1.0;
        this.isTracer = weaponConfig.isTracer ?? false;

        this.creationTime = performance.now();
        this.energy = 1.0;
        this.bounceCount = 0;
        this.traveledDistance = 0;

        return this;
    }
}

const BulletPhysicsSystem = {
    // --- Configuration ---
    settings: {
        enabled: true,
        gravity: new THREE.Vector3(0, -9.81, 0),
        maxSimultaneousBullets: 200,
        bulletPoolSize: 250,
        meshPoolSize: 250,
        trailPoolSize: 100,
        decalPoolSize: 150,
        renderTrails: true,
        trailMaxPoints: 30,
        trailMinVertexDistance: 0.1,
        trailFadeDuration: 1500,
        renderHitDecals: true,
        decalLifetime: 15000,
        decalSize: 0.1,
        obstacleDestructionThreshold: 1.0,
        obstacleImpactImpulseScale: 0.05,
        partialDestructionEnabled: true,
        debugMode: false,
    },

    // --- State ---
    activeBullets: [],
    damagedObstacles: new Map(), // Key: obstacle UUID, Value: { totalDamage, mesh, segments? }

    // --- Dependencies (Injected via init) ---
    dependencies: {
        scene: null,
        physicsWorld: null, // Interface: { removeBody(body), applyImpulse(body, impulseVec3, worldPosVec3) }
        audioManager: null,   // Interface: { play(soundName, { position?, volume?, surface? }) }
        particleSystem: null,// Interface: { createImpactParticles(config), createExplosion(config) }
        eventSystem: null,    // Interface: { on(eventName, handler), emit(eventName, data) }
        environmentProvider: null, // Interface: () => Array<THREE.Mesh>
        targetProvider: null,      // Interface: () => Array<THREE.Mesh>
        materialManager: MaterialManager, // Use the placeholder or provide a real one
    },

    // --- Object Pools ---
    _bulletPool: [],
    _meshPool: [],
    _trailPool: [],
    _decalPool: [],
    _availableBulletIds: new Set(),

    // --- Weapon Definitions (Load externally in production) ---
    weaponTypes: {
        standard: {
            id: 'standard', speed: 400, maxBounces: 1, bounceEnergyLoss: 0.5, maxDistance: 1000,
            destructionPower: 0.3, penetrationPower: 5.0, caliber: 7.62, mass: 0.01,
            dragCoefficient: 0.45, gravityFactor: 1.0, meshSize: 0.02, color: 0xffcc00,
            isTracer: false, fireSound: 'shoot_standard',
        },
        sniper: {
            id: 'sniper', speed: 900, maxBounces: 0, bounceEnergyLoss: 0.9, maxDistance: 2500,
            destructionPower: 0.6, penetrationPower: 15.0, caliber: 7.62, mass: 0.012,
            dragCoefficient: 0.3, gravityFactor: 1.0, meshSize: 0.025, color: 0xffffff,
            isTracer: true, fireSound: 'shoot_sniper',
        },
        pistol: {
            id: 'pistol', speed: 350, maxBounces: 2, bounceEnergyLoss: 0.4, maxDistance: 300,
            destructionPower: 0.15, penetrationPower: 3.0, caliber: 9.0, mass: 0.008,
            dragCoefficient: 0.5, gravityFactor: 1.0, meshSize: 0.015, color: 0x999999,
            isTracer: false, fireSound: 'shoot_pistol',
        },
        shotgun_pellet: {
            id: 'shotgun_pellet', speed: 380, maxBounces: 0, bounceEnergyLoss: 0.8, maxDistance: 50,
            destructionPower: 0.1, penetrationPower: 1.0, caliber: 8.4, mass: 0.003,
            dragCoefficient: 0.6, gravityFactor: 1.0, meshSize: 0.01, color: 0xaaaaaa,
            isTracer: false, fireSound: null, spreadAngle: 5.0
        },
        bouncy: {
            id: 'bouncy', speed: 300, maxBounces: 5, bounceEnergyLoss: 0.1, maxDistance: 500,
            destructionPower: 0.1, penetrationPower: 2.0, caliber: 10.0, mass: 0.015,
            dragCoefficient: 0.5, gravityFactor: 1.0, meshSize: 0.03, color: 0x00ccff,
            isTracer: true, fireSound: 'shoot_bouncy',
        }
    },

    /**
     * Initializes the Bullet Physics System.
     * @param {object} dependencies - Required external modules and functions.
     * @param {THREE.Scene} dependencies.scene - The main THREE.js scene.
     * @param {object} dependencies.materialManager - An object conforming to the MaterialManager interface.
     * @param {function} dependencies.environmentProvider - Function returning collidable environment meshes.
     * @param {function} dependencies.targetProvider - Function returning collidable target meshes.
     * @param {object} [dependencies.physicsWorld] - Optional physics engine world instance.
     * @param {object} [dependencies.audioManager] - Optional audio playback manager.
     * @param {object} [dependencies.particleSystem] - Optional particle effect system.
     * @param {object} [dependencies.eventSystem] - Optional event bus.
     */
    init(dependencies) {
        console.log("Initializing Advanced Bullet Physics System...");

        if (!dependencies || !dependencies.scene || !dependencies.materialManager || !dependencies.environmentProvider || !dependencies.targetProvider) {
            console.error("BulletPhysicsSystem: Missing critical dependencies (scene, materialManager, environmentProvider, targetProvider)! Disabling system.");
            this.settings.enabled = false;
            return;
        }

        // Store provided dependencies
        this.dependencies = { ...this.dependencies, ...dependencies };

        // Validate dependency interfaces (basic check)
        if (this.dependencies.audioManager && typeof this.dependencies.audioManager.play !== 'function') {
             console.warn("BulletPhysicsSystem: Provided audioManager lacks a 'play' method.");
        }
         if (this.dependencies.particleSystem && (typeof this.dependencies.particleSystem.createImpactParticles !== 'function' || typeof this.dependencies.particleSystem.createExplosion !== 'function')) {
             console.warn("BulletPhysicsSystem: Provided particleSystem lacks required methods ('createImpactParticles', 'createExplosion').");
         }
        if (this.dependencies.physicsWorld && (typeof this.dependencies.physicsWorld.removeBody !== 'function' || typeof this.dependencies.physicsWorld.applyImpulse !== 'function')) {
             console.warn("BulletPhysicsSystem: Provided physicsWorld lacks required methods ('removeBody', 'applyImpulse').");
         }
        if (this.dependencies.eventSystem && (typeof this.dependencies.eventSystem.on !== 'function' || typeof this.dependencies.eventSystem.emit !== 'function')) {
             console.warn("BulletPhysicsSystem: Provided eventSystem lacks required methods ('on', 'emit').");
         }


        // Initialize Object Pools
        this._initializePools();

        this.activeBullets = [];
        this.damagedObstacles.clear();

        // Register event listeners if EventSystem is available
        if (this.dependencies.eventSystem) {
            this.dependencies.eventSystem.on('bulletFired', this.handleBulletFired.bind(this));
            // Listen for shotgun specific event if needed, or handle in handleBulletFired
            this.dependencies.eventSystem.on('fireShotgun', this.handleFireShotgun.bind(this));
            this.dependencies.eventSystem.on('gameStateChanged', this.handleGameStateChange.bind(this));
            this.dependencies.eventSystem.on('obstacleRemoved', this.handleObstacleRemoved.bind(this));
        } else {
            console.warn("BulletPhysicsSystem: EventSystem not provided. Manual bullet creation required via fireBullet() or fireShotgunBlast().");
        }

        this.settings.enabled = true;
        console.log(`Advanced Bullet Physics System Initialized. Pools: Bullets(${this._bulletPool.length}), Meshes(${this._meshPool.length}), Trails(${this._trailPool.length}), Decals(${this._decalPool.length})`);
    },

    _initializePools() {
        // Bullet Objects
        this._bulletPool = [];
        this._availableBulletIds.clear();
        for (let i = 0; i < this.settings.bulletPoolSize; i++) {
            const bullet = new PooledBullet();
            bullet._poolId = i; // Assign persistent pool ID
            this._bulletPool.push(bullet);
            this._availableBulletIds.add(i);
        }

        // Bullet Meshes
        this._meshPool = this._createMeshPool(this.settings.meshPoolSize,
            () => new THREE.SphereGeometry(0.5, 8, 8), // Base radius 0.5, scaled later
            () => new THREE.MeshStandardMaterial({
                color: 0xffffff, emissive: 0x000000, roughness: 0.5, metalness: 0.8,
                premultipliedAlpha: true // Good practice if using transparency later
            }),
            false // Not decals
        );

        // Trail Renderers
        if (this.settings.renderTrails) {
            this._trailPool = this._createLinePool(this.settings.trailPoolSize,
                () => new THREE.LineBasicMaterial({
                    color: 0xffffff, vertexColors: true, transparent: true,
                    opacity: 0.8, depthWrite: false, // Don't occlude things behind trail
                    blending: THREE.AdditiveBlending // Brighter trails
                }),
                this.settings.trailMaxPoints
            );
        } else {
            this._trailPool = [];
        }

        // Hit Decals
        if (this.settings.renderHitDecals) {
            this._decalPool = this._createMeshPool(this.settings.decalPoolSize,
                () => new THREE.PlaneGeometry(1, 1), // Base size 1x1, scaled later
                () => new THREE.MeshStandardMaterial({
                    color: 0x333333, transparent: true, opacity: 0.9,
                    depthWrite: false, // Avoid interfering with depth buffer
                    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, // Prevent z-fighting
                    map: null // Placeholder for decal texture
                }),
                true // Mark as decal pool
            );
             // TODO: Pre-load common decal textures here if possible
        } else {
            this._decalPool = [];
        }
    },

    _createMeshPool(size, createGeometry, createMaterial, isDecalPool) {
        const pool = [];
        for (let i = 0; i < size; i++) {
            const geometry = createGeometry();
            const material = createMaterial();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            mesh.userData = { pooled: true, active: false, poolIndex: i, creationTime: 0, lifetime: Infinity, isDecal: isDecalPool };
            if (!isDecalPool) mesh.castShadow = true;
            this.dependencies.scene.add(mesh); // Add to scene once, manage visibility
            pool.push(mesh);
        }
        return pool;
    },

    _createLinePool(size, createMaterial, maxPoints) {
        const pool = [];
        for (let i = 0; i < size; i++) {
            const material = createMaterial();
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(maxPoints * 3);
            const colors = new Float32Array(maxPoints * 3);
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage)); // Mark as dynamic
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
            geometry.setDrawRange(0, 0);

            const line = new THREE.Line(geometry, material);
            line.frustumCulled = false;
            line.visible = false;
            line.userData = { pooled: true, active: false, poolIndex: i, vertexCount: 0, lastVertexTime: 0 };
            this.dependencies.scene.add(line);
            pool.push(line);
        }
        return pool;
    },

    _acquireBulletObject() {
        if (this._availableBulletIds.size === 0) {
            if (this.settings.debugMode) console.warn("Bullet pool depleted!");
            return null;
        }
        const id = this._availableBulletIds.values().next().value;
        this._availableBulletIds.delete(id);
        return this._bulletPool[id];
    },

    _releaseBulletObject(bullet) {
        if (bullet && bullet._poolId !== -1 && this._bulletPool[bullet._poolId] === bullet) { // Ensure it's the correct object
             if (!this._availableBulletIds.has(bullet._poolId)){ // Avoid double-release
                 this._availableBulletIds.add(bullet._poolId);
                 bullet.reset(); // Reset state AFTER confirming it's back in the pool
             }
        } else {
            if (this.settings.debugMode) console.warn("Attempted to release invalid or already released bullet object:", bullet);
        }
    },

    _acquirePooledVisual(pool) {
        for (const visual of pool) {
            if (visual.userData.pooled && !visual.userData.active) {
                visual.userData.active = true;
                visual.visible = true; // Make visible on acquire
                return visual;
            }
        }
        if (this.settings.debugMode) {
            let poolName = 'Unknown';
            if (pool === this._meshPool) poolName = 'Mesh';
            else if (pool === this._trailPool) poolName = 'Trail';
            else if (pool === this._decalPool) poolName = 'Decal';
            console.warn(`${poolName} pool depleted!`);
        }
        return null;
    },

    _releasePooledVisual(visual) {
        if (visual && visual.userData.pooled && visual.userData.active) {
            visual.userData.active = false;
            visual.visible = false; // Make invisible on release
            visual.userData.creationTime = 0; // Reset timer/lifetime info
            visual.userData.lifetime = Infinity;

            if (visual.isLine) { // Reset Trail specific properties
                visual.geometry.setDrawRange(0, 0);
                 // Clear buffer data if necessary, though reusing is often faster
                 // const positions = visual.geometry.attributes.position.array;
                 // positions.fill(0); // Optional: zero out data
                 // visual.geometry.attributes.position.needsUpdate = true;
                visual.userData.vertexCount = 0;
            }
            if (visual.userData.isDecal) { // Reset Decal specific properties
                if (visual.parent !== this.dependencies.scene) {
                    // If attached to another object, re-attach to scene root for pooling
                    this.dependencies.scene.attach(visual);
                }
                visual.scale.set(1, 1, 1); // Reset scale
                visual.rotation.set(0, 0, 0); // Reset rotation
                visual.material.opacity = 0.9; // Reset opacity
                visual.material.map = null; // Clear texture reference
                 visual.material.needsUpdate = true;
            }
        }
    },

    _activateVisuals(bullet, weaponConfig) {
        // Mesh
        bullet.mesh = this._acquirePooledVisual(this._meshPool);
        if (bullet.mesh) {
            bullet.mesh.position.copy(bullet.position);
            bullet.mesh.scale.setScalar(weaponConfig.meshSize); // Geometry radius is 0.5, so scale is size
            bullet.mesh.material.color.setHex(weaponConfig.color);
            bullet.mesh.material.emissive.setHex(bullet.isTracer ? weaponConfig.color : 0x000000);
            bullet.mesh.material.emissiveIntensity = bullet.isTracer ? 1.5 : 0.0;
            bullet.mesh.material.needsUpdate = true;
            if (bullet.velocity.lengthSq() > 0.001) {
                bullet.mesh.lookAt(bullet.position.clone().add(bullet.velocity));
            }
        }

        // Trail
        if (this.settings.renderTrails && bullet.isTracer) { // Only tracers get trails
            bullet.trail = this._acquirePooledVisual(this._trailPool);
            if (bullet.trail) {
                bullet.trailVertices = []; // Clear old data
                bullet.trail.userData.vertexCount = 0;
                bullet.trail.userData.lastVertexTime = bullet.creationTime;
                const positions = bullet.trail.geometry.attributes.position.array;
                const colors = bullet.trail.geometry.attributes.color.array;

                // Add initial point
                positions[0] = bullet.position.x; positions[1] = bullet.position.y; positions[2] = bullet.position.z;
                const trailColor = new THREE.Color(weaponConfig.color);
                colors[0] = trailColor.r; colors[1] = trailColor.g; colors[2] = trailColor.b;

                bullet.trailVertices.push({ pos: bullet.position.clone(), time: bullet.creationTime });
                bullet.trail.userData.vertexCount = 1;
                bullet.trail.geometry.setDrawRange(0, 1);
                bullet.trail.geometry.attributes.position.needsUpdate = true;
                bullet.trail.geometry.attributes.color.needsUpdate = true;
            }
        } else {
            bullet.trail = null;
            bullet.trailVertices = [];
        }
    },

    _deactivateVisuals(bullet) {
        if (bullet.mesh) {
            this._releasePooledVisual(bullet.mesh);
            bullet.mesh = null;
        }
        if (bullet.trail) {
            this._releasePooledVisual(bullet.trail);
            bullet.trail = null;
            bullet.trailVertices = []; // Clear vertex data associated with bullet
        }
    },

    // --- Event Handlers ---

    handleBulletFired(data) {
        if (!this.settings.enabled) return;

        const { origin, direction, weaponType = 'standard', count = 1, spreadAngle = 0 } = data;
        if (!origin || !direction) {
             console.error("BulletPhysicsSystem: 'bulletFired' event missing origin or direction.");
             return;
        }

        const weaponConfig = this.weaponTypes[weaponType] || this.weaponTypes.standard;
        if (!weaponConfig){
             console.warn(`BulletPhysicsSystem: Unknown weaponType "${weaponType}". Using "standard".`);
             weaponConfig = this.weaponTypes.standard;
        }

        const baseDirection = direction.clone().normalize();

        for (let i = 0; i < count; i++) {
            let fireDirection = baseDirection.clone();
            if (spreadAngle > 0 && count > 1) {
                 fireDirection = this._calculateSpreadDirection(baseDirection, spreadAngle);
            }
            this.createBullet(origin, fireDirection, weaponType); // Pass weaponType string
        }

        // Play fire sound once, even for bursts/shotguns handled here
        if (this.dependencies.audioManager && weaponConfig.fireSound && count > 0) {
            this.dependencies.audioManager.play(weaponConfig.fireSound, { position: origin, volume: 0.8 });
        }
    },

     // Specific handler for shotgun event if needed for different logic
     handleFireShotgun(data) {
        if (!this.settings.enabled) return;
        const { origin, direction, weaponType = 'shotgun_pellet', count = 8 } = data;
         if (!origin || !direction) {
             console.error("BulletPhysicsSystem: 'fireShotgun' event missing origin or direction.");
             return;
         }

        const weaponConfig = this.weaponTypes[weaponType];
        if (!weaponConfig){
             console.warn(`BulletPhysicsSystem: Unknown shotgun pellet type "${weaponType}".`);
             return; // Don't fire if config is missing
        }
        const spread = weaponConfig.spreadAngle || 5.0;

        const fireData = {
             origin: origin,
             direction: direction,
             weaponType: weaponType,
             count: count,
             spreadAngle: spread
         };
         // Reuse the main handler for the actual firing logic
         this.handleBulletFired(fireData);

         // Play shotgun sound (assuming it's different from pellet hit/fire sound)
          if (this.dependencies.audioManager) {
            this.dependencies.audioManager.play('shoot_shotgun', { position: origin, volume: 1.0 });
        }
     },

    handleGameStateChange(data) {
        if (!data || !data.state) return;
        if (data.state === 'gameOver' || data.state === 'menu' || data.state === 'levelEnd') {
            if (this.settings.debugMode) console.log(`GameState Changed to ${data.state}, clearing bullets and effects.`);
            this.clearAllBullets();
            this.clearAllDecals();
            this.damagedObstacles.clear();
        }
    },

    handleObstacleRemoved(data) {
        if (data && data.obstacleUUID && this.damagedObstacles.has(data.obstacleUUID)) {
            this.damagedObstacles.delete(data.obstacleUUID);
            if (this.settings.debugMode) console.log(`Removed damage tracking for obstacle ${data.obstacleUUID}`);
        }
    },

    _calculateSpreadDirection(baseDirection, spreadAngleDegrees) {
         const spreadRad = THREE.MathUtils.degToRad(spreadAngleDegrees);
         const randomAngle = Math.random() * Math.PI * 2;
         // Cosine-weighted distribution for more central clustering (more realistic)
         const randomSpread = Math.acos(1 - Math.random() * (1 - Math.cos(spreadRad)));
         // Simple uniform spread: const randomSpread = Math.random() * spreadRad;

         const spreadVector = new THREE.Vector3(
             Math.cos(randomAngle) * Math.sin(randomSpread),
             Math.sin(randomAngle) * Math.sin(randomSpread),
             Math.cos(randomSpread) // Z is forward in local space
         );

         // Align spreadVector with baseDirection
         const targetQuaternion = new THREE.Quaternion();
         const up = (Math.abs(baseDirection.y) < 0.99) ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0); // Handle gimbal lock cases
         const rotationMatrix = new THREE.Matrix4().lookAt(new THREE.Vector3(), baseDirection, up);
         targetQuaternion.setFromRotationMatrix(rotationMatrix);

         return spreadVector.applyQuaternion(targetQuaternion);
    },


    // --- Core Logic ---

    /**
     * Creates and launches a new bullet using pooled objects.
     * Should generally be called via event handlers or fireBullet/fireShotgunBlast.
     */
    createBullet(origin, direction, weaponType = 'standard') {
        if (!this.settings.enabled) return null;
        if (this.activeBullets.length >= this.settings.maxSimultaneousBullets) {
            if (this.settings.debugMode) console.warn(`Max simultaneous bullets (${this.settings.maxSimultaneousBullets}) reached. Bullet not created.`);
            return null;
        }

        const weaponConfig = this.weaponTypes[weaponType] || this.weaponTypes.standard;
        if (!weaponConfig){
            console.warn(`BulletPhysicsSystem: Cannot create bullet, unknown weaponType "${weaponType}". Using "standard".`);
            weaponConfig = this.weaponTypes.standard;
        }


        const bullet = this._acquireBulletObject();
        if (!bullet) {
             if (this.settings.debugMode) console.warn("Failed to acquire bullet object from pool.");
            return null; // Pool empty
        }

        bullet.activate(bullet._poolId, origin, direction, weaponConfig);
        this._activateVisuals(bullet, weaponConfig); // Get mesh/trail from pools

        this.activeBullets.push(bullet);
        // Don't play sound here, handled by fire event handlers

        return bullet;
    },

    /** Updates all active bullets based on the time delta. Call this in your game loop. */
    update(delta) {
        if (!this.settings.enabled || delta <= 0) return;

        // Clamp delta to prevent physics explosion with large time steps
        const dt = Math.min(delta, 1 / 30); // Max step of 1/30th second

        const gravityForce = this.settings.gravity.clone().multiplyScalar(dt);
        const collidables = this._getCollidableObjects();
        const bulletsToRemove = [];

        for (let i = 0; i < this.activeBullets.length; i++) {
            const bullet = this.activeBullets[i];
            if (!bullet || !bullet.active) continue;

            // --- Physics Simulation ---
            bullet.lastPosition.copy(bullet.position);

            // 1. Apply Gravity
            bullet.velocity.addScaledVector(gravityForce, bullet.gravityFactor);

            // 2. Apply Air Resistance (Drag)
            const speedSq = bullet.velocity.lengthSq();
            let currentMaterialDrag = 1.0; // Assume air drag initially
            // TODO: Check if bullet is inside a volume (e.g., water) to apply different drag

            if (speedSq > 0.001) {
                const dragMagnitude = speedSq * bullet.dragCoefficient * 0.5 * currentMaterialDrag;
                const dragForce = bullet.velocity.clone().normalize().multiplyScalar(-dragMagnitude * dt);
                bullet.velocity.add(dragForce);
                bullet.energy = bullet.velocity.length() / bullet.initialVelocityMagnitude; // Update energy based on speed
            }

            // 3. Calculate Movement Step
            const movementStep = bullet.velocity.clone().multiplyScalar(dt);
            const predictedPosition = bullet.position.clone().add(movementStep);
            const stepDistance = movementStep.length();

            // --- Collision Detection ---
            let collisionResult = null;
            if (stepDistance > 0.001 && collidables.length > 0) {
                const ray = new THREE.Ray(bullet.lastPosition, movementStep.clone().normalize());
                collisionResult = this._raycast(ray, stepDistance, collidables, bullet);
            }

            // --- Collision Response ---
            if (collisionResult) {
                const { point, normal, face, object, distance } = collisionResult;
                const materialName = this.dependencies.materialManager.getMaterialNameFromObject(object);
                const materialProps = this.dependencies.materialManager.getMaterialProperties(materialName);

                bullet.position.copy(point);
                bullet.traveledDistance += distance;

                const impactVelocity = bullet.velocity.clone();
                const impactAngle = Math.acos(Math.max(-1, Math.min(1, normal.dot(impactVelocity.clone().normalize()) * -1))); // Angle relative to normal (0 = perpendicular)
                const impactEnergy = bullet.energy; // Energy just before impact

                this._createHitEffect(point, normal, face, object, materialProps, impactVelocity, impactEnergy, bullet.bulletCaliber);
                this._applyImpactImpulse(object, point, impactVelocity.clone().multiplyScalar(bullet.mass));

                const isDestructible = object.userData?.isDestructible ?? false;
                let destroyed = false;
                if (isDestructible) {
                    destroyed = this._handleObstacleDamage(object, point, normal, bullet.destructionPower * impactEnergy, materialProps);
                }

                // Basic Penetration Check (stop or continue)
                const penetrationThreshold = materialProps.hardness * 20.0; // Arbitrary scaling factor
                const effectivePenetration = bullet.penetrationPower * impactEnergy * Math.cos(impactAngle); // More power head-on

                // Check if bullet should stop or continue (penetrate/ricochet)
                 let shouldStop = true; // Assume stop unless penetration or ricochet occurs

                if (!destroyed && effectivePenetration > penetrationThreshold && materialProps.penetrationMultiplier) {
                     // Penetration occurs (simplified: pass through thin materials)
                     // More realistic model needs object thickness, material layers etc.
                     const energyLossOnPen = 0.6 + materialProps.hardness * 0.3; // Lose more energy through harder stuff
                     bullet.energy *= (1.0 - energyLossOnPen);
                     bullet.penetrationPower *= 0.5; // Reduce future penetration ability
                     bullet.position.addScaledVector(bullet.velocity.clone().normalize(), 0.01); // Move slightly past surface
                     bullet.lastPosition.copy(bullet.position); // Update last pos to avoid immediate re-collision
                     shouldStop = false; // Bullet continues
                     if (this.settings.debugMode) console.log("Bullet penetrated material:", materialName);

                 } else if (!destroyed) {
                    // No penetration, check Ricochet
                    const minBounceEnergy = 0.05;
                    const maxBounceAngleRad = THREE.MathUtils.degToRad(80); // Allow bounces up to 80 degrees from normal

                    if (bullet.bounceCount < bullet.maxBounces && impactEnergy > minBounceEnergy && impactAngle > (Math.PI / 2 - maxBounceAngleRad)) { // Check angle relative to surface (glancing angles > ~10 deg)
                         const reflection = this._calculateReflection(impactVelocity, normal);

                         // Energy loss depends on angle (less loss at glancing) and hardness (more loss on hard)
                         const angleFactor = Math.sin(impactAngle); // 1 at 90deg (glancing), 0 at 0deg (head-on)
                         const energyLoss = bullet.bounceEnergyLossFactor * (1.0 - angleFactor * 0.7) + materialProps.hardness * 0.1; // Base loss + hardness factor
                         const remainingEnergyFactor = Math.max(0, 1.0 - energyLoss);

                         bullet.velocity.copy(reflection).multiplyScalar(remainingEnergyFactor);
                         bullet.energy *= remainingEnergyFactor;

                         bullet.position.addScaledVector(normal, 0.01); // Move slightly away
                         bullet.lastPosition.copy(bullet.position); // Update last pos

                         bullet.bounceCount++;
                         shouldStop = false; // Bullet continues bouncing

                         // Play bounce sound
                         if (this.dependencies.audioManager) {
                             this.dependencies.audioManager.play('bulletBounce', { position: point, volume: 0.4 * impactEnergy, surface: materialName });
                         }
                     }
                }

                 if (shouldStop || destroyed) { // Stop if no penetration/ricochet, or if obstacle was destroyed
                     bulletsToRemove.push(bullet);
                     continue; // Skip rest of update for this bullet
                 }

            } else {
                // No collision
                bullet.position.copy(predictedPosition);
                bullet.traveledDistance += stepDistance;
            }

            // --- Update Visuals ---
            if (bullet.mesh) {
                bullet.mesh.position.copy(bullet.position);
                if (bullet.velocity.lengthSq() > 0.01) {
                    bullet.mesh.lookAt(bullet.position.clone().add(bullet.velocity));
                }
            }
            if (bullet.trail) {
                this._updateBulletTrail(bullet, dt);
            }

            // --- Check Removal Conditions ---
            if (bullet.traveledDistance >= bullet.maxDistance ||
                bullet.energy < 0.01 || // Effectively stopped
                (performance.now() - bullet.creationTime) > 15000 || // Max lifetime 15s
                !this._isInWorldBounds(bullet.position))
            {
                bulletsToRemove.push(bullet);
            }
        } // End bullet loop

        // --- Remove Bullets marked for removal ---
        for (const bullet of bulletsToRemove) {
            const index = this.activeBullets.indexOf(bullet);
            if (index !== -1) {
                this._deactivateVisuals(bullet);
                this._releaseBulletObject(bullet);
                this.activeBullets.splice(index, 1);
            }
        }

        // --- Update & Cleanup Effects ---
        this._updateActiveDecals(dt);
        // Trails are updated with bullets, but could have separate cleanup if needed
    },

    _getCollidableObjects() {
        // In a large world, use spatial partitioning (octree, grid) or physics engine's broadphase here!
        try {
            const environment = this.dependencies.environmentProvider ? this.dependencies.environmentProvider() : [];
            const targets = this.dependencies.targetProvider ? this.dependencies.targetProvider() : [];
            // Ensure returned values are arrays and filter basic validity
            const validEnvironment = Array.isArray(environment) ? environment.filter(obj => obj && obj.isMesh && obj.uuid && obj.visible) : [];
            const validTargets = Array.isArray(targets) ? targets.filter(obj => obj && obj.isMesh && obj.uuid && obj.visible) : [];
            return [...validEnvironment, ...validTargets];
        } catch (error) {
            console.error("BulletPhysicsSystem: Error getting collidable objects from providers:", error);
            return [];
        }
    },

    _raycast(ray, maxDistance, objects, bullet) {
        // Reuse a single Raycaster instance if possible for performance
        if (!this._raycaster) this._raycaster = new THREE.Raycaster();

        this._raycaster.set(ray.origin, ray.direction);
        this._raycaster.far = maxDistance;

        // Filter out the bullet's own mesh *before* raycasting
        const meshesToTest = objects.filter(obj => obj !== bullet.mesh);
        if (meshesToTest.length === 0) return null;

        const intersects = this._raycaster.intersectObjects(meshesToTest, false); // false: don't check children unless specified

        if (intersects.length > 0) {
            // Intersects are sorted by distance automatically. Return the first valid one.
             const closestHit = intersects[0];

            // Ensure the normal is in world space
            if (closestHit.face && closestHit.object.matrixWorld) {
                // Clone face normal and transform, don't modify original
                closestHit.normal = closestHit.face.normal.clone().transformDirection(closestHit.object.matrixWorld).normalize();
            } else {
                 // Fallback if face normal isn't available (e.g., points intersection)
                 // This is less accurate but better than nothing.
                 closestHit.normal = ray.direction.clone().negate();
            }
            return closestHit;
        }
        return null;
    },

     _createHitEffect(position, normal, face, hitObject, materialProps, impactVelocity, impactEnergy, caliber) {
        // 1. Particle Effects
        if (this.dependencies.particleSystem && typeof this.dependencies.particleSystem.createImpactParticles === 'function') {
            try {
                const particleConfig = {
                    position: position.clone(),
                    normal: normal.clone(),
                    color: materialProps.effects.particleColor || 0xaaaaaa,
                    count: Math.max(3, Math.floor(8 * impactEnergy + caliber * 0.3)),
                    size: 0.005 * caliber + 0.01,
                    speed: 3 + impactEnergy * 8,
                    spread: 0.6, // Radians
                    duration: 400 + 600 * impactEnergy,
                    materialProps: materialProps // Pass material info for custom types (sparks, splinters etc)
                };
                this.dependencies.particleSystem.createImpactParticles(particleConfig);
            } catch (e) { console.error("Error creating particle effect:", e); }
        }

        // 2. Hit Decal
        if (this.settings.renderHitDecals && !materialProps.effects.noDecal && hitObject && hitObject.isMesh && this.dependencies.scene) {
            const decal = this._acquirePooledVisual(this._decalPool);
            if (decal) {
                decal.position.copy(position).addScaledVector(normal, 0.005); // Offset slightly
                decal.scale.setScalar(this.settings.decalSize * (caliber / 7.62)); // Scale by caliber

                // Orient decal to surface normal
                const lookTarget = decal.position.clone().add(normal);
                decal.lookAt(lookTarget);

                // Random rotation around the normal for variation
                decal.rotateZ(Math.random() * Math.PI * 2);

                // Set decal material properties (texture should be loaded elsewhere)
                // Example: decal.material.map = loadedDecalTextures[materialProps.effects.decal];
                decal.material.color.setHex(0x222222); // Base dark hole color
                decal.material.opacity = 0.85;
                decal.material.needsUpdate = true;

                decal.userData.creationTime = performance.now();
                decal.userData.lifetime = this.settings.decalLifetime * (0.8 + Math.random() * 0.4); // Slight variation

                // Optional: Attach decal to moving objects (careful with pooling!)
                // if (hitObject.userData.physicsBody) {
                //     hitObject.attach(decal); // THREE.Object3D.attach handles world transforms
                // }
            }
        }

        // 3. Audio Effect
        if (this.dependencies.audioManager && typeof this.dependencies.audioManager.play === 'function') {
             try {
                const soundName = materialProps.effects.sound || 'hit_generic';
                this.dependencies.audioManager.play(soundName, {
                    position: position.clone(),
                    volume: Math.max(0.1, 0.7 * impactEnergy),
                    surface: materialProps.name || 'default'
                });
             } catch (e) { console.error("Error playing hit sound:", e); }
        }
    },

    _updateBulletTrail(bullet, delta) {
        if (!bullet.trail || !bullet.active || !bullet.trailVertices) return;

        const trail = bullet.trail;
        const geometry = trail.geometry;
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color.array;
        const now = performance.now();
        const fadeDuration = this.settings.trailFadeDuration;
        const maxPoints = this.settings.trailMaxPoints;

        // Add new vertex if moved sufficiently and space available
        const lastVertexPos = (bullet.trailVertices.length > 0) ? bullet.trailVertices[bullet.trailVertices.length - 1].pos : bullet.initialPosition;
        if (bullet.position.distanceTo(lastVertexPos) > this.settings.trailMinVertexDistance) {
             let index;
             if (trail.userData.vertexCount < maxPoints) {
                 // Append to end
                 index = trail.userData.vertexCount;
                 trail.userData.vertexCount++;
                 bullet.trailVertices.push({ pos: bullet.position.clone(), time: now });
             } else {
                 // Overwrite oldest vertex (circular buffer effect)
                 index = 0; // Index of the oldest vertex to overwrite
                 // Shift existing vertex data (inefficient but simple for example)
                 bullet.trailVertices.shift(); // Remove oldest data
                 bullet.trailVertices.push({ pos: bullet.position.clone(), time: now }); // Add newest data

                 // Shift actual buffer data
                 positions.copyWithin(0, 3, maxPoints * 3);
                 colors.copyWithin(0, 3, maxPoints * 3);
                 index = maxPoints - 1; // Write new data at the end
             }


             const writeIndex = index * 3;
             positions[writeIndex] = bullet.position.x;
             positions[writeIndex + 1] = bullet.position.y;
             positions[writeIndex + 2] = bullet.position.z;

             // Use base weapon color for new point
             const baseColor = new THREE.Color(this.weaponTypes[bullet.weaponType]?.color || 0xffffff);
             colors[writeIndex] = baseColor.r;
             colors[writeIndex + 1] = baseColor.g;
             colors[writeIndex + 2] = baseColor.b;

             trail.userData.lastVertexTime = now; // Update time for potential independent cleanup
             geometry.setDrawRange(0, trail.userData.vertexCount); // Update draw range
        }


        // Update existing vertex colors for fading
        let needsColorUpdate = false;
        let needsPosUpdate = true; // Always flag position buffer needs update
        for (let i = 0; i < trail.userData.vertexCount; i++) {
            const vertexData = bullet.trailVertices[i];
            if (!vertexData) continue; // Should not happen, but safety check

            const age = now - vertexData.time;
            const alpha = Math.max(0, 1.0 - (age / fadeDuration));
            const fadeFactor = alpha * alpha; // Exponential fade

            const colorIndex = i * 3;
            // Get original color if possible, or assume current color is base
            // For simplicity, fade the current color value
            colors[colorIndex + 0] *= fadeFactor;
            colors[colorIndex + 1] *= fadeFactor;
            colors[colorIndex + 2] *= fadeFactor;

            needsColorUpdate = true;
        }

        // Update buffer attributes
        if (needsPosUpdate) geometry.attributes.position.needsUpdate = true;
        if (needsColorUpdate) geometry.attributes.color.needsUpdate = true;

         // Might need to update bounding sphere if vertices change significantly
         // geometry.computeBoundingSphere(); // Uncomment if culling issues appear
    },

    _updateActiveDecals(delta) {
        if (!this.settings.renderHitDecals) return;
        const now = performance.now();
        const decalsToRelease = [];

        for (const decal of this._decalPool) {
            if (decal.userData.active && decal.userData.lifetime !== Infinity) {
                const age = now - decal.userData.creationTime;
                const lifeRatio = age / decal.userData.lifetime;

                if (lifeRatio >= 1.0) {
                    decalsToRelease.push(decal);
                } else if (lifeRatio > 0.75) { // Start fading in last 25%
                    const fade = 1.0 - (lifeRatio - 0.75) / 0.25;
                    decal.material.opacity = 0.85 * Math.max(0, fade); // Fade base opacity
                    decal.material.needsUpdate = true;
                }
            }
        }

        for(const decal of decalsToRelease) {
            this._releasePooledVisual(decal);
        }
    },

    _handleObstacleDamage(obstacleMesh, hitPosition, hitNormal, damageAmount, materialProps) {
        if (!obstacleMesh || !obstacleMesh.uuid || !(damageAmount > 0)) return false;

        const obstacleId = obstacleMesh.uuid;
        let damageData = this.damagedObstacles.get(obstacleId);

        if (!damageData) {
            damageData = {
                totalDamage: 0,
                mesh: obstacleMesh, // Keep reference
                segments: this.settings.partialDestructionEnabled ? this._createObstacleSegments(obstacleMesh) : null
            };
            // Only add if destructible flag is explicitly set
             if (obstacleMesh.userData?.isDestructible) {
                this.damagedObstacles.set(obstacleId, damageData);
             } else {
                 return false; // Not marked as destructible
             }
        }

        damageData.totalDamage += damageAmount;

        // Apply partial damage if enabled
        if (damageData.segments) {
            this._damageNearestSegment(damageData, hitPosition, damageAmount * 1.5); // Focus damage locally
        }

        // Check for full destruction
        let fullyDestroyed = false;
        const destructionThreshold = this.settings.obstacleDestructionThreshold;

        if (damageData.segments) {
            const totalSegments = damageData.segments.length;
            if (totalSegments > 0) {
                 const destroyedSegments = damageData.segments.filter(s => s.destroyed).length;
                 const destructionRatio = destroyedSegments / totalSegments;
                 const requiredRatio = materialProps.brittle ? 0.4 : 0.7; // Brittle things break easier
                 if (destructionRatio >= requiredRatio || damageData.totalDamage >= destructionThreshold * 1.5) { // Also check total damage threshold as fallback
                      fullyDestroyed = true;
                 }
            } else {
                 // Fallback if segment creation failed
                 if (damageData.totalDamage >= destructionThreshold) fullyDestroyed = true;
            }
        } else {
            // Standard threshold check
            if (damageData.totalDamage >= destructionThreshold) {
                fullyDestroyed = true;
            }
        }

        if (fullyDestroyed) {
            this._destroyObstacle(damageData, obstacleId);
            return true;
        }

        return false;
    },

    _createObstacleSegments(obstacleMesh) {
        try {
            if (!obstacleMesh.geometry) return null;
            if (!obstacleMesh.geometry.boundingBox) {
                obstacleMesh.geometry.computeBoundingBox();
            }
            if (!obstacleMesh.geometry.boundingBox) return null;

            const segments = [];
            const box = obstacleMesh.geometry.boundingBox;
            const size = new THREE.Vector3(); box.getSize(size);
            const center = new THREE.Vector3(); box.getCenter(center);
            const segSize = size.clone().multiplyScalar(0.5);

            // 2x2x2 grid (8 segments)
            for (let x = -0.5; x <= 0.5; x += 1) {
                for (let y = -0.5; y <= 0.5; y += 1) {
                    for (let z = -0.5; z <= 0.5; z += 1) {
                        const localPos = new THREE.Vector3(center.x + x * segSize.x, center.y + y * segSize.y, center.z + z * segSize.z);
                        segments.push({
                            localPosition: localPos,
                            // worldPosition calculation deferred until needed or updated periodically
                            health: 1.0,
                            destroyed: false,
                        });
                    }
                }
            }
            return segments;
        } catch (e) {
            console.error("Error creating obstacle segments:", e);
            return null;
        }
    },

    _damageNearestSegment(obstacleData, hitPositionWorld, damage) {
        if (!obstacleData || !obstacleData.segments) return;

        let nearestSegment = null;
        let minDistanceSq = Infinity;
        const tempWorldPos = new THREE.Vector3(); // Reuse vector

        for (const segment of obstacleData.segments) {
            if (segment.destroyed) continue;
            // Calculate world position on the fly
            tempWorldPos.copy(segment.localPosition).applyMatrix4(obstacleData.mesh.matrixWorld);
            const distSq = tempWorldPos.distanceToSquared(hitPositionWorld);
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                nearestSegment = segment;
            }
        }

        if (nearestSegment) {
            nearestSegment.health = Math.max(0, nearestSegment.health - damage);
            if (nearestSegment.health === 0 && !nearestSegment.destroyed) {
                nearestSegment.destroyed = true;
                // Trigger local destruction effect
                if (this.dependencies.particleSystem && typeof this.dependencies.particleSystem.createImpactParticles === 'function') {
                     const segmentWorldPos = tempWorldPos.copy(nearestSegment.localPosition).applyMatrix4(obstacleData.mesh.matrixWorld);
                     try {
                         this.dependencies.particleSystem.createImpactParticles({
                             position: segmentWorldPos, count: 8, size: 0.08, speed: 4, duration: 300,
                             color: this.dependencies.materialManager.getMaterialProperties(this.dependencies.materialManager.getMaterialNameFromObject(obstacleData.mesh)).effects.particleColor
                         });
                     } catch (e) { console.error("Error creating segment destruction particles:", e); }
                }
            }
        }
    },

    _destroyObstacle(damageData, obstacleId) {
        const obstacleMesh = damageData.mesh;
        if (!obstacleMesh) return;

        const destroyPosition = new THREE.Vector3();
         obstacleMesh.getWorldPosition(destroyPosition); // Get current world position for effects

        if (this.settings.debugMode) console.log(`Destroying obstacle: ${obstacleId}`);

        // 1. Destruction Particle Effect
        if (this.dependencies.particleSystem && typeof this.dependencies.particleSystem.createExplosion === 'function') {
            try {
                 const materialProps = this.dependencies.materialManager.getMaterialProperties(this.dependencies.materialManager.getMaterialNameFromObject(obstacleMesh));
                 this.dependencies.particleSystem.createExplosion({
                     position: destroyPosition, count: 40 + Math.random() * 30, size: 0.15 + Math.random() * 0.15,
                     speed: 8 + Math.random() * 8, duration: 1200 + Math.random() * 800,
                     color: materialProps.effects.particleColor, materialProps: materialProps
                 });
             } catch (e) { console.error("Error creating destruction explosion:", e); }
        }

        // 2. Destruction Sound
        if (this.dependencies.audioManager && typeof this.dependencies.audioManager.play === 'function') {
            try {
                 this.dependencies.audioManager.play('obstacleDestruction', { position: destroyPosition, volume: 1.0 });
            } catch (e) { console.error("Error playing destruction sound:", e); }
        }

        // 3. Remove from Physics
        if (this.dependencies.physicsWorld && typeof this.dependencies.physicsWorld.removeBody === 'function' && obstacleMesh.userData.physicsBody) {
            try {
                 this.dependencies.physicsWorld.removeBody(obstacleMesh.userData.physicsBody);
                 obstacleMesh.userData.physicsBody = null;
             } catch (e) { console.error("Error removing physics body:", e); }
        }

        // 4. Remove from Scene (make invisible, actual removal might be deferred)
        obstacleMesh.visible = false;
        // Optionally dispose geometry/material later by a separate manager
        // obstacleMesh.geometry?.dispose();
        // obstacleMesh.material?.dispose();
        if (obstacleMesh.parent) {
            // Use remove, not detach, if it's just hidden and might be reused/disposed later
            obstacleMesh.parent.remove(obstacleMesh);
        }


        // 5. Clean up tracking data
        this.damagedObstacles.delete(obstacleId);

        // 6. Emit event
        if (this.dependencies.eventSystem && typeof this.dependencies.eventSystem.emit === 'function') {
             try {
                 this.dependencies.eventSystem.emit('obstacleDestroyed', {
                     obstacleUUID: obstacleId, position: destroyPosition,
                 });
            } catch (e) { console.error("Error emitting obstacleDestroyed event:", e); }
        }
    },

     _applyImpactImpulse(hitObject, hitPosition, impulseVector) {
        if (!this.dependencies.physicsWorld || typeof this.dependencies.physicsWorld.applyImpulse !== 'function' || !hitObject || !hitObject.userData?.physicsBody) {
            return;
        }
        try {
            const body = hitObject.userData.physicsBody;
            // Assuming applyImpulse takes the body, world-space impulse, and world-space position
            this.dependencies.physicsWorld.applyImpulse(
                body,
                impulseVector.clone().multiplyScalar(this.settings.obstacleImpactImpulseScale),
                hitPosition.clone() // Clone to avoid modification issues
            );
        } catch (error) {
            console.error("BulletPhysicsSystem: Error applying physics impulse:", error);
        }
    },

    _calculateReflection(velocity, normal) {
        // Uses THREE.Vector3's built-in reflect method
        return velocity.clone().reflect(normal);
    },

    _isInWorldBounds(position) {
        const limit = 5000; // Example large limit
        return position.y > -200 && // Allow slightly below ground for effect persistence
               Math.abs(position.x) < limit &&
               Math.abs(position.z) < limit;
    },

    // --- Cleanup ---

    clearAllBullets() {
        if (this.settings.debugMode) console.log(`Clearing ${this.activeBullets.length} active bullets...`);
        // Iterate backwards for safe removal while modifying array
        for (let i = this.activeBullets.length - 1; i >= 0; i--) {
            const bullet = this.activeBullets[i];
            if (bullet) {
                 this._deactivateVisuals(bullet);
                 this._releaseBulletObject(bullet);
            }
        }
        this.activeBullets.length = 0; // Faster way to clear array
    },

    clearAllDecals() {
        if (this.settings.renderHitDecals && this.settings.debugMode) console.log("Clearing active decals...");
        for (const decal of this._decalPool) {
            if (decal.userData.active) {
                this._releasePooledVisual(decal);
            }
        }
    },

    // --- Public API Methods ---

    /** Manually fire a single bullet (alternative to event system). */
    fireBullet(origin, direction, weaponType = 'standard') {
        if (!this.settings.enabled) return;
        if (!origin || !direction) { console.error("fireBullet requires origin and direction."); return; }
        const fireData = { origin: origin.clone(), direction: direction.clone(), weaponType };
        this.handleBulletFired(fireData);
    },

    /** Manually fire multiple pellets (alternative to event system). */
    fireShotgunBlast(origin, baseDirection, pelletWeaponType = 'shotgun_pellet', pelletCount = 8) {
        if (!this.settings.enabled) return;
         if (!origin || !baseDirection) { console.error("fireShotgunBlast requires origin and baseDirection."); return; }

         const weaponConfig = this.weaponTypes[pelletWeaponType];
         if (!weaponConfig) {
             console.warn(`BulletPhysicsSystem: Unknown shotgun pellet type "${pelletWeaponType}" for fireShotgunBlast.`);
             return;
         }
         const spread = weaponConfig.spreadAngle || 5.0;

         const fireData = {
             origin: origin.clone(),
             direction: baseDirection.clone(),
             weaponType: pelletWeaponType,
             count: pelletCount,
             spreadAngle: spread
         };
         // Use the main handler for spread calculation and firing
         this.handleBulletFired(fireData);

          // Play shotgun sound distinct from pellets if desired
          if (this.dependencies.audioManager) {
            this.dependencies.audioManager.play('shoot_shotgun', { position: origin, volume: 1.0 });
        }
    },

    /** Enable or disable the entire physics simulation. */
    setEnabled(enabled) {
         if(this.settings.enabled === enabled) return;
         this.settings.enabled = enabled;
         if (!enabled) {
             this.clearAllBullets();
             this.clearAllDecals();
             this.damagedObstacles.clear();
             console.log("BulletPhysicsSystem Disabled.");
         } else {
             console.log("BulletPhysicsSystem Enabled.");
         }
    },

     /** Reload weapon configurations (e.g., after loading from file). */
     setWeaponTypes(newWeaponTypes) {
         if (typeof newWeaponTypes !== 'object' || newWeaponTypes === null) {
             console.error("Failed to set weapon types: Invalid data provided.");
             return;
         }
         this.weaponTypes = newWeaponTypes;
         if (this.settings.debugMode) console.log("BulletPhysicsSystem weapon types updated.");
     }
};

export default BulletPhysicsSystem;
