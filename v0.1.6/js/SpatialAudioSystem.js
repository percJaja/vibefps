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
  }
};
