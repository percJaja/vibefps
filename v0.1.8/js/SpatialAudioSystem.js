// SpatialAudioSystem.js
// 벽과 장애물 위치를 고려한 현실적인 오디오 반향 시스템

const SpatialAudioSystem = {
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
  
  // 초기화
  init() {
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
    
    console.log('SpatialAudioSystem 초기화 완료');
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
  
  // 현재 플레이어 위치에서 공간 특성 분석
  analyzeSpace(playerPosition, forceUpdate = false) {
    // 공간 오디오가 비활성화된 경우 기본값 반환
    if (!this.settings.enabled) {
      return this.getDefaultRoomCharacteristics();
    }
    
    const now = Date.now();
    
    // 이미 최근에 분석한 위치이고 강제 업데이트가 아니면 캐시된 결과 반환
    if (
      !forceUpdate &&
      now - this.cachedAnalysis.lastUpdateTime < this.updateInterval &&
      playerPosition.distanceTo(this.cachedAnalysis.position) < 2
    ) {
      return this.cachedAnalysis.roomCharacteristics;
    }
    
    // 새 분석 수행
    const roomCharacteristics = this.performSpaceAnalysis(playerPosition);
    
    // 분석 결과 캐싱
    this.cachedAnalysis = {
      position: playerPosition.clone(),
      roomCharacteristics: roomCharacteristics,
      lastUpdateTime: now
    };
    
    return roomCharacteristics;
  },
  
  // 공간 분석 실행 - 플레이어 주변의 벽/장애물 감지
  performSpaceAnalysis(playerPosition) {
    // 모든 방향으로 레이를 발사하여 가장 가까운 표면까지의 거리 찾기
    const reflectionDistances = [];
    
    // 8개 방향(또는 설정된 방향 수)으로 레이캐스트 발사
    for (let i = 0; i < this.settings.rayDirections; i++) {
      const angle = (i / this.settings.rayDirections) * Math.PI * 2;
      
      // XZ 평면에서의 방향
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      );
      
      // 위로 30도 기울인 방향 추가 (천장)
      if (i % 2 === 0) {
        const upDirection = direction.clone();
        upDirection.y = 0.5; // 대략 30도 기울임
        upDirection.normalize();
        
        const upDistance = this.castRayForReflection(playerPosition, upDirection);
        if (upDistance) reflectionDistances.push(upDistance);
      }
      
      // 아래로 30도 기울인 방향 추가 (바닥)
      if (i % 2 === 1) {
        const downDirection = direction.clone();
        downDirection.y = -0.5; // 대략 -30도 기울임
        downDirection.normalize();
        
        const downDistance = this.castRayForReflection(playerPosition, downDirection);
        if (downDistance) reflectionDistances.push(downDistance);
      }
      
      // 수평 방향 레이캐스트
      const distance = this.castRayForReflection(playerPosition, direction);
      if (distance) reflectionDistances.push(distance);
    }
    
    // 유효한 반사 거리가 없으면 기본값 사용
    if (reflectionDistances.length === 0) {
      console.warn('유효한 반사 거리를 찾을 수 없음, 기본값 사용');
      return this.getDefaultRoomCharacteristics();
    }
    
    // 평균 반사 거리 계산
    const avgDistance = reflectionDistances.reduce((sum, dist) => sum + dist, 0) / reflectionDistances.length;
    
    // 최소 및 최대 반사 거리 찾기
    const minDistance = Math.min(...reflectionDistances);
    const maxDistance = Math.max(...reflectionDistances);
    
    // 공간 변동성(방 균일성) 계산
    const variance = reflectionDistances.reduce((sum, dist) => sum + Math.pow(dist - avgDistance, 2), 0) / reflectionDistances.length;
    const uniformity = Math.max(0, 1 - Math.min(1, Math.sqrt(variance) / avgDistance));
    
    // 룸 크기 범주 결정
    let roomSize;
    if (avgDistance < 3) {
      roomSize = 'small';
    } else if (avgDistance < 8) {
      roomSize = 'medium';
    } else if (avgDistance < 20) {
      roomSize = 'large';
    } else if (avgDistance < 50 && uniformity > 0.6) {
      roomSize = 'hall';
    } else {
      roomSize = 'outdoor';
    }
    
    // 장애물 밀도 계산 (레이 중 얼마나 많은 비율이 장애물에 부딪혔는지)
    const obstacleRayCount = reflectionDistances.filter(d => d < this.settings.maxReflectionDistance).length;
    const obstacleDensity = obstacleRayCount / (this.settings.rayDirections * 3); // 3은 위/아래/수평 방향 때문
    
    // 결과 반환
    return {
      roomSize,                  // 룸 크기 카테고리
      averageDistance: avgDistance, // 평균 반사 거리
      minDistance,               // 최소 반사 거리
      maxDistance,               // 최대 반사 거리
      uniformity,                // 공간 균일성 (0-1)
      obstacleDensity,           // 장애물 밀도 (0-1)
      reflectionCount: reflectionDistances.length, // 감지된 반사 수
      presetValues: this.reverbPresets[roomSize] // 해당 룸 크기의 리버브 프리셋
    };
  },
  
  // 레이캐스트를 사용하여 반사 거리 측정
  castRayForReflection(origin, direction) {
    // 모든 벽과 장애물을 포함하는 객체 배열 생성
    const objects = [];
    
    // 씬에서 모든 메시를 가져오기
    if (Graphics && Graphics.scene) {
      Graphics.scene.traverse(object => {
        // 메시이고 벽이나 장애물일 가능성이 있는 오브젝트
        if (object.isMesh && object !== Graphics.camera) {
          objects.push(object);
        }
      });
    }
    
    // Environment에서 장애물 추가
    if (Environment && Environment.obstacles) {
      Environment.obstacles.forEach(obstacle => {
        if (obstacle.mesh) {
          objects.push(obstacle.mesh);
        }
      });
    }
    
    // 객체가 없으면 기본값 반환
    if (objects.length === 0) {
      return this.settings.maxReflectionDistance;
    }
    
    // 레이캐스트 수행
    this.raycaster.set(origin, direction);
    const intersects = this.raycaster.intersectObjects(objects, true);
    
    // 충돌이 감지되면 거리 반환
    if (intersects.length > 0) {
      return intersects[0].distance;
    }
    
    // 충돌이 없으면 null 반환 (기본값 사용)
    return null;
  },
  
  // 기본 룸 특성 가져오기
  getDefaultRoomCharacteristics() {
    const roomSize = this.settings.roomSizeFallback;
    return {
      roomSize,
      averageDistance: 10,
      minDistance: 5,
      maxDistance: 15,
      uniformity: 0.7,
      obstacleDensity: 0.5,
      reflectionCount: 0,
      presetValues: this.reverbPresets[roomSize]
    };
  },

  /**
   * 디버그용 UI와 로그를 추가하여 현재 작동 중인 오디오 시스템을 표시합니다
   * @param {string} systemName - 작동 중인 시스템 이름
   * @param {Object} data - 디버그 데이터
   */
  showDebugInfo(systemName, data = {}) {
    // 1. 콘솔에 로그 남기기
    console.log(`🔊 오디오 시스템: ${systemName}`, data);
    
    // 2. 화면에 일시적으로 표시할 디버그 UI
    const debugDiv = document.getElementById('audioDebugInfo');
    
    // 디버그 UI가 없으면 생성
    if (!debugDiv) {
      const newDebugDiv = document.createElement('div');
      newDebugDiv.id = 'audioDebugInfo';
      newDebugDiv.style.position = 'fixed';
      newDebugDiv.style.top = '70px';
      newDebugDiv.style.right = '10px';
      newDebugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      newDebugDiv.style.color = '#fff';
      newDebugDiv.style.padding = '10px';
      newDebugDiv.style.borderRadius = '5px';
      newDebugDiv.style.fontFamily = 'monospace';
      newDebugDiv.style.fontSize = '12px';
      newDebugDiv.style.zIndex = '1000';
      newDebugDiv.style.pointerEvents = 'none'; // 마우스 클릭 통과
      document.body.appendChild(newDebugDiv);
    }
    
    // 디버그 정보 업데이트
    const debugInfo = document.getElementById('audioDebugInfo') || newDebugDiv;
    
    // 시스템 이름에 따라 색상 다르게 표시
    let systemColor = '#ffffff';
    if (systemName.includes('Direction')) {
      systemColor = '#00ffff'; // 청록색: 방향성 시스템
    } else if (systemName.includes('3D')) {
      systemColor = '#ff9900'; // 주황색: 3D 시스템
    } else if (systemName.includes('Legacy')) {
      systemColor = '#aaaaaa'; // 회색: 기존 시스템
    }
    
    // 데이터 문자열로 변환
    let dataString = '';
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        dataString += `${key}: ${value.toFixed(2)}<br>`;
      } else if (typeof value === 'object' && value !== null) {
        if (value.name) {
          dataString += `${key}: ${value.name}<br>`;
        }
      } else {
        dataString += `${key}: ${value}<br>`;
      }
    });
    
    // HTML 업데이트
    debugInfo.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px; color: ${systemColor};">
        ${systemName}
      </div>
      <div>${dataString}</div>
    `;
    
    // 5초 후 디버그 정보 숨기기
    setTimeout(() => {
      if (debugInfo && document.body.contains(debugInfo)) {
        debugInfo.style.opacity = '0';
        debugInfo.style.transition = 'opacity 1s';
        
        setTimeout(() => {
          debugInfo.style.opacity = '1';
          debugInfo.innerHTML = '';
        }, 1000);
      }
    }, 5000);
    
    // 3. 시각적 디버그 효과 (총소리 타입에 따라 다른 화면 테두리 효과)
    const flashEffect = document.createElement('div');
    flashEffect.style.position = 'fixed';
    flashEffect.style.top = '0';
    flashEffect.style.left = '0';
    flashEffect.style.width = '100%';
    flashEffect.style.height = '100%';
    flashEffect.style.pointerEvents = 'none';
    flashEffect.style.zIndex = '999';
    flashEffect.style.boxShadow = `inset 0 0 50px ${systemColor}`;
    flashEffect.style.opacity = '0.4';
    flashEffect.style.transition = 'opacity 0.5s';
    
    document.body.appendChild(flashEffect);
    
    // 0.5초 후 효과 제거
    setTimeout(() => {
      flashEffect.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(flashEffect)) {
          document.body.removeChild(flashEffect);
        }
      }, 500);
    }, 500);
    
    return true;
  },
  
  // 총소리 효과 생성 (AudioManager.js와 통합)
  createGunSoundWithEnvironment(position, options = {}) {
    if (!this.settings.enabled || !AudioManager.context) return null;
    
    // 플레이어 위치 가져오기 (Physics 모듈에서)
    const playerPosition = new THREE.Vector3();
    if (Physics && Physics.playerBody) {
      playerPosition.set(
        Physics.playerBody.position.x,
        Physics.playerBody.position.y,
        Physics.playerBody.position.z
      );
    } else if (Graphics && Graphics.camera) {
      playerPosition.copy(Graphics.camera.position);
    }
    
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
      const playerPosition = new THREE.Vector3();
      if (Graphics && Graphics.camera) {
        playerPosition.copy(Graphics.camera.position);
      }
      
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
  
  // 디버그: 현재 위치의 환경 특성을 시각화 (개발용)
  visualizeEnvironment(playerPosition) {
    if (!Graphics || !Graphics.scene) return;
    
    // 기존 시각화 요소 제거
    this.clearVisualization();
    
    // 시각화 요소를 담을 그룹
    this.visualizationGroup = new THREE.Group();
    Graphics.scene.add(this.visualizationGroup);
    
    // 레이캐스트 방향 시각화
    for (let i = 0; i < this.settings.rayDirections; i++) {
      const angle = (i / this.settings.rayDirections) * Math.PI * 2;
      
      // XZ 평면 방향
      const direction = new THREE.Vector3(
        Math.cos(angle),
        0,
        Math.sin(angle)
      );
      
      // 수평 방향 시각화
      this.visualizeRay(playerPosition, direction, 0x00ff00);
      
      // 위 방향 시각화
      if (i % 2 === 0) {
        const upDirection = direction.clone();
        upDirection.y = 0.5;
        upDirection.normalize();
        this.visualizeRay(playerPosition, upDirection, 0x0000ff);
      }
      
      // 아래 방향 시각화
      if (i % 2 === 1) {
        const downDirection = direction.clone();
        downDirection.y = -0.5;
        downDirection.normalize();
        this.visualizeRay(playerPosition, downDirection, 0xff0000);
      }
    }
    
    // 5초 후 시각화 제거
    setTimeout(() => this.clearVisualization(), 5000);
  },
  
  // 레이 시각화 유틸리티
  visualizeRay(origin, direction, color) {
    if (!this.visualizationGroup) return;
    
    // 레이캐스트로 반사 거리 얻기
    const distance = this.castRayForReflection(origin, direction) || this.settings.maxRaycastDistance;
    
    // 레이 끝점 계산
    const end = new THREE.Vector3().copy(direction).multiplyScalar(distance).add(origin);
    
    // 선 생성
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3().copy(end).sub(origin)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.position.copy(origin);
    
    this.visualizationGroup.add(line);
    
    // 끝점에 작은 구체 추가
    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(end);
    
    this.visualizationGroup.add(sphere);
  },
  
  // 시각화 요소 제거
  clearVisualization() {
    if (this.visualizationGroup && Graphics && Graphics.scene) {
      Graphics.scene.remove(this.visualizationGroup);
      this.visualizationGroup = null;
    }
  },

  /**
   * 플레이어 위치 기반 공간 반향 효과에 방향성을 추가합니다
   * @param {string} soundName - 재생할 사운드 이름 
   * @param {THREE.Vector3} position - 플레이어의 현재 위치
   */
  createDirectionalReverb(soundName, position) {
    if (!this.settings.enabled || !AudioManager.context) return null;
    
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
    
    // 플레이어 방향 정보 가져오기 (카메라 방향)
    const initialPlayerDirection = new THREE.Vector3(0, 0, -1); // 기본값: 앞쪽을 바라봄
    if (Graphics && Graphics.camera) {
      // 카메라가 바라보는 방향 계산
      initialPlayerDirection.set(0, 0, -1).applyQuaternion(Graphics.camera.quaternion);
    }
    
    // 맵 경계 - Environment.js에서 확인된 값
    const boundaries = {
      north: -50,  // z 좌표 최소값
      south: 50,   // z 좌표 최대값
      east: 50,    // x 좌표 최대값
      west: -50    // x 좌표 최소값
    };
    
    // 각 벽 정보 및 방향 벡터 정의
    const walls = [
      { name: 'north', 
        distance: Math.abs(position.z - boundaries.north), 
        direction: new THREE.Vector3(0, 0, -1),  // 북쪽(앞) 방향
        position: new THREE.Vector3(position.x, position.y, boundaries.north) },
      { name: 'south', 
        distance: Math.abs(position.z - boundaries.south), 
        direction: new THREE.Vector3(0, 0, 1),   // 남쪽(뒤) 방향
        position: new THREE.Vector3(position.x, position.y, boundaries.south) },
      { name: 'east', 
        distance: Math.abs(position.x - boundaries.east), 
        direction: new THREE.Vector3(1, 0, 0),   // 동쪽(오른쪽) 방향
        position: new THREE.Vector3(boundaries.east, position.y, position.z) },
      { name: 'west', 
        distance: Math.abs(position.x - boundaries.west), 
        direction: new THREE.Vector3(-1, 0, 0),  // 서쪽(왼쪽) 방향
        position: new THREE.Vector3(boundaries.west, position.y, position.z) }
    ];
    
    // 가까운 벽 선택
    const closestWalls = walls
      .sort((a, b) => a.distance - b.distance)
      .slice(0, qualitySettings.wallCount);
    
    // 벽에 따라 다른 지연 시간 설정 (더 자연스러운 효과)
    // 음속(343m/s)을 고려한 지연 시간 계산
    closestWalls.forEach(wall => {
      // 왕복 거리와 음속에 기반한 지연 시간 (밀리초)
      wall.delay = (wall.distance * 2) / 343 * 1000;
    });
    
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
    
    // 맵 경계 정보 가져오기
    const boundaries = {
      north: -50, south: 50, east: 50, west: -50
    };
    
    // 벽 반사 위치 계산
    const reflectionPoints = [
      // 북쪽 벽 반사
      { pos: new THREE.Vector3(position.x, position.y, boundaries.north), name: 'north' },
      // 남쪽 벽 반사
      { pos: new THREE.Vector3(position.x, position.y, boundaries.south), name: 'south' },
      // 동쪽 벽 반사
      { pos: new THREE.Vector3(boundaries.east, position.y, position.z), name: 'east' },
      // 서쪽 벽 반사
      { pos: new THREE.Vector3(boundaries.west, position.y, position.z), name: 'west' }
    ];
    
    // 품질 설정 가져오기
    const qualitySettings = this.getReverbQualitySettings();
    
    // 각 반사점까지의 거리 계산 및 정렬
    reflectionPoints.forEach(point => {
      point.distance = position.distanceTo(point.pos);
    });
    
    // 가까운 반사점 먼저 정렬
    reflectionPoints.sort((a, b) => a.distance - b.distance);
    
    // 품질 설정에 따른 반사점 수 제한
    const selectedPoints = reflectionPoints.slice(0, qualitySettings.wallCount);
    
    // 각 반사점에서 소리 재생
    selectedPoints.forEach((point, index) => {
      // 음속(343m/s)을 고려한 소리 도달 시간 (밀리초)
      const delay = (point.distance * 2) / 343 * 1000;
      
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
          panner.positionX.value = point.pos.x;
          panner.positionY.value = point.pos.y;
          panner.positionZ.value = point.pos.z;
        } else {
          // 구형 API
          panner.setPosition(point.pos.x, point.pos.y, point.pos.z);
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
      reflectionPoints: selectedPoints
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
    if (!this.settings.enabled || !AudioManager.context) {
      // 디버그: 시스템 비활성화됨
      this.showDebugInfo('🚫 Audio System Disabled', { reason: 'System disabled or context missing' });
      return null;
    }
    
    // 공간 반향 설정 확인
    if (!GameSettings.audio || !GameSettings.audio.spatialReverb) {
      // 디버그: 공간 반향 비활성화됨
      this.showDebugInfo('🚫 Spatial Reverb Disabled', { settings: GameSettings.audio });
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
      this.showDebugInfo('🔊 3D Spatial Audio (High Quality)', { 
        quality: 'high',
        wallCount: this.getReverbQualitySettings().wallCount,
        position: `x:${position.x.toFixed(1)}, z:${position.z.toFixed(1)}`
      });
      
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
      this.showDebugInfo('🔊 Directional Reverb (Medium/Low Quality)', { 
        quality: quality,
        playerDir: `x:${playerDir.x.toFixed(1)}, z:${playerDir.z.toFixed(1)}`,
        position: `x:${position.x.toFixed(1)}, z:${position.z.toFixed(1)}`
      });
      
      return this.createDirectionalReverb(soundName, position);
    }
  }
};
