const TargetManager = {
  targets: [],
  
  init() {
    this.createTargets(20);
  },
  
  createTargets(count) {
    const targetGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x330000
    });
    
    for (let i = 0; i < count; i++) {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.position.x = Math.random() * 80 - 40;
      target.position.y = Math.random() * 5 + 1;
      target.position.z = Math.random() * 80 - 40;
      target.castShadow = true;
      target.receiveShadow = true;
      Graphics.scene.add(target);
      
      this.targets.push({
        mesh: target,
        active: true,
        respawnTime: 0
      });
    }
  },
  
  update() {
    // 타겟 리스폰 처리
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (!target.active && Game.timeLeft <= target.respawnTime) {
        target.active = true;
        target.mesh.visible = true;
        target.mesh.position.x = Math.random() * 80 - 40;
        target.mesh.position.y = Math.random() * 5 + 1;
        target.mesh.position.z = Math.random() * 80 - 40;
      }
    }
  },
  
  checkHit(raycaster) {
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (!target.active) continue;
      
      const intersects = raycaster.intersectObject(target.mesh);
      if (intersects.length > 0) {
        target.active = false;
        target.mesh.visible = false;
        target.respawnTime = Game.timeLeft - 5; // 5초 후 리스폰
        
        Game.addScore(10);
        Graphics.showHitMarker();
        AudioManager.play('hit');
        
        return true;
      }
    }
    return false;
  }
};
