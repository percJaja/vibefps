// ReverbCalculator.js
// 공간 정보를 바탕으로 반향 효과 계산 및 생성

// 전역 네임스페이스 사용
window.ReverbCalculator = {
  // 의존성 참조
  settings: null,
  reverbPresets: null,
  
  // 초기화
  init(dependencies) {
    console.log('ReverbCalculator 초기화 중...');
    this.settings = dependencies.settings;
    this.reverbPresets = dependencies.reverbPresets;
    
    console.log('ReverbCalculator 초기화 완료');
  },
  
  /**
   * 현재 품질 설정에 따른 반향 매개변수 가져오기
   * @return {Object} 현재 품질 설정에 맞는 반향 매개변수 객체
   */
  getReverbQualitySettings() {
    // 공간 반향이 비활성화되어 있으면 빈 매개변수 반환
    if (!GameSettings || !GameSettings.audio || !GameSettings.audio.spatialReverb) {
      return {
        wallCount: 0,
        maxDelay: 0,
        ttl: 1000
      };
    }
    
    // 품질 설정에 따른 매개변수
    const qualitySettings = {
      high: {
        wallCount: 3,    // 반향을 계산할 벽 수
        maxDelay: 0.5,   // 최대 지연 시간
        ttl: 8000        // 캐시 유효 시간 (ms)
      },
      medium: {
        wallCount: 2,
        maxDelay: 0.3,
        ttl: 10000
      },
      low: {
        wallCount: 1,
        maxDelay: 0.2,
        ttl: 15000
      }
    };
    
    // GameSettings에서 품질 설정 가져오기
    const quality = GameSettings && GameSettings.audio && GameSettings.audio.reverbQuality ? 
                  GameSettings.audio.reverbQuality : 'medium';
    
    // 설정에 맞는 매개변수 반환 (없으면 중간 품질 사용)
    return qualitySettings[quality] || qualitySettings.medium;
  },
  
  /**
   * 주어진 위치에서 맵의 크기와 경계를 고려하여 벽까지의 거리 계산
   * @param {THREE.Vector3} position - 계산의 기준이 되는 위치
   * @return {Object} 각 벽까지의 거리 및 방향
   */
  calculateWallDistances(position) {
    // 맵 경계 - Environment.js에서 확인된 값 (실제 환경에 맞게 조정 필요)
    const boundaries = {
      north: -50,  // z 좌표 최소값
      south: 50,   // z 좌표 최대값
      east: 50,    // x 좌표 최대값
      west: -50    // x 좌표 최소값
    };
    
    // 각 벽 정보 및 방향 벡터 정의
    return [
      { 
        name: 'north', 
        distance: Math.abs(position.z - boundaries.north), 
        direction: new THREE.Vector3(0, 0, -1),  // 북쪽(앞) 방향
        position: new THREE.Vector3(position.x, position.y, boundaries.north) 
      },
      { 
        name: 'south', 
        distance: Math.abs(position.z - boundaries.south), 
        direction: new THREE.Vector3(0, 0, 1),   // 남쪽(뒤) 방향
        position: new THREE.Vector3(position.x, position.y, boundaries.south) 
      },
      { 
        name: 'east', 
        distance: Math.abs(position.x - boundaries.east), 
        direction: new THREE.Vector3(1, 0, 0),   // 동쪽(오른쪽) 방향
        position: new THREE.Vector3(boundaries.east, position.y, position.z) 
      },
      { 
        name: 'west', 
        distance: Math.abs(position.x - boundaries.west), 
        direction: new THREE.Vector3(-1, 0, 0),  // 서쪽(왼쪽) 방향
        position: new THREE.Vector3(boundaries.west, position.y, position.z) 
      }
    ];
  },
  
  /**
   * 가장 가까운 벽을 찾고 현재 품질 설정에 따라 필터링
   * @param {THREE.Vector3} position - 플레이어 위치
   * @return {Array} 가장 가까운 벽들의 배열
   */
  findClosestWalls(position) {
    const walls = this.calculateWallDistances(position);
    
    // 거리 기준으로 정렬
    walls.sort((a, b) => a.distance - b.distance);
    
    // 현재 품질 설정에 따라 벽 수 제한
    const qualitySettings = this.getReverbQualitySettings();
    const closestWalls = walls.slice(0, qualitySettings.wallCount);
    
    // 벽에 따라 다른 지연 시간 설정 (더 자연스러운 효과)
    // 음속(343m/s)을 고려한 지연 시간 계산
    closestWalls.forEach(wall => {
      // 왕복 거리와 음속에 기반한 지연 시간 (밀리초)
      wall.delay = (wall.distance * 2) / 343 * 1000;
      // 최대 지연 시간 제한
      wall.delay = Math.min(wall.delay, qualitySettings.maxDelay * 1000);
    });
    
    return closestWalls;
  },
  
  /**
   * 오디오 노드 간 연결 설정 및 필터 구성
   * @param {AudioNode} source - 소스 오디오 노드
   * @param {Object} options - 필터 옵션
   * @return {Object} 생성된 오디오 노드들
   */
  createAudioNodes(source, options = {}) {
    if (!AudioManager || !AudioManager.context) return null;
    
    // 필터 노드 생성
    const filter = AudioManager.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.filterFrequency || 2000;
    filter.Q.value = options.filterQ || 1.0;
    
    // 게인 노드 생성
    const gain = AudioManager.context.createGain();
    gain.gain.value = options.gain || 0.3;
    
    // 패너 노드 생성 (방향성)
    const panner = AudioManager.context.createStereoPanner();
    panner.pan.value = options.panning || 0;
    
    // 노드 연결
    source.connect(filter);
    filter.connect(panner);
    panner.connect(gain);
    gain.connect(AudioManager.context.destination);
    
    return { filter, gain, panner };
  },
  
  /**
   * 단순 리버브 효과 생성 (콘볼버 기반)
   * @param {number} resonance - 반향의 강도 (0-1)
   * @return {ConvolverNode} 콘볼버 노드
   */
  createSimpleReverb(resonance = 0.5) {
    if (!AudioManager || !AudioManager.context) return null;
    
    // 단순한 리버브 효과 생성 (공간감)
    const convolver = AudioManager.context.createConvolver();
    const rate = AudioManager.context.sampleRate;
    const length = rate * resonance;
    const decay = resonance;
    const impulse = AudioManager.context.createBuffer(2, length, rate);
    
    const impulseL = impulse.getChannelData(0);
    const impulseR = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
      const n = i / length;
      impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    
    convolver.buffer = impulse;
    return convolver;
  },
  
  /**
   * 공간 정보를 기반으로 방 크기에 맞는 리버브 설정 계산
   * @param {Object} spaceInfo - 공간 분석 정보
   * @return {Object} 공간에 맞는 오디오 설정
   */
  calculateReverbSettings(spaceInfo) {
    if (!spaceInfo) return {};
    
    // 기본 설정
    const settings = {
      resonance: 0.5, // 기본 반향 강도
      delay: 0.02,   // 기본 지연 시간
      decay: 0.8,    // 기본 감쇠율
      filterFrequency: 3000 // 기본 필터 주파수
    };
    
    // 방 크기에 따른 설정 조정
    if (spaceInfo.roomSize === 'small') {
      settings.resonance = 0.3;
      settings.delay = 0.01;
      settings.decay = 0.9;
      settings.filterFrequency = 4000;
    } else if (spaceInfo.roomSize === 'medium') {
      settings.resonance = 0.5;
      settings.delay = 0.02;
      settings.decay = 0.8;
      settings.filterFrequency = 3000;
    } else if (spaceInfo.roomSize === 'large') {
      settings.resonance = 0.7;
      settings.delay = 0.03;
      settings.decay = 0.6;
      settings.filterFrequency = 2500;
    } else if (spaceInfo.roomSize === 'hall') {
      settings.resonance = 0.9;
      settings.delay = 0.04;
      settings.decay = 0.5;
      settings.filterFrequency = 2000;
    } else if (spaceInfo.roomSize === 'outdoor') {
      settings.resonance = 0.2;
      settings.delay = 0.05;
      settings.decay = 0.3;
      settings.filterFrequency = 5000;
    }
    
    // 장애물 밀도에 따른 조정
    if (spaceInfo.obstacleDensity > 0.7) {
      settings.filterFrequency = Math.min(settings.filterFrequency, 1000);
      settings.decay += 0.1;
    } else if (spaceInfo.obstacleDensity > 0.3) {
      settings.filterFrequency = Math.min(settings.filterFrequency, 2000);
    }
    
    // 공간 균일성에 따른 조정
    if (spaceInfo.uniformity < 0.3) {
      // 불균일한 공간은 불규칙한 반향을 가짐
      settings.decay *= 0.8;
    }
    
    return settings;
  }
};
