const Environment = {
  obstacles: [],
  
  init() {
    this.createFloor();
    this.createWalls();
    this.createObstacles(15);
  },
  
  createFloor() {
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    Graphics.scene.add(floor);
  },
  
  createWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
      metalness: 0.1
    });
    
    // 북쪽 벽
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(100, 10, 1), wallMaterial);
    northWall.position.set(0, 5, -50);
    northWall.receiveShadow = true;
    northWall.castShadow = true;
    Graphics.scene.add(northWall);
    
    // 남쪽 벽
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(100, 10, 1), wallMaterial);
    southWall.position.set(0, 5, 50);
    southWall.receiveShadow = true;
    southWall.castShadow = true;
    Graphics.scene.add(southWall);
    
    // 동쪽 벽
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 100), wallMaterial);
    eastWall.position.set(50, 5, 0);
    eastWall.receiveShadow = true;
    eastWall.castShadow = true;
    Graphics.scene.add(eastWall);
    
    // 서쪽 벽
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(1, 10, 100), wallMaterial);
    westWall.position.set(-50, 5, 0);
    westWall.receiveShadow = true;
    westWall.castShadow = true;
    Graphics.scene.add(westWall);
    
    // 물리 엔진용 벽 추가
    this.addWallBody(new CANNON.Vec3(0, 5, -50), new CANNON.Vec3(50, 5, 0.5));
    this.addWallBody(new CANNON.Vec3(0, 5, 50), new CANNON.Vec3(50, 5, 0.5));
    this.addWallBody(new CANNON.Vec3(50, 5, 0), new CANNON.Vec3(0.5, 5, 50));
    this.addWallBody(new CANNON.Vec3(-50, 5, 0), new CANNON.Vec3(0.5, 5, 50));
  },
  
  addWallBody(position, halfExtents) {
    const wallShape = new CANNON.Box(halfExtents);
    const wallBody = new CANNON.Body({
      mass: 0,
      position: position,
      shape: wallShape
    });
    Physics.world.addBody(wallBody);
  },
  
  createObstacles(count) {
    for (let i = 0; i < count; i++) {
      const obstacleGeometry = new THREE.BoxGeometry(
        Math.random() * 3 + 1,
        Math.random() * 3 + 1,
        Math.random() * 3 + 1
      );
      const obstacleMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5),
        roughness: 0.7,
        metalness: 0.2
      });
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      
      obstacle.position.x = Math.random() * 80 - 40;
      obstacle.position.y = obstacleGeometry.parameters.height / 2;
      obstacle.position.z = Math.random() * 80 - 40;
      
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      Graphics.scene.add(obstacle);
      
      // 장애물 물리 몸체 추가
      const obstacleShape = new CANNON.Box(new CANNON.Vec3(
        obstacleGeometry.parameters.width / 2,
        obstacleGeometry.parameters.height / 2,
        obstacleGeometry.parameters.depth / 2
      ));
      const obstacleBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(obstacle.position.x, obstacle.position.y, obstacle.position.z),
        shape: obstacleShape
      });
      Physics.world.addBody(obstacleBody);
      
      this.obstacles.push({
        mesh: obstacle,
        body: obstacleBody
      });
    }
  }
};
