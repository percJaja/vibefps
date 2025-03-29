/**
 * @file ParticleSystem.js
 * @description Manages particle effects for impacts and explosions.
 *
 * !! WARNING !!
 * This implementation uses individual THREE.Mesh objects per particle.
 * This is **EXTREMELY INEFFICIENT** for large numbers of particles and WILL cause
 * performance issues in a real game.
 * It serves as a functional placeholder to meet the interface requirements of
 * BulletPhysicsSystem.
 *
 * TODO: Replace this entire implementation with a performant solution using:
 *   - THREE.InstancedMesh for debris/mesh-based particles.
 *   - THREE.Points with custom shaders for sprite-like particles.
 *   - Object pooling for particle instances/systems.
 * !! WARNING !!
 */
const ParticleSystem = {
    particles: [],       // Holds individual active particle meshes
    particleGroups: [],  // Holds groups containing particles for organizational cleanup
    scene: null,         // Reference to the main THREE.Scene, injected via init

    /**
     * Initializes the Particle System.
     * @param {object} dependencies - Required dependencies.
     * @param {THREE.Scene} dependencies.scene - The main THREE.js scene.
     */
    init(dependencies) {
        if (!dependencies || !dependencies.scene) {
            console.error("ParticleSystem.init: Missing required 'scene' dependency!");
            return;
        }
        this.scene = dependencies.scene;
        this.particles = [];
        this.particleGroups = [];
        console.log("ParticleSystem Initialized (Placeholder Implementation)");
    },

    /**
     * Creates particles for a bullet impact effect.
     * (Placeholder Implementation - Performance Intensive!)
     * @param {object} config - Impact configuration data.
     * @param {THREE.Vector3} config.position - World position of the impact.
     * @param {THREE.Vector3} config.normal - World surface normal at the impact point.
     * @param {number} [config.color=0xaaaaaa] - Base hex color for particles.
     * @param {number} [config.count=15] - Number of particles to create.
     * @param {number} [config.size=0.05] - Base size of particles.
     * @param {number} [config.speed=8] - Base speed of particles.
     * @param {number} [config.spread=0.6] - Spread angle (radians) relative to normal.
     * @param {number} [config.duration=800] - Average particle lifetime (ms).
     * @param {object} [config.materialProps] - Properties of the hit material (e.g., sparks, splinters).
     */
    createImpactParticles(config) {
        // console.log("Creating Impact Particles (Placeholder):", config); // Debug

        const {
            position,
            normal,
            color = 0xaaaaaa,
            count = 15,
            size = 0.05,
            speed = 8,
            spread = 0.6, // Approx 35 degrees cone
            duration = 800,
            materialProps = {}
        } = config;

        if (!this.scene || !position || !normal) return null;

        // Determine particle type based on material (simplified)
        let particleColor = materialProps.effects?.particleColor || color;
        let useEffects = materialProps.effects || {};

        // Simple Material for placeholder (should reuse materials in InstancedMesh)
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide // Important for thin planes
        });

        const particleGroup = new THREE.Group();
        this.scene.add(particleGroup);

        const startTime = performance.now();
        const maxLifeTime = duration + 500; // Add buffer

        // Get orthogonal vectors to the normal for spreading
        const tangent1 = new THREE.Vector3();
        const tangent2 = new THREE.Vector3();
        if(Math.abs(normal.x) > Math.abs(normal.z)){
             tangent1.set(-normal.y, normal.x, 0).normalize();
        } else {
             tangent1.set(0, -normal.z, normal.y).normalize();
        }
        tangent2.crossVectors(normal, tangent1);

        for (let i = 0; i < count; i++) {
            // --- Inefficient Geometry/Mesh Creation (Placeholder) ---
            let particleGeometry;
            // Vary shape slightly - placeholder logic
            const shapeType = Math.random();
            if (useEffects.sparks || useEffects.splinters || shapeType < 0.4) { // Simple thin shard
                 particleGeometry = new THREE.PlaneGeometry(size * (0.5 + Math.random()), size * (0.1 + Math.random() * 0.3));
             } else if (shapeType < 0.8) { // Small sphere chunk
                 particleGeometry = new THREE.SphereGeometry(size * (0.2 + Math.random() * 0.4), 4, 2);
             } else { // Small box chunk
                 particleGeometry = new THREE.BoxGeometry(size * (0.3 + Math.random()*0.3), size * (0.3 + Math.random()*0.3), size * (0.3 + Math.random()*0.3));
             }
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone()); // Clone material is also inefficient
            // ---------------------------------------------------------

            particle.position.copy(position); // Start at hit point

            particle.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

            // Calculate velocity direction within the spread cone around the normal
            const angle = Math.random() * spread * 0.5; // Angle from normal
            const rotationAroundNormal = Math.random() * Math.PI * 2;

             // Start with normal direction
             const velocityDir = normal.clone();
             // Rotate towards tangent1 by 'angle'
             velocityDir.applyAxisAngle(tangent2, angle);
            // Rotate around original normal
             velocityDir.applyAxisAngle(normal, rotationAroundNormal);


            const particleSpeed = speed * (0.7 + Math.random() * 0.6); // Speed variation
            const velocity = velocityDir.multiplyScalar(particleSpeed);

            // Add slight outward velocity from center if desired
            // velocity.addScaledVector(particle.position.clone().sub(position).normalize(), speed * 0.1);

            const rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10
            );

            const life = (duration / 1000) * (0.7 + Math.random() * 0.6); // Lifetime variation

            particle.userData = {
                velocity: velocity, rotationSpeed: rotationSpeed,
                life: life, startLife: life,
                startOpacity: particleMaterial.opacity,
                creationTime: startTime // Use performance.now() based time
            };

            particleGroup.add(particle);
            this.particles.push(particle);
        }

        this.particleGroups.push({
            group: particleGroup,
            particles: [...this.particles.slice(-count)], // Reference recently added particles
            creationTime: startTime,
            maxLifeTime: maxLifeTime / 1000 // Store max life in seconds
        });

        return particleGroup;
    },


    /**
     * Creates a large explosion effect, e.g., for obstacle destruction.
     * (Placeholder Implementation - Performance Intensive!)
     * @param {object} config - Explosion configuration data.
     * @param {THREE.Vector3} config.position - World position of the explosion center.
     * @param {number} [config.color=0xff8800] - Base hex color.
     * @param {number} [config.count=50] - Number of particles.
     * @param {number} [config.size=0.15] - Base size.
     * @param {number} [config.speed=12] - Base speed.
     * @param {number} [config.duration=1500] - Average lifetime (ms).
     * @param {object} [config.materialProps] - Properties of the destroyed material.
     */
    createExplosion(config) {
        // console.log("Creating Explosion (Placeholder):", config); // Debug

         const {
            position,
            color = 0xff8800,
            count = 50,
            size = 0.15,
            speed = 12,
            duration = 1500,
            materialProps = {}
        } = config;

         if (!this.scene || !position ) return null;

         // This implementation reuses the _createDebrisCluster logic but with different parameters.
         // In a real system, this might trigger smoke, fire, and debris.
         return this._createDebrisCluster(position, materialProps.effects?.particleColor || color, count, size, speed, duration);
    },

    /**
     * Internal helper to create a cluster of debris-like particles.
     * (Placeholder Implementation - Performance Intensive!)
     * Use createImpactParticles or createExplosion externally.
     */
     _createDebrisCluster(position, color, count, size, speed, duration) {

        // Simple Material for placeholder
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95,
             side: THREE.DoubleSide
        });

        const particleGroup = new THREE.Group();
        this.scene.add(particleGroup);

        const startTime = performance.now();
        const maxLifeTime = duration + 800; // Add buffer

        for (let i = 0; i < count; i++) {
            // --- Inefficient Geometry/Mesh Creation (Placeholder) ---
             let particleGeometry;
             const shapeType = Math.random();
              if (shapeType < 0.4) { // Shard
                  particleGeometry = new THREE.PlaneGeometry(size * (0.5 + Math.random()), size * (0.2 + Math.random() * 0.4));
              } else if (shapeType < 0.8) { // Sphere chunk
                  particleGeometry = new THREE.SphereGeometry(size * (0.2 + Math.random() * 0.5), 5, 3);
              } else { // Box chunk
                  particleGeometry = new THREE.BoxGeometry(size * (0.4 + Math.random()*0.4), size * (0.4 + Math.random()*0.4), size * (0.4 + Math.random()*0.4));
              }
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
            // ---------------------------------------------------------

            // Start slightly offset from center
            particle.position.copy(position).add(
                 new THREE.Vector3( (Math.random()-0.5) * size * 2, (Math.random()-0.5) * size * 2, (Math.random()-0.5) * size * 2 )
             );

            particle.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

            // Velocity outward from center
            const velocityDir = new THREE.Vector3().randomDirection(); // Random direction
             const particleSpeed = speed * (0.5 + Math.random());
             const velocity = velocityDir.multiplyScalar(particleSpeed);
             // Add slight upward bias to explosions
             velocity.y += speed * 0.3 * Math.random();


            const rotationSpeed = new THREE.Vector3(
                (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8
            );

            const life = (duration / 1000) * (0.6 + Math.random() * 0.8); // Longer, more varied lifetime for explosions

            particle.userData = {
                velocity: velocity, rotationSpeed: rotationSpeed,
                life: life, startLife: life,
                startOpacity: particleMaterial.opacity,
                creationTime: startTime
            };

            particleGroup.add(particle);
            this.particles.push(particle);
        }

         this.particleGroups.push({
            group: particleGroup,
            particles: [...this.particles.slice(-count)],
            creationTime: startTime,
            maxLifeTime: maxLifeTime / 1000 // Store max life in seconds
        });

        return particleGroup;
    },


    /**
     * Updates particle positions, lifetimes, and opacity.
     * @param {number} delta - Time delta since last frame (in seconds).
     */
    update(delta) {
        if (!this.scene) return;

        const now = performance.now() / 1000; // Current time in seconds
        const removedParticles = []; // Keep track of particles removed in this frame

        // Update individual particles
        for (let i = this.particles.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
            const particle = this.particles[i];
            const data = particle.userData;

            if (!data || data.life <= 0) { // Check if particle should be removed
                 removedParticles.push({particle: particle, index: i});
                 continue; // Skip update if life is zero or less
            }


             // Reduce life
             data.life -= delta;

             // If life ended this frame, mark for removal and skip further updates
             if(data.life <= 0) {
                  removedParticles.push({particle: particle, index: i});
                  continue;
             }


            // Update position
            particle.position.addScaledVector(data.velocity, delta);

            // Update rotation
            particle.rotation.x += data.rotationSpeed.x * delta;
            particle.rotation.y += data.rotationSpeed.y * delta;
            particle.rotation.z += data.rotationSpeed.z * delta;

            // Apply gravity
             const gravity = 9.8 * 2.0; // Stronger gravity for particles
            data.velocity.y -= gravity * delta;

            // Apply damping/drag (simple linear damping)
            data.velocity.multiplyScalar(Math.max(0, 1.0 - delta * 1.5)); // Dampen faster

            // Fade out based on life
             if (particle.material && particle.material.opacity !== undefined) {
                 particle.material.opacity = Math.max(0, data.startOpacity * (data.life / data.startLife));
             }

             // Optional: Shrink near end of life
             if (data.life < data.startLife * 0.3) {
                const scale = Math.max(0.1, data.life / (data.startLife * 0.3));
                 particle.scale.setScalar(scale);
             }


             // Simple floor collision/removal
             if (particle.position.y < -0.1) {
                  data.life = 0; // Mark for removal
                  removedParticles.push({particle: particle, index: i});
             }
        }

         // Remove particles marked for removal (ensures indices are correct)
         // Sort by index descending to remove from end without shifting indices
         removedParticles.sort((a, b) => b.index - a.index);
         removedParticles.forEach(item => {
             const particle = item.particle;
             if (particle.parent) {
                 particle.parent.remove(particle);
             }
             // Dispose resources
             particle.geometry?.dispose();
             // Material might be shared in a real system, handle disposal carefully
             if (particle.material && typeof particle.material.dispose === 'function') {
                // Check if it's a cloned material specific to this particle
                // In this placeholder, we clone, so we dispose.
                 particle.material.dispose();
             }
             this.particles.splice(item.index, 1); // Remove from active array
         });


        // Update and cleanup organizational groups
        for (let i = this.particleGroups.length - 1; i >= 0; i--) {
            const system = this.particleGroups[i];
            const systemAge = now - (system.creationTime / 1000); // Age in seconds

            // Remove group if it's too old OR contains no more active particles managed by this system
             let hasActiveParticles = false;
             // Extremely inefficient check for placeholder. In reality, pool would manage lifetime.
             // for(const p of system.particles){
             //     if(this.particles.includes(p)){ hasActiveParticles = true; break;}
             // }

            if (systemAge > system.maxLifeTime /* || !hasActiveParticles */ ) {
                 if (system.group.parent) {
                     system.group.parent.remove(system.group);
                 }
                 // Ensure particles in this group were already handled above
                 // or add specific cleanup here if needed.
                 this.particleGroups.splice(i, 1);
            }
        }
    },
};

export default ParticleSystem;
