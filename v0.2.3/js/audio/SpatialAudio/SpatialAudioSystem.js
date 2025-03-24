// SpatialAudioSystem.js - 메인 모듈
// 벽과 장애물 위치를 고려한 현실적인 오디오 반향 시스템

// 전역 네임스페이스 사용
window.SpatialAudioSystem = {
  // 기본 설정
  settings: {
    enabled: true,                 // 공간 오디오 활성화 여부
    maxReflections: 4,             // 계산할 최대 반사 수
    maxReflectionDistance: 50,     // 반사를 계산할 최대 거리
    maxRaycastDistance: 100,       // 레이캐스트 최대 거리
    reflectionCoefficient: 0.7,    // 반사 계수 (0-1)
    rayDirections: 8,              // 발사할 레이 방향 수 (균등 분포)
    roomSizeFallback: 'medium',    // 레이캐스트 실패 시 기본 룸 크기
  },
  
  // 서브모듈 참조
  roomAnalyzer: null,
  reverbCalculator: null,
  directionalAudio: null,
  debugVisualizer: null,
  
  // 초기화 여부
  isInitialized: false,
  
  // 초기화
  init() {
    // 이미 초기화되었으면 스킵
    if (this.isInitialized) {
      console.log('SpatialAudioSystem이 이미 초기화되어 있습니다');
      return;
    }
    
    console.log('SpatialAudioSystem 초기화 시작...');
    
    // 필요한 의존성 확인
    if (typeof THREE === 'undefined') {
      console.error('SpatialAudioSystem: THREE.js가 필요합니다');
      this.settings.enabled = false;
      return;
    }
    
    // 레이캐스터 초기화
    this.raycaster = new THREE.Raycaster();
    
    // 룸 크기별 리버브 프리셋 초기화
    this.reverbPresets = {
      // 방 크기별 리버브 특성: [반향 시간(초), 초기 반사 지연(초), 감쇠 계수]
      small: [0.3, 0.01, 0.9],     // 작은 방 (화장실, 벽장)
      medium: [0.5, 0.02, 0.8],    // 중간 방 (거실, 침실)
      large: [1.0, 0.03, 0.6],     // 큰 방 (강당, 체육관)
      hall: [1.5, 0.04, 0.5],      // 홀 (대강당, 교회)
      outdoor: [0.2, 0.05, 0.3]    // 실외
    };
    
    // 현재 캐시된 공간 분석 데이터
    this.cachedAnalysis = {
      position: new THREE.Vector3(),
      roomCharacteristics: null,
      lastUpdateTime: 0
    };
    
    // 공간 분석 주기 (밀리초)
    this.updateInterval = 500; // 0.5초마다 업데이트
    
    // 서브모듈 초기화
    this.initSubmodules();
    
    // 초기화 완료 플래그 설정
    this.isInitialized = true;
    
    console.log('SpatialAudioSystem 초기화 완료');
  },
  
  // 서브모듈 초기화
  initSubmodules() {
    console.log('SpatialAudioSystem 서브모듈 초기화...');
    
    // 공통 의존성 객체
    const dependencies = {
      settings: this.settings,
      reverbPresets: this.reverbPresets,
      raycaster: this.raycaster,
      cachedAnalysis: this.cachedAnalysis,
      updateInterval: this.updateInterval
    };
    
    // 각 모듈이 제대로 로드되었는지 확인
    if (!window.RoomAnalyzer) {
      console.error('RoomAnalyzer 모듈을 찾을 수 없습니다');
    }
    
    if (!window.ReverbCalculator) {
      console.error('ReverbCalculator 모듈을 찾을 수 없습니다');
    }
    
    if (!window.DirectionalAudio) {
      console.error('DirectionalAudio 모듈을 찾을 수 없습니다');
    }
    
    if (!window.AudioDebugVisualizer) {
      console.error('AudioDebugVisualizer 모듈을 찾을 수 없습니다');
    }
    
    // 전역 객체에서 모듈 참조
    this.roomAnalyzer = window.RoomAnalyzer;
    this.reverbCalculator = window.ReverbCalculator;
    this.directionalAudio = window.DirectionalAudio;
    this.debugVisualizer = window.AudioDebugVisualizer;
    
    // 모듈 상태 로깅
    console.log('모듈 로드 상태:');
    console.log('- RoomAnalyzer:', this.roomAnalyzer ? 'OK' : 'Missing');
    console.log('- ReverbCalculator:', this.reverbCalculator ? 'OK' : 'Missing');
    console.log('- DirectionalAudio:', this.directionalAudio ? 'OK' : 'Missing');
    console.log('- AudioDebugVisualizer:', this.debugVisualizer ? 'OK' : 'Missing');
    
    // 각 모듈 초기화
    if (this.roomAnalyzer && typeof this.roomAnalyzer.init === 'function') {
      this.roomAnalyzer.init(dependencies);
    }
    
    if (this.reverbCalculator && typeof this.reverbCalculator.init === 'function') {
      this.reverbCalculator.init(dependencies);
    }
    
    if (this.directionalAudio && typeof this.directionalAudio.init === 'function') {
      this.directionalAudio.init(dependencies);
    }
    
    if (this.debugVisualizer && typeof this.debugVisualizer.init === 'function') {
      this.debugVisualizer.init(dependencies);
    }
    
    // 모듈 간 의존성 설정
    if (this.directionalAudio && typeof this.directionalAudio.setModuleDependencies === 'function') {
      this.directionalAudio.setModuleDependencies({
        reverbCalculator: this.reverbCalculator,
        roomAnalyzer: this.roomAnalyzer
      });
    }
    
    if (this.directionalAudio && typeof this.directionalAudio.setDebugVisualizer === 'function') {
      this.directionalAudio.setDebugVisualizer(this.debugVisualizer);
    }
    
    // RoomAnalyzer의 castRayForReflection 함수를 AudioDebugVisualizer에 설정
    if (this.debugVisualizer && this.roomAnalyzer && 
        typeof this.debugVisualizer.setRayCastFunction === 'function' &&
        typeof this.roomAnalyzer.castRayForReflection === 'function') {
      this.debugVisualizer.setRayCastFunction(
        this.roomAnalyzer.castRayForReflection.bind(this.roomAnalyzer)
      );
    }
    
    console.log('서브모듈 초기화 완료');
  },
  
  // 현재 플레이어 위치에서 공간 특성 분석
  analyzeSpace(playerPosition, forceUpdate = false) {
    // roomAnalyzer 체크
    if (!this.roomAnalyzer) {
      console.error('RoomAnalyzer 모듈이 초기화되지 않았습니다');
      return {
        roomSize: this.settings.roomSizeFallback,
        presetValues: this.reverbPresets[this.settings.roomSizeFallback]
      };
    }
    
    return this.roomAnalyzer.analyzeSpace(playerPosition, forceUpdate);
  },
  
  // 총소리 효과 생성 (AudioManager.js와 통합)
  createGunSoundWithEnvironment(position, options = {}) {
    if (!this.settings.enabled || !AudioManager.context) return null;
    
    // 플레이어 위치 가져오기 (Physics 모듈에서)
    const playerPosition = this.getPlayerPosition();
    
    // 총소리 위치 (기본값은 플레이어 위치)
    const soundPosition = position || playerPosition;
    
    // 플레이어 주변 공간 분석
    const spaceCharacteristics = this.analyzeSpace(playerPosition);
    
    // 기본 총소리 옵션에 환경 특성 추가
    const environmentOptions = {
      ...options,
      distance: position ? playerPosition.distanceTo(position) : 0,
      // 공간 크기에 따른 리버브 양 조정
      resonance: spaceCharacteristics.roomSize === 'outdoor' ? 0.2 : 
                (spaceCharacteristics.roomSize === 'hall' ? 0.9 : 
                (spaceCharacteristics.roomSize === 'large' ? 0.7 : 
                (spaceCharacteristics.roomSize === 'medium' ? 0.5 : 0.3))),
      // 공간 균일성에 따른 에코 특성 조정
      echoDelay: spaceCharacteristics.presetValues[1],
      echoDuration: spaceCharacteristics.presetValues[0],
      echoDecay: spaceCharacteristics.presetValues[2]
    };
    
    // 장애물 밀도에 따른 저역 통과 필터 조정
    if (spaceCharacteristics.obstacleDensity > 0.7) {
      environmentOptions.filterFrequency = 1000; // 많은 장애물: 더 많은 저역 필터링
    } else if (spaceCharacteristics.obstacleDensity > 0.3) {
      environmentOptions.filterFrequency = 2000; // 중간 장애물 밀도
    } else {
      environmentOptions.filterFrequency = 4000; // 적은 장애물: 최소 필터링
    }
    
    // 공간 분석 디버그 로그
    if (window.DEBUG_AUDIO) {
      console.log('공간 오디오 분석:', spaceCharacteristics);
      console.log('적용된 오디오 설정:', environmentOptions);
    }
    
    // 환경 특성을 고려한 총소리 재생 (AudioManager 사용)
    return AudioManager.play('shoot', environmentOptions);
  },
  
  // 이 시스템을 AudioManager와 통합하기 위한 메서드
  enhanceAudioManager() {
    if (!AudioManager || !AudioManager.context) {
      console.error('AudioManager를 찾을 수 없거나 초기화되지 않았습니다');
      return;
    }
    
    // 원래 총소리 생성기 저장
    const originalShootGenerator = AudioManager.sounds.shoot;
    
    // 총소리 생성기를 환경 인식 버전으로 확장
    AudioManager.sounds.shoot = (options = {}) => {
      if (!this.settings.enabled) {
        // 공간 오디오 비활성화 시 원래 생성기 사용
        return originalShootGenerator(options);
      }
      
      // 플레이어 위치 가져오기
      const playerPosition = this.getPlayerPosition();
      
      // 공간 분석
      const spaceCharacteristics = this.analyzeSpace(playerPosition);
      
      // 원본 옵션에 공간 정보 추가
      const enhancedOptions = {
        ...options,
        // 공간 특성에 기반한 반향 설정
        resonance: Math.min(0.95, options.resonance || 0.5 + spaceCharacteristics.uniformity * 0.3),
        roomSize: spaceCharacteristics.roomSize,
        // 공간 크기에 따라 EQ 조정
        filterFrequency: options.filterFrequency || 
          (spaceCharacteristics.roomSize === 'small' ? 2000 : 
           spaceCharacteristics.roomSize === 'outdoor' ? 4000 : 3000)
      };
      
      // 확장된 옵션으로 원래 생성기 호출
      return originalShootGenerator(enhancedOptions);
    };
    
    console.log('AudioManager 확장: 공간 인식 사운드 활성화');
    
    // AudioManager에 원래 생성기 참조 저장 (필요 시 복원을 위해)
    AudioManager._originalShootGenerator = originalShootGenerator;
  },
  
  // 확장된 총소리 생성기를 복원
  restoreOriginalAudioManager() {
    if (AudioManager && AudioManager._originalShootGenerator) {
      AudioManager.sounds.shoot = AudioManager._originalShootGenerator;
      console.log('AudioManager 복원: 원래 총소리 생성기로 되돌림');
    }
  },
  
  /**
   * 플레이어 위치 기반 공간 반향 효과에 방향성을 추가합니다
   * @param {string} soundName - 재생할 사운드 이름 
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  createDirectionalReverb(soundName, position) {
    // 의존성 확인
    if (!this.directionalAudio) {
      console.error('DirectionalAudio 모듈이 초기화되지 않았습니다');
      return null;
    }
    
    return this.directionalAudio.createDirectionalReverb(soundName, position);
  },
  
  /**
   * 고급 3D 공간 오디오 처리 - PannerNode 기반
   * @param {string} soundName - 재생할 사운드 이름
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  create3DReverb(soundName, position) {
    // 의존성 확인
    if (!this.directionalAudio) {
      console.error('DirectionalAudio 모듈이 초기화되지 않았습니다');
      return null;
    }
    
    return this.directionalAudio.create3DReverb(soundName, position);
  },
  
  /**
   * 총소리 효과와 방향성 반향 효과를 생성합니다
   * @param {string} soundName - 발사할 소리 이름 (기본값 'shoot')
   * @param {THREE.Vector3} position - 플레이어 위치
   * @param {Object} options - 추가 옵션
   */
  createGunSoundWithReverb(soundName = 'shoot', position, options = {}) {
    // 모듈이 초기화되지 않았을 때의 안전 장치
    if (!this.directionalAudio) {
      console.error('DirectionalAudio 모듈이 초기화되지 않았습니다');
      
      // 기본 오디오 재생으로 폴백
      if (AudioManager) {
        return AudioManager.play(soundName, options);
      }
      return null;
    }
    
    // 보호로직을 추가해서 에러 방지
    try {
      return this.directionalAudio.createGunSoundWithReverb(soundName, position, options);
    } catch (e) {
      console.error('공간 오디오 처리 중 오류:', e);
      // 오류 발생 시 기본 오디오 재생
      if (AudioManager) {
        return AudioManager.play(soundName, options);
      }
      return null;
    }
  },
  
  // 디버그: 현재 위치의 환경 특성을 시각화 (개발용)
  visualizeEnvironment(playerPosition) {
    if (this.debugVisualizer) {
      this.debugVisualizer.visualizeEnvironment(playerPosition);
    }
  },
  
  // 플레이어 위치 가져오기 헬퍼
  getPlayerPosition() {
    const position = new THREE.Vector3();
    
    if (Physics && Physics.playerBody) {
      position.copy(Physics.playerBody.position);
    } else if (Graphics && Graphics.camera) {
      position.copy(Graphics.camera.position);
    }
    
    return position;
  },
  
  // 디버그 정보 표시
  showDebugInfo(systemName, data = {}) {
    if (this.debugVisualizer) {
      this.debugVisualizer.showDebugInfo(systemName, data);
    }
  }
};
