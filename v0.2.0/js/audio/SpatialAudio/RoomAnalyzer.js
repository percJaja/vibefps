// RoomAnalyzer.js
// 플레이어 주변 공간을 분석하여 방의 크기와 특성 결정

// 전역 네임스페이스 사용
window.RoomAnalyzer = {
  // 공유 의존성 객체
  settings: null,
  reverbPresets: null,
  raycaster: null,
  cachedAnalysis: null,
  updateInterval: 500,
  
  // 초기화
  init(dependencies) {
    console.log('RoomAnalyzer 초기화 중...');
    
    // 의존성 주입
    this.settings = dependencies.settings;
    this.reverbPresets = dependencies.reverbPresets;
    this.raycaster = dependencies.raycaster;
    this.cachedAnalysis = dependencies.cachedAnalysis;
    this.updateInterval = dependencies.updateInterval;
    
    console.log('RoomAnalyzer 초기화 완료');
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
    this.cachedAnalysis.position = playerPosition.clone();
    this.cachedAnalysis.roomCharacteristics = roomCharacteristics;
    this.cachedAnalysis.lastUpdateTime = now;
    
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
  }
};
