/**
 * PortalSystem.js - 게임 포털 관리 모듈
 * 
 * VibeFPS 게임의 시작/종료 포털을 생성하고 관리합니다.
 * 플레이어가 포털에 접촉했을 때 다른 게임으로 이동하는 기능을 제공합니다.
 */
const PortalSystem = {
  startPortal: null,
  exitPortal: null,
  startPortalGroup: null,
  exitPortalGroup: null,
  startPortalBox: null,
  exitPortalBox: null,
  
  // 플레이어 위치/충돌 감지용 변수
  playerPosition: new THREE.Vector3(),
  playerBox: new THREE.Box3(),
  checkInterval: null,
  transitionStarted: false,
  portalParams: null,
  
  init() {
    // URL 매개변수 확인 및 저장
    this.portalParams = new URLSearchParams(window.location.search);
    
    // 포털 생성
    this.createExitPortal();
    
    // 포털에서 들어온 경우 시작 포털 생성
    if (this.portalParams.get('portal')) {
      this.createStartPortal();
    }
    
    // 충돌 감지 이벤트 설정
    this.setupEventListeners();
    
    // 충돌 감지를 위한 주기적 검사 시작
    this.startCollisionDetection();
    
    console.log("PortalSystem 초기화 완료");
  },
  
  setupEventListeners() {
    // 플레이어 위치 변경 이벤트 구독
    EventSystem.on('playerMoved', (data) => {
      if (data && data.position) {
        this.playerPosition.copy(data.position);
        
        // 플레이어 박스 업데이트 (충돌 감지용)
        this.playerBox.setFromCenterAndSize(
          this.playerPosition,
          new THREE.Vector3(1, 2, 1) // 플레이어 크기 근사값
        );
      }
    });
  },
  
  createStartPortal() {
    console.log("시작 포털 생성 중...");
    
    // 포털 그룹 생성
    this.startPortalGroup = new THREE.Group();
    
    // 스폰 위치 설정 (바닥 위 약간 위)
    this.startPortalGroup.position.set(0, 2, -10);
    this.startPortalGroup.rotation.y = Math.PI; // 플레이어 반대 방향으로 설정
    
    // 포털 링 생성
    const portalGeometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    this.startPortalGroup.add(portal);
    
    // 포털 내부 생성
    const innerGeometry = new THREE.CircleGeometry(1.7, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6666,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.z = 0.05; // 약간 앞으로 이동하여 링과 겹치지 않도록
    this.startPortalGroup.add(inner);
    
    // 이전 게임 레이블 생성
    const refUrl = this.portalParams.get('ref');
    if (refUrl) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 64;
      context.fillStyle = '#ffffff';
      context.font = 'bold 28px Arial';
      context.textAlign = 'center';
      context.fillText(`BACK TO ${refUrl.toUpperCase()}`, canvas.width/2, canvas.height/2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelGeometry = new THREE.PlaneGeometry(4, 0.6);
      const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.y = 3;
      label.position.z = 0.1;
      this.startPortalGroup.add(label);
    }
    
    // 파티클 시스템 추가
    const particleCount = 500;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      // 포털 주변에 링 형태로 파티클 생성
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + (Math.random() - 0.5) * 0.6;
      particlePositions[i] = Math.cos(angle) * radius;
      particlePositions[i + 1] = Math.sin(angle) * radius;
      particlePositions[i + 2] = (Math.random() - 0.5) * 0.5;
      
      // 빨간색 계열 색상
      particleColors[i] = 0.8 + Math.random() * 0.2;
      particleColors[i + 1] = 0.1 + Math.random() * 0.2;
      particleColors[i + 2] = 0.1 + Math.random() * 0.2;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
    this.startPortalGroup.add(particleSystem);
    
    // 씬에 포털 추가
    Graphics.scene.add(this.startPortalGroup);
    
    // 충돌 감지용 박스 생성
    this.startPortalBox = new THREE.Box3().setFromObject(this.startPortalGroup);
    
    // 포털 애니메이션 시작
    this.animatePortal(particlesGeometry, inner, 'start');
    
    this.startPortal = {
      group: this.startPortalGroup,
      particlesGeometry: particlesGeometry,
      inner: inner
    };
    
    console.log("시작 포털 생성 완료");
  },
  
  createExitPortal() {
    console.log("종료 포털 생성 중...");
    
    // 포털 그룹 생성
    this.exitPortalGroup = new THREE.Group();
    
    // 게임 환경 반대편에 포털 위치 설정
    this.exitPortalGroup.position.set(30, 2, 30);
    this.exitPortalGroup.rotation.y = -Math.PI / 4; // 대각선 방향으로 설정
    
    // 포털 링 생성
    const portalGeometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });
    const portal = new THREE.Mesh(portalGeometry, portalMaterial);
    this.exitPortalGroup.add(portal);
    
    // 포털 내부 생성
    const innerGeometry = new THREE.CircleGeometry(1.7, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ff66,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.z = 0.05; // 약간 앞으로 이동하여 링과 겹치지 않도록
    this.exitPortalGroup.add(inner);
    
    // 비버스 포털 레이블 생성
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(4, 0.6);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 3;
    label.position.z = 0.1;
    this.exitPortalGroup.add(label);
    
    // 파티클 시스템 추가
    const particleCount = 500;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      // 포털 주변에 링 형태로 파티클 생성
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + (Math.random() - 0.5) * 0.6;
      particlePositions[i] = Math.cos(angle) * radius;
      particlePositions[i + 1] = Math.sin(angle) * radius;
      particlePositions[i + 2] = (Math.random() - 0.5) * 0.5;
      
      // 녹색 계열 색상
      particleColors[i] = 0.1 + Math.random() * 0.2;
      particleColors[i + 1] = 0.8 + Math.random() * 0.2;
      particleColors[i + 2] = 0.1 + Math.random() * 0.2;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(particlesGeometry, particleMaterial);
    this.exitPortalGroup.add(particleSystem);
    
    // 씬에 포털 추가
    Graphics.scene.add(this.exitPortalGroup);
    
    // 충돌 감지용 박스 생성
    this.exitPortalBox = new THREE.Box3().setFromObject(this.exitPortalGroup);
    
    // 포털 애니메이션 시작
    this.animatePortal(particlesGeometry, inner, 'exit');
    
    this.exitPortal = {
      group: this.exitPortalGroup,
      particlesGeometry: particlesGeometry,
      inner: inner
    };
    
    console.log("종료 포털 생성 완료");
  },
  
  animatePortal(particlesGeometry, innerMesh, portalType) {
    const animate = () => {
      // 파티클 애니메이션
      if (particlesGeometry && particlesGeometry.attributes && particlesGeometry.attributes.position) {
        const positions = particlesGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          // 파티클 위치에 사인파 애니메이션 적용
          positions[i + 1] += 0.01 * Math.sin(Date.now() * 0.002 + i * 0.1);
          positions[i] += 0.01 * Math.cos(Date.now() * 0.001 + i * 0.1);
        }
        particlesGeometry.attributes.position.needsUpdate = true;
      }
      
      // 내부 포털 회전
      if (innerMesh) {
        innerMesh.rotation.z += portalType === 'start' ? 0.01 : -0.01;
      }
      
      // 포털 전체 스케일 맥동
      const scale = 1 + 0.05 * Math.sin(Date.now() * 0.002);
      if (portalType === 'start' && this.startPortalGroup) {
        this.startPortalGroup.scale.set(scale, scale, scale);
      } else if (portalType === 'exit' && this.exitPortalGroup) {
        this.exitPortalGroup.scale.set(scale, scale, scale);
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  },
  
  startCollisionDetection() {
    // 매 프레임마다 충돌 검사하지 않고 100ms마다 검사하여 성능 최적화
    this.checkInterval = setInterval(() => {
      this.checkPortalCollisions();
    }, 100);
  },
  
  checkPortalCollisions() {
    // 게임이 시작되지 않았거나 일시정지 상태면 무시
    if (!Game.gameStarted || Game.isSettingsOpen || this.transitionStarted) {
      return;
    }
    
    // 플레이어 위치 수동 업데이트 (이벤트가 구현되지 않은 경우 대비)
    if (Physics && Physics.playerBody) {
      this.playerPosition.set(
        Physics.playerBody.position.x,
        Physics.playerBody.position.y,
        Physics.playerBody.position.z
      );
      
      this.playerBox.setFromCenterAndSize(
        this.playerPosition,
        new THREE.Vector3(1, 2, 1)
      );
    }
    
    // 시작 포털 충돌 검사
    if (this.startPortalBox && this.portalParams.get('portal')) {
      const startPortalDistance = this.playerPosition.distanceTo(this.startPortalBox.getCenter(new THREE.Vector3()));
      
      // 플레이어가 시작 포털 가까이 있고 실제로 충돌하는지 확인
      if (startPortalDistance < 5 && this.playerBox.intersectsBox(this.startPortalBox)) {
        this.enterStartPortal();
      }
    }
    
    // 종료 포털 충돌 검사
    if (this.exitPortalBox) {
      const exitPortalDistance = this.playerPosition.distanceTo(this.exitPortalBox.getCenter(new THREE.Vector3()));
      
      // 플레이어가 종료 포털 가까이 있고 실제로 충돌하는지 확인
      if (exitPortalDistance < 5 && this.playerBox.intersectsBox(this.exitPortalBox)) {
        this.enterExitPortal();
      }
    }
  },
  
  enterStartPortal() {
    // 이미 전환 중이면 무시
    if (this.transitionStarted) return;
    this.transitionStarted = true;
    
    console.log("시작 포털 진입 감지");
    
    // 소리 재생
    if (AudioManager) {
      AudioManager.play('bonusHit');
    }
    
    // 전체 화면 효과
    if (Graphics) {
      Graphics.showBonusEffect();
    }
    
    // ref 파라미터 확인하여 이전 게임으로 돌아가기
    const refUrl = this.portalParams.get('ref');
    if (refUrl) {
      // 현재 URL 파라미터 유지 (단, ref 제외)
      const currentParams = new URLSearchParams(window.location.search);
      const newParams = new URLSearchParams();
      
      for (const [key, value] of currentParams.entries()) {
        if (key !== 'ref') {
          newParams.append(key, value);
        }
      }
      
      // 전체 URL 구성
      let url = refUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const paramString = newParams.toString();
      const finalUrl = url + (paramString ? '?' + paramString : '');
      
      // 잠시 지연 후 이동 (효과 표시를 위해)
      setTimeout(() => {
        window.location.href = finalUrl;
      }, 500);
    }
  },
  
  enterExitPortal() {
    // 이미 전환 중이면 무시
    if (this.transitionStarted) return;
    this.transitionStarted = true;
    
    console.log("종료 포털 진입 감지");
    
    // 소리 재생
    if (AudioManager) {
      AudioManager.play('bonusHit');
    }
    
    // 전체 화면 효과
    if (Graphics) {
      Graphics.showBonusEffect();
    }
    
    // 포털 파라미터 구성
    const currentParams = new URLSearchParams(window.location.search);
    const newParams = new URLSearchParams();
    
    // 필수 파라미터 추가
    newParams.append('portal', 'true');
    newParams.append('username', 'vibefps_player');
    newParams.append('color', 'white');
    newParams.append('speed', '5');
    
    // 현재 URL을 ref로 추가
    newParams.append('ref', window.location.host + window.location.pathname);
    
    // 기존 파라미터 유지 (portal, username, color, speed, ref 제외)
    for (const [key, value] of currentParams.entries()) {
      if (!['portal', 'username', 'color', 'speed', 'ref'].includes(key)) {
        newParams.append(key, value);
      }
    }
    
    const paramString = newParams.toString();
    const portalUrl = 'https://portal.pieter.com' + (paramString ? '?' + paramString : '');
    
    // 백그라운드에서 포털 URL 프리로드
    if (!document.getElementById('preloadFrame')) {
      const iframe = document.createElement('iframe');
      iframe.id = 'preloadFrame';
      iframe.style.display = 'none';
      iframe.src = portalUrl;
      document.body.appendChild(iframe);
    }
    
    // 잠시 지연 후 이동 (효과 표시를 위해)
    setTimeout(() => {
      window.location.href = portalUrl;
    }, 500);
  },
  
  update() {
    // 포털 충돌 박스 업데이트 (애니메이션으로 인한 스케일/위치 변경 반영)
    if (this.startPortalGroup && this.startPortalBox) {
      this.startPortalBox.setFromObject(this.startPortalGroup);
    }
    
    if (this.exitPortalGroup && this.exitPortalBox) {
      this.exitPortalBox.setFromObject(this.exitPortalGroup);
    }
  },
  
  // 정리 함수
  dispose() {
    // 애니메이션 정리
    clearInterval(this.checkInterval);
    
    // 포털 제거
    if (this.startPortalGroup && Graphics.scene) {
      Graphics.scene.remove(this.startPortalGroup);
    }
    
    if (this.exitPortalGroup && Graphics.scene) {
      Graphics.scene.remove(this.exitPortalGroup);
    }
    
    // 이벤트 리스너 정리
    EventSystem.off('playerMoved');
  }
};
