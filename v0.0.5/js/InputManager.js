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
    joystickPosition: { x: 0, y: 0 },
    lookActive: false,
    lookStart: { x: 0, y: 0 },
    lookCurrent: { x: 0, y: 0 }
  },
  pointerLocked: false,
  isMobile: false,
  
  // 카메라 조작을 위한 변수 추가
  cameraPitch: 0,
  cameraYaw: 0,
  
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
      if (this.touch.joystickActive && e.touches.length > 0) {
        e.preventDefault();
        this.updateJoystickPosition(e.touches[0]);
      }
      
      // 모바일에서 시점 변경 (화면 오른쪽 부분 터치시)
      if (Game.gameStarted && e.touches.length > 0) {
        const touch = e.touches[0];
        const screenWidth = window.innerWidth;
        
        // 화면 오른쪽 절반에서 터치시 시점 변경
        if (touch.clientX > screenWidth / 2) {
          if (!this.touch.lookActive) {
            this.touch.lookActive = true;
            this.touch.lookStart.x = touch.clientX;
            this.touch.lookStart.y = touch.clientY;
            this.touch.lookCurrent.x = touch.clientX;
            this.touch.lookCurrent.y = touch.clientY;
          } else {
            const deltaX = touch.clientX - this.touch.lookCurrent.x;
            const deltaY = touch.clientY - this.touch.lookCurrent.y;
            
            // 쿼터니언 기반 회전으로 수정
            this.cameraYaw -= deltaX * 0.01;
            this.cameraPitch -= deltaY * 0.01;
            
            // pitch 제한 (-89도 ~ 89도)
            this.cameraPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.cameraPitch));
            
            // 카메라 방향 업데이트
            this.updateCameraRotation();
            
            this.touch.lookCurrent.x = touch.clientX;
            this.touch.lookCurrent.y = touch.clientY;
          }
        }
      }
    });
    
    document.addEventListener('touchend', (e) => {
      // 모든 터치가 끝났는지 확인
      let joystickTouchEnded = true;
      let lookTouchEnded = true;
      
      // 남아있는 터치가 있는지 확인
      if (e.touches.length > 0) {
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          const joystickRect = joystick.getBoundingClientRect();
          const touchInJoystick = (
            touch.clientX >= joystickRect.left &&
            touch.clientX <= joystickRect.right &&
            touch.clientY >= joystickRect.top &&
            touch.clientY <= joystickRect.bottom
          );
          
          if (touchInJoystick) {
            joystickTouchEnded = false;
          }
          
          if (touch.clientX > window.innerWidth / 2) {
            lookTouchEnded = false;
          }
        }
      }
      
      // 조이스틱 터치가 끝났을 때만 리셋
      if (joystickTouchEnded && this.touch.joystickActive) {
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
      
      // 시점 변경 터치가 끝났을 때만 리셋
      if (lookTouchEnded) {
        this.touch.lookActive = false;
      }
    });
    
    // 발사 버튼 이벤트 (이벤트 전파 중단)
    shootButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation(); // 이벤트 전파 중단
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
    
    // 이동 키 상태 업데이트 (수정: 방향이 바뀌었던 문제 수정)
    this.keys.moveForward = deltaY < -0.3;
    this.keys.moveBackward = deltaY > 0.3;
    this.keys.moveLeft = deltaX < -0.3;
    this.keys.moveRight = deltaX > 0.3;
  },
  
  onKeyDown(event) {
    if (!Game.gameStarted) return;
    
    const key = event.code;
    
    // 이동 키 매핑 수정
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
    
    // 마우스 이동을 yaw와 pitch 값에 적용
    this.cameraYaw -= movementX * 0.002;
    this.cameraPitch -= movementY * 0.002;
    
    // pitch 제한 (-89도 ~ 89도, 수직에서 약간 여유 줌)
    this.cameraPitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.cameraPitch));
    
    // 카메라 방향 업데이트
    this.updateCameraRotation();
  },
  
  // 새로 추가한 쿼터니언 기반 카메라 회전 함수
  updateCameraRotation() {
    // 회전 순서를 ZYX로 설정 (기존 ThreeJS 기본값은 XYZ)
    Graphics.camera.rotation.order = 'YXZ';
    
    // 쿼터니언을 사용하여 회전 계산
    const quaternion = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(0, this.cameraYaw, 0, 'YXZ'))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(this.cameraPitch, 0, 0, 'YXZ')));
    
    // 회전 행렬로 변환
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
    
    // 카메라 회전 적용 (오일러 각으로 다시 변환)
    Graphics.camera.rotation.setFromRotationMatrix(rotationMatrix);
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
