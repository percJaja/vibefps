/**
 * BGMManager.js - 배경 음악 관리 모듈
 * 
 * 게임의 다양한 상태에 맞는 배경 음악을 관리합니다.
 * MP3 파일을 사용하여 더 풍부한 음악 경험을 제공합니다.
 */
const BGMManager = {
  // 현재 활성화된 BGM 트랙 
  currentTrack: null,
  
  // 사용 가능한 BGM 트랙 목록
  tracks: {
    menu: null,
    gameplay: null,
    intense: null,
    victory: null,
    gameover: null
  },
  
  // 마지막 볼륨 저장 (페이드 인/아웃에서 사용)
  lastVolume: 0.5,
  
  // 페이드 효과용 타이머 ID
  fadeTimerId: null,
  
  // 오디오 재생 준비 여부 (자동 재생 정책 관련)
  audioEnabled: false,
  
  // 기본값으로 재생할 트랙 (오디오 활성화 후 사용)
  defaultTrack: 'menu',
  
  // 대기 중인 트랙 목록
  pendingTracks: [],
  
  // 현재 게임 상태
  currentGameState: 'menu',
  
  // 인텐스 트랙 활성화 상태
  intenseMusicActive: false,
  
  // 인텐스 트랙 전환 타이머
  intenseMusicTimer: null,
  
  // 인텐스 음악 쿨다운 (마지막으로 인텐스 음악이 재생된 시간)
  lastIntenseTime: 0,
  
  // 인텐스 음악 쿨다운 시간 (밀리초) - 증가: 15초 → 30초
  intenseCooldown: 30000, // 30초
  
  /**
   * 초기화 함수
   */
  init() {
    // 모든 BGM 트랙 미리 로드
    this.preloadTracks();
    
    // 이벤트 리스너 등록
    this.setupEventListeners();
    
    // 사용자 상호작용 이벤트 등록 (오디오 활성화)
    this.setupAudioUnlock();
    
    console.log('BGMManager 초기화 완료');
  },
  
  /**
   * 모든 BGM 트랙 미리 로드
   */
  preloadTracks() {
    // 오디오 객체 생성 및 속성 설정
    for (const trackName in this.tracks) {
      const audio = new Audio();
      audio.src = `../assets/audio/bgm/${trackName}.mp3`;
      audio.loop = true;
      audio.preload = 'auto'; // 자동 미리 로드
      audio.volume = 0; // 초기에는 볼륨 0으로 설정
      
      // 모바일 디바이스의 자동 재생 제한 우회를 위해 음소거 상태로 미리 로드
      audio.muted = true;
      
      this.tracks[trackName] = audio;
      
      // 로드 완료 이벤트
      audio.addEventListener('canplaythrough', () => {
        console.log(`BGM 트랙 로드 완료: ${trackName}`);
      });
      
      // 오류 처리
      audio.addEventListener('error', (e) => {
        console.error(`BGM 트랙 로드 실패: ${trackName}`, e.target.error);
        
        // 파일 경로 문제일 가능성 높음 - 안내 메시지 출력
        if (e.target.error && e.target.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          console.warn(`BGM 파일이 존재하지 않을 수 있습니다. 경로 확인: assets/audio/bgm/${trackName}.mp3`);
          
          // 폴백: MP3 로드에 실패한 경우, 절차적 사운드로 생성
          this.createFallbackTrack(trackName);
        }
      });
    }
  },
  
  /**
   * MP3 로드 실패 시 폴백으로 사용할 절차적 오디오 생성
   * @param {string} trackName - 트랙 이름
   */
  createFallbackTrack(trackName) {
    if (!window.AudioContext) {
      console.warn("AudioContext를 지원하지 않는 브라우저입니다. 폴백 오디오를 생성할 수 없습니다.");
      return;
    }
    
    // AudioContext 생성
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // 간단한 오실레이터와 게인 노드로 절차적 사운드 생성
    const createProceduralTrack = () => {
      // 트랙 유형에 따라 다른 설정 적용
      let oscillator, gainNode, type, frequency, gainValue;
      
      switch (trackName) {
        case 'menu':
          type = 'sine';
          frequency = 220; // A3
          gainValue = 0.1;
          break;
        case 'gameplay':
          type = 'triangle';
          frequency = 329.63; // E4
          gainValue = 0.15;
          break;
        case 'intense':
          type = 'sawtooth';
          frequency = 440; // A4
          gainValue = 0.2;
          break;
        case 'victory':
          type = 'sine';
          frequency = 523.25; // C5
          gainValue = 0.15;
          break;
        case 'gameover':
          type = 'triangle';
          frequency = 196; // G3
          gainValue = 0.1;
          break;
        default:
          type = 'sine';
          frequency = 220;
          gainValue = 0.1;
      }
      
      // 오실레이터 생성
      oscillator = audioCtx.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      // 게인 노드 생성
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // 초기 볼륨은 0
      
      // 미묘한 변조 추가
      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.2; // 매우 느린 변조
      
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 4; // 변조 강도
      
      // 노드 연결
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // LFO 시작
      lfo.start();
      oscillator.start();
      
      return { oscillator, gainNode, lfo, audioCtx };
    };
    
    // Audio 객체처럼 속성 및 메서드를 가진 폴백 객체 생성
    const fallbackTrack = {
      nodes: null,
      paused: true,
      muted: true,
      loop: true,
      volume: 0,
      
      play() {
        if (!this.nodes) {
          this.nodes = createProceduralTrack();
          this.paused = false;
          
          // 볼륨 설정
          if (!this.muted) {
            this.nodes.gainNode.gain.value = this.volume * 0.2; // 기본 게인의 20%로 제한
          }
        } else if (this.paused) {
          // 이미 생성된 경우, 오디오 컨텍스트 재개
          if (this.nodes.audioCtx.state === 'suspended') {
            this.nodes.audioCtx.resume();
          }
          this.paused = false;
        }
        
        return Promise.resolve(); // 실제 Audio.play()는 Promise를 반환
      },
      
      pause() {
        if (this.nodes && !this.paused) {
          this.paused = true;
          if (this.nodes.audioCtx.state === 'running') {
            this.nodes.audioCtx.suspend();
          }
        }
      }
    };
    
    // 원본 트랙 대체
    this.tracks[trackName] = fallbackTrack;
    console.log(`${trackName} 트랙에 대한 폴백 생성 완료`);
  },
  
  /**
   * 자동 재생 정책 제한을 해결하기 위한 설정
   */
  setupAudioUnlock() {
    // 사용자 상호작용 이벤트에 오디오 잠금 해제 함수 등록
    const unlockAudio = () => {
      if (this.audioEnabled) return; // 이미 활성화되었으면 중복 실행 방지
      
      console.log('사용자 상호작용 감지 - 오디오 활성화 시도');
      
      // 음소거 해제
      for (const trackName in this.tracks) {
        if (this.tracks[trackName]) {
          this.tracks[trackName].muted = false;
        }
      }
      
      // 짧은 임시 사운드 재생하여 오디오 컨텍스트 활성화
      const silentSound = new Audio();
      silentSound.src = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      silentSound.volume = 0.01; // 아주 작은 볼륨
      
      // 사운드 재생 시도
      const playPromise = silentSound.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // 오디오 활성화 성공
          this.audioEnabled = true;
          console.log('오디오 활성화 성공');
          
          // 0.5초 후에 기본 트랙 또는 대기 중인 트랙 재생 시도
          setTimeout(() => {
            // 대기 중인 트랙이 있으면 재생
            if (this.pendingTracks.length > 0) {
              const { trackName, fadeInDuration } = this.pendingTracks.shift();
              this.play(trackName, fadeInDuration);
              
              // 나머지 대기 트랙 무시 (가장 최근 것만 사용)
              this.pendingTracks = [];
            } else if (this.defaultTrack) {
              // 기본 트랙 재생
              this.play(this.defaultTrack);
            }
          }, 500);
          
          // 이벤트 알림
          if (EventSystem && typeof EventSystem.emit === 'function') {
            EventSystem.emit('audioEnabled', { source: 'BGMManager' });
          }
        }).catch(e => {
          // 여전히 권한 없음 - 추가 사용자 상호작용 필요
          console.warn('첫 시도에서 오디오 활성화 실패. 다음 상호작용을 기다립니다.', e);
        });
      }
    };
    
    // 다양한 사용자 상호작용 이벤트에 리스너 등록
    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(eventType => {
      document.addEventListener(eventType, unlockAudio, { once: false });
    });
    
    // 게임 시작 버튼 찾아서 이벤트 리스너 추가
    const startButton = document.getElementById('startButton');
    if (startButton) {
      startButton.addEventListener('click', unlockAudio, { once: true });
    }
    
    // 설정 버튼에도 이벤트 리스너 추가
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
      settingsButton.addEventListener('click', unlockAudio, { once: true });
    }
  },
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 게임 상태 변경 이벤트 리스닝
    if (typeof EventSystem !== 'undefined') {
      EventSystem.on('gameStateChanged', (data) => {
        this.handleGameStateChange(data.state);
      });
      
      // 콤보 효과에 반응하기 위한 이벤트 리스닝
      EventSystem.on('targetHit', (data) => {
        // 동적 BGM이 활성화되어 있는지 확인
        if (!GameSettings.audio || !GameSettings.audio.dynamicBgm) {
          return; // 비활성화 상태면 무시
        }
        
        // 게임 플레이 중인지 확인
        if (this.currentGameState !== 'playing') {
          return; // 게임 플레이 상태가 아니면 무시
        }
        
        // 인텐스 음악이 이미 재생 중이면 무시
        if (this.intenseMusicActive) {
          return;
        }
        
        // 인텐스 트랙 쿨다운 확인
        const now = Date.now();
        if (now - this.lastIntenseTime < this.intenseCooldown) {
          return; // 쿨다운 중이면 무시
        }
        
        // 콤보 임계값 증가 (5 → 8)
        if (data.comboCount >= 8) {
          // 인텐스 트랙 활성화 상태로 표시
          this.intenseMusicActive = true;
          
          // 인텐스 트랙 재생 (횡단 페이드)
          this.crossFade('intense', 1.5); // 페이드 시간 증가 (1.0 → 1.5)
          
          // 마지막 인텐스 음악 재생 시간 기록
          this.lastIntenseTime = now;
          
          // 이전 타이머가 있으면 제거
          if (this.intenseMusicTimer) {
            clearTimeout(this.intenseMusicTimer);
          }
          
          // 인텐스 음악 지속 시간 연장 (10초 → 20초)
          this.intenseMusicTimer = setTimeout(() => {
            // 아직 게임 플레이 중이고 인텐스 트랙이 활성화되어 있으면
            if (this.currentGameState === 'playing' && this.intenseMusicActive) {
              // 인텐스 음악 비활성화
              this.intenseMusicActive = false;
              
              // 게임플레이 트랙으로 돌아감 (페이드 시간 증가: 2.0 → 3.0)
              this.crossFade('gameplay', 3.0);
            }
          }, 20000); // 20초로 연장
        }
      });
    }
    
    // 설정 변경 이벤트 리스닝 (설정 화면에서 동적 BGM 토글 위해)
    if (typeof GameSettings !== 'undefined' && GameSettings.onSettingsChanged) {
      GameSettings.onSettingsChanged.push((settings) => {
        // 동적 BGM이 비활성화되었고, 인텐스 음악이 재생 중이면
        if (!settings.audio.dynamicBgm && this.intenseMusicActive) {
          // 인텐스 음악 중지하고 일반 게임 음악으로 전환
          this.intenseMusicActive = false;
          if (this.intenseMusicTimer) {
            clearTimeout(this.intenseMusicTimer);
            this.intenseMusicTimer = null;
          }
          this.crossFade('gameplay', 2.0);
        }
      });
    }
  },
  
  /**
   * 게임 상태 변경 처리
   * @param {string} state - 게임 상태
   */
  handleGameStateChange(state) {
    // 이전 상태와 동일하면 불필요한 처리 방지
    if (state === this.currentGameState) {
      return;
    }
    
    // 현재 게임 상태 업데이트
    this.currentGameState = state;
    
    // 상태 변경 시 인텐스 음악 상태 초기화
    this.intenseMusicActive = false;
    
    // 이전 인텐스 트랙 타이머가 있으면 제거
    if (this.intenseMusicTimer) {
      clearTimeout(this.intenseMusicTimer);
      this.intenseMusicTimer = null;
    }
    
    switch (state) {
      case 'initialized':
      case 'menu':
        this.defaultTrack = 'menu';
        this.play('menu', 1.5); // 페이드 시간 조정
        break;
      case 'playing':
        this.defaultTrack = 'gameplay';
        this.play('gameplay', 2.0); // 페이드 시간 조정
        break;
      case 'gameOver':
        this.defaultTrack = 'gameover';
        this.play('gameover', 2.5); // 페이드 시간 조정
        break;
      default:
        // 알 수 없는 상태는 menu 트랙 사용
        this.defaultTrack = 'menu';
        this.play('menu', 1.0);
    }
  },
  
  /**
   * 지정된 BGM 트랙 재생
   * @param {string} trackName - 재생할 트랙 이름
   * @param {number} fadeInDuration - 페이드 인 지속 시간(초)
   */
  play(trackName, fadeInDuration = 2.0) {
    // 트랙이 유효한지 확인
    if (!this.tracks[trackName]) {
      console.warn(`알 수 없는 BGM 트랙: ${trackName}`);
      return;
    }
    
    // 현재 동일한 트랙이 재생 중이면 무시 (중복 재생 방지)
    if (this.currentTrack === this.tracks[trackName] && 
        !this.tracks[trackName].paused) {
      return;
    }
    
    // 오디오가 아직 활성화되지 않았으면 대기 목록에 추가
    if (!this.audioEnabled) {
      console.log(`BGM 재생 대기 중: ${trackName} (오디오 활성화 필요)`);
      // 이전 요청이 있으면 교체 (가장 최근 요청만 유지)
      this.pendingTracks = [{ trackName, fadeInDuration }];
      // 기본 트랙으로 설정
      this.defaultTrack = trackName;
      return;
    }
    
    // 볼륨 설정 가져오기 (BGM 비활성화 여부 확인)
    const targetVolume = (!GameSettings.volumes || GameSettings.volumes.bgmEnabled !== false) ? 
                         (GameSettings.volumes?.music || 0.5) : 0;
    this.lastVolume = targetVolume;
    
    // 기존 트랙 페이드 아웃
    if (this.currentTrack) {
      this.fadeOut(this.currentTrack, fadeInDuration * 0.8); // 페이드아웃은 페이드인보다 약간 빠르게
    }
    
    // 새 트랙 설정
    const newTrack = this.tracks[trackName];
    
    // 음소거 해제 (모바일 자동 재생 제한 해제)
    newTrack.muted = false;
    
    // 볼륨 초기화
    if (typeof newTrack.volume !== 'undefined') {
      newTrack.volume = 0;
    }
    
    // 재생 시작 (절차적 사운드나 실제 오디오 파일)
    const playPromise = newTrack.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.warn(`BGM 재생 시작 실패: ${trackName}`, e);
        
        // 사용자 상호작용 필요 메시지
        if (e.name === 'NotAllowedError') {
          console.info('브라우저 자동 재생 정책: 사용자 상호작용 후 재생 시도가 필요합니다');
          
          // 오디오 활성화 재시도
          this.audioEnabled = false;
          
          // 현재 요청을 대기 목록에 추가
          this.pendingTracks = [{ trackName, fadeInDuration }];
          
          // 사용자에게 알림 표시 (선택적)
          this.showAudioActivationMessage();
        }
      });
    }
    
    // 페이드 인
    this.fadeIn(newTrack, fadeInDuration);
    
    // 현재 트랙 업데이트
    this.currentTrack = newTrack;
    
    console.log(`BGM 트랙 변경: ${trackName}`);
  },
  
  /**
   * 사용자에게 오디오 활성화 필요 메시지 표시
   */
  showAudioActivationMessage() {
    // 기존 메시지가 있다면 제거
    const existingMsg = document.getElementById('bgmActivationMsg');
    if (existingMsg) {
      existingMsg.remove();
    }
    
    // 메시지 컨테이너 생성
    const msgContainer = document.createElement('div');
    msgContainer.id = 'bgmActivationMsg';
    msgContainer.style.position = 'fixed';
    msgContainer.style.bottom = '20px';
    msgContainer.style.right = '20px';
    msgContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    msgContainer.style.color = 'white';
    msgContainer.style.padding = '10px 15px';
    msgContainer.style.borderRadius = '5px';
    msgContainer.style.fontSize = '14px';
    msgContainer.style.maxWidth = '250px';
    msgContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    msgContainer.style.zIndex = '9999';
    msgContainer.style.transition = 'opacity 0.5s';
    
    // 로컬라이제이션 지원 여부 확인
    const message = (typeof Localization !== 'undefined') ?
      Localization.getText('bgmActivationMessage') || '화면을 클릭하여 음악을 활성화하세요' :
      '화면을 클릭하여 음악을 활성화하세요';
    
    msgContainer.textContent = message;
    
    // 클릭 시 자신을 제거하도록 설정
    msgContainer.addEventListener('click', () => {
      msgContainer.style.opacity = '0';
      setTimeout(() => msgContainer.remove(), 500);
    });
    
    // 5초 후 자동으로 사라짐
    setTimeout(() => {
      if (document.body.contains(msgContainer)) {
        msgContainer.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(msgContainer)) {
            msgContainer.remove();
          }
        }, 500);
      }
    }, 5000);
    
    // 화면에 추가
    document.body.appendChild(msgContainer);
  },
  
  /**
   * 현재 재생 중인 BGM 일시 정지
   */
  pause() {
    if (this.currentTrack) {
      this.currentTrack.pause();
    }
  },
  
  /**
   * 일시 정지된 BGM 다시 재생
   */
  resume() {
    if (this.currentTrack && this.currentTrack.paused) {
      const resumePromise = this.currentTrack.play();
      if (resumePromise !== undefined) {
        resumePromise.catch(e => {
          console.warn('BGM 재개 실패:', e);
          
          // 자동 재생 정책 오류인 경우
          if (e.name === 'NotAllowedError') {
            // 오디오 활성화 재시도
            this.audioEnabled = false;
            
            // 사용자에게 알림 표시
            this.showAudioActivationMessage();
          }
        });
      }
    }
  },
  
  /**
   * 모든 BGM 정지
   */
  stopAll() {
    // 페이드 타이머 정리
    if (this.fadeTimerId) {
      clearInterval(this.fadeTimerId);
      this.fadeTimerId = null;
    }
    
    // 인텐스 음악 타이머 정리
    if (this.intenseMusicTimer) {
      clearTimeout(this.intenseMusicTimer);
      this.intenseMusicTimer = null;
    }
    
    // 모든 트랙 정지
    for (const trackName in this.tracks) {
      const track = this.tracks[trackName];
      if (track) {
        if (typeof track.pause === 'function') {
          track.pause();
          
          // 실제 오디오 요소인 경우에만 currentTime 재설정
          if (track instanceof Audio) {
            track.currentTime = 0;
          }
        }
      }
    }
    
    this.currentTrack = null;
    this.intenseMusicActive = false;
  },
  
  /**
   * 오디오 트랙 페이드 인
   * @param {HTMLAudioElement|Object} track - 페이드 인할 오디오 트랙
   * @param {number} duration - 페이드 지속 시간(초)
   */
  fadeIn(track, duration = 2.0) {
    // 이전 페이드 작업 취소
    if (this.fadeTimerId) {
      clearInterval(this.fadeTimerId);
    }
    
    // BGM이 비활성화되어 있으면 볼륨 0 유지
    if (GameSettings.volumes && GameSettings.volumes.bgmEnabled === false) {
      if (typeof track.volume !== 'undefined') {
        track.volume = 0;
      } else if (track.nodes && track.nodes.gainNode) {
        track.nodes.gainNode.gain.value = 0;
      }
      return;
    }
    
    // 목표 볼륨
    const targetVolume = this.lastVolume;
    
    // 볼륨을 직접 설정할 수 있는지 확인
    if (typeof track.volume !== 'undefined') {
      // 일반 오디오 요소 처리
      track.volume = 0;
      
      // 업데이트 간격 (밀리초)
      const interval = 50;
      
      // 각 단계마다 증가할 볼륨
      const step = targetVolume / (duration * 1000 / interval);
      
      // 페이드 인 시작
      this.fadeTimerId = setInterval(() => {
        // 볼륨 증가
        track.volume = Math.min(targetVolume, track.volume + step);
        
        // 목표 볼륨에 도달하면 인터벌 중지
        if (track.volume >= targetVolume - 0.01) {
          track.volume = targetVolume;
          clearInterval(this.fadeTimerId);
          this.fadeTimerId = null;
        }
      }, interval);
    } else if (track.nodes && track.nodes.gainNode) {
      // 절차적 트랙 처리
      track.nodes.gainNode.gain.value = 0;
      
      // 현재 오디오 컨텍스트 시간
      const now = track.nodes.audioCtx.currentTime;
      
      // 리니어 램프로 볼륨 증가
      track.nodes.gainNode.gain.linearRampToValueAtTime(
        0, now
      );
      track.nodes.gainNode.gain.linearRampToValueAtTime(
        targetVolume * 0.2, // 실제 오디오보다 작게 조정
        now + duration
      );
    }
  },
  
  /**
   * 오디오 트랙 페이드 아웃
   * @param {HTMLAudioElement|Object} track - 페이드 아웃할 오디오 트랙
   * @param {number} duration - 페이드 지속 시간(초)
   */
  fadeOut(track, duration = 2.0) {
    // 이미 재생 중이 아니면 무시
    if (track.paused) {
      return;
    }
    
    // 볼륨을 직접 설정할 수 있는지 확인
    if (typeof track.volume !== 'undefined') {
      // 일반 오디오 요소 처리
      const startVolume = track.volume;
      
      // 업데이트 간격 (밀리초)
      const interval = 50;
      
      // 각 단계마다 감소할 볼륨
      const step = startVolume / (duration * 1000 / interval);
      
      // 별도의 타이머 ID 사용 (여러 트랙 동시 페이드를 위해)
      const fadeOutTimerId = setInterval(() => {
        // 볼륨 감소
        track.volume = Math.max(0, track.volume - step);
        
        // 볼륨이 0에 도달하면 정지 및 인터벌 중지
        if (track.volume <= 0.01) {
          track.volume = 0;
          track.pause();
          
          // 실제 오디오 요소인 경우에만 currentTime 재설정
          if (track instanceof Audio) {
            track.currentTime = 0; // 처음으로 되감기
          }
          
          clearInterval(fadeOutTimerId);
        }
      }, interval);
    } else if (track.nodes && track.nodes.gainNode) {
      // 절차적 트랙 처리
      const now = track.nodes.audioCtx.currentTime;
      const currentGain = track.nodes.gainNode.gain.value;
      
      // 리니어 램프로 볼륨 감소
      track.nodes.gainNode.gain.linearRampToValueAtTime(
        currentGain, now
      );
      track.nodes.gainNode.gain.linearRampToValueAtTime(
        0, now + duration
      );
      
      // 페이드 아웃 후 정지
      setTimeout(() => {
        if (track.nodes) {
          track.pause();
        }
      }, duration * 1000);
    }
  },
  
  /**
   * 두 트랙 간 크로스 페이드
   * @param {string} newTrackName - 페이드 인할 새 트랙 이름
   * @param {number} duration - 페이드 지속 시간(초)
   */
  crossFade(newTrackName, duration = 2.0) {
    // 트랙이 유효한지 확인
    if (!this.tracks[newTrackName]) {
      console.warn(`알 수 없는 BGM 트랙: ${newTrackName}`);
      return;
    }
    
    // 새 트랙이 현재 트랙과 동일하고 이미 재생 중이면 무시
    if (this.currentTrack === this.tracks[newTrackName] && 
        !this.tracks[newTrackName].paused) {
      return;
    }
    
    // 전환 방지: 짧은 시간 내에 여러 번 트랙 변경을 방지
    if (this._lastCrossFadeTime && Date.now() - this._lastCrossFadeTime < 3000) {
      console.log(`너무 빠른 트랙 전환 시도 방지: ${newTrackName}`);
      return;
    }
    
    // 크로스페이드 타임스탬프 기록
    this._lastCrossFadeTime = Date.now();
    
    // 현재 트랙이 있으면 페이드 아웃
    if (this.currentTrack) {
      this.fadeOut(this.currentTrack, duration);
    }
    
    // 새 트랙 페이드 인
    this.play(newTrackName, duration);
  },
  
  /**
   * BGM 볼륨 설정
   * @param {number} volume - 0.0 ~ 1.0 사이의 볼륨 값
   */
  setVolume(volume) {
    // 유효 범위로 제한
    volume = Math.max(0, Math.min(1, volume));
    
    // 볼륨 저장
    this.lastVolume = volume;
    
    // 현재 트랙 볼륨 설정
    if (this.currentTrack) {
      if (typeof this.currentTrack.volume !== 'undefined') {
        this.currentTrack.volume = volume;
      } else if (this.currentTrack.nodes && this.currentTrack.nodes.gainNode) {
        // 절차적 트랙은 볼륨을 20%로 제한
        this.currentTrack.nodes.gainNode.gain.value = volume * 0.2;
      }
    }
    
    console.log(`BGM 볼륨 설정: ${volume}`);
  },
  
  /**
   * 오디오 상태 확인
   * @return {Object} 현재 오디오 상태 정보
   */
  getStatus() {
    // 현재 오디오 상태 정보 반환
    return {
      audioEnabled: this.audioEnabled,
      currentTrack: this.currentTrack ? Object.keys(this.tracks).find(key => this.tracks[key] === this.currentTrack) : null,
      volume: this.lastVolume,
      isPaused: this.currentTrack ? this.currentTrack.paused : true,
      pendingTracks: this.pendingTracks,
      intenseMusicActive: this.intenseMusicActive,
      currentGameState: this.currentGameState
    };
  }
};
