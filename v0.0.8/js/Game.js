const Game = {
  gameStarted: false,
  score: 0,
  ammo: 30,
  maxAmmo: 30,
  timeLeft: 60,
  health: 100,
  playerVelocity: new THREE.Vector3(),
  playerDirection: new THREE.Vector3(),
  timerInterval: null,
  isInitialized: false,
  assetsLoaded: false,
  
  // 부모 창과 통신하는 함수
  sendGameState(state) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'gameStateUpdate',
        state: state // 'menu', 'playing', 'gameOver' 중 하나
      }, '*');
    }
  },
  
  init() {
    // 이미 초기화된 경우 중복 실행 방지
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    console.log("Game.init() 호출됨");
    
    // 모든 종속성이 로드되었는지 확인하고 초기화
    if (typeof THREE !== 'undefined' && typeof CANNON !== 'undefined') {
      this.initializeModules();
    } else {
      // 종속성이 로드될 때까지 대기
      this.waitForDependencies()
        .then(() => {
          this.initializeModules();
        })
        .catch(error => {
          console.error('Game initialization failed:', error);
          // 초기화 실패 시 3초 후 재시도
          setTimeout(() => {
            this.isInitialized = false;
            this.init();
          }, 3000);
        });
    }
  },
  
  // 모든 게임 모듈 초기화
  initializeModules() {
    console.log("Initializing game modules...");
    
    // 엔진 및 모듈 초기화
    Graphics.init();
    Physics.init();
    Graphics.setupLights();
    Environment.init();
    
    // 파티클 시스템 초기화 (추가됨)
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.init();
    }
    
    TargetManager.init();
    AudioManager.init();
    InputManager.init();
    
    // 플레이어 위치 조정 - 바닥에서 시작하도록 설정
    Physics.playerBody.position.set(0, 1.6, 0);
    Physics.playerBody.velocity.set(0, 0, 0);
    
    // 카메라 회전 순서 초기화 (중요!)
    Graphics.camera.rotation.order = 'YXZ';
    
    // UI 이벤트 설정
    this.setupUIEvents();
    
    // 설정 로드
    GameSettings.loadSettings();
    
    // 모든 리소스 로드 완료 표시
    this.assetsLoaded = true;
    
    console.log('Game initialized successfully');
    
    // 부모 창에 준비 상태 알림
    this.sendGameState('ready');
  },
  
  // 외부 라이브러리 로드 대기 함수
  waitForDependencies() {
    return new Promise((resolve, reject) => {
      // 최대 대기 시간 (10초)
      const maxWaitTime = 10000;
      const startTime = Date.now();
      
      const checkLibraries = () => {
        // THREE와 CANNON이 모두 로드되었는지 확인
        if (typeof THREE !== 'undefined' && typeof CANNON !== 'undefined') {
          resolve();
          return;
        }
        
        // 최대 대기 시간 초과 시 실패
        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error('Dependencies loading timeout'));
          return;
        }
        
        // 100ms 간격으로 재확인
        setTimeout(checkLibraries, 100);
      };
      
      checkLibraries();
    });
  },
  
  setupUIEvents() {
    // 시작 화면
    const startButton = document.getElementById('startButton');
    if (startButton) {
      startButton.addEventListener('click', () => {
        document.getElementById('startScreen').style.display = 'none';
        this.startGame();
      });
    }
    
    // 게임 오버 화면
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        location.reload(); // 리로드로 재시작
      });
    }
    
    // 설정 화면
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        this.showSettings();
      });
    }
    
    const saveSettingsButton = document.getElementById('saveSettings');
    if (saveSettingsButton) {
      saveSettingsButton.addEventListener('click', () => {
        GameSettings.saveSettings();
        document.getElementById('settingsScreen').style.display = 'none';
        if (this.gameStarted) {
          Graphics.renderer.domElement.requestPointerLock();
        }
      });
    }
    
    const cancelSettingsButton = document.getElementById('cancelSettings');
    if (cancelSettingsButton) {
      cancelSettingsButton.addEventListener('click', () => {
        document.getElementById('settingsScreen').style.display = 'none';
        GameSettings.loadSettings();
        if (this.gameStarted) {
          Graphics.renderer.domElement.requestPointerLock();
        }
      });
    }
  },
  
  startGame() {
    console.log("Game.startGame() 호출됨");
    // 모든 리소스가 로드되지 않았으면 대기
    if (!this.assetsLoaded) {
      console.log('게임 리소스 로드 중... 0.5초 후 다시 시도');
      setTimeout(() => this.startGame(), 500);
      return;
    }
    
    console.log("게임 시작 실행");
    this.gameStarted = true;
    this.sendGameState('playing'); // 게임 시작 상태 알림
    
    this.score = 0;
    this.ammo = this.maxAmmo;
    this.timeLeft = 60;
    this.health = 100;
    
    // UI 업데이트
    document.getElementById('score').textContent = this.score;
    document.getElementById('ammo').textContent = this.ammo;
    document.getElementById('maxAmmo').textContent = this.maxAmmo;
    document.getElementById('timer').textContent = this.timeLeft;
    document.getElementById('healthFill').style.width = '100%';

    // 모바일 브라우저 동작 제한 (스크롤 방지)
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    this.startTimer();
    AudioManager.playMusic();
    this.animate();
    
    // 포인터 락 요청
    try {
      Graphics.renderer.domElement.requestPointerLock();
    } catch (e) {
      console.warn('Pointer lock request failed:', e);
    }
  },
  
  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      document.getElementById('timer').textContent = this.timeLeft;
      
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.gameOver();
      }
    }, 1000);
  },
  
  gameOver() {
    this.gameStarted = false;
    AudioManager.pauseMusic();
    clearInterval(this.timerInterval);
    
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // 모바일 브라우저 동작 제한 해제
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    
    document.getElementById('finalScore').textContent = this.score;
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    // 부모 창에 게임 오버 상태 알림
    this.sendGameState('gameOver');
  },
  
  shoot() {
    if (!this.gameStarted || this.ammo <= 0) {
      if (this.ammo <= 0) {
        AudioManager.play('emptyGun');
      }
      return;
    }
    
    this.ammo--;
    document.getElementById('ammo').textContent = this.ammo;
    
    Graphics.createGunFlash();
    AudioManager.play('shoot');
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), Graphics.camera);
    
    TargetManager.checkHit(raycaster);
  },
  
  reload() {
    if (this.ammo < this.maxAmmo) {
      AudioManager.play('reload');
      this.ammo = this.maxAmmo;
      document.getElementById('ammo').textContent = this.ammo;
    }
  },
  
  addScore(points) {
    this.score += points;
    document.getElementById('score').textContent = this.score;
  },
  
  takeDamage(amount) {
    this.health -= amount;
    this.health = Math.max(0, this.health);
    document.getElementById('healthFill').style.width = `${this.health}%`;
    
    if (this.health <= 0) {
      this.gameOver();
    }
  },
  
  updatePlayer(delta) {
    if (!this.gameStarted) return;
    
    this.playerDirection.z = Number(InputManager.keys.moveBackward) - Number(InputManager.keys.moveForward);
    this.playerDirection.x = Number(InputManager.keys.moveRight) - Number(InputManager.keys.moveLeft);
    this.playerDirection.normalize();
    
    // 중요 변경 사항: 카메라의 rotation.y 대신 InputManager의 cameraYaw 사용
    const yawRotation = new THREE.Euler(0, InputManager.cameraYaw, 0);
    this.playerDirection.applyEuler(yawRotation);
    
    const speed = 5;
    this.playerVelocity.x = this.playerDirection.x * speed * delta;
    this.playerVelocity.z = this.playerDirection.z * speed * delta;
    
    Physics.playerBody.velocity.x = this.playerVelocity.x * 20;
    Physics.playerBody.velocity.z = this.playerVelocity.z * 20;
    
    Graphics.camera.position.x = Physics.playerBody.position.x;
    Graphics.camera.position.y = Physics.playerBody.position.y;
    Graphics.camera.position.z = Physics.playerBody.position.z;
  },
  
  showSettings() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    GameSettings.loadSettings();
    document.getElementById('settingsScreen').style.display = 'flex';
  },
  
  animate() {
    if (!this.gameStarted) return;
    
    requestAnimationFrame(this.animate.bind(this));
    const delta = Graphics.clock.getDelta();
    
    Physics.update(delta);
    this.updatePlayer(delta);
    TargetManager.update();
    
    Graphics.renderer.render(Graphics.scene, Graphics.camera);
  }
};

// 부모 창으로부터 오는 메시지 처리
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message && message.type === 'checkGameState') {
    // 현재 게임 상태 확인 및 전송
    if (Game.gameStarted) {
      Game.sendGameState('playing');
    } else {
      if (document.getElementById('gameOverScreen').style.display === 'flex') {
        Game.sendGameState('gameOver');
      } else {
        Game.sendGameState('menu');
      }
    }
  }
});

// DOMContentLoaded 대신 즉시 실행 구문 사용
// 병렬 로드를 위한 지연 초기화
(function() {
  // 직접 호출하지 않고 타이머를 사용하여 비동기 초기화
  // 이렇게 하면 DOM이 완전히 로드되지 않았더라도 초기화 과정이 시작됨
  setTimeout(function() {
    // Game.init은 내부적으로 의존성 검사를 함
    Game.init();
  }, 10);
})();
