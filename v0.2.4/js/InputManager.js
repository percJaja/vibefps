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
    
    // 설정 버튼 이벤트 추가
    this.setupSettingsButtonEvents();
    
    // 게임 상태 변경 이벤트 리스너 등록 (v0.1.4 추가)
    EventSystem.on('gameStateChanged', this.handleGameStateChange.bind(this));
  },
  
  // 게임 상태 변경 처리 함수 추가 (v0.1.4 추가)
  handleGameStateChange(data) {
    const settingsBtn = document.getElementById('settingsButton');
    if (!settingsBtn) return;
    
    switch (data.state) {
      case 'gameOver':
        break;
      case 'playing':
        // 게임 진행 중 설정 버튼 활성화
        settingsBtn.classList.remove('hidden', 'disabled');
        
        // GitHub 팝업이 닫히고 게임으로 돌아올 때 키 상태 초기화
        if (data.reason === 'githubPopupClosed') {
          this.resetKeys();
        }
        break;
      case 'paused':
        // GitHub 팝업이 열렸을 때 키 상태 초기화
        if (data.reason === 'githubPopup') {
          this.resetKeys();
        }
        break;
      case 'initialized':
      case 'menu':
        // 필요한 경우 다른 상태에 따른 처리를 추가
        break;
    }
  },
  
  checkMobile() {
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
      document.getElementById('mobileControls').style.display = 'flex';
      
      // 모바일 환경에서 추가 UI 최적화
      const settingsBtn = document.getElementById('settingsButton');
      if (settingsBtn) {
        // 버튼 크기 증가
        settingsBtn.style.padding = '10px 15px';
        settingsBtn.style.fontSize = '18px';
      }
    }
  },
  
  setupSettingsButtonEvents() {
    const settingsBtn = document.getElementById('settingsButton');
    if (!settingsBtn) return;
    
    // 모바일 터치 이벤트
    settingsBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 버튼이 disabled 클래스를 가지고 있으면 무시 (v0.1.4 수정)
      if (settingsBtn.classList.contains('disabled')) {
        console.log("설정 버튼 비활성화 상태");
        return;
      }
      
      console.log("설정 버튼 터치됨");
      
      if (typeof Game !== 'undefined') {
        Game.showSettings();
      }
    }, { passive: false });
    
    // 일반 클릭 이벤트도 유지
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 버튼이 disabled 클래스를 가지고 있으면 무시 (v0.1.4 수정)
      if (settingsBtn.classList.contains('disabled')) {
        console.log("설정 버튼 비활성화 상태");
        return;
      }
      
      console.log("설정 버튼 클릭됨");
      
      if (typeof Game !== 'undefined') {
        Game.showSettings();
      }
    });
  },
  
  setupMobileControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const shootButton = document.getElementById('shootButton');
  
    // UI 요소인지 확인하는 헬퍼 함수
    const isUIElement = (element) => {
      return element.closest('#settingsScreen') || 
             element.closest('#settingsButton') || 
             element.closest('#gameOverScreen') || 
             element.closest('#startScreen');
    };
  
    // touchstart 이벤트 - 식별자 할당을 한 곳에서만 수행
    document.addEventListener('touchstart', (e) => {
      // UI 요소 터치는 무시하고 기본 동작 유지
      if (isUIElement(e.target)) {
        return;
      }
      
      // 게임 실행 중이 아니거나 설정 화면이 열려 있으면 무시
      if (!Game.gameStarted || Game.isSettingsOpen) return;
      
      e.preventDefault();
      
      // 각 터치 처리
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        
        // 왼쪽 화면(조이스틱) 터치 처리
        if (touch.clientX < window.innerWidth / 2) {
          // 이미 조이스틱이 활성화되어 있지 않을 때만 새로 할당
          if (!this.touch.joystickActive) {
            this.touch.joystickActive = true;
            this.touch.joystickIdentifier = touch.identifier;
            this.updateJoystickPosition(touch);
            console.log(`왼쪽 터치 시작: 조이스틱 ID ${touch.identifier} 할당`);
          }
        }
        
        // 오른쪽 화면(시점 제어) 터치 처리
        if (touch.clientX > window.innerWidth / 2) {
          // 이미 시점 제어가 활성화되어 있지 않을 때만 새로 할당
          if (!this.touch.lookActive) {
            this.touch.lookActive = true;
            this.touch.lookIdentifier = touch.identifier;
            this.touch.lookStart.x = touch.clientX;
            this.touch.lookStart.y = touch.clientY;
            this.touch.lookCurrent.x = touch.clientX;
            this.touch.lookCurrent.y = touch.clientY;
            console.log(`오른쪽 터치 시작: 시점 제어 ID ${touch.identifier} 할당`);
          }
        }
      }
    }, { passive: false });
  
    // 중요: joystick 엘리먼트에 대한 별도의 touchstart 이벤트는 제거
    // 이 부분이 충돌의 원인이었음
    // joystick.addEventListener('touchstart', ...) 코드 제거
  
    // touchmove 이벤트 - 식별자 기반 터치 처리
    document.addEventListener('touchmove', (e) => {
      // UI 요소 터치는 무시하고 기본 동작 유지
      if (isUIElement(e.target)) {
        return;
      }
      
      // 게임 실행 중이 아니거나 설정 화면이 열려 있으면 무시
      if (!Game.gameStarted || Game.isSettingsOpen) return;
      
      e.preventDefault();
      
      // 모든 현재 터치 처리
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        
        // 조이스틱 터치 처리 (식별자 일치 확인)
        if (this.touch.joystickActive && touch.identifier === this.touch.joystickIdentifier) {
          this.updateJoystickPosition(touch);
        }
        
        // 시점 제어 터치 처리 (식별자 일치 확인)
        if (this.touch.lookActive && touch.identifier === this.touch.lookIdentifier) {
          const deltaX = touch.clientX - this.touch.lookCurrent.x;
          const deltaY = touch.clientY - this.touch.lookCurrent.y;
          
          // 카메라 회전 업데이트
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
    }, { passive: false });
  
    // touchend 이벤트 - 식별자 기반 터치 종료 처리
    document.addEventListener('touchend', (e) => {
      // UI 요소 터치는 무시하고 기본 동작 유지 (게임오버 화면에서 재시작 버튼 등)
      if (isUIElement(e.target)) {
        return;
      }
      
      // 게임 실행 중이 아니면 무시
      if (!Game.gameStarted) return;
      
      e.preventDefault();
      
      // 종료된 터치 처리
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // 조이스틱 터치가 종료되었는지 확인 (식별자 일치 확인)
        if (this.touch.joystickActive && touch.identifier === this.touch.joystickIdentifier) {
          console.log(`조이스틱 터치 종료: ID ${touch.identifier}`);
          this.touch.joystickActive = false;
          this.touch.joystickIdentifier = null;
          this.touch.joystickPosition = { x: 0, y: 0 };
          joystickKnob.style.transform = 'translate(-50%, -50%)';
          
          // 이동 키 상태 리셋
          this.keys.moveForward = false;
          this.keys.moveBackward = false;
          this.keys.moveLeft = false;
          this.keys.moveRight = false;
        }
        
        // 시점 제어 터치가 종료되었는지 확인 (식별자 일치 확인)
        if (this.touch.lookActive && touch.identifier === this.touch.lookIdentifier) {
          console.log(`시점 제어 터치 종료: ID ${touch.identifier}`);
          this.touch.lookActive = false;
          this.touch.lookIdentifier = null;
        }
      }
    }, { passive: false });
    
    // touchcancel 이벤트도 동일하게 처리
    document.addEventListener('touchcancel', (e) => {
      // 위의 touchend와 동일한 로직
      if (isUIElement(e.target)) {
        return;
      }
      
      if (!Game.gameStarted) return;
      
      e.preventDefault();
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        if (this.touch.joystickActive && touch.identifier === this.touch.joystickIdentifier) {
          console.log(`조이스틱 터치 취소: ID ${touch.identifier}`);
          this.touch.joystickActive = false;
          this.touch.joystickIdentifier = null;
          this.touch.joystickPosition = { x: 0, y: 0 };
          joystickKnob.style.transform = 'translate(-50%, -50%)';
          
          this.keys.moveForward = false;
          this.keys.moveBackward = false;
          this.keys.moveLeft = false;
          this.keys.moveRight = false;
        }
        
        if (this.touch.lookActive && touch.identifier === this.touch.lookIdentifier) {
          console.log(`시점 제어 터치 취소: ID ${touch.identifier}`);
          this.touch.lookActive = false;
          this.touch.lookIdentifier = null;
        }
      }
    }, { passive: false });
  
    // 발사 버튼 터치 이벤트
    shootButton.addEventListener('touchstart', (e) => {
      // 게임 실행 중이 아니거나 설정 화면이 열려 있으면 무시
      if (!Game.gameStarted || Game.isSettingsOpen) return;
      
      e.preventDefault();
      e.stopPropagation(); // 이벤트 전파 중단
      Game.shoot();
    }, { passive: false });
    
    // 게임 종료 화면 버튼 이벤트 수동 등록
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
      restartButton.addEventListener('touchstart', (e) => {
        e.stopPropagation(); // 중요: 이벤트 전파 중단
        document.getElementById('gameOverScreen').style.display = 'none';
        location.reload();
      });
    }
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
    // 설정 화면이 열려 있으면 일반 키 입력 무시 (ESC 키 제외)
    if (!Game.gameStarted || (Game.isSettingsOpen && event.code !== 'Escape')) return;
    
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
    // 설정 화면이 열려 있으면 마우스 이동 무시
    if (!Game.gameStarted || Game.isSettingsOpen || !this.pointerLocked) return;
    
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
  
  onClick(event) {
    // 설정 화면이나 다른 UI 요소를 클릭했을 때는 무시
    const settingsScreen = document.getElementById('settingsScreen');
    const settingsButton = document.getElementById('settingsButton');
    const clickedOnSettings = event.target.closest('#settingsScreen') || event.target.closest('#settingsButton');
    
    if (!Game.gameStarted || clickedOnSettings || Game.isSettingsOpen) return;
    
    if (!this.pointerLocked) {
      Graphics.renderer.domElement.requestPointerLock();
    } else {
      Game.shoot();
    }
  },
  
  onPointerLockChange() {
    // 현재 포인터 락 상태 업데이트
    this.pointerLocked = document.pointerLockElement === Graphics.renderer.domElement;
  },

  resetKeys() {
    this.keys.moveForward = false;
    this.keys.moveBackward = false;
    this.keys.moveLeft = false;
    this.keys.moveRight = false;
  }
};
