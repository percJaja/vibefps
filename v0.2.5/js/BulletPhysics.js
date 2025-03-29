/**
 * BulletPhysics.js - 총알 물리 효과 시스템
 * 
 * 총알의 물리적 시뮬레이션을 처리하며 장애물과의 상호작용을 구현합니다.
 * - 장애물 충돌 시 정지
 * - 표면 반사 (튕김 효과)
 * - 장애물 파손 및 파괴
 * - 사실적인 궤적 및 중력 효과
 */
const BulletPhysics = {
  // 총알 효과 관련 설정
  settings: {
    enabled: true,                  // 총알 물리 효과 활성화 여부
    maxBounces: 2,                  // 최대 튕김 횟수
    maxDistance: 100,               // 최대 발사 거리
    bounceEnergyLoss: 0.4,          // 튕길 때마다 손실되는 에너지 (0-1)
    obstacleDestructionThreshold: 0.9, // 장애물 파손 임계값 (0-1) - 더 높게 설정하여 파괴가 어렵게 함
    bulletSpeed: 300,               // 총알 속도 (미터/초)
    gravity: 9.8,                   // 중력 영향
    renderTrail: true,              // 총알 궤적 시각화 여부
    obstacleMovementFactor: 0.05,   // 장애물이 얼마나 움직이는지 (0-1) - 낮게 설정하여 움직임 최소화
    partialDestructionEnabled: true, // 부분 파괴 기능 활성화 여부
  },

  // 활성화된 총알 목록
  activeBullets: [],

  // 파손된 장애물 추적
  damagedObstacles: {},

  // 효과 관련 리소스
  effects: {
    bulletHitMeshes: [],
    bulletTrails: []
  },

  /**
   * 초기화 함수
   */
  init() {
    this.activeBullets = [];
    this.damagedObstacles = {};
    this.effects = {
      bulletHitMeshes: [],
      bulletTrails: []
    };

    // 이벤트 시스템 리스너 등록
    if (typeof EventSystem !== 'undefined') {
      // 발사 이벤트 수신
      EventSystem.on('bulletFired', this.handleBulletFired.bind(this));

      // 게임 상태 변화 이벤트 수신
      EventSystem.on('gameStateChanged', this.handleGameStateChange.bind(this));
    }

    console.log('BulletPhysics 시스템 초기화 완료');
  },

  /**
   * 총알 발사 이벤트 처리
   * @param {Object} data - 발사 이벤트 데이터
   */
  handleBulletFired(data) {
    if (!this.settings.enabled) return;

    const { origin, direction, weapon } = data;
    this.createBullet(origin, direction, weapon);
  },

  /**
   * 게임 상태 변화 이벤트 처리
   * @param {Object} data - 게임 상태 데이터
   */
  handleGameStateChange(data) {
    if (data.state === 'gameOver' || data.state === 'menu') {
      // 게임 종료 시 모든 총알 제거
      this.clearAllBullets();
    }
  },

  /**
   * 새 총알 생성
   * @param {THREE.Vector3} origin - 발사 위치
   * @param {THREE.Vector3} direction - 발사 방향
   * @param {string} weapon - 무기 유형 (기본값: 'standard')
   */
  createBullet(origin, direction, weapon = 'standard') {
    // 무기 유형에 따른 설정
    const weaponSettings = this.getWeaponSettings(weapon);

    // 정확한 총알 시작 위치와 방향 계산
    // 총알은 항상 카메라 위치 및 방향과 일치해야 함
    const accurateOrigin = origin.clone();
    
    // 카메라가 보는 정확한 방향 사용
    const accurateDirection = direction.clone().normalize();
    
    // 새 총알 객체 생성
    const bullet = {
      position: accurateOrigin.clone(),
      initialPosition: accurateOrigin.clone(),
      direction: accurateDirection.clone(),
      initialDirection: accurateDirection.clone(),
      velocity: accurateDirection.clone().multiplyScalar(weaponSettings.speed),
      bounceCount: 0,
      maxBounces: weaponSettings.maxBounces,
      energy: 1.0, // 시작 에너지 (최대)
      weapon: weapon,
      destructionPower: weaponSettings.destructionPower,
      creationTime: Date.now(),
      lastPosition: accurateOrigin.clone(), // 궤적 렌더링용
      // 시각 효과용 메시
      mesh: this.createBulletMesh(weaponSettings),
      trail: this.settings.renderTrail ? this.createBulletTrail(accurateOrigin) : null
    };

    // 메시 초기 위치 설정
    if (bullet.mesh) {
      bullet.mesh.position.copy(accurateOrigin);
    }

    // 총알 목록에 추가
    this.activeBullets.push(bullet);

    // 발사 소리 재생
    if (typeof AudioManager !== 'undefined') {
      AudioManager.play('shoot', { type: weapon });
    }

    return bullet;
  },

  /**
   * 무기 유형별 설정 반환
   * @param {string} weapon - 무기 유형
   * @returns {Object} 무기 설정
   */
  getWeaponSettings(weapon) {
    const settings = {
      standard: {
        speed: this.settings.bulletSpeed,
        maxBounces: this.settings.maxBounces,
        destructionPower: 0.3,
        size: 0.025, // 총알 크기 줄임
        color: 0xffcc00
      },
      powerful: {
        speed: this.settings.bulletSpeed * 1.5,
        maxBounces: Math.max(1, this.settings.maxBounces - 1),
        destructionPower: 0.5,
        size: 0.035, // 총알 크기 줄임
        color: 0xff4400
      },
      bouncy: {
        speed: this.settings.bulletSpeed * 0.8,
        maxBounces: this.settings.maxBounces + 2,
        destructionPower: 0.2,
        size: 0.02, // 총알 크기 줄임
        color: 0x00ccff
      }
    };

    return settings[weapon] || settings.standard;
  },

  /**
   * 총알 메시 생성
   * @param {Object} weaponSettings - 무기 설정
   * @returns {THREE.Mesh} 총알 메시
   */
  createBulletMesh(weaponSettings) {
    if (!Graphics || !Graphics.scene) return null;

    // 총알 지오메트리 및 재질
    const bulletGeometry = new THREE.SphereGeometry(weaponSettings.size, 8, 8);
    
    // MeshBasicMaterial은 emissive 속성이 없으므로 MeshStandardMaterial 사용
    // 성능 최적화가 필요하면 MeshPhongMaterial이나 단순 MeshBasicMaterial로 대체 가능
    const bulletMaterial = new THREE.MeshStandardMaterial({ 
      color: weaponSettings.color,
      emissive: weaponSettings.color,
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3
    });

    // 메시 생성
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletMesh.castShadow = true;

    // 씬에 추가
    Graphics.scene.add(bulletMesh);

    return bulletMesh;
  },

  /**
   * 총알 궤적 효과 생성
   * @param {THREE.Vector3} startPosition - 시작 위치
   * @returns {THREE.Line} 궤적 라인
   */
  createBulletTrail(startPosition) {
    if (!Graphics || !Graphics.scene) return null;

    // 궤적 재질
    const trailMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffcc00,
      transparent: true,
      opacity: 0.7,
      linewidth: 1
    });

    // 궤적 지오메트리 (초기에 시작 위치만 포함)
    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3); // 최초 1개 점 (x, y, z)
    
    // 시작 위치 설정
    positions[0] = startPosition.x;
    positions[1] = startPosition.y;
    positions[2] = startPosition.z;
    
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 라인 생성
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    // 씬에 추가
    Graphics.scene.add(trail);

    return trail;
  },

  /**
   * 총알 궤적 업데이트
   * @param {Object} bullet - 총알 객체
   */
  updateBulletTrail(bullet) {
    if (!bullet.trail) return;

    // 현재 지오메트리에서 이전 위치 배열 가져오기
    const positions = bullet.trail.geometry.attributes.position.array;
    const positionCount = positions.length / 3;

    // 새 위치 배열 생성 (기존 + 새 위치)
    const newPositions = new Float32Array((positionCount + 1) * 3);

    // 기존 위치 복사
    for (let i = 0; i < positions.length; i++) {
      newPositions[i] = positions[i];
    }

    // 새 위치 추가
    newPositions[positions.length] = bullet.position.x;
    newPositions[positions.length + 1] = bullet.position.y;
    newPositions[positions.length + 2] = bullet.position.z;

    // 최대 길이 제한 (너무 길어지지 않도록)
    const maxTrailPoints = 20;
    let finalPositions = newPositions;

    if (positionCount >= maxTrailPoints) {
      finalPositions = new Float32Array(maxTrailPoints * 3);
      // 첫 번째 점은 항상 유지하고, 나머지 점들을 시프트
      for (let i = 0; i < maxTrailPoints * 3; i++) {
        finalPositions[i] = newPositions[i + 3]; // 첫 점 이후부터 복사
      }
    }

    // 지오메트리 업데이트
    bullet.trail.geometry.setAttribute(
      'position', 
      new THREE.BufferAttribute(finalPositions, 3)
    );
    bullet.trail.geometry.attributes.position.needsUpdate = true;
  },

  /**
   * 총알 히트 이펙트 생성
   * @param {THREE.Vector3} position - 충돌 위치
   * @param {THREE.Vector3} normal - 충돌 표면 법선
   * @param {string} surfaceType - 표면 유형 ('obstacle', 'wall', 'floor' 등)
   */
  createHitEffect(position, normal, surfaceType = 'obstacle') {
    // 충돌 효과음 재생
    if (typeof AudioManager !== 'undefined') {
      AudioManager.play('hit', { 
        position: position,
        surfaceType: surfaceType
      });
    }

    // 충돌 이펙트 생성 (파티클 등)
    if (typeof ParticleSystem !== 'undefined' && ParticleSystem.createExplosion) {
      // 표면 유형에 따라 다른 효과 생성
      let color, count, size, speed;

      switch (surfaceType) {
        case 'metal':
          color = 0xcccccc; // 금속성 파편
          count = 15;       
          size = 0.05;      
          speed = 15;
          break;
        case 'wood':
          color = 0x8B4513; // 나무 색
          count = 20;       
          size = 0.08;      
          speed = 10;
          break;
        case 'wall':
          color = 0xbbbbbb; // 벽 파편
          count = 10;       
          size = 0.1;      
          speed = 8;
          break;
        default:
          color = 0xdddddd; // 기본 파편
          count = 12;       
          size = 0.07;      
          speed = 12;
      }

      // 파티클 효과 생성
      ParticleSystem.createExplosion(position, color, count, size, speed);
    }

    // 총알 흔적 (총알 구멍) 생성
    this.createBulletHoleMesh(position, normal, surfaceType);
  },

  /**
   * 총알 구멍 메시 생성
   * @param {THREE.Vector3} position - 충돌 위치
   * @param {THREE.Vector3} normal - 충돌 표면 법선
   * @param {string} surfaceType - 표면 유형
   */
  createBulletHoleMesh(position, normal, surfaceType) {
    if (!Graphics || !Graphics.scene) return;

    // 총알 구멍 재질 (표면 유형에 따라 다름)
    let bulletHoleColor;
    switch (surfaceType) {
      case 'metal': bulletHoleColor = 0x333333; break;
      case 'wood': bulletHoleColor = 0x1a0d00; break;
      case 'wall': bulletHoleColor = 0x222222; break;
      default: bulletHoleColor = 0x111111;
    }

    // 총알 구멍 메시 생성 (얇은 원통형)
    const holeGeometry = new THREE.CircleGeometry(0.05, 8);
    const holeMaterial = new THREE.MeshBasicMaterial({ 
      color: bulletHoleColor,
      side: THREE.DoubleSide
    });

    const holeMesh = new THREE.Mesh(holeGeometry, holeMaterial);

    // 충돌 지점에 배치
    holeMesh.position.copy(position);

    // 표면에 정확히 위치시키기 위해 법선 방향으로 살짝 이동
    holeMesh.position.add(normal.clone().multiplyScalar(0.01));

    // 표면에 향하도록 회전
    holeMesh.lookAt(position.clone().add(normal));

    // 씬에 추가
    Graphics.scene.add(holeMesh);

    // 효과 배열에 추가 (나중에 정리하기 위해)
    this.effects.bulletHitMeshes.push({
      mesh: holeMesh,
      creationTime: Date.now(),
      lifetime: 10000  // 10초 후 제거
    });
  },

  /**
   * 장애물 파손 효과 생성
   * @param {Object} obstacle - 파손할 장애물 객체
   * @param {THREE.Vector3} hitPosition - 충돌 위치
   * @param {number} damageAmount - 파손 정도 (0-1)
   */
  createObstacleDestructionEffect(obstacle, hitPosition, damageAmount) {
    if (!obstacle || !obstacle.mesh) return;
    
    // 장애물이 석재(파괴 불가능) 타입인지 확인
    if (obstacle.type === 'stone' || obstacle.material === 'stone') {
      // 석재 장애물은 파손되지 않음, 대신 단단한 표면 효과만 생성
      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.createExplosion(
          hitPosition,
          0x888888, // 석재 파편 색상
          5,        // 적은 수의 파편
          0.05,     // 작은 크기
          8         // 느린 속도
        );
      }
      return;
    }

    // 장애물 ID 추출 (메시의 uuid 사용)
    const obstacleId = obstacle.mesh.uuid;

    // 이미 파손 상태 추적 중인지 확인
    if (!this.damagedObstacles[obstacleId]) {
      this.damagedObstacles[obstacleId] = {
        damage: 0,
        hitPoints: [],
        originalScale: obstacle.mesh.scale.clone(),
        originalPosition: obstacle.mesh.position.clone(),
        segments: this.createObstacleSegments(obstacle) // 장애물을 가상의 세그먼트로 분할
      };
    }

    // 파손 정도 업데이트
    this.damagedObstacles[obstacleId].damage += damageAmount;
    this.damagedObstacles[obstacleId].hitPoints.push(hitPosition.clone());

    // 파손 시각 효과 적용
    const totalDamage = this.damagedObstacles[obstacleId].damage;
    
    // 맞은 위치에 가장 가까운 세그먼트를 찾아 파손 표시
    if (this.settings.partialDestructionEnabled && this.damagedObstacles[obstacleId].segments) {
      this.damageNearestSegment(this.damagedObstacles[obstacleId], hitPosition, damageAmount);
    }

    // 장애물 시각적 변형 (파손 정도에 따라)
    // 움직임 요소를 줄이기 위해 obstacleMovementFactor 적용
    const moveFactor = this.settings.obstacleMovementFactor;
    const scaleFactor = Math.max(0.85, 1 - totalDamage * 0.15); // 축소 효과 감소
    
    obstacle.mesh.scale.set(
      this.damagedObstacles[obstacleId].originalScale.x * scaleFactor,
      this.damagedObstacles[obstacleId].originalScale.y * scaleFactor,
      this.damagedObstacles[obstacleId].originalScale.z * scaleFactor
    );

    // 약간의 회전 변화로 파손 효과 표현 (감소된 움직임)
    obstacle.mesh.rotation.x += (Math.random() - 0.5) * moveFactor * totalDamage;
    obstacle.mesh.rotation.y += (Math.random() - 0.5) * moveFactor * totalDamage;
    obstacle.mesh.rotation.z += (Math.random() - 0.5) * moveFactor * totalDamage;

    // 파손된 장애물의 물리 바디 업데이트 (크기 축소)
    if (obstacle.body) {
      // CannonJS에서는 물리 바디 스케일 직접 변경이 어려움
      // 대신 충돌 영역을 조정
      obstacle.body.shapes.forEach(shape => {
        if (shape.halfExtents) {
          shape.halfExtents.x *= scaleFactor;
          shape.halfExtents.y *= scaleFactor;
          shape.halfExtents.z *= scaleFactor;
          shape.updateConvexPolyhedronRepresentation();
        }
      });
    }

    // 완전 파괴 여부 확인 (임계값 초과 시)
    if (totalDamage >= this.settings.obstacleDestructionThreshold) {
      if (this.settings.partialDestructionEnabled) {
        // 부분 파괴 모드에서는 세그먼트의 70% 이상이 파괴된 경우에만 완전 파괴
        const segments = this.damagedObstacles[obstacleId].segments;
        const destroyedSegments = segments.filter(s => s.destroyed).length;
        const destructionRatio = destroyedSegments / segments.length;
        
        if (destructionRatio > 0.7) {
          this.destroyObstacle(obstacle, obstacleId);
        }
      } else {
        // 일반 모드에서는 임계값 도달 시 바로 파괴
        this.destroyObstacle(obstacle, obstacleId);
      }
    }

    // 파편 효과 생성
    if (typeof ParticleSystem !== 'undefined') {
      // 파손 지점에서 작은 파편 생성
      const fragmentColor = obstacle.mesh.material.color 
                            ? obstacle.mesh.material.color.getHex() 
                            : 0x999999;

      ParticleSystem.createExplosion(
        hitPosition,
        fragmentColor,
        Math.floor(5 + damageAmount * 20),  // 파손 정도에 따른 파편 개수
        0.1,  // 크기
        10    // 속도
      );
    }
  },
  
  /**
   * 장애물을 가상의 세그먼트(부분)으로 분할
   * @param {Object} obstacle - 분할할 장애물
   * @returns {Array} 세그먼트 배열
   */
  createObstacleSegments(obstacle) {
    if (!obstacle || !obstacle.mesh) return [];
    
    const segments = [];
    // 장애물 크기에 따라 8-27개 세그먼트로 분할 (2x2x2 ~ 3x3x3)
    
    const size = obstacle.mesh.geometry.parameters;
    const width = size.width || 1;
    const height = size.height || 1;
    const depth = size.depth || 1;
    
    // 크기에 따라 분할 단위 결정 (크면 더 많이 분할)
    const divX = width > 2 ? 3 : 2;
    const divY = height > 2 ? 3 : 2;
    const divZ = depth > 2 ? 3 : 2;
    
    const segWidth = width / divX;
    const segHeight = height / divY;
    const segDepth = depth / divZ;
    
    const obstaclePos = obstacle.mesh.position;
    const obstacleRot = obstacle.mesh.rotation;
    
    // 가상의 세그먼트 생성 (x,y,z 위치에 따라)
    for (let x = 0; x < divX; x++) {
      for (let y = 0; y < divY; y++) {
        for (let z = 0; z < divZ; z++) {
          // 세그먼트의 로컬 좌표 계산
          const localX = (x - (divX-1)/2) * segWidth;
          const localY = (y - (divY-1)/2) * segHeight;
          const localZ = (z - (divZ-1)/2) * segDepth;
          
          // 회전 변환 적용 (간소화된 계산)
          const segment = {
            x: localX,
            y: localY,
            z: localZ,
            position: new THREE.Vector3(
              obstaclePos.x + localX,
              obstaclePos.y + localY,
              obstaclePos.z + localZ
            ),
            size: new THREE.Vector3(segWidth, segHeight, segDepth),
            health: 1.0,  // 초기 세그먼트 상태 (1 = 100% 건강)
            destroyed: false
          };
          
          segments.push(segment);
        }
      }
    }
    
    return segments;
  },
  
  /**
   * 충돌 위치와 가장 가까운 세그먼트에 피해 적용
   * @param {Object} obstacleData - 장애물 데이터
   * @param {THREE.Vector3} hitPosition - 충돌 위치
   * @param {number} damage - 피해량
   */
  damageNearestSegment(obstacleData, hitPosition, damage) {
    if (!obstacleData || !obstacleData.segments || obstacleData.segments.length === 0) return;
    
    // 가장 가까운 세그먼트 찾기
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < obstacleData.segments.length; i++) {
      const segment = obstacleData.segments[i];
      if (segment.destroyed) continue; // 이미 파괴된 세그먼트는 건너뜀
      
      const distance = segment.position.distanceTo(hitPosition);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    // 가장 가까운 세그먼트에 피해 적용
    const nearestSegment = obstacleData.segments[nearestIndex];
    nearestSegment.health -= damage * 2; // 세그먼트에 더 많은 피해 적용 (집중 피해)
    
    // 세그먼트가 파괴되었는지 확인
    if (nearestSegment.health <= 0 && !nearestSegment.destroyed) {
      nearestSegment.destroyed = true;
      
      // 파괴된 세그먼트에서 파편 생성
      if (typeof ParticleSystem !== 'undefined') {
        const color = obstacleData.mesh ? 
                    (obstacleData.mesh.material.color ? obstacleData.mesh.material.color.getHex() : 0x999999) 
                    : 0x999999;
                    
        ParticleSystem.createExplosion(
          nearestSegment.position,
          color,
          15,     // 파편 개수
          0.08,   // 파편 크기
          12      // 파편 속도
        );
      }
    }
  },

  /**
   * 장애물 완전 파괴
   * @param {Object} obstacle - 파괴할 장애물 객체
   * @param {string} obstacleId - 장애물 ID
   */
  destroyObstacle(obstacle, obstacleId) {
    // 파괴 효과음 재생
    if (typeof AudioManager !== 'undefined') {
      AudioManager.play('obstacleDestruction', { 
        position: obstacle.mesh.position.clone()
      });
    }

    // 큰 폭발 이펙트 생성
    if (typeof ParticleSystem !== 'undefined') {
      const color = obstacle.mesh.material.color 
                  ? obstacle.mesh.material.color.getHex() 
                  : 0x999999;

      ParticleSystem.createExplosion(
        obstacle.mesh.position.clone(),
        color,
        40,  // 많은 파편
        0.15, // 큰 파편
        15    // 빠른 속도
      );
    }

    // 파괴된 장애물 메시 제거
    if (Graphics && Graphics.scene) {
      Graphics.scene.remove(obstacle.mesh);
    }

    // 파괴된 장애물 물리 바디 제거
    if (Physics && Physics.world && obstacle.body) {
      Physics.world.remove(obstacle.body);
    }

    // 장애물 파손 추적 정보 제거
    delete this.damagedObstacles[obstacleId];

    // Environment.obstacles 배열에서 제거
    if (Environment && Environment.obstacles) {
      const obstacleIndex = Environment.obstacles.findIndex(o => o.mesh === obstacle.mesh);
      if (obstacleIndex !== -1) {
        Environment.obstacles.splice(obstacleIndex, 1);
      }
    }

    // 이벤트 발행 (다른 시스템이 반응할 수 있도록)
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('obstacleDestroyed', {
        position: obstacle.mesh.position.clone(),
        obstacleId: obstacleId
      });
    }
  },

  /**
   * 반사 벡터 계산 (튕김 방향)
   * @param {THREE.Vector3} velocity - 입사 속도 벡터
   * @param {THREE.Vector3} normal - 충돌 표면 법선 벡터
   * @returns {THREE.Vector3} 반사 벡터
   */
  calculateReflection(velocity, normal) {
    // 반사 공식: R = V - 2 * (V·N) * N
    const dot = velocity.dot(normal);
    return velocity.clone().sub(
      normal.clone().multiplyScalar(2 * dot)
    );
  },

  /**
   * 총알 제거
   * @param {Object} bullet - 제거할 총알 객체
   * @param {number} index - 총알 배열 인덱스
   */
  removeBullet(bullet, index) {
    // 총알 메시 제거
    if (bullet.mesh && Graphics && Graphics.scene) {
      Graphics.scene.remove(bullet.mesh);
      if (bullet.mesh.geometry) bullet.mesh.geometry.dispose();
      if (bullet.mesh.material) bullet.mesh.material.dispose();
    }

    // 궤적 제거
    if (bullet.trail && Graphics && Graphics.scene) {
      Graphics.scene.remove(bullet.trail);
      if (bullet.trail.geometry) bullet.trail.geometry.dispose();
      if (bullet.trail.material) bullet.trail.material.dispose();
    }

    // 활성 총알 목록에서 제거
    this.activeBullets.splice(index, 1);
  },

  /**
   * 모든 총알 제거
   */
  clearAllBullets() {
    // 모든 활성 총알 제거
    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      this.removeBullet(this.activeBullets[i], i);
    }

    // 배열 초기화 (안전을 위해)
    this.activeBullets = [];
  },

  /**
   * 오래된 효과 정리
   */
  cleanupEffects() {
    const currentTime = Date.now();

    // 총알 구멍 효과 정리
    for (let i = this.effects.bulletHitMeshes.length - 1; i >= 0; i--) {
      const hitEffect = this.effects.bulletHitMeshes[i];

      // 수명이 다한 효과 제거
      if (currentTime - hitEffect.creationTime > hitEffect.lifetime) {
        if (hitEffect.mesh && Graphics && Graphics.scene) {
          Graphics.scene.remove(hitEffect.mesh);
          if (hitEffect.mesh.geometry) hitEffect.mesh.geometry.dispose();
          if (hitEffect.mesh.material) hitEffect.mesh.material.dispose();
        }

        this.effects.bulletHitMeshes.splice(i, 1);
      }
    }

    // 최대 효과 개수 제한 (성능을 위해)
    const maxHitEffects = 30;
    if (this.effects.bulletHitMeshes.length > maxHitEffects) {
      // 가장 오래된 효과부터 제거
      const effectsToRemove = this.effects.bulletHitMeshes.length - maxHitEffects;

      // 오래된 순으로 정렬
      this.effects.bulletHitMeshes.sort((a, b) => a.creationTime - b.creationTime);

      // 첫 N개 (가장 오래된 효과들) 제거
      for (let i = 0; i < effectsToRemove; i++) {
        const hitEffect = this.effects.bulletHitMeshes[i];

        if (hitEffect.mesh && Graphics && Graphics.scene) {
          Graphics.scene.remove(hitEffect.mesh);
          if (hitEffect.mesh.geometry) hitEffect.mesh.geometry.dispose();
          if (hitEffect.mesh.material) hitEffect.mesh.material.dispose();
        }
      }

      // 배열에서 제거된 효과 제거
      this.effects.bulletHitMeshes.splice(0, effectsToRemove);
    }
  },

  /**
   * 총알 충돌 감지
   * @param {THREE.Raycaster} raycaster - 레이캐스터
   * @param {Object} bullet - 총알 객체
   * @returns {Object|null} 충돌 정보 또는 null
   */
  detectCollision(raycaster, bullet) {
    const allIntersects = [];
    
    // 1. 장애물과의 충돌 검사
    if (Environment && Environment.obstacles) {
      const obstacles = Environment.obstacles.map(o => o.mesh);
      const obstacleIntersects = raycaster.intersectObjects(obstacles);
      
      obstacleIntersects.forEach(intersection => {
        const obstacleIndex = obstacles.indexOf(intersection.object);
        allIntersects.push({
          hitPoint: intersection.point,
          hitNormal: intersection.face.normal,
          distance: intersection.distance,
          obstacle: Environment.obstacles[obstacleIndex],
          surfaceType: Environment.obstacles[obstacleIndex].type || 'obstacle'
        });
      });
    }

    // 2. 벽과의 충돌 검사
    const wallObjects = [];

    // Graphics.scene에서 벽 메시 찾기
    if (Graphics && Graphics.scene) {
      Graphics.scene.traverse(object => {
        // 벽 메시 식별 로직 (이름, 위치 등으로 구분)
        if (object.isMesh && (
            (object.position.x === 50 || object.position.x === -50) || // 동/서 벽
            (object.position.z === 50 || object.position.z === -50)    // 남/북 벽
        )) {
          wallObjects.push(object);
        }
      });
    }

    const wallIntersects = raycaster.intersectObjects(wallObjects);
    
    wallIntersects.forEach(intersection => {
      allIntersects.push({
        hitPoint: intersection.point,
        hitNormal: intersection.face.normal,
        distance: intersection.distance,
        obstacle: null,
        surfaceType: 'wall'
      });
    });

    // 3. 바닥과의 충돌 검사
    const floorObjects = [];

    // Graphics.scene에서 바닥 메시 찾기
    if (Graphics && Graphics.scene) {
      Graphics.scene.traverse(object => {
        // 바닥 메시 식별 로직
        if (object.isMesh && object.rotation.x === -Math.PI / 2) { // 바닥은 X축으로 -90도 회전
          floorObjects.push(object);
        }
      });
    }

    const floorIntersects = raycaster.intersectObjects(floorObjects);
    
    floorIntersects.forEach(intersection => {
      allIntersects.push({
        hitPoint: intersection.point,
        hitNormal: intersection.face.normal,
        distance: intersection.distance,
        obstacle: null,
        surfaceType: 'floor'
      });
    });
    
    // 4. 타겟 매니저로부터 타겟을 가져와 충돌 검사
    // 주의: 타겟과 충돌은 마지막에 검사하여 장애물에 가려진 타겟을 맞히지 않도록 함
    if (typeof TargetManager !== 'undefined' && TargetManager.targets) {
      const targetMeshes = TargetManager.targets.map(t => t.mesh);
      const targetIntersects = raycaster.intersectObjects(targetMeshes);
      
      targetIntersects.forEach(intersection => {
        allIntersects.push({
          hitPoint: intersection.point,
          hitNormal: intersection.face.normal,
          distance: intersection.distance,
          target: true, // 타겟 충돌 표시
          surfaceType: 'target'
        });
      });
    }

    // 모든 충돌을 거리에 따라 정렬하고 가장 가까운 것을 반환
    if (allIntersects.length > 0) {
      // 거리순으로 정렬
      allIntersects.sort((a, b) => a.distance - b.distance);
      return allIntersects[0]; // 가장 가까운 충돌 반환
    }

    // 충돌 없음
    return null;
  },

  /**
   * 총알 업데이트 (물리 시뮬레이션)
   * @param {number} delta - 시간 간격 (초)
   */
  update(delta) {
    if (!this.settings.enabled) return;

    // 총알 업데이트
    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      const bullet = this.activeBullets[i];

      // 이전 위치 저장 (충돌 감지 및 궤적용)
      bullet.lastPosition.copy(bullet.position);

      // 중력 영향 적용
      bullet.velocity.y -= this.settings.gravity * delta;

      // 총알 이동
      const movement = bullet.velocity.clone().multiplyScalar(delta);
      bullet.position.add(movement);

      // 충돌 감지를 위한 레이캐스트 설정
      const rayDirection = movement.clone().normalize();
      const rayLength = movement.length();

      const raycaster = new THREE.Raycaster(bullet.lastPosition, rayDirection, 0, rayLength);

      // 충돌 감지
      const collision = this.detectCollision(raycaster, bullet);

      // 충돌이 발생한 경우
      if (collision) {
        const { hitPoint, hitNormal, obstacle, surfaceType, target } = collision;

        // 타겟과 충돌한 경우는 처리하지 않음 (레이캐스트 식별 문제)
        // 타겟 맞춤은 Game.js의 기존 로직으로 처리
        if (target) {
          continue;
        }

        // 충돌 효과 생성
        this.createHitEffect(hitPoint, hitNormal, surfaceType);

        // 장애물에 피해를 줄 수 있는 경우
        if (obstacle && bullet.destructionPower > 0) {
          // 돌 장애물은 파괴되지 않고 튕기지도 않음
          const isStone = obstacle.type === 'stone' || obstacle.material === 'stone';
          
          if (!isStone) {
            this.createObstacleDestructionEffect(
              obstacle, 
              hitPoint,
              bullet.destructionPower * bullet.energy
            );
          }
          
          // 돌 장애물이면 튕김 없이 바로 총알 제거
          if (isStone) {
            this.removeBullet(bullet, i);
            continue;
          }
        }

        // 보유 에너지에 따라 튕김 처리
        if (bullet.energy > 0.2 && bullet.bounceCount < bullet.maxBounces) {
          // 튕김 방향 계산 (반사 벡터)
          const reflection = this.calculateReflection(bullet.velocity, hitNormal);

          // 속도 업데이트 (에너지 감소 반영)
          bullet.energy *= (1 - this.settings.bounceEnergyLoss);
          bullet.velocity.copy(reflection).multiplyScalar(bullet.velocity.length() * bullet.energy);

          // 충돌 지점에서 살짝 떨어진 위치로 이동 (겹침 방지)
          bullet.position.copy(hitPoint).add(hitNormal.clone().multiplyScalar(0.1));

          // 튕김 카운트 증가
          bullet.bounceCount++;

          // 튕김 효과음 재생
          if (typeof AudioManager !== 'undefined') {
            AudioManager.play('bulletBounce', {
              position: hitPoint,
              energy: bullet.energy,
              surfaceType: surfaceType // 표면 유형에 따른 소리 변화
            });
          }
        } else {
          // 충분한 에너지가 없거나 최대 튕김 횟수 도달: 총알 제거
          this.removeBullet(bullet, i);
          continue;
        }
      }

      // 메시 위치 업데이트
      if (bullet.mesh) {
        bullet.mesh.position.copy(bullet.position);

        // 진행 방향으로 회전 
        if (bullet.velocity.lengthSq() > 0.001) {
          const bulletDirection = bullet.velocity.clone().normalize();
          bullet.mesh.lookAt(bullet.position.clone().add(bulletDirection));
        }
      }

      // 궤적 업데이트
      if (bullet.trail) {
        this.updateBulletTrail(bullet);
      }

      // 총알 제거 조건 확인

      // 1. 최대 거리 도달 여부
      const distanceTraveled = bullet.position.distanceTo(bullet.initialPosition);
      if (distanceTraveled > this.settings.maxDistance) {
        this.removeBullet(bullet, i);
        continue;
      }

      // 2. 수명 초과 여부 (5초)
      if (Date.now() - bullet.creationTime > 5000) {
        this.removeBullet(bullet, i);
        continue;
      }

      // 3. 장면 밖으로 나간 경우
      if (
        bullet.position.y < -10 ||
        Math.abs(bullet.position.x) > 100 ||
        Math.abs(bullet.position.z) > 100
      ) {
        this.removeBullet(bullet, i);
        continue;
      }
    }

    // 오래된 효과 정리
    this.cleanupEffects();
  },

  /**
   * 게임에 총알 물리 시스템 통합
   * @returns {boolean} 통합 성공 여부
   */
  integrateWithGame() {
    if (typeof Game === 'undefined') return false;

    // 원래 슈팅 함수 저장
    const originalShootFunction = Game.shoot;

    // 새로운 발사 함수로 대체
    Game.shoot = function() {
      // 탄약이 없는 경우 총알 발사하지 않음
      if (Game.ammo <= 0) {
        if (typeof AudioManager !== 'undefined') {
          AudioManager.play('emptyGun');
        }
        return false;
      }
      
      // 탄약 감소
      Game.ammo--;
      document.getElementById('ammo').textContent = Game.ammo;
      
      // 시각적 효과 (총구 화염 등)
      Graphics.createGunFlash();

      // 레이캐스트 설정
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(), Graphics.camera);
      
      // 먼저 장애물과의 충돌 확인 (타겟 감지 전에)
      const obstacles = [];
      
      // 모든 장애물 메시 수집
      if (Environment && Environment.obstacles) {
        obstacles.push(...Environment.obstacles.map(o => o.mesh));
      }
      
      // 벽 메시 찾기
      if (Graphics && Graphics.scene) {
        Graphics.scene.traverse(object => {
          // 벽 메시 식별 로직
          if (object.isMesh && (
              (object.position.x === 50 || object.position.x === -50) || // 동/서 벽
              (object.position.z === 50 || object.position.z === -50)    // 남/북 벽
          )) {
            obstacles.push(object);
          }
        });
      }
      
      // 장애물과의 충돌 확인
      const obstacleIntersects = raycaster.intersectObjects(obstacles);
      let obstacleDistance = Infinity;
      
      if (obstacleIntersects.length > 0) {
        obstacleDistance = obstacleIntersects[0].distance;
      }
      
      // 타겟 감지 및 처리 (장애물 충돌 거리를 고려)
      let hit = false;
      
      // GitHub 타겟 확인 (특수 타겟)
      if (typeof GitHubTarget !== 'undefined') {
        hit = GitHubTarget.checkHit(raycaster);
      }
      
      // 일반 타겟 확인 (장애물에 가려진 경우는 제외)
      if (!hit && typeof TargetManager !== 'undefined') {
        // TargetManager.checkHit 함수를 직접 수정하는 대신, 
        // 여기서 먼저 타겟과의 거리를 확인하고 장애물보다 먼 경우 무시
        
        // 타겟 메시 수집
        const targetMeshes = TargetManager.targets.map(t => t.mesh);
        const targetIntersects = raycaster.intersectObjects(targetMeshes);
        
        if (targetIntersects.length > 0) {
          // 가장 가까운 타겟까지의 거리
          const targetDistance = targetIntersects[0].distance;
          
          // 타겟이 장애물보다 가까우면 히트 처리
          if (targetDistance < obstacleDistance) {
            hit = TargetManager.checkHit(raycaster);
          } else {
            // 장애물에 가려진 타겟은 히트 처리하지 않음
            console.log("장애물에 막힌 타겟");
          }
        }
      }
      
      // 총알 물리 시스템 활성화된 경우 추가 처리
      if (BulletPhysics.settings.enabled) {
        // 카메라 정보 가져오기
        const camera = Graphics.camera;
        
        // 카메라 위치 및 방향
        const origin = camera.position.clone();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);
        
        // 이벤트 발생
        if (typeof EventSystem !== 'undefined') {
          EventSystem.emit('bulletFired', {
            origin: origin,
            direction: direction,
            weapon: 'standard'
          });
        } else {
          // 이벤트 시스템이 없는 경우 직접 호출
          BulletPhysics.createBullet(origin, direction, 'standard');
        }
      }

      return hit;
    };

    // 애니메이션 루프에 총알 물리 업데이트 통합
    const originalAnimateFunction = Game.animate;

    Game.animate = function() {
      // 원래 애니메이션 로직 실행
      originalAnimateFunction.apply(Game, arguments);

      // 총알 물리 시스템 업데이트
      if (BulletPhysics.settings.enabled && Game.gameStarted) {
        // Graphics.clock.getDelta()는 이미 Game.animate에서 호출되었을 수 있으므로,
        // 별도의 delta 값을 계산
        const delta = Math.min(0.016, 1 / 60); // 최대 16ms (60fps) 제한
        BulletPhysics.update(delta);
      }
    };

    console.log('총알 물리 시스템이 Game 모듈과 통합되었습니다.');
    return true;
  }
};
