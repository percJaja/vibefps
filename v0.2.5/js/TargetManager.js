const TargetManager = {
    targets: [],           // Array holding target data objects { mesh, active, type, points, etc. }
    targetsByUUID: new Map(), // For quick lookup by mesh UUID
    comboCount: 0,
    comboMultiplier: 1,
    comboTimer: 0,
    comboTimeout: 3,       // Seconds

    // Dependencies (injected via init)
    dependencies: {
        scene: null,
        audioManager: null,
        particleSystem: null,
        eventSystem: null,
        localization: null, // Optional: For UI strings
        getEnvironmentObstacles: () => [], // Function providing obstacle meshes for avoidance
        // getTimeLeft: () => 0, // Function providing remaining game time for respawn logic
    },

    /**
     * Initializes the Target Manager.
     * @param {object} dependencies - Required external modules and functions.
     * @param {THREE.Scene} dependencies.scene
     * @param {object} dependencies.audioManager
     * @param {object} dependencies.particleSystem
     * @param {object} dependencies.eventSystem
     * @param {function} dependencies.getEnvironmentObstacles - Function returning Array<THREE.Mesh>
     * @param {object} [dependencies.localization] - Optional localization module/object
     * @param {function} [dependencies.getTimeLeft] - Optional function returning game time left
     */
    init(dependencies) {
        console.log("Initializing TargetManager...");
        if (!dependencies || !dependencies.scene || !dependencies.audioManager || !dependencies.particleSystem || !dependencies.eventSystem || !dependencies.getEnvironmentObstacles) {
             console.error("TargetManager.init: Missing critical dependencies!");
             return;
        }
        this.dependencies = {...this.dependencies, ...dependencies}; // Shallow merge

        this.targets = [];
        this.targetsByUUID.clear();
        this.comboCount = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;

        this.createTargets();

        // --- Central Change: Listen for bullet hits ---
        if (this.dependencies.eventSystem) {
            this.dependencies.eventSystem.on('bulletHit', this.handleBulletImpact.bind(this));
        } else {
             console.error("TargetManager requires an EventSystem dependency to function correctly!");
        }
         // --------------------------------------------

        // Listener for localization changes affecting combo UI
        if (this.dependencies.localization && typeof document !== 'undefined') {
            document.addEventListener('localizationUpdated', this.updateComboUI.bind(this));
        }
        console.log(`TargetManager Initialized: ${this.targets.length} targets created.`);
    },

    // Provides active target meshes for external systems (like BulletPhysicsSystem)
    getActiveTargetMeshes() {
        return this.targets.filter(t => t.active).map(t => t.mesh);
    },

    createTargets() {
        // Configure how many of each type
        this.createStandardTargets(15);
        this.createBonusTargets(3);
        this.createPenaltyTargets(2);
    },

     /** Internal helper to add target and map UUID */
     _addTarget(targetData) {
        this.targets.push(targetData);
        this.targetsByUUID.set(targetData.mesh.uuid, targetData);
     },

     /** Internal helper to find target data by its mesh object */
     _findTargetByMesh(mesh) {
         if (!mesh || !mesh.uuid) return null;
         return this.targetsByUUID.get(mesh.uuid);
     },


    _createSingleTarget(config) {
         const geometry = config.geometry || new THREE.SphereGeometry(0.5, 16, 16);
         const material = config.material || new THREE.MeshStandardMaterial({ color: 0xcccccc });
         const mesh = new THREE.Mesh(geometry, material);

         mesh.position.set(
            Math.random() * 80 - 40,
            Math.random() * 5 + 1, // Y position range
            Math.random() * 80 - 40
         );
         mesh.castShadow = true;
         mesh.receiveShadow = true;

         if (config.randomRotation) {
              mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
         }

         // --- CRITICAL: Set UserData for BulletPhysicsSystem ---
         mesh.userData.isTarget = true;
         mesh.userData.materialType = config.materialType || 'target_generic'; // Important for MaterialManager lookup!
         // Optional: Add reference back to target data if needed by hit logic
         // mesh.userData.targetReference = null; // Set below
         // --------------------------------------------------------

         this.dependencies.scene.add(mesh);

         const targetData = {
             mesh: mesh,
             active: true,
             respawnTime: 0,
             type: config.type, // 'standard', 'bonus', 'penalty'
             points: config.points,
             movementType: config.movementType || 'stationary',
             movementSpeed: (config.movementSpeedRange ? (Math.random() * (config.movementSpeedRange[1] - config.movementSpeedRange[0]) + config.movementSpeedRange[0]) : 0),
             movementDirection: new THREE.Vector3().randomDirection().setY(Math.random() * config.verticalMovementFactor - (config.verticalMovementFactor/2)).normalize(),
             initialPosition: mesh.position.clone(),
             movementRange: (config.movementRange ? (Math.random() * (config.movementRange[1] - config.movementRange[0]) + config.movementRange[0]) : 0),
             respawnDelay: config.respawnDelay || 5 // Default respawn delay
         };
         // mesh.userData.targetReference = targetData; // Link mesh back to data
         this._addTarget(targetData); // Add to manager's lists
         return targetData;
    },


    createStandardTargets(count) {
        const targetMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000, roughness: 0.5, metalness: 0.5, emissive: 0x330000
        });
        for (let i = 0; i < count; i++) {
             this._createSingleTarget({
                geometry: new THREE.SphereGeometry(0.5, 16, 16),
                material: targetMaterial,
                type: 'standard',
                points: 10,
                movementType: Math.random() > 0.4 ? 'moving' : 'stationary', // More movers
                movementSpeedRange: [1, 3],
                verticalMovementFactor: 0.5,
                movementRange: [3, 8],
                respawnDelay: 5,
                 materialType: 'target_standard', // For MaterialManager
             });
        }
    },

    createBonusTargets(count) {
        const targetMaterial = new THREE.MeshStandardMaterial({
             color: 0xffd700, roughness: 0.3, metalness: 0.8, emissive: 0x554400
        });
         for (let i = 0; i < count; i++) {
             this._createSingleTarget({
                geometry: new THREE.SphereGeometry(0.4, 16, 16),
                material: targetMaterial,
                type: 'bonus',
                points: 25,
                movementType: 'moving', // Always moving
                movementSpeedRange: [2, 5],
                verticalMovementFactor: 0.8, // Moves more vertically
                movementRange: [5, 12],
                respawnDelay: 8,
                materialType: 'target_bonus', // For MaterialManager
             });
        }
    },

     createPenaltyTargets(count) {
        const targetMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00, roughness: 0.7, metalness: 0.2, emissive: 0x003300
        });
         for (let i = 0; i < count; i++) {
             this._createSingleTarget({
                geometry: new THREE.BoxGeometry(0.8, 0.8, 0.8),
                material: targetMaterial,
                type: 'penalty',
                points: -15, // Negative points
                movementType: 'moving',
                movementSpeedRange: [0.5, 2], // Slower
                verticalMovementFactor: 0.3, // Less vertical
                movementRange: [2, 6],
                randomRotation: true,
                respawnDelay: 3, // Quick respawn
                materialType: 'target_penalty', // For MaterialManager
             });
        }
    },


    /**
     * Updates target movement, animations, and respawn timers. Call this every frame.
     * @param {number} delta - Time delta since last frame.
     */
    update(delta) {

        // Update Combo Timer
        if (this.comboCount > 0) {
            this.comboTimer += delta;
            if (this.comboTimer >= this.comboTimeout) {
                this.resetCombo();
                this.updateComboUI();
            }
        }

        const obstacles = this.dependencies.getEnvironmentObstacles(); // Get current obstacles for avoidance

        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];

            // Respawn logic (use provided getTimeLeft or assume always running if not provided)
             const currentTimeLeft = this.dependencies.getTimeLeft ? this.dependencies.getTimeLeft() : Infinity;
            if (!target.active && target.respawnTime > 0 && currentTimeLeft <= target.respawnTime) {
                 this.respawnTarget(target);
            }

            // Movement logic for active moving targets
            if (target.active && target.movementType === 'moving') {
                 this.updateTargetMovement(target, delta, obstacles);
                 // Apply specific animations
                 if (target.type === 'penalty') { // Rotate penalty targets
                      target.mesh.rotation.x += 0.5 * delta;
                      target.mesh.rotation.y += 0.8 * delta;
                 } else if (target.type === 'bonus') { // Pulsating scale for bonus targets
                      const scale = 1.0 + Math.sin(performance.now() / 200) * 0.1; // Use performance time
                      target.mesh.scale.setScalar(scale);
                 } else {
                      target.mesh.scale.setScalar(1.0); // Ensure standard targets are normal size
                 }
            }
        }
    },

    respawnTarget(target) {
         target.active = true;
         target.mesh.visible = true;
         target.mesh.scale.setScalar(1.0); // Reset scale

         // Find a new valid spawn position (simple random placement)
         target.mesh.position.set(
             Math.random() * 80 - 40,
             Math.random() * 5 + 1,
             Math.random() * 80 - 40
         );
         target.initialPosition.copy(target.mesh.position);

          // Reset movement direction
          target.movementDirection.set(
              Math.random() * 2 - 1,
              Math.random() * (target.type === 'bonus' ? 0.8 : 0.5),
              Math.random() * 2 - 1
          ).normalize();
         target.respawnTime = 0; // Clear respawn time
     },


    updateTargetMovement(target, delta, obstacles) {
         // Reverse direction if out of range
         const distanceFromInitial = target.mesh.position.distanceTo(target.initialPosition);
         if (distanceFromInitial >= target.movementRange) {
             target.movementDirection.subVectors(target.initialPosition, target.mesh.position).normalize();
         }

          // Simple Obstacle Avoidance (Raycast)
          if (obstacles.length > 0 && target.movementSpeed > 0) {
             const raycaster = new THREE.Raycaster(target.mesh.position, target.movementDirection, 0, 1.5); // Short distance check
             const intersects = raycaster.intersectObjects(obstacles); // Assumes obstacles is Array<Mesh>
             if (intersects.length > 0) {
                 // Reflect direction slightly away from obstacle normal
                  target.movementDirection.reflect(intersects[0].face.normal.clone().transformDirection(intersects[0].object.matrixWorld).normalize());
             }
          }

         // Update position
         target.mesh.position.addScaledVector(target.movementDirection, target.movementSpeed * delta);

         // Clamp Y position (basic boundary check)
         const minY = 0.5;
         const maxY = 8.0;
         if (target.mesh.position.y < minY) {
             target.mesh.position.y = minY;
             if (target.movementDirection.y < 0) target.movementDirection.y *= -0.5; // Bounce up gently
         } else if (target.mesh.position.y > maxY) {
              target.mesh.position.y = maxY;
              if (target.movementDirection.y > 0) target.movementDirection.y *= -0.5; // Bounce down gently
         }
         // Could add X/Z boundary checks too
    },


    /**
     * Handles the 'bulletHit' event emitted by the physics/collision system.
     * @param {object} eventData - Data about the bullet impact.
     * @param {THREE.Object3D} eventData.hitObject - The mesh that was hit.
     * @param {THREE.Vector3} eventData.hitPoint - World position of the hit.
     * @param {THREE.Vector3} eventData.normal - World normal at the hit point.
     * @param {object} [eventData.bulletProperties] - Optional properties of the bullet.
     */
    handleBulletImpact(eventData) {
         if (!eventData || !eventData.hitObject) return;

         // Check if the hit object is one of our managed targets
         const targetData = this._findTargetByMesh(eventData.hitObject);

         if (targetData && targetData.active) {
             // --- Target Hit Confirmed ---

             const targetPosition = targetData.mesh.position.clone(); // Store position before hiding
             const hitPoint = eventData.hitPoint || targetPosition; // Use hit point if available

             // 1. Deactivate Target & Schedule Respawn
             targetData.active = false;
             targetData.mesh.visible = false;
              const currentTimeLeft = this.dependencies.getTimeLeft ? this.dependencies.getTimeLeft() : Infinity;
             // Schedule respawn only if game has time left or runs indefinitely
              if(currentTimeLeft > 0) {
                  targetData.respawnTime = currentTimeLeft - targetData.respawnDelay;
              } else {
                 targetData.respawnTime = 0; // Don't respawn if time is 0
              }


             // 2. Handle Combo Logic
             let isComboIncrementedThisHit = false;
             if (targetData.type === 'penalty') {
                 this.resetCombo();
             } else {
                  this.incrementCombo();
                  isComboIncrementedThisHit = true;
             }

             // 3. Calculate Points
             const basePoints = targetData.points;
             const targetPoints = Math.floor(basePoints * this.comboMultiplier);

              // 4. Trigger Effects (using injected dependencies)
              try {
                  // Sound Effect
                   let hitSound = 'targetHitStandard'; // Default sound
                   if (targetData.type === 'bonus') hitSound = 'targetHitBonus';
                   else if (targetData.type === 'penalty') hitSound = 'targetHitPenalty';
                   this.dependencies.audioManager.play(hitSound, { position: targetPosition });

                  // Particle Effect (Using createImpactParticles with target material type)
                   this.dependencies.particleSystem.createImpactParticles({
                       position: hitPoint,
                       normal: eventData.normal || new THREE.Vector3(0,1,0), // Use provided normal or default upwards
                       count: targetData.type === 'bonus' ? 40 : (targetData.type === 'penalty' ? 20: 25),
                       size: targetData.type === 'bonus' ? 0.15 : (targetData.type === 'penalty' ? 0.1 : 0.12),
                       speed: targetData.type === 'bonus' ? 15 : (targetData.type === 'penalty' ? 8 : 10),
                       duration: 800,
                        // Pass material properties based on type for potential particle variation
                        materialProps: this.dependencies.materialManager.getMaterialProperties(targetData.mesh.userData.materialType) || {},
                        color: targetData.mesh.material.color.getHex() // Use target color
                   });

             } catch (e) {
                  console.error("TargetManager: Error triggering effects:", e);
             }

             // 5. Emit Event for Scoring/Game Logic
              this.dependencies.eventSystem.emit('targetHit', {
                 targetType: targetData.type,
                 pointsAwarded: targetPoints,
                 hitPosition: hitPoint,
                 comboCount: this.comboCount,
                 comboMultiplier: this.comboMultiplier
                 // Note: No penetration bonus info here anymore
              });

              // 6. Update UI
              this.updateComboUI();
         }
    },

    incrementCombo() {
        this.comboCount++;
        this.comboTimer = 0; // Reset timeout timer

        // Update multiplier based on count thresholds
        if (this.comboCount >= 10) this.comboMultiplier = 3.0;
        else if (this.comboCount >= 5) this.comboMultiplier = 2.0;
        else if (this.comboCount >= 3) this.comboMultiplier = 1.5;
        else this.comboMultiplier = 1.0;
    },

    resetCombo() {
        if (this.comboCount > 0) { // Only reset if combo was active
             this.comboCount = 0;
             this.comboMultiplier = 1.0;
             this.comboTimer = 0;
             // Maybe play a "combo lost" sound?
             // this.dependencies.audioManager.play('comboLost');
        }
    },

    updateComboUI() {
         // Ensure this runs only in a browser environment with DOM
         if (typeof document === 'undefined') return;

         const comboElement = document.getElementById('combo');
         if (comboElement) {
            if (this.comboCount >= 3) { // Show combo starting from 3 hits
                let comboText = `${this.comboCount}x Combo (${this.comboMultiplier}x)`; // Default English
                // Example using optional localization dependency
                 if (this.dependencies.localization && typeof this.dependencies.localization.translate === 'function') {
                      // Assuming translate takes key and parameters
                     comboText = this.dependencies.localization.translate('ui.comboText', {
                         count: this.comboCount,
                         multiplier: this.comboMultiplier
                     });
                 }

                 comboElement.textContent = comboText;
                 if (comboElement.style.display !== 'block') {
                     comboElement.style.display = 'block';
                     comboElement.style.opacity = '0'; // Start transparent for fade-in
                     // Force reflow before adding transition class
                     void comboElement.offsetWidth;
                      comboElement.classList.add('fade-in', 'pop'); // Add animation classes
                     setTimeout(()=> comboElement.classList.remove('fade-in','pop'), 500); // Clean up classes
                      comboElement.style.opacity = '1'; // Should be handled by CSS class
                 } else {
                      // Already visible, just pop it
                      comboElement.classList.remove('pop'); // Remove first to re-trigger animation
                      void comboElement.offsetWidth;
                      comboElement.classList.add('pop');
                       setTimeout(()=> comboElement.classList.remove('pop'), 200);
                 }

            } else { // Hide combo UI if below threshold
                 if (comboElement.style.display !== 'none') {
                     comboElement.style.opacity = '0';
                     setTimeout(() => {
                          comboElement.style.display = 'none'; // Hide after fade
                     }, 300); // Match fade-out duration
                 }
            }
        }
    }
};

export default TargetManager;
