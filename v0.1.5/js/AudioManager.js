const AudioManager = {
  context: null,
  sounds: {},
  music: null,
  
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
    
    // 배경 음악 초기화
    this.initBackgroundMusic();
    
    console.log('AudioManager 초기화 완료: 절차적 사운드 사용');
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
      penaltyHit: this.createPenaltyHitSoundGenerator()
    };
  },
  
  initBackgroundMusic() {
    // 간단한 배경 음악 (옵션)
    if (this.context) {
      const musicGenerator = () => {
        // 배경 음악을 위한 오실레이터 및 게인 노드 설정
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 220; // A3 음
        
        // 미묘한 변조 추가
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.2; // 매우 느린 변조
        
        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 4; // 변조 강도
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        // 볼륨 설정
        gainNode.gain.value = 0.05 * (GameSettings.volumes.music || 0.5);
        
        // 연결
        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        // LFO 시작
        lfo.start();
        
        return { oscillator, gainNode, lfo };
      };
      
      this.music = {
        generator: musicGenerator,
        playing: false,
        nodes: null,
        volume: GameSettings.volumes.music || 0.5
      };
    } else {
      // Web Audio API를 사용할 수 없는 경우 빈 오디오 요소로 폴백
      this.music = new Audio();
      this.music.loop = true;
      this.music.volume = GameSettings.volumes.music || 0.5;
    }
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
      
      // 게인(볼륨) 구성
      gainNode.gain.value = 0;
      
      // 볼륨 엔벨로프
      const now = this.context.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.7 * (GameSettings.volumes.sfx || 0.7), now + 0.01);
      
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
  
  playMusic() {
    if (this.context && this.music.generator && !this.music.playing) {
      this.music.playing = true;
      this.music.nodes = this.music.generator();
      this.music.nodes.oscillator.start();
    } else if (this.music && this.music.paused) {
      this.music.play().catch(e => console.warn('음악 재생 실패:', e));
    }
  },
  
  pauseMusic() {
    if (this.context && this.music.nodes && this.music.playing) {
      this.music.nodes.oscillator.stop();
      if (this.music.nodes.lfo) {
        this.music.nodes.lfo.stop();
      }
      this.music.playing = false;
      this.music.nodes = null;
    } else if (this.music && !this.music.paused) {
      this.music.pause();
    }
  },
  
  setVolume(type, volume) {
    if (type === 'music') {
      if (this.context && this.music.nodes) {
        this.music.volume = volume;
        this.music.nodes.gainNode.gain.value = volume;
      } else if (this.music) {
        this.music.volume = volume;
      }
    } else if (type === 'sfx') {
      // 이것은 현재 재생 중인 소리가 아닌 향후 소리에 영향을 미칩니다
      GameSettings.volumes.sfx = volume;
    }
  }
};
