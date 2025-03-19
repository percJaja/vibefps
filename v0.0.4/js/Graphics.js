const Graphics = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  
  init() {
    // 씬 생성 및 배경색 설정
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    
    // 카메라 생성 및 위치 설정
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.y = 1.6;
    
    // 렌더러 생성 및 설정
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // 클럭 생성
    this.clock = new THREE.Clock();
    
    // 윈도우 리사이즈 이벤트 핸들러
    window.addEventListener('resize', this.onWindowResize.bind(this));
  },
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },
  
  setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  },
  
  createGunFlash() {
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.bottom = '50%';
    flash.style.right = '50%';
    flash.style.width = '50px';
    flash.style.height = '50px';
    flash.style.borderRadius = '50%';
    flash.style.backgroundColor = 'rgba(255, 200, 50, 0.8)';
    flash.style.boxShadow = '0 0 20px 10px rgba(255, 200, 50, 0.5)';
    flash.style.transform = 'translate(50%, 50%)';
    flash.style.opacity = '0.9';
    
    document.getElementById('gunEffects').appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
    }, 100);
  },
  
  showHitMarker() {
    const hitMarker = document.getElementById('hitMarker');
    hitMarker.style.opacity = '1';
    
    setTimeout(() => {
      hitMarker.style.opacity = '0';
    }, 200);
  }
};
