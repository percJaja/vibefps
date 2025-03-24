/**
 * TimeWeatherSystem.js - 시간대와 날씨 시스템
 * 
 * 게임 환경의 시간대(아침, 낮, 저녁, 밤)와 날씨 효과를 관리합니다.
 * 태양(또는 달) 위치, 조명 색상, 하늘 색상, 안개 등을 조절하여 다양한 분위기를 연출합니다.
 */
const TimeWeatherSystem = {
  // 시간대/날씨 설정
  settings: {
    timeOfDay: 'day',           // 'morning', 'day', 'evening', 'night'
    weather: 'clear',           // 'clear', 'cloudy', 'foggy', 'rainy'
    autoTimeProgression: false, // 자동 시간 진행 여부
    transitionDuration: 10,     // 전환 시간(초)
    dayNightCycleDuration: 600  // 하루 주기 시간(초, 10분)
  },

  // 시간대별 설정값
  timeSettings: {
    morning: {
      skyColor: 0xFFC9B5,        // 분홍빛 하늘
      ambientColor: 0x9D9BAA,    // 부드러운 아침 주변광
      ambientIntensity: 1.5,     // 중간 강도 주변광
      sunColor: 0xFFDFC8,        // 따뜻한 주황빛 태양
      sunIntensity: 0.7,         // 낮은 태양 강도
      sunPosition: { x: -10, y: 8, z: 10 }, // 동쪽에서 낮게 뜨는 태양
      fogColor: 0xFFDDBB,        // 따뜻한 안개 색
      fogDensity: 0.008          // 약간의 아침 안개
    },
    day: {
      skyColor: 0x87CEEB,        // 하늘색
      ambientColor: 0x404040,    // 회색 주변광
      ambientIntensity: 2.0,     // 밝은 주변광
      sunColor: 0xFFFFFF,        // 흰색 태양
      sunIntensity: 1.0,         // 최대 태양 강도
      sunPosition: { x: 10, y: 20, z: 10 }, // 머리 위 높은 태양
      fogColor: 0xC8E1FB,        // 밝은 안개 색
      fogDensity: 0.001          // 거의 없는 안개
    },
    evening: {
      skyColor: 0xFF7F50,        // 주황색 하늘
      ambientColor: 0x443333,    // 따뜻한 주변광
      ambientIntensity: 1.2,     // 중간 강도 주변광
      sunColor: 0xFF7700,        // 주황색 태양
      sunIntensity: 0.6,         // 낮은 태양 강도
      sunPosition: { x: 15, y: 5, z: -10 }, // 서쪽으로 넘어가는 태양
      fogColor: 0xCC7755,        // 황혼 안개 색
      fogDensity: 0.01           // 황혼 안개
    },
    night: {
      skyColor: 0x0A1030,        // 어두운 청색 하늘
      ambientColor: 0x334455,    // 차가운 주변광
      ambientIntensity: 0.5,     // 낮은 주변광
      sunColor: 0xCCDDFF,        // 차가운 달빛
      sunIntensity: 0.3,         // 매우 낮은 강도
      sunPosition: { x: -5, y: 15, z: -10 }, // 달 위치
      fogColor: 0x0A1030,        // 어두운 안개 색
      fogDensity: 0.015          // 짙은 밤 안개
    }
  },

  // 날씨별 설정값
  weatherSettings: {
    clear: {
      fogDensityMultiplier: 1.0, // 기본 안개 곱셈값
      sunIntensityMultiplier: 1.0 // 기본 태양 강도 곱셈값
    },
    cloudy: {
      fogDensityMultiplier: 1.5, // 구름 낀 날씨는 안개가 좀 더 짙음
      sunIntensityMultiplier: 0.7 // 태양 강도 감소
    },
    foggy: {
      fogDensityMultiplier: 3.0, // 매우 짙은 안개
      sunIntensityMultiplier: 0.5 // 태양 강도 크게 감소
    },
    rainy: {
      fogDensityMultiplier: 2.0, // 비 오는 날의 안개
      sunIntensityMultiplier: 0.4 // 태양 강도 크게 감소
    }
  },

  // 내부 변수
  _transitionStartTime: 0,
  _transitionProgress: 1, // 1이면 전환 완료
  _currentSettings: null,
  _targetSettings: null,
  _ambientLight: null,
  _directionalLight: null,
  _rainEffect: null,
  _sunMesh: null,
  _moonMesh: null,
  _sunFlare: null,

  /**
   * 초기화 함수
   */
  init() {
    // Graphics 모듈이 초기화된 후에 실행해야 함
    if (!Graphics || !Graphics.scene) {
      console.error('TimeWeatherSystem: Graphics 모듈이 초기화되지 않았습니다.');
      return;
    }

    // 기존 조명 참조
    this._findLights();

    // 초기 설정 적용
    this._currentSettings = this._getSettingsForTime(this.settings.timeOfDay);
    this._targetSettings = this._currentSettings;
    this.applySettings(this._currentSettings);

    // 태양과 달 초기화
    this._initSunAndMoon();

    // 안개 초기화
    this._initFog();

    // 강우 효과 초기화
    this._initRainEffect();

    // 이벤트 시스템 리스너 등록
    if (typeof EventSystem !== 'undefined') {
      EventSystem.on('gameStateChanged', this._handleGameStateChange.bind(this));
    }

    // 자동 시간 진행이 활성화된 경우 업데이트 루프 시작
    if (this.settings.autoTimeProgression) {
      this._setupAutoProgression();
    }

    console.log(`TimeWeatherSystem 초기화 완료: ${this.settings.timeOfDay}, ${this.settings.weather}`);
  },
  
  /**
   * 태양과 달 메시 초기화
   */
  _initSunAndMoon() {
    if (!Graphics || !Graphics.scene) return;
    
    // 태양 메시 생성 - 적절한 크기로 조정
    const sunGeometry = new THREE.SphereGeometry(4, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFAA,
      transparent: true,
      opacity: 1.0
      // MeshBasicMaterial은 emissive 속성을 지원하지 않음
    });
    this._sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this._sunMesh.renderOrder = 0;
    
    // 태양 위치 설정 (훨씬 멀리)
    this._sunMesh.position.set(0, 500, 0);
    Graphics.scene.add(this._sunMesh);
    
    // 태양 내부 코어 (더 밝은 중심부)
    const sunCoreGeometry = new THREE.SphereGeometry(2.5, 16, 16);
    const sunCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.9
    });
    const sunCore = new THREE.Mesh(sunCoreGeometry, sunCoreMaterial);
    this._sunMesh.add(sunCore);
    
    // 태양 후광 효과 (렌즈 플레어 구현) - 더 크고 밝게
    const sunFlareTexture = this._createFlareTexture();
    const sunFlareMaterial = new THREE.SpriteMaterial({
      map: sunFlareTexture,
      color: 0xFFFFDD,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this._sunFlare = new THREE.Sprite(sunFlareMaterial);
    this._sunFlare.scale.set(15, 15, 1); // 더 큰 후광
    this._sunMesh.add(this._sunFlare);
    
    // 태양 광채 (outer glow) - 더 넓은 범위의 빛 효과
    const sunGlowGeometry = new THREE.SphereGeometry(6, 16, 16);
    const sunGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF80,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide // 안쪽이 아닌 바깥쪽을 렌더링
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    this._sunMesh.add(sunGlow);
    
    // 태양 광선 효과 (방사형 빛)
    this._sunRays = this._createSunRays();
    this._sunMesh.add(this._sunRays);
    
    // 달 메시 생성 - 태양보다 작게
    const moonGeometry = new THREE.SphereGeometry(2, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xDDEEFF,
      transparent: true,
      opacity: 0.9
    });
    this._moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 달 위치 설정 (훨씬 멀리)
    this._moonMesh.position.set(0, 500, 0);
    Graphics.scene.add(this._moonMesh);
    
    // 달 광채 (달빛 효과)
    const moonGlowGeometry = new THREE.SphereGeometry(3, 16, 16);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xAABBFF,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    this._moonMesh.add(moonGlow);
    
    // 태양 광원에 연결
    this._updateCelestialPositions(this._currentSettings);
  },
  
  /**
   * 태양 광선 효과 생성 (방사형 선)
   * @returns {THREE.Group} 태양 광선 그룹
   */
  _createSunRays() {
    const raysGroup = new THREE.Group();
    const rayCount = 12; // 광선 개수
    const rayLength = 12; // 광선 길이
    
    for (let i = 0; i < rayCount; i++) {
      // 각도 계산
      const angle = (i / rayCount) * Math.PI * 2;
      
      // 광선 메시
      const rayGeometry = new THREE.PlaneGeometry(0.5, rayLength);
      const rayMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFDD,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      
      const ray = new THREE.Mesh(rayGeometry, rayMaterial);
      
      // 위치 및 회전 설정
      ray.position.x = Math.cos(angle) * 6; // 태양 중심에서 약간 떨어진 위치
      ray.position.y = Math.sin(angle) * 6;
      ray.rotation.z = angle;
      
      // 그룹에 추가
      raysGroup.add(ray);
    }
    
    return raysGroup;
  },
  
  /**
   * 렌즈 플레어용 텍스처 생성 (태양 후광)
   * @returns {THREE.Texture} 렌즈 플레어 텍스처
   */
  _createFlareTexture() {
    // 캔버스에 그래디언트 원 생성
    const canvas = document.createElement('canvas');
    canvas.width = 256; // 더 큰 텍스처 해상도
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // 원형 그래디언트 생성
    const gradient = context.createRadialGradient(
      128, 128, 0,    // 내부 원 중심과 반지름
      128, 128, 128   // 외부 원 중심과 반지름
    );
    
    // 그래디언트 색상 설정 - 더 밝고 강렬한 중심부
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // 중심에 완전한 흰색
    gradient.addColorStop(0.2, 'rgba(255, 255, 220, 0.9)'); // 약간 바깥쪽에 노란빛 흰색
    gradient.addColorStop(0.5, 'rgba(255, 240, 150, 0.7)'); // 중간에 노란색
    gradient.addColorStop(0.8, 'rgba(255, 210, 120, 0.3)'); // 바깥쪽에 옅은 노란색
    gradient.addColorStop(1, 'rgba(255, 180, 60, 0)');      // 가장자리 투명
    
    // 원 그리기
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    
    // 중앙에 추가 하이라이트
    const innerGradient = context.createRadialGradient(
      128, 128, 0,   // 내부 원 중심과 반지름
      128, 128, 30   // 외부 원 중심과 반지름 (작은 영역)
    );
    
    innerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');  // 완전한 흰색
    innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');  // 투명하게 페이드아웃
    
    context.fillStyle = innerGradient;
    context.fillRect(0, 0, 256, 256);
    
    // 광선 효과 추가 (별 모양의 빛)
    this._drawSunBurst(context, 128, 128, 120, 12);
    
    // 텍스처 생성
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  },
  
  /**
   * 태양 광선 패턴 그리기 (캔버스에 별 모양의 빛 그리기)
   * @param {CanvasRenderingContext2D} context - 캔버스 컨텍스트
   * @param {number} x - 중심 X 좌표
   * @param {number} y - 중심 Y 좌표
   * @param {number} radius - 광선 반경
   * @param {number} rayCount - 광선 수
   */
  _drawSunBurst(context, x, y, radius, rayCount) {
    context.save();
    context.translate(x, y);
    
    // 광선 그리기
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      
      context.save();
      context.rotate(angle);
      
      // 광선 그래디언트
      const rayGradient = context.createLinearGradient(0, 0, radius, 0);
      rayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      // 광선 그리기
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(radius, -radius/30); // 얇은 광선
      context.lineTo(radius, radius/30);
      context.closePath();
      
      context.fillStyle = rayGradient;
      context.fill();
      
      context.restore();
    }
    
    context.restore();
  },

  /**
   * 기존 조명 찾기
   */
  _findLights() {
    if (!Graphics || !Graphics.scene) return;

    // 씬의 모든 오브젝트를 순회하며 조명 찾기
    Graphics.scene.traverse((object) => {
      if (object.type === 'AmbientLight') {
        this._ambientLight = object;
      } else if (object.type === 'DirectionalLight') {
        this._directionalLight = object;
      }
    });

    // 조명이 없으면 경고
    if (!this._ambientLight || !this._directionalLight) {
      console.warn('TimeWeatherSystem: 씬에서 조명을 찾을 수 없습니다.');
    }
  },

  /**
   * 안개 초기화
   */
  _initFog() {
    if (!Graphics || !Graphics.scene) return;

    // 안개 설정
    const timeSettings = this._getSettingsForTime(this.settings.timeOfDay);
    const weatherSettings = this.weatherSettings[this.settings.weather];
    const fogDensity = timeSettings.fogDensity * weatherSettings.fogDensityMultiplier;

    // 지수 안개 추가 (거리에 따라 지수적으로 증가하는 안개 농도)
    Graphics.scene.fog = new THREE.FogExp2(timeSettings.fogColor, fogDensity);
  },

  /**
   * 비 효과 초기화
   */
  _initRainEffect() {
    // 비 효과는 weather가 'rainy'일 때만 표시
    if (this.settings.weather !== 'rainy') return;

    // 이미 비 효과가 있으면 제거
    this._removeRainEffect();

    // 비 입자 생성
    const rainCount = 1000; // 비 입자 수
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3); // xyz 좌표

    // 비 입자 위치 랜덤 생성
    for (let i = 0; i < rainCount * 3; i += 3) {
      // 플레이어 주변 넓은 영역에 비 배치
      rainPositions[i] = Math.random() * 100 - 50; // x
      rainPositions[i + 1] = Math.random() * 20 + 5; // y (5-25 높이)
      rainPositions[i + 2] = Math.random() * 100 - 50; // z
    }

    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    // 비 입자 재질
    const rainMaterial = new THREE.PointsMaterial({
      color: 0xCCCCCC,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });

    // 비 입자 시스템 생성
    this._rainEffect = new THREE.Points(rainGeometry, rainMaterial);
    this._rainEffect.userData.velocities = new Float32Array(rainCount); // 비 속도

    // 개별 비 입자 속도 설정
    for (let i = 0; i < rainCount; i++) {
      this._rainEffect.userData.velocities[i] = 0.1 + Math.random() * 0.3; // 떨어지는 속도
    }

    // 씬에 추가
    Graphics.scene.add(this._rainEffect);
  },

  /**
   * 비 효과 제거
   */
  _removeRainEffect() {
    if (this._rainEffect && Graphics && Graphics.scene) {
      Graphics.scene.remove(this._rainEffect);
      this._rainEffect.geometry.dispose();
      this._rainEffect.material.dispose();
      this._rainEffect = null;
    }
  },

  /**
   * 특정 시간대에 맞는 설정 가져오기
   * @param {string} timeOfDay - 시간대
   * @returns {Object} 시간대 설정
   */
  _getSettingsForTime(timeOfDay) {
    return this.timeSettings[timeOfDay] || this.timeSettings.day;
  },

  /**
   * 게임 상태 변경 이벤트 처리
   * @param {Object} data - 게임 상태 데이터
   */
  _handleGameStateChange(data) {
    if (data.state === 'playing') {
      // 새 게임이 시작되면 랜덤 시간대와 날씨 설정
      if (this.settings.randomizeOnNewGame) {
        this.randomizeTimeAndWeather();
      }
    }
  },

  /**
   * 자동 시간 진행 설정
   */
  _setupAutoProgression() {
    // 게임 애니메이션 루프에 후크
    if (typeof Game !== 'undefined' && Game.animate) {
      const originalAnimateFn = Game.animate;
      Game.animate = (timestamp) => {
        // 원래 애니메이션 함수 호출
        originalAnimateFn.call(Game, timestamp);
        
        // 시간 시스템 업데이트
        if (Game.gameStarted && !Game.isPaused) {
          this.update(timestamp);
        }
      };
    } else {
      // Game 모듈을 못 찾으면 자체 업데이트 함수 필요
      let lastTime = 0;
      const updateLoop = (timestamp) => {
        if (lastTime === 0) lastTime = timestamp;
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        this.update(deltaTime);
        requestAnimationFrame(updateLoop);
      };
      requestAnimationFrame(updateLoop);
    }
  },

  /**
   * 시스템 업데이트 (애니메이션 루프에서 호출)
   * @param {number} deltaTime - 경과 시간 (초)
   */
  update(deltaTime) {
    // 전환 진행 중이면 업데이트
    if (this._transitionProgress < 1) {
      this._updateTransition(deltaTime);
    }

    // 자동 시간 진행이 활성화되어 있으면 시간 업데이트
    if (this.settings.autoTimeProgression && Game && Game.gameStarted && !Game.isPaused) {
      this._updateAutoTimeProgression(deltaTime);
    }

    // 비 효과 업데이트
    this._updateRainEffect(deltaTime);
    
    // 천체(태양, 달) 업데이트
    this._updateCelestialBodies(deltaTime);
  },
  
  /**
   * 천체(태양, 달) 추가 업데이트 - 애니메이션과 카메라와의 관계
   * @param {number} deltaTime - 경과 시간
   */
  _updateCelestialBodies(deltaTime) {
    if (!this._sunMesh || !this._moonMesh || !Graphics || !Graphics.camera) return;
    
    // 태양 애니메이션 효과
    if (this._sunMesh.visible) {
      // 태양 광선 회전 (천천히)
      if (this._sunRays) {
        this._sunRays.rotation.z += deltaTime * 0.01; // 매우 느린 회전
      }
      
      // 태양 후광 회전 (천천히)
      if (this._sunFlare) {
        this._sunFlare.material.rotation += deltaTime * 0.02; // 느린 회전
      }
      
      // 태양 흔들림 효과 (더 작은 흔들림)
      const time = Date.now() * 0.0001; // 매우 느린 주기
      const sunWobble = Math.sin(time * 0.5) * 0.08; // 작은 흔들림
      this._sunMesh.position.y += sunWobble * deltaTime;
      
      // 태양 펄스 효과 (크기 미세하게 변화)
      if (this._sunMesh.children.length > 0 && this._sunMesh.children[2]) {
        // 광채 크기 맥동 효과
        const glow = this._sunMesh.children[2]; // 광채 메시
        const pulseScale = 1.0 + Math.sin(time * 2.0) * 0.05; // ±5% 맥동
        glow.scale.set(pulseScale, pulseScale, pulseScale);
      }
      
      // 날씨에 따른 광선 효과
      if (this._sunRays) {
        // 안개/구름 낀 날씨에서는 광선 효과 희미하게
        if (this.settings.weather === 'foggy') {
          // 각 광선 메시의 투명도 조정
          this._sunRays.children.forEach(ray => {
            ray.material.opacity = 0.15 + Math.sin(time * 3 + ray.rotation.z) * 0.05;
          });
        } else if (this.settings.weather === 'cloudy') {
          this._sunRays.children.forEach(ray => {
            ray.material.opacity = 0.25 + Math.sin(time * 3 + ray.rotation.z) * 0.05;
          });
        } else {
          // 맑은 날씨에서는 선명한 광선
          this._sunRays.children.forEach(ray => {
            ray.material.opacity = 0.4 + Math.sin(time * 3 + ray.rotation.z) * 0.08;
          });
        }
      }
    }
    
    // 달 애니메이션 효과
    if (this._moonMesh.visible) {
      // 약간의 달 흔들림
      const time = Date.now() * 0.00008; // 매우 느린 주기
      const moonWobble = Math.sin(time * 0.3) * 0.05; // 아주 작은 흔들림
      this._moonMesh.position.y += moonWobble * deltaTime;
      
      // 달빛 맥동 효과
      if (this._moonMesh.children.length > 0) {
        const moonGlow = this._moonMesh.children[0];
        const moonPulse = 1.0 + Math.sin(time * 1.5) * 0.03; // ±3% 맥동
        moonGlow.scale.set(moonPulse, moonPulse, moonPulse);
      }
    }
    
    // 하늘 배경에 태양/달 통합
    if (Graphics.camera) {
      // 카메라 위치
      const cameraPos = Graphics.camera.position.clone();
      
      // 하늘 돔 효과 - 카메라로부터 훨씬 더 멀리 배치하고 이동에 덜 영향받게 함
      const skyDistance = 1000; // 매우 먼 거리
      
      // 현재 방향 유지, 하지만 카메라로부터의 거리 재계산
      if (this._sunMesh.visible) {
        const sunDir = this._sunMesh.position.clone().sub(cameraPos).normalize();
        
        // 하늘과의 상대 위치 계산 (극히 일부만 카메라 이동에 따라 움직이게)
        // 이렇게 하면 실제 천체와 같이 카메라가 움직여도 거의 고정된 것처럼 보임
        const offsetFactor = 0.05; // 5%만 카메라 이동에 반응
        const sunPos = cameraPos.clone().add(
          sunDir.multiplyScalar(skyDistance + offsetFactor * cameraPos.length())
        );
        
        // 현재 회전/애니메이션 효과 유지하면서 위치만 업데이트
        const currentRotation = this._sunMesh.rotation.clone();
        this._sunMesh.position.copy(sunPos);
        this._sunMesh.rotation.copy(currentRotation);
      }
      
      if (this._moonMesh.visible) {
        const moonDir = this._moonMesh.position.clone().sub(cameraPos).normalize();
        
        // 하늘과의 상대 위치 계산
        const offsetFactor = 0.05; // 5%만 카메라 이동에 반응
        const moonPos = cameraPos.clone().add(
          moonDir.multiplyScalar(skyDistance + offsetFactor * cameraPos.length())
        );
        
        // 현재 회전/애니메이션 효과 유지하면서 위치만 업데이트
        const currentRotation = this._moonMesh.rotation.clone();
        this._moonMesh.position.copy(moonPos);
        this._moonMesh.rotation.copy(currentRotation);
      }
    }
  },

  /**
   * 전환 상태 업데이트
   * @param {number} deltaTime - 경과 시간
   */
  _updateTransition(deltaTime) {
    // 전환 진행도 계산
    this._transitionProgress += deltaTime / this.settings.transitionDuration;
    if (this._transitionProgress > 1) this._transitionProgress = 1;

    // 보간된 설정 계산 및 적용
    const interpolatedSettings = this._interpolateSettings(
      this._currentSettings,
      this._targetSettings,
      this._transitionProgress
    );
    this.applySettings(interpolatedSettings, false); // 전환 중이므로 즉시 적용 않함
  },

  /**
   * 자동 시간 진행 업데이트
   * @param {number} deltaTime - 경과 시간
   */
  _updateAutoTimeProgression(deltaTime) {
    // 시간 업데이트 논리
    // 전체 일/밤 주기 사용
    const cycleTime = (Date.now() / 1000) % this.settings.dayNightCycleDuration;
    const cycleFraction = cycleTime / this.settings.dayNightCycleDuration;
    
    // 주기에 따른 시간대 결정
    // 0-0.25: 아침, 0.25-0.5: 낮, 0.5-0.75: 저녁, 0.75-1.0: 밤
    let newTimeOfDay;
    if (cycleFraction < 0.25) {
      newTimeOfDay = 'morning';
    } else if (cycleFraction < 0.5) {
      newTimeOfDay = 'day';
    } else if (cycleFraction < 0.75) {
      newTimeOfDay = 'evening';
    } else {
      newTimeOfDay = 'night';
    }
    
    // 시간대가 변경되었으면 새 시간대로 전환
    if (newTimeOfDay !== this.settings.timeOfDay) {
      this.setTimeOfDay(newTimeOfDay, true); // 자연스러운 전환
    }
  },

  /**
   * 비 효과 업데이트
   * @param {number} deltaTime - 경과 시간
   */
  _updateRainEffect(deltaTime) {
    if (!this._rainEffect) return;

    // 비 입자 위치 업데이트
    const positions = this._rainEffect.geometry.attributes.position.array;
    const velocities = this._rainEffect.userData.velocities;
    const rainCount = velocities.length;

    for (let i = 0; i < rainCount; i++) {
      const idx = i * 3;
      positions[idx + 1] -= velocities[i] * 15 * deltaTime; // Y 위치 업데이트 (떨어지는 효과)

      // 바닥에 닿으면 다시 위로 이동
      if (positions[idx + 1] < 0) {
        positions[idx] = Math.random() * 100 - 50; // 새 X 좌표
        positions[idx + 1] = Math.random() * 10 + 15; // 새 Y 좌표 (높이)
        positions[idx + 2] = Math.random() * 100 - 50; // 새 Z 좌표
      }
    }

    // 변경된 위치 업데이트
    this._rainEffect.geometry.attributes.position.needsUpdate = true;
  },

  /**
   * 두 설정 간 보간 계산
   * @param {Object} startSettings - 시작 설정
   * @param {Object} endSettings - 종료 설정
   * @param {number} progress - 진행도 (0-1)
   * @returns {Object} 보간된 설정
   */
  _interpolateSettings(startSettings, endSettings, progress) {
    const result = {};

    // 색상 보간
    result.skyColor = this._lerpColor(startSettings.skyColor, endSettings.skyColor, progress);
    result.ambientColor = this._lerpColor(startSettings.ambientColor, endSettings.ambientColor, progress);
    result.sunColor = this._lerpColor(startSettings.sunColor, endSettings.sunColor, progress);
    result.fogColor = this._lerpColor(startSettings.fogColor, endSettings.fogColor, progress);

    // 숫자값 보간
    result.ambientIntensity = this._lerp(startSettings.ambientIntensity, endSettings.ambientIntensity, progress);
    result.sunIntensity = this._lerp(startSettings.sunIntensity, endSettings.sunIntensity, progress);
    result.fogDensity = this._lerp(startSettings.fogDensity, endSettings.fogDensity, progress);

    // 벡터값 보간 (태양 위치)
    result.sunPosition = {
      x: this._lerp(startSettings.sunPosition.x, endSettings.sunPosition.x, progress),
      y: this._lerp(startSettings.sunPosition.y, endSettings.sunPosition.y, progress),
      z: this._lerp(startSettings.sunPosition.z, endSettings.sunPosition.z, progress)
    };

    return result;
  },

  /**
   * 선형 보간 (Linear Interpolation)
   * @param {number} start - 시작값
   * @param {number} end - 종료값
   * @param {number} t - 보간 인자 (0-1)
   * @returns {number} 보간된 값
   */
  _lerp(start, end, t) {
    return start * (1 - t) + end * t;
  },

  /**
   * 색상 보간 (16진수 색상)
   * @param {number} startColor - 시작 색상 (0xRRGGBB)
   * @param {number} endColor - 종료 색상 (0xRRGGBB)
   * @param {number} t - 보간 인자 (0-1)
   * @returns {number} 보간된 색상
   */
  _lerpColor(startColor, endColor, t) {
    // 색상을 R, G, B 성분으로 분해
    const startR = (startColor >> 16) & 255;
    const startG = (startColor >> 8) & 255;
    const startB = startColor & 255;

    const endR = (endColor >> 16) & 255;
    const endG = (endColor >> 8) & 255;
    const endB = endColor & 255;

    // 성분별 보간
    const r = Math.round(this._lerp(startR, endR, t));
    const g = Math.round(this._lerp(startG, endG, t));
    const b = Math.round(this._lerp(startB, endB, t));

    // 다시 16진수 색상으로 조합
    return (r << 16) | (g << 8) | b;
  },
  
  /**
   * 설정 적용 함수
   * @param {Object} settings - 적용할 설정
   * @param {boolean} setAsTarget - 목표 설정으로 설정할지 여부
   */
  applySettings(settings, setAsTarget = true) {
    if (!Graphics || !Graphics.scene) return;

    // 목표 설정으로 설정
    if (setAsTarget) {
      this._targetSettings = settings;
    }

    // 하늘색 설정
    Graphics.scene.background = new THREE.Color(settings.skyColor);

    // 주변광 설정
    if (this._ambientLight) {
      this._ambientLight.color.setHex(settings.ambientColor);
      this._ambientLight.intensity = settings.ambientIntensity;
    }

    // 태양/달 설정
    if (this._directionalLight) {
      this._directionalLight.color.setHex(settings.sunColor);
      this._directionalLight.intensity = settings.sunIntensity;
      this._directionalLight.position.set(
        settings.sunPosition.x,
        settings.sunPosition.y,
        settings.sunPosition.z
      );
    }
    
    // 태양/달 메시 위치 업데이트
    this._updateCelestialPositions(settings);

    // 안개 설정
    if (Graphics.scene.fog) {
      Graphics.scene.fog.color.setHex(settings.fogColor);
      
      // 현재 날씨 설정 가져오기
      const weatherSettings = this.weatherSettings[this.settings.weather];
      const fogDensity = settings.fogDensity * weatherSettings.fogDensityMultiplier;
      
      // FogExp2 안개 밀도 설정
      if (Graphics.scene.fog.density !== undefined) {
        Graphics.scene.fog.density = fogDensity;
      }
    }
  },
  
  /**
   * 천체(태양, 달) 위치 업데이트
   * @param {Object} settings - 현재 시간대 설정
   */
  _updateCelestialPositions(settings) {
    if (!this._sunMesh || !this._moonMesh) return;
    
    // 태양 위치 계산 (훨씬 멀리, 빛의 방향과 일치)
    const sunDistance = 800; // 매우 큰 거리로 설정
    const normalizedSunPos = new THREE.Vector3(
      settings.sunPosition.x,
      settings.sunPosition.y,
      settings.sunPosition.z
    ).normalize();
    
    // 태양 방향으로부터 위치 계산
    this._sunMesh.position.copy(normalizedSunPos.multiplyScalar(sunDistance));
    
    // 달은 태양의 반대편에 위치
    this._moonMesh.position.copy(normalizedSunPos.multiplyScalar(-sunDistance));
    
    // 시간대에 따라 태양/달 표시 여부 결정
    const isSunVisible = settings.timeOfDay !== 'night';
    const isMoonVisible = settings.timeOfDay === 'night' || settings.timeOfDay === 'evening';
    
    // 태양/달 메시 가시성 설정
    this._sunMesh.visible = isSunVisible;
    this._moonMesh.visible = isMoonVisible;
    
    // 태양 효과 조정
    if (this._sunFlare) {
      // 날씨에 따라 태양 후광 효과 조정
      const weatherSettings = this.weatherSettings[this.settings.weather];
      const flareOpacity = 0.9 * weatherSettings.sunIntensityMultiplier;
      
      // 태양 후광 크기 조정 (시간에 따라)
      let flareScale = 15; // 기본 크기
      
      // 시간대에 따른 후광 크기 조정
      if (settings.timeOfDay === 'evening') {
        flareScale = 20; // 저녁에는 더 큰 후광 (붉은 석양)
      } else if (settings.timeOfDay === 'morning') {
        flareScale = 18; // 아침에는 약간 더 큰 후광
      }
      
      // 날씨에 따른 가시성 조정
      if (this.settings.weather === 'foggy') {
        flareScale *= 1.3; // 안개 낀 날씨에는 더 퍼져 보이는 효과
      } else if (this.settings.weather === 'cloudy') {
        flareScale *= 1.2; // 구름 낀 날씨에도 약간 더 퍼져 보임
      }
      
      this._sunFlare.material.opacity = flareOpacity;
      this._sunFlare.scale.set(flareScale, flareScale, 1);
    }
    
    // 태양 광선 효과 조정
    if (this._sunRays) {
      // 시간대에 따른 광선 회전 방향 설정
      if (settings.timeOfDay === 'morning') {
        this._sunRays.rotation.z = Math.PI / 4; // 아침에는 45도 회전
      } else if (settings.timeOfDay === 'evening') {
        this._sunRays.rotation.z = -Math.PI / 4; // 저녁에는 -45도 회전
      } else {
        this._sunRays.rotation.z = 0; // 낮에는 기본 각도
      }
      
      // 날씨에 따른 가시성 조정
      if (this.settings.weather === 'foggy' || this.settings.weather === 'cloudy') {
        this._sunRays.visible = false; // 안개나 구름 낀 날씨에는 광선 효과 숨김
      } else {
        this._sunRays.visible = true;
      }
    }
    
    // 태양/달 크기와 색상 조정 (시간대에 따라)
    if (settings.timeOfDay === 'evening') {
      // 저녁에는 붉은 태양
      this._sunMesh.material.color.setHex(0xFF7700);
      this._sunMesh.scale.set(4.5, 4.5, 4.5); // 저녁에는 태양이 약간 더 커 보임
      
      // 자식 요소도 색상 조정
      if (this._sunMesh.children.length > 0) {
        // 내부 코어 (첫 번째 자식)
        if (this._sunMesh.children[0]) {
          this._sunMesh.children[0].material.color.setHex(0xFFDDAA);
        }
        
        // 후광 효과 (두 번째 자식)
        if (this._sunFlare) {
          this._sunFlare.material.color.setHex(0xFF9955);
        }
        
        // 광채 효과 (세 번째 자식)
        if (this._sunMesh.children.length > 2) {
          this._sunMesh.children[2].material.color.setHex(0xFF8844);
        }
      }
    } else if (settings.timeOfDay === 'morning') {
      // 아침에는 주황빛 태양
      this._sunMesh.material.color.setHex(0xFFDDAA);
      this._sunMesh.scale.set(4.2, 4.2, 4.2); // 아침에는 태양이 약간 더 커 보임
      
      // 자식 요소도 색상 조정
      if (this._sunMesh.children.length > 0) {
        // 내부 코어 (첫 번째 자식)
        if (this._sunMesh.children[0]) {
          this._sunMesh.children[0].material.color.setHex(0xFFEECC);
        }
        
        // 후광 효과 (두 번째 자식)
        if (this._sunFlare) {
          this._sunFlare.material.color.setHex(0xFFCC88);
        }
        
        // 광채 효과 (세 번째 자식)
        if (this._sunMesh.children.length > 2) {
          this._sunMesh.children[2].material.color.setHex(0xFFBB77);
        }
      }
    } else {
      // 낮에는 밝은 태양
      this._sunMesh.material.color.setHex(0xFFFFAA);
      this._sunMesh.scale.set(4.0, 4.0, 4.0); // 기본 크기
      
      // 자식 요소도 색상 조정
      if (this._sunMesh.children.length > 0) {
        // 내부 코어 (첫 번째 자식)
        if (this._sunMesh.children[0]) {
          this._sunMesh.children[0].material.color.setHex(0xFFFFFF);
        }
        
        // 후광 효과 (두 번째 자식)
        if (this._sunFlare) {
          this._sunFlare.material.color.setHex(0xFFFFDD);
        }
        
        // 광채 효과 (세 번째 자식)
        if (this._sunMesh.children.length > 2) {
          this._sunMesh.children[2].material.color.setHex(0xFFFF80);
        }
      }
    }
    
    // 달 크기 조정
    this._moonMesh.scale.set(2.0, 2.0, 2.0);
  },

  /**
   * 시간대 설정
   * @param {string} timeOfDay - 설정할 시간대
   * @param {boolean} transition - 전환 효과 사용 여부
   */
  setTimeOfDay(timeOfDay, transition = true) {
    // 유효한 시간대인지 확인
    if (!this.timeSettings[timeOfDay]) {
      console.error(`TimeWeatherSystem: 유효하지 않은 시간대 - ${timeOfDay}`);
      return;
    }

    // 현재 시간대와 같으면 무시
    if (this.settings.timeOfDay === timeOfDay && this._transitionProgress === 1) {
      return;
    }

    // 시간대 설정 업데이트
    this.settings.timeOfDay = timeOfDay;
    
    // 새 시간대 설정 가져오기
    const newSettings = this._getSettingsForTime(timeOfDay);
    
    if (transition) {
      // 부드러운 전환 시작
      this._currentSettings = this._interpolateSettings(
        this._currentSettings || this.timeSettings.day,
        newSettings, 
        0 // 0%에서 시작
      );
      this._targetSettings = newSettings;
      this._transitionProgress = 0;
    } else {
      // 즉시 전환
      this._currentSettings = newSettings;
      this._targetSettings = newSettings;
      this._transitionProgress = 1;
      this.applySettings(newSettings);
    }

    // 이벤트 발행
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('timeOfDayChanged', { 
        timeOfDay: timeOfDay,
        transition: transition
      });
    }

    console.log(`TimeWeatherSystem: 시간대 변경 - ${timeOfDay}, 전환: ${transition}`);
  },

  /**
   * 날씨 설정
   * @param {string} weather - 설정할 날씨
   * @param {boolean} transition - 전환 효과 사용 여부
   */
  setWeather(weather, transition = true) {
    // 유효한 날씨인지 확인
    if (!this.weatherSettings[weather]) {
      console.error(`TimeWeatherSystem: 유효하지 않은 날씨 - ${weather}`);
      return;
    }

    // 현재 날씨와 같으면 무시
    if (this.settings.weather === weather) {
      return;
    }

    // 이전 날씨가 비였으면 비 효과 제거
    if (this.settings.weather === 'rainy') {
      this._removeRainEffect();
    }

    // 날씨 설정 업데이트
    this.settings.weather = weather;
    
    // 현재 시간대 설정 다시 적용 (날씨 효과 포함)
    const currentTimeSettings = this._getSettingsForTime(this.settings.timeOfDay);
    
    if (transition) {
      // 부드러운 전환 시작
      this._currentSettings = this._interpolateSettings(
        this._currentSettings || currentTimeSettings,
        currentTimeSettings, 
        0 // 0%에서 시작
      );
      this._targetSettings = currentTimeSettings;
      this._transitionProgress = 0;
    } else {
      // 즉시 전환
      this._currentSettings = currentTimeSettings;
      this._targetSettings = currentTimeSettings;
      this._transitionProgress = 1;
      this.applySettings(currentTimeSettings);
    }

    // 비 효과 초기화 (날씨가 비면)
    if (weather === 'rainy') {
      this._initRainEffect();
    }

    // 이벤트 발행
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('weatherChanged', { 
        weather: weather,
        transition: transition
      });
    }

    console.log(`TimeWeatherSystem: 날씨 변경 - ${weather}, 전환: ${transition}`);
  },

  /**
   * 자동 시간 진행 설정
   * @param {boolean} enabled - 활성화 여부
   * @param {number} cycleDuration - 주기 길이 (초)
   */
  setAutoTimeProgression(enabled, cycleDuration = 600) {
    this.settings.autoTimeProgression = enabled;
    
    if (cycleDuration > 0) {
      this.settings.dayNightCycleDuration = cycleDuration;
    }

    if (enabled && !this._autoProgressionSetup) {
      this._setupAutoProgression();
      this._autoProgressionSetup = true;
    }

    console.log(`TimeWeatherSystem: 자동 시간 진행 ${enabled ? '활성화' : '비활성화'}, 주기: ${this.settings.dayNightCycleDuration}초`);
  },

  /**
   * 시간대와 날씨 랜덤 설정
   * @param {boolean} transition - 전환 효과 사용 여부
   */
  randomizeTimeAndWeather(transition = true) {
    // 시간대 랜덤 선택
    const times = Object.keys(this.timeSettings);
    const randomTime = times[Math.floor(Math.random() * times.length)];
    
    // 날씨 랜덤 선택
    const weathers = Object.keys(this.weatherSettings);
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    
    // 설정 적용
    this.setTimeOfDay(randomTime, transition);
    this.setWeather(randomWeather, transition);

    return { time: randomTime, weather: randomWeather };
  }
};
