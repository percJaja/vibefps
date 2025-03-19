const InputManager = {
  keys: {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false
  },
  mouse: {
    x: 0,
    y: 0
  },
  touch: {
    joystickActive: false,
    joystickPosition: { x: 0, y: 0 }
  },
  pointerLocked: false,
  isMobile: false,
  
  init() {
    // 모바일 감지
    this.checkMobile();
    
    // 키보드 이벤트
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    
    // 마우스 이벤트
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('click', this.onClick.bind(this));
    
    // 포인터 락 이벤트
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    
    // 모바일 컨트롤 설정
    if (this.isMobile) {
      this.setupMobileControls();
    }
  },
  
  checkMobile() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
      document.getElementById('mobileControls').style.display = 'flex';
    }
  },
  
  setupMobileControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const shootButton = document.getElementById('shootButton');
    
    // 조이스틱 터치 이벤트
    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touch.joystickActive = true;
      this.updateJoystickPosition(e.touches[0]);
    });
    
    document.addEventListener('touchmove', (e) => {
      if (this.touch.joystickActive) {
        e.preventDefault();
        this.updateJoystickPosition(e.touches[0]);
      }
    });
    
    document.addEventListener('touchend', (e) => {
      if (this.touch.joystickActive) {
        e.preventDefault();
        this.touch.joystickActive = false;
        this.touch.joystickPosition = { x: 0, y: 0 };
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        
        // 키 리셋
        this.keys.moveForward = false;
        this.keys.moveBackward = false;
        this.keys.moveLeft = false;
        this.keys.moveRight = false;
      }
    });
    
    // 발사 버튼 이벤트
    shootButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      Game.shoot();
    });
  },
  
  updateJoystickPosition(touch) {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    
    const joystickRect = joystick.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    
    // 조이스틱 이동 범위 제한
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = joystickRect.width / 2 - 20;
    
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }
    
    // 노브 위치 업데이트
    joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    
    // 방향 계산 후 업데이트
    this.touch.joystickPosition = {
      x: deltaX / maxDistance,
      y: deltaY / maxDistance
    };
    
    // 이동 키 상태 업데이트
    this.keys.moveForward = deltaY < -0.3;
    this.keys.moveBackward = deltaY > 0.3;
    this.keys.moveLeft = deltaX < -0.3;
    this.keys.moveRight = deltaX > 0.3;
  },
  
  onKeyDown(event) {
    if (!Game.gameStarted) return;
    
    const key = event.code;
    
    if (key === GameSettings.keyBindings.forward) {
      this.keys.moveForward = true;
    } else if (key === GameSettings.keyBindings.backward) {
      this.keys.moveBackward = true;
    } else if (key === GameSettings.keyBindings.left) {
      this.keys.moveLeft = true;
    } else if (key === GameSettings.keyBindings.right) {
      this.keys.moveRight = true;
    } else if (key === GameSettings.keyBindings.jump) {
      if (Physics.playerBody.position.y <= 1.7) {
        Physics.playerBody.velocity.y = 7;
        AudioManager.play('jump');
      }
    } else if (key === GameSettings.keyBindings.reload) {
      Game.reload();
    }
  },
  
  onKeyUp(event) {
    if (!Game.gameStarted) return;
    
    const key = event.code;
    
    if (key === GameSettings.keyBindings.forward) {
      this.keys.moveForward = false;
    } else if (key === GameSettings.keyBindings.backward) {
      this.keys.moveBackward = false;
    } else if (key === GameSettings.keyBindings.left) {
      this.keys.moveLeft = false;
    } else if (key === GameSettings.keyBindings.right) {
      this.keys.moveRight = false;
    }
  },
  
  onMouseMove(event) {
    if (!Game.gameStarted || !this.pointerLocked) return;
    
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;
    
    Graphics.camera.rotation.y -= movementX * 0.002;
    Graphics.camera.rotation.x -= movementY * 0.002;
    
    // 상하 회전 제한
    Graphics.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, Graphics.camera.rotation.x));
  },
  
  onClick() {
    if (!Game.gameStarted) return;
    
    if (!this.pointerLocked) {
      Graphics.renderer.domElement.requestPointerLock();
    } else {
      Game.shoot();
    }
  },
  
  onPointerLockChange() {
    this.pointerLocked = document.pointerLockElement === Graphics.renderer.domElement;
  }
};
