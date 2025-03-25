/**
 * AudioManager.js - 효과음 관리 모듈
 * 
 * 게임 내 효과음을 생성하고 관리합니다.
 * 절차적 사운드 생성과 공간 오디오 처리를 담당합니다.
 */
const AudioManager = {
  context: null,
  sounds: {},
  
  // 반향 캐시 객체
  reverbCache: {
    position: null,
    timestamp: 0,
    reverbs: null,
    ttl: 10000  // 10초 (밀리초 단위)
  },
  
  init() {
    // Web Audio API 컨텍스트 초기화
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();
      
      // 브라우저 자동 재생 정책 우회를 위해 사용자 상호작용에서 컨텍스트 재개
      document.addEventListener('click', () => {
        if (this.context && this.context.state === 'suspended') {
          this.context.resume();
        }
      }, { once: true });
    } catch (e) {
      console.error('Web Audio API가 이 브라우저에서 지원되지 않습니다', e);
    }
    
    // 절차적 사운드 초기화
    this.initProceduralSounds();
    
    // 이벤트 시스템에 등록
    this.setupEventHandlers();
    
    console.log('AudioManager 초기화 완료: 절차적 사운드 사용');
  },
  
  setupEventHandlers() {
    // 발사 이벤트에 대한 리스너 등록
    EventSystem.on('shootEvent', (data) => {
      this.play('shoot', {
        type: data.type || 'standard',
        volume: data.volume || 1.0
      });
      
      // 공간 오디오 시스템이 있으면 활용
      if (typeof SpatialAudioSystem !== 'undefined' && 
          SpatialAudioSystem.createGunSoundWithReverb) {
        SpatialAudioSystem.createGunSoundWithReverb('shoot', data.position);
      }
    });
    
    // 기타 게임 이벤트에 대한 리스너 등록
    EventSystem.on('targetHit', (data) => {
      // 타겟 타입에 따른 사운드 재생
      const hitTarget = data.hitTargets[0];
      if (hitTarget) {
        if (hitTarget.type === 'bonus') {
          this.play('bonusHit');
        } else if (hitTarget.type === 'penalty') {
          this.play('penaltyHit');
        } else {
          this.play('hit');
        }
      }
      
      // 관통 보너스가 있으면 추가 효과음
      if (data.penetrationBonus > 0) {
        this.play('bonusHit', { volume: 0.7 });
      }
    });
  },
  
  initProceduralSounds() {
    // 파일을 로드하는 대신 절차적 사운드 생성기를 만듭니다
    this.sounds = {
      shoot: this.createGunSoundGenerator(),
      hit: this.createImpactSoundGenerator(),
      reload: this.createReloadSoundGenerator(),
      jump: this.createJumpSoundGenerator(),
      emptyGun: this.createEmptyGunSoundGenerator(),
      bonusHit: this.createBonusHitSoundGenerator(),
      penaltyHit: this.createPenaltyHitSoundGenerator(),
      bulletBounce: this.createBulletBounceGenerator(),
      obstacleDestruction: this.createObstacleDestructionGenerator()
    };
  },
  
  createGunSoundGenerator() {
    // 호출될 때 총소리를 생성하는 함수 반환
    return (options = {}) => {
      if (!this.context) return;
      
      // 기본 총 매개변수
      const params = Object.assign({
        type: 'standard', // standard, powerful, silenced 중 하나
        distance: 0,      // 청취자로부터의 거리 (0-100)
        resonance: 0.7    // 에코/리버브 양 (0-1)
      }, options);
      
      // 오디오 노드 생성
      const noiseBuffer = this.createNoiseBuffer(0.2);
      const bufferSource = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      const filterNode = this.context.createBiquadFilter();
      const compressor = this.context.createDynamicsCompressor();
      
      // 버퍼 소스 구성
      bufferSource.buffer = noiseBuffer;
      
      // 필터 구성 - 총기 유형별로 다른 소리 특성 부여
      filterNode.type = 'lowpass';
      
      if (params.type === 'silenced') {
        // 소음기 장착된 총: 저주파만 통과하고 Q값 낮음 (둔탁한 소리)
        filterNode.frequency.value = 800;
        filterNode.Q.value = 1;
      } else if (params.type === 'powerful') {
        // 강력한 총: 높은 Q값으로 공명 효과 (날카로운 소리)
        filterNode.frequency.value = 2000;
        filterNode.Q.value = 15;
      } else {
        // 표준 총: 중간 값
        filterNode.frequency.value = 3000;
        filterNode.Q.value = 5;
      }
      
      // 옵션에 음량이 명시적으로 설정된 경우 사용
      const volume = (options.volume !== undefined) ? 
        options.volume : 
        (GameSettings.volumes.sfx || 0.7);

      // 게인(볼륨) 구성 - 초기값 설정
      gainNode.gain.value = 0;

      // 볼륨 엔벨로프 - 볼륨 옵션 적용
      const now = this.context.currentTime;
      gainNode.gain.setValueAtTime(0, now);

      // 총기 유형별 볼륨 조정 (더 명확한 구분)
      let peakVolume = 0.7 * volume; // 기본값

      if (params.type === 'powerful') {
        // 강력한 총소리는 더 큰 볼륨으로
        peakVolume = 0.9 * volume;
        // 더 빠르게 최대 볼륨에 도달
        gainNode.gain.linearRampToValueAtTime(peakVolume, now + 0.005);
      } else if (params.type === 'silenced') {
        // 소음기 장착 총소리는 작은 볼륨으로
        peakVolume = 0.4 * volume;
        gainNode.gain.linearRampToValueAtTime(peakVolume, now + 0.01);
      } else {
        // 표준 총소리는 중간 볼륨
        gainNode.gain.linearRampToValueAtTime(peakVolume, now + 0.01);
      }
      
      // 총기 유형별 다른 감쇠 시간
      if (params.type === 'silenced') {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); // 짧은 감쇠
      } else if (params.type === 'powerful') {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // 긴 감쇠
      } else {
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // 중간 감쇠
      }
      
      // 거리 효과
      if (params.distance > 0) {
        const maxDistance = 100;
        const volume = 1 - Math.min(params.distance / maxDistance, 0.9);
        gainNode.gain.value *= volume;
        
        // 거리에 따른 약간의 지연 추가 (소리는 약 343m/s로 전파)
        const delay = this.context.createDelay();
        delay.delayTime.value = params.distance / 343;
        bufferSource.connect(delay);
        delay.connect(filterNode);
      } else {
        bufferSource.connect(filterNode);
      }
      
      // 노드 연결
      filterNode.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(this.context.destination);
      
      // 필요한 경우 리버브/에코 추가
      if (params.resonance > 0) {
        const convolver = this.createSimpleReverb(params.resonance);
        const reverbGain = this.context.createGain();
        reverbGain.gain.value = params.resonance * 0.2;
        
        gainNode.connect(convolver);
        convolver.connect(reverbGain);
        reverbGain.connect(this.context.destination);
      }
      
      // 총소리에 금속성 고주파 추가 (발사 찰칵 소리)
      const clickOscillator = this.context.createOscillator();
      const clickGain = this.context.createGain();
      clickOscillator.type = 'square';
      clickOscillator.frequency.value = 2500;
      clickGain.gain.value = 0;
      clickGain.gain.setValueAtTime(0, now);
      clickGain.gain.linearRampToValueAtTime(0.1 * (GameSettings.volumes.sfx || 0.7), now + 0.001);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      
      clickOscillator.connect(clickGain);
      clickGain.connect(this.context.destination);
      
      // 소리 시작
      bufferSource.start();
      clickOscillator.start();
      clickOscillator.stop(now + 0.03);
      
      return bufferSource;
    };
  },
  
  createImpactSoundGenerator() {
    // 타격 사운드 생성기
    return (options = {}) => {
      if (!this.context) return;
      
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 150;
      
      gainNode.gain.value = 0;
      
      const now = this.context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator.start();
      oscillator.stop(now + 0.1);
      
      return oscillator;
    };
  },
  
  createReloadSoundGenerator() {
    // 재장전 사운드 생성기
    return (options = {}) => {
      if (!this.context) return;
      
      const bufferSource = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      
      // 짧은 클릭 사운드 생성
      const clickBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      
      for (let i = 0; i < clickData.length; i++) {
        if (i < clickData.length * 0.1) {
          clickData[i] = Math.random() * 0.5;
        } else {
          clickData[i] = Math.random() * 0.1 * (1 - i / clickData.length);
        }
      }
      
      bufferSource.buffer = clickBuffer;
      gainNode.gain.value = 0.3 * (GameSettings.volumes.sfx || 0.7);
      
      bufferSource.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      bufferSource.start();
      
      // 작은 지연 후 두 번째 기계적 클릭 생성
      setTimeout(() => {
        if (!this.context) return;
        
        const bufferSource2 = this.context.createBufferSource();
        const gainNode2 = this.context.createGain();
        
        bufferSource2.buffer = clickBuffer;
        gainNode2.gain.value = 0.2 * (GameSettings.volumes.sfx || 0.7);
        
        bufferSource2.connect(gainNode2);
        gainNode2.connect(this.context.destination);
        
        bufferSource2.start();
      }, 100);
      
      return bufferSource;
    };
  },
  
  createJumpSoundGenerator() {
    // 점프 사운드 생성기
    return (options = {}) => {
      if (!this.context) return;
      
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 180;
      
      const now = this.context.currentTime;
      oscillator.frequency.linearRampToValueAtTime(150, now + 0.1);
      
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator.start();
      oscillator.stop(now + 0.2);
      
      return oscillator;
    };
  },
  
  createEmptyGunSoundGenerator() {
    // 빈 총 사운드 생성기 (딸깍)
    return (options = {}) => {
      if (!this.context) return;
      
      const bufferSource = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      
      // 짧은 클릭 사운드 생성
      const clickBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.1, this.context.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      
      for (let i = 0; i < clickData.length; i++) {
        clickData[i] = (Math.random() * 2 - 1) * (1 - i / clickData.length) * 0.5;
      }
      
      bufferSource.buffer = clickBuffer;
      gainNode.gain.value = 0.2 * (GameSettings.volumes.sfx || 0.7);
      
      bufferSource.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      bufferSource.start();
      
      return bufferSource;
    };
  },
  
  createBonusHitSoundGenerator() {
    // 보너스 타겟 명중 사운드 생성기 (상승 음)
    return (options = {}) => {
      if (!this.context) return;
      
      const oscillator1 = this.context.createOscillator();
      const oscillator2 = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator1.type = 'sine';
      oscillator1.frequency.value = 440; // A4
      
      oscillator2.type = 'sine';
      oscillator2.frequency.value = 880; // A5
      
      const now = this.context.currentTime;
      oscillator1.frequency.linearRampToValueAtTime(880, now + 0.1); // A4 → A5
      oscillator2.frequency.linearRampToValueAtTime(1760, now + 0.1); // A5 → A6
      
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator1.start();
      oscillator2.start();
      oscillator1.stop(now + 0.3);
      oscillator2.stop(now + 0.3);
      
      return [oscillator1, oscillator2];
    };
  },
  
  createPenaltyHitSoundGenerator() {
    // 페널티 타겟 명중 사운드 생성기 (하강 음)
    return (options = {}) => {
      if (!this.context) return;
      
      const oscillator1 = this.context.createOscillator();
      const oscillator2 = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator1.type = 'sawtooth';
      oscillator1.frequency.value = 110; // A2
      
      oscillator2.type = 'sawtooth';
      oscillator2.frequency.value = 55; // A1
      
      const now = this.context.currentTime;
      oscillator1.frequency.linearRampToValueAtTime(55, now + 0.2); // A2 → A1
      oscillator2.frequency.linearRampToValueAtTime(27.5, now + 0.2); // A1 → A0
      
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator1.start();
      oscillator2.start();
      oscillator1.stop(now + 0.3);
      oscillator2.stop(now + 0.3);
      
      return [oscillator1, oscillator2];
    };
  },
  
  // 사운드 생성을 위한 유틸리티 메서드
  createNoiseBuffer(duration = 1) {
    // 화이트 노이즈 버퍼 생성 (총소리의 기초)
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
  },
  
  createSimpleReverb(resonance = 0.5) {
    // 단순한 리버브 효과 생성 (공간감)
    const convolver = this.context.createConvolver();
    const rate = this.context.sampleRate;
    const length = rate * resonance;
    const decay = resonance;
    const impulse = this.context.createBuffer(2, length, rate);
    
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
  
  // 재생 메서드
  play(name, options = {}) {
    if (this.sounds[name]) {
      if (typeof this.sounds[name] === 'function') {
        // 절차적 사운드
        return this.sounds[name](options);
      } else {
        // 전통적인 오디오 요소 (폴백)
        const sound = this.sounds[name].cloneNode();
        sound.volume = GameSettings.volumes.sfx || 0.7;
        sound.play().catch(e => console.warn('오디오 재생 실패:', e));
        return sound;
      }
    }
  },
  
  // 볼륨 설정 메서드
  setVolume(type, volume) {
    if (type === 'sfx') {
      // 효과음 볼륨 설정
      GameSettings.volumes.sfx = volume;
    } 
    // 음악 볼륨은 BGMManager에서 처리하므로 제거
  },
  
  // 공간 오디오 관련 메서드
  getReverbQualitySettings() {
    // 공간 반향이 비활성화되어 있으면 빈 매개변수 반환
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
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
    const quality = GameSettings.audio && GameSettings.audio.reverbQuality ? 
                  GameSettings.audio.reverbQuality : 'medium';
    
    // 설정에 맞는 매개변수 반환 (없으면 중간 품질 사용)
    return qualitySettings[quality] || qualitySettings.medium;
  },
  
  createCachedReverb(position) {
    if (!this.context) return null;
    
    // 공간 반향 설정 확인
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
      return null; // 비활성화된 경우 반향 없음
    }
    
    // 현재 품질 설정 가져오기
    const qualitySettings = this.getReverbQualitySettings();
    
    // 반향을 계산할 벽이 없으면 반환
    if (qualitySettings.wallCount <= 0) {
      return null;
    }
    
    const now = Date.now();
    
    // TTL 업데이트
    this.reverbCache.ttl = qualitySettings.ttl;
    
    // 캐시가 유효한지 확인
    if (this.reverbCache.reverbs && 
        this.reverbCache.position && 
        now - this.reverbCache.timestamp < this.reverbCache.ttl) {
      
      // 현재 위치와 캐시된 위치가 충분히 가까운지 확인 (2미터 내)
      const cachedPos = this.reverbCache.position;
      const distance = Math.sqrt(
        Math.pow(position.x - cachedPos.x, 2) + 
        Math.pow(position.y - cachedPos.y, 2) + 
        Math.pow(position.z - cachedPos.z, 2)
      );
      
      if (distance < 2) {
        // 캐시 사용
        console.log("반향 캐시 사용 - 위치 변화:", distance.toFixed(2) + "m");
        return this.reverbCache.reverbs;
      }
    }
    
    // 이하 기존 코드...
    console.log("새로운 반향 계산");
    
    // 맵 경계 - Environment.js에서 확인된 값
    const boundaries = {
      north: -50,  // z 좌표 최소값
      south: 50,   // z 좌표 최대값
      east: 50,    // x 좌표 최대값
      west: -50    // x 좌표 최소값
    };
    
    // 각 벽까지의 거리 계산
    const distances = {
      north: Math.abs(position.z - boundaries.north),
      south: Math.abs(position.z - boundaries.south),
      east: Math.abs(position.x - boundaries.east),
      west: Math.abs(position.x - boundaries.west)
    };
    
    // 가까운 벽 선택 시 품질 설정 반영
    const closestWalls = Object.entries(distances)
      .sort((a, b) => a[1] - b[1])
      .slice(0, qualitySettings.wallCount);
    
    // 각 벽에 대한 반향 노드 생성
    const reverbs = closestWalls.map(([wall, distance]) => {
      // 음속을 고려한 지연 시간 (343m/s)
      // 품질 설정의 최대 지연 제한 적용
      const delayTime = Math.min((distance * 2) / 343, qualitySettings.maxDelay);
      
      // 반향 노드 설정
      const delay = this.context.createDelay(Math.min(delayTime + 0.05, 1.0));
      delay.delayTime.value = delayTime;
      
      // 거리에 따른 감쇠 계산
      const gain = this.context.createGain();
      gain.gain.value = Math.min(0.2 / Math.sqrt(distance), 0.15) * (GameSettings.volumes.sfx || 0.7);
      
      // 벽 재질에 따른 필터 (모든 벽이 같은 재질이라 가정)
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000 - (distance * 10); // 거리가 멀수록 고주파 감쇠 증가
      
      return { delay, gain, filter, wall, distance };
    });
    
    // 결과 캐싱
    this.reverbCache = {
      position: position.clone(),
      timestamp: now,
      reverbs: {
        connectSource: (source) => {
          reverbs.forEach(({ delay, filter, gain }) => {
            source.connect(delay);
            delay.connect(filter);
            filter.connect(gain);
            gain.connect(this.context.destination);
          });
        }
      },
      ttl: qualitySettings.ttl
    };
    
    return this.reverbCache.reverbs;
  },
  
  /**
   * 플레이어 위치를 고려하여 총소리에 공간감을 추가합니다
   * @param {string} soundName - 재생할 사운드 이름
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  playSpatialGunshot(soundName, position) {
    if (!this.context) return;
    
    // 참고: Game.js에서 이미 기본 총소리를 직접 재생하므로 여기서는 반향 효과만 담당합니다
    
    // 캐시된 반향 효과 가져오기
    const cachedReverb = this.createCachedReverb(position);
    
    // 반향 효과가 있다면 적용
    if (cachedReverb) {
      // 현재 품질 설정 가져오기
      const qualitySettings = this.getReverbQualitySettings();
      
      // 벽에 따라 다른 지연 시간 설정 (더 자연스러운 효과)
      const delays = [50, 80, 110]; // 기본 지연 시간 (ms)
      
      // 각 벽마다 별도의 반향 생성 (최대 3개)
      for (let i = 0; i < Math.min(qualitySettings.wallCount, 3); i++) {
        setTimeout(() => {
          // 벽에서 반사된 소리는 조금 다르게 들리도록 설정
          const echoShot = this.play(soundName, { 
            type: 'silenced',  // 소음기 달린 소리처럼 처리
            volume: 0.3 - (i * 0.1)  // 각 반향마다 점점 작아지는 볼륨
          });
          
          if (echoShot) {
            cachedReverb.connectSource(echoShot);
          }
        }, delays[i] + Math.random() * 10); // 약간의 랜덤성 추가
      }
    }
  },

  /**
   * 총알 튕김 사운드 생성기
   * AudioManager.js의 initProceduralSounds() 함수 내에 추가할 사운드 생성기
   * @returns {Function} 사운드 생성 함수
   */
  createBulletBounceGenerator() {
    return (options = {}) => {
      if (!this.context) return;
  
      // 기본 옵션 설정
      const params = Object.assign({
        energy: 0.5,       // 반발 에너지 (0-1)
        position: null,    // 위치 벡터
        surfaceType: 'hard' // 표면 타입
      }, options);
  
      // 튕김 사운드용 오실레이터
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
  
      // 표면 타입에 따른 다른 소리 특성
      let frequency = 200;
      let decayTime = 0.2;
  
      switch (params.surfaceType) {
        case 'metal':
          frequency = 300;
          decayTime = 0.3;
          break;
        case 'wood':
          frequency = 150;
          decayTime = 0.4;
          break;
        case 'soft':
          frequency = 100;
          decayTime = 0.5;
          break;
        default: // 'hard' or other
          frequency = 250;
          decayTime = 0.2;
      }
  
      // 에너지에 따른 볼륨 및 주파수 조정
      oscillator.frequency.value = frequency * (0.7 + params.energy * 0.6);
      oscillator.type = 'sine';
  
      // 볼륨 엔벨로프 설정
      const now = this.context.currentTime;
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(params.energy * 0.3 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
  
      // 노드 연결
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
  
      // 효과음 재생
      oscillator.start();
      oscillator.stop(now + decayTime);
  
      return oscillator;
    };
  },
  
  /**
   * 장애물 파괴 사운드 생성기
   * AudioManager.js의 initProceduralSounds() 함수 내에 추가할 사운드 생성기
   * @returns {Function} 사운드 생성 함수
   */
  createObstacleDestructionGenerator() {
    return (options = {}) => {
      if (!this.context) return;
  
      // 충돌 노이즈 사운드 생성
      const duration = 0.6;
      const bufferSize = this.context.sampleRate * duration;
      const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const output = noiseBuffer.getChannelData(0);
  
      // 파괴 소리용 노이즈 패턴 생성
      for (let i = 0; i < bufferSize; i++) {
        // 초기에 더 큰 노이즈, 이후 점점 감소
        const decay = 1.0 - (i / bufferSize);
        output[i] = (Math.random() * 2 - 1) * decay * decay;
      }
  
      // 노이즈 플레이어 설정
      const noiseSource = this.context.createBufferSource();
      noiseSource.buffer = noiseBuffer;
  
      // 필터 및 게인 설정
      const lowpass = this.context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 400;
      lowpass.Q.value = 1;
  
      const highpass = this.context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100;
  
      const gainNode = this.context.createGain();
      gainNode.gain.value = 0.4 * (GameSettings.volumes.sfx || 0.7);
  
      // 오디오 그래프 연결
      noiseSource.connect(lowpass);
      lowpass.connect(highpass);
      highpass.connect(gainNode);
      gainNode.connect(this.context.destination);
  
      // 추가적인 충돌음 생성 (더 높은 주파수)
      const impactOsc = this.context.createOscillator();
      impactOsc.type = 'sawtooth';
      impactOsc.frequency.value = 120;
  
      const impactGain = this.context.createGain();
      const now = this.context.currentTime;
      impactGain.gain.value = 0;
      impactGain.gain.setValueAtTime(0, now);
      impactGain.gain.linearRampToValueAtTime(0.3 * (GameSettings.volumes.sfx || 0.7), now + 0.02);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
      impactOsc.connect(impactGain);
      impactGain.connect(this.context.destination);
  
      // 효과음 재생
      noiseSource.start();
      impactOsc.start();
      impactOsc.stop(now + 0.2);
  
      return noiseSource;
    };
  }
};
