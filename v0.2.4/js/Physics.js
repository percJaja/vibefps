const Physics = {
  world: null,
  playerBody: null,
  
  init() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    
    // 플레이어 물리 몸체 생성
    const playerShape = new CANNON.Sphere(1);
    this.playerBody = new CANNON.Body({
      mass: 5,
      position: new CANNON.Vec3(0, 1.6, 0),
      shape: playerShape,
      material: new CANNON.Material()
    });
    this.world.addBody(this.playerBody);
    
    // 바닥 생성
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape,
      material: new CANNON.Material()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
  },
  
  update(delta) {
    this.world.step(1/60, delta, 3);
  }
};