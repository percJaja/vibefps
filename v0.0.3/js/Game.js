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
    // 엔진 및 모듈 초기화
    Graphics.init();
    Physics.init();
    Graphics.setupLights();
    Environment.init();
    TargetManager.init();
    AudioManager.init();
    InputManager.init();
    
    // UI 이벤트 설정
    this.setupUIEvents();
    
    // 설정 로드
    GameSettings.loadSettings();
    
    // 부모 창에 메뉴 상태 알림
    this.sendGameState('menu');
  },
  
  setupUIEvents() {
    // 시작 화면
    document.getElementById('startButton').addEventListener('click', () => {
      document.getElementById('startScreen').style.display = 'none';
      this.startGame();
    });
    
    // 게임 오버 화면
    document.getElementById('restartButton').addEventListener('click', () => {
      document.getElementById('gameOverScreen').style.display = 'none';
      location.reload(); // 리로드로 재시작
    });
    
    // 설정 화면
    document.getElementById('settingsButton').addEventListener('click', () => {
      this.showSettings();
    });
    
    document.getElementById('saveSettings').addEventListener('click', () => {
      GameSettings.saveSettings();
      document.getElementById('settingsScreen').style.display = 'none';
      if (this.gameStarted) {
        Graphics.renderer.domElement.requestPointerLock();
      }
    });
    
    document.getElementById('cancelSettings').addEventListener('click', () => {
      document.getElementById('settingsScreen').style.display = 'none';
      GameSettings.loadSettings();
      if (this.gameStarted) {
        Graphics.renderer.domElement.requestPointerLock();
      }
    });
  },
  
  startGame() {
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
    
    this.startTimer();
    AudioManager.playMusic();
    this.animate();
    Graphics.renderer.domElement.requestPointerLock();
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
    
    this.playerDirection.z = Number(InputManager.keys.moveForward) - Number(InputManager.keys.moveBackward);
    this.playerDirection.x = Number(InputManager.keys.moveRight) - Number(InputManager.keys.moveLeft);
    this.playerDirection.normalize();
    
    this.playerDirection.applyEuler(new THREE.Euler(0, Graphics.camera.rotation.y, 0));
    
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

window.addEventListener('load', () => {
  Game.init();
});
