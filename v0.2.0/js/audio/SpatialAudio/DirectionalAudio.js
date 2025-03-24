// DirectionalAudio.js
// 방향성을 가진 오디오 효과 생성 및 처리

// 전역 네임스페이스 사용
window.DirectionalAudio = {
  // 의존성 참조
  settings: null,
  reverbCalculator: null,
  roomAnalyzer: null,
  debugVisualizer: null,
  
  // 초기화
  init(dependencies) {
    console.log('DirectionalAudio 초기화 중...');
    this.settings = dependencies.settings;
    
    // ReverbCalculator와 RoomAnalyzer는 나중에 SpatialAudioSystem에서 설정됨
    
    console.log('DirectionalAudio 초기화 완료');
  },
  
  // 메인 모듈에서 다른 모듈 참조 설정
  setModuleDependencies(modules) {
    console.log('DirectionalAudio 모듈 의존성 설정');
    this.reverbCalculator = modules.reverbCalculator;
    this.roomAnalyzer = modules.roomAnalyzer;
  },
  
  // 디버그 시각화 모듈 참조 설정
  setDebugVisualizer(visualizer) {
    this.debugVisualizer = visualizer;
  },
  
  /**
   * 플레이어 위치 기반 공간 반향 효과에 방향성을 추가합니다
   * @param {string} soundName - 재생할 사운드 이름 
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  createDirectionalReverb(soundName, position) {
    console.log('createDirectionalReverb 호출됨:', soundName);
    
    // 모듈 의존성 확인
    if (!this.reverbCalculator) {
      console.error('ReverbCalculator가 설정되지 않았습니다');
      return null;
    }
    
    if (!this.settings.enabled || !AudioManager.context) return null;
    
    // 공간 반향 설정 확인
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
      return null; // 비활성화된 경우 반향 없음
    }
    
    // 현재 품질 설정 가져오기
    const qualitySettings = this.reverbCalculator.getReverbQualitySettings();
    
    // 반향을 계산할 벽이 없으면 반환
    if (qualitySettings.wallCount <= 0) {
      return null;
    }
    
    // 플레이어 방향 정보 가져오기 (카메라 방향)
    const initialPlayerDirection = new THREE.Vector3(0, 0, -1); // 기본값: 앞쪽을 바라봄
    if (Graphics && Graphics.camera) {
      // 카메라가 바라보는 방향 계산
      initialPlayerDirection.set(0, 0, -1).applyQuaternion(Graphics.camera.quaternion);
    }
    
    // 가까운 벽 정보 가져오기
    const closestWalls = this.reverbCalculator.findClosestWalls(position);
    
    // 각 벽마다 별도의 반향 생성 
    closestWalls.forEach((wall, index) => {
      setTimeout(() => {
        // 반향이 재생될 시점의 최신 플레이어 방향 가져오기
        const currentPlayerDirection = new THREE.Vector3(0, 0, -1);
        if (Graphics && Graphics.camera) {
          currentPlayerDirection.set(0, 0, -1).applyQuaternion(Graphics.camera.quaternion);
        }
        
        // 벽에서 반사된 소리는 조금 다르게 들리도록 설정
        const echoShot = AudioManager.play(soundName, { 
          type: 'silenced',  // 소음기 달린 소리처럼 처리
          volume: 0.3 - (index * 0.1)  // 각 반향마다 점점 작아지는 볼륨
        });
        
        if (echoShot && AudioManager.context) {
          // 새로운 StereoPanner 노드 생성
          const panner = AudioManager.context.createStereoPanner();
          
          // 현재(반향 시점)의 플레이어 방향 기준으로 패닝 값 계산
          const panningValue = this.calculatePanning(currentPlayerDirection, wall.direction);
          panner.pan.value = panningValue;
          
          // 필터링 및 게인 설정
          const filter = AudioManager.context.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 2000 - (wall.distance * 10); // 거리가 멀수록 고주파 감쇠 증가
          
          const gain = AudioManager.context.createGain();
          gain.gain.value = Math.min(0.2 / Math.sqrt(wall.distance), 0.15) * (GameSettings.volumes.sfx || 0.7);
          
          // 오디오 노드 연결
          echoShot.connect(panner);
          panner.connect(filter);
          filter.connect(gain);
          gain.connect(AudioManager.context.destination);
          
          // 로그 출력 (디버깅용)
          if (window.DEBUG_AUDIO) {
            console.log(`벽 ${wall.name} 반향: 패닝 ${panningValue.toFixed(2)}, 지연 ${wall.delay.toFixed(0)}ms, 거리 ${wall.distance.toFixed(1)}m`);
          }
        }
      }, wall.delay);
    });
    
    return {
      walls: closestWalls,
      initialDirection: initialPlayerDirection.clone()
    };
  },
  
  /**
   * 고급 3D 공간 오디오 처리 - PannerNode 기반
   * @param {string} soundName - 재생할 사운드 이름
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  create3DReverb(soundName, position) {
    console.log('create3DReverb 호출됨:', soundName);
    
    // 모듈 의존성 확인
    if (!this.reverbCalculator) {
      console.error('ReverbCalculator가 설정되지 않았습니다');
      return this.createDirectionalReverb(soundName, position); // 폴백
    }
    
    if (!this.settings.enabled || !AudioManager.context) return null;
    
    // 공간 반향 설정 확인
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
      return null;
    }
    
    // 품질 설정 확인 - 3D 모드는 'high' 품질 설정에서만 활성화
    const quality = GameSettings.audio.reverbQuality;
    if (quality !== 'high') {
      // 고품질이 아니면 일반 방향성 반향 사용
      return this.createDirectionalReverb(soundName, position);
    }
    
    // Web Audio API의 AudioListener 생성 (플레이어의 "귀")
    const listener = AudioManager.context.listener;
    
    // 오디오 리스너 속성 설정 (HTML5 Web Audio API 방식)
    if (typeof listener.positionX !== 'undefined') {
      // 최신 Web Audio API
      listener.positionX.value = position.x;
      listener.positionY.value = position.y;
      listener.positionZ.value = position.z;
      
      // 플레이어 전방 벡터
      const forward = new THREE.Vector3(0, 0, -1);
      if (Graphics && Graphics.camera) {
        forward.copy(new THREE.Vector3(0, 0, -1)).applyQuaternion(Graphics.camera.quaternion);
      }
      
      // 플레이어 위쪽 벡터 (항상 y축 고정)
      const up = new THREE.Vector3(0, 1, 0);
      
      // 전방 및 위쪽 벡터 설정
      listener.forwardX.value = forward.x;
      listener.forwardY.value = forward.y;
      listener.forwardZ.value = forward.z;
      listener.upX.value = up.x;
      listener.upY.value = up.y;
      listener.upZ.value = up.z;
    } else {
      // 구형 Web Audio API
      listener.setPosition(position.x, position.y, position.z);
      
      const forward = new THREE.Vector3(0, 0, -1);
      const up = new THREE.Vector3(0, 1, 0);
      
      if (Graphics && Graphics.camera) {
        forward.copy(new THREE.Vector3(0, 0, -1)).applyQuaternion(Graphics.camera.quaternion);
      }
      
      listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
    
    // 반사 위치 계산
    const reflectionPoints = this.reverbCalculator.findClosestWalls(position);
    
    // 현재 품질 설정 가져오기
    const qualitySettings = this.reverbCalculator.getReverbQualitySettings();
    
    // 각 반사점에서 소리 재생
    reflectionPoints.forEach((point, index) => {
      // 음속(343m/s)을 고려한 소리 도달 시간 (밀리초)
      const delay = point.delay;
      
      // 지연 후 반사음 재생
      setTimeout(() => {
        // 현재 시점의 플레이어 위치와 방향 정보 다시 가져오기
        const currentPosition = new THREE.Vector3();
        if (Physics && Physics.playerBody) {
          currentPosition.copy(Physics.playerBody.position);
        } else if (Graphics && Graphics.camera) {
          currentPosition.copy(Graphics.camera.position);
        }
        
        // 반사된 소리 생성
        const sound = AudioManager.play(soundName, {
          type: 'silenced',
          volume: 0.2 - (index * 0.05) // 각 반사마다 볼륨 감소
        });
        
        if (!sound) return;
        
        // 3D 위치 패너 생성
        const panner = AudioManager.context.createPanner();
        
        // 패너 설정
        panner.panningModel = 'HRTF'; // 머리 관련 전달 함수 (더 현실적인 3D)
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 100;
        panner.rolloffFactor = 1.5;
        panner.coneInnerAngle = 360;
        panner.coneOuterAngle = 360;
        panner.coneOuterGain = 0;
        
        // 패너의 위치 설정 (반사점)
        if (typeof panner.positionX !== 'undefined') {
          // 최신 API
          panner.positionX.value = point.position.x;
          panner.positionY.value = point.position.y;
          panner.positionZ.value = point.position.z;
        } else {
          // 구형 API
          panner.setPosition(point.position.x, point.position.y, point.position.z);
        }
        
        // 오디오 필터링 (거리에 따른 고주파 감소)
        const filter = AudioManager.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000 - (point.distance * 5);
        filter.Q.value = 1.0;
        
        // 볼륨 제어
        const gain = AudioManager.context.createGain();
        gain.gain.value = Math.min(0.2 / Math.sqrt(point.distance), 0.15) * (GameSettings.volumes.sfx || 0.7);
        
        // 오디오 노드 연결
        sound.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
        gain.connect(AudioManager.context.destination);
        
        // 디버그 로깅
        if (window.DEBUG_AUDIO) {
          console.log(`3D 반향: ${point.name}, 거리: ${point.distance.toFixed(2)}m, 지연: ${delay.toFixed(0)}ms`);
        }
      }, delay);
    });
    
    return {
      reflectionPoints: reflectionPoints
    };
  },
  
  /**
   * 플레이어 방향과 벽 방향을 기준으로 스테레오 패닝 값을 계산합니다
   * @param {THREE.Vector3} playerDir - 플레이어가 바라보는 방향 벡터
   * @param {THREE.Vector3} wallDir - 벽의 방향 벡터
   * @return {number} -1(완전 왼쪽) ~ 1(완전 오른쪽) 사이의 패닝 값
   */
  calculatePanning(playerDir, wallDir) {
    // 플레이어 방향의 오른쪽 벡터 계산 (외적 이용)
    const playerRight = new THREE.Vector3(0, 1, 0).cross(playerDir).normalize();
    
    // 벽 방향과 플레이어 오른쪽 벡터의 내적 계산
    // 내적 값이 양수이면 오른쪽, 음수이면 왼쪽에 위치
    const dotProduct = wallDir.dot(playerRight);
    
    // 내적 값을 -1~1 범위로 제한하여 패닝 값으로 사용
    // 값이 클수록 더 오른쪽에서 소리가 들림
    const panValue = Math.max(-1, Math.min(1, dotProduct * 1.5)); // 1.5배로 증가 (더 확실한 효과)
    
    // 디버그 레벨이 높을 때만 패닝 값 로그 출력
    if (window.DEBUG_AUDIO && window.DEBUG_AUDIO > 1) {
      console.log(`패닝 계산: ${panValue.toFixed(2)} (dot: ${dotProduct.toFixed(2)})`);
    }
    
    return panValue;
  },
  
  /**
   * 총소리 효과와 방향성 반향 효과를 생성합니다
   * @param {string} soundName - 발사할 소리 이름 (기본값 'shoot')
   * @param {THREE.Vector3} position - 플레이어 위치
   * @param {Object} options - 추가 옵션
   */
  createGunSoundWithReverb(soundName = 'shoot', position, options = {}) {
    console.log('createGunSoundWithReverb 호출됨:', soundName);
    
    if (!this.settings.enabled || !AudioManager.context) {
      // 디버그: 시스템 비활성화됨
      if (this.debugVisualizer) {
        this.debugVisualizer.showDebugInfo('🚫 Audio System Disabled', { reason: 'System disabled or context missing' });
      }
      return null;
    }
    
    // 공간 반향 설정 확인
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
      // 디버그: 공간 반향 비활성화됨
      if (this.debugVisualizer) {
        this.debugVisualizer.showDebugInfo('🚫 Spatial Reverb Disabled', { settings: GameSettings.audio });
      }
      return null; // 비활성화된 경우 반향 없음
    }
    
    // 품질 설정에 따라 다른 반향 방식 사용
    const quality = GameSettings.audio && GameSettings.audio.reverbQuality ? 
                   GameSettings.audio.reverbQuality : 'medium';
    
    // 디버그: 기본 총소리도 소리 특성 변경 (구분하기 쉽게)
    const debugOptions = { ...options };
    
    if (quality === 'high') {
      // 고품질: 완전한 3D 공간 오디오 - 주파수 특성 변경 (더 낮은 음역대)
      debugOptions.frequency = 220;
      
      // 디버그: 3D 시스템 활성화 표시
      if (this.debugVisualizer) {
        this.debugVisualizer.showDebugInfo('🔊 3D Spatial Audio (High Quality)', { 
          quality: 'high',
          wallCount: this.reverbCalculator ? this.reverbCalculator.getReverbQualitySettings().wallCount : 0,
          position: `x:${position ? position.x.toFixed(1) : 'N/A'}, z:${position ? position.z.toFixed(1) : 'N/A'}`
        });
      }
      
      return this.create3DReverb(soundName, position);
    } else {
      // 중/저품질: 방향성이 있는 스테레오 반향 - 주파수 특성 변경 (더 높은 음역대)
      debugOptions.frequency = 880;
      
      // 플레이어 방향 정보 가져오기
      const playerDir = new THREE.Vector3(0, 0, -1);
      if (Graphics && Graphics.camera) {
        playerDir.set(0, 0, -1).applyQuaternion(Graphics.camera.quaternion);
      }
      
      // 디버그: 방향성 시스템 활성화 표시
      if (this.debugVisualizer) {
        this.debugVisualizer.showDebugInfo('🔊 Directional Reverb (Medium/Low Quality)', { 
          quality: quality,
          playerDir: `x:${playerDir.x.toFixed(1)}, z:${playerDir.z.toFixed(1)}`,
          position: `x:${position ? position.x.toFixed(1) : 'N/A'}, z:${position ? position.z.toFixed(1) : 'N/A'}`
        });
      }
      
      return this.createDirectionalReverb(soundName, position);
    }
  }
};
