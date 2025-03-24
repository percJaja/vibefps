const ParticleSystem = {
  particles: [],
  particleSystems: [],
  
  init() {
    // 파티클 시스템 초기화
    this.particles = [];
    this.particleSystems = [];
  },
  
  // 타겟 파괴 파티클 생성
  createExplosion(position, color, count = 20, size = 0.1, speed = 3) {
    // 파티클 재질 생성
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    
    // 파티클 그룹
    const particleGroup = new THREE.Group();
    Graphics.scene.add(particleGroup);
    
    // 실제 시작 시간 저장 (wall clock time 기준으로 확실히 제거하기 위함)
    const startTime = Date.now();
    const maxLifeTime = 1200; // 최대 1.2초 후 강제 제거 (더 짧게 조정)
    
    // 파티클 생성
    for (let i = 0; i < count; i++) {
      // 파티클 형태 - 풍선 조각처럼 불규칙한 모양
      let particleGeometry;
      
      // 랜덤하게 다양한 모양 생성
      const shapeType = Math.floor(Math.random() * 4);
      if (shapeType === 0) {
        // 삼각형 조각
        particleGeometry = new THREE.TetrahedronGeometry(size * (0.5 + Math.random() * 0.5));
      } else if (shapeType === 1) {
        // 구 조각
        particleGeometry = new THREE.SphereGeometry(size * (0.3 + Math.random() * 0.7), 4, 4);
      } else if (shapeType === 2) {
        // 상자 조각
        particleGeometry = new THREE.BoxGeometry(
          size * (0.4 + Math.random() * 0.6),
          size * (0.4 + Math.random() * 0.6),
          size * (0.1 + Math.random() * 0.3)
        );
      } else {
        // 얇은 조각
        particleGeometry = new THREE.PlaneGeometry(
          size * (0.5 + Math.random() * 1.0),
          size * (0.5 + Math.random() * 1.0)
        );
      }
      
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      
      // 파티클 위치 설정 - 조금 랜덤하게 시작 (더 퍼짐)
      particle.position.copy(position);
      // 처음부터 약간 퍼져 시작
      particle.position.x += (Math.random() - 0.5) * 0.3;  
      particle.position.y += (Math.random() - 0.5) * 0.3;
      particle.position.z += (Math.random() - 0.5) * 0.3;
      
      // 파티클 회전 랜덤 설정
      particle.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      
      // 파티클 속도 - 폭발하는 방향으로 퍼져나가게
      // 폭발 방향 계산 - 중심에서 바깥으로
      const explosionDir = new THREE.Vector3()
        .subVectors(particle.position, position) // 현재 위치 - 중심 위치 = 퍼져나가는 방향
        .normalize();
      
      // 방향이 0벡터인 경우 랜덤 방향 생성
      if (explosionDir.lengthSq() < 0.001) {
        explosionDir.set(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();
      }
      
      // 속도를 랜덤하게 설정하되 최소값을 보장
      const randomSpeed = speed * (0.7 + Math.random() * 1.3);
      
      const velocity = explosionDir.multiplyScalar(randomSpeed);
      
      // 중력 영향을 줄이기 위해 상방향 속도 추가 (더 넓게 퍼지도록)
      velocity.y += speed * 0.4;
      
      // 회전 속도 추가 (더 빠르게 회전)
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      
      // 파티클 수명 (다양하게 조정)
      const life = 0.4 + Math.random() * 0.4;
      
      // 파티클 속성 저장
      particle.userData = {
        velocity: velocity,
        rotationSpeed: rotationSpeed,
        life: life,
        startLife: life,
        startOpacity: particleMaterial.opacity,
        creationTime: startTime // 생성 시간 저장
      };
      
      // 파티클 그룹에 추가
      particleGroup.add(particle);
      
      // 배열에 추가
      this.particles.push(particle);
    }
    
    // 파티클 그룹 저장
    this.particleSystems.push({
      group: particleGroup,
      particles: [...this.particles.slice(-count)], // 방금 생성한 파티클 참조
      life: 0.8, // 파티클 시스템 수명 (짧게 조정)
      startTime: startTime,
      maxLifeTime: maxLifeTime
    });
    
    return particleGroup;
  },
  
  // 타겟 유형별 폭발 효과
  createTargetExplosion(position, targetType) {
    let color, count, size, speed;
    
    switch (targetType) {
      case 'standard':
        color = 0xff0000; // 빨간색
        count = 25;       // 더 많은 파티클
        size = 0.12;      // 더 큰 크기
        speed = 20;       // 훨씬 더 빠른 속도
        break;
      case 'bonus':
        color = 0xffd700; // 금색
        count = 40;       // 더 많은 파티클
        size = 0.15;      // 더 큰 크기
        speed = 25;       // 훨씬 더 빠른 속도
        break;
      case 'penalty':
        color = 0x00ff00; // 녹색
        count = 30;       // 더 많은 파티클
        size = 0.14;      // 더 큰 크기
        speed = 18;       // 훨씬 더 빠른 속도
        break;
      default:
        color = 0xff0000;
        count = 25;
        size = 0.12;
        speed = 20;
    }
    
    return this.createExplosion(position, color, count, size, speed);
  },
  
  // 파티클 시스템 업데이트
  update(delta) {
    const currentTime = Date.now();
    
    // 각 파티클 업데이트
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      // wall time 기준으로 오래된 파티클은 강제로 제거
      if (particle.userData.creationTime && currentTime - particle.userData.creationTime > 1000) {
        particle.userData.life = 0;
        continue;
      }
      
      // 파티클이 여전히 활성화되어 있는지 확인
      if (particle.userData.life > 0) {
        // 위치 업데이트 (더 빠른 움직임)
        particle.position.x += particle.userData.velocity.x * delta;
        particle.position.y += particle.userData.velocity.y * delta;
        particle.position.z += particle.userData.velocity.z * delta;
        
        // 회전 업데이트 (더 빠른 회전)
        particle.rotation.x += particle.userData.rotationSpeed.x * delta;
        particle.rotation.y += particle.userData.rotationSpeed.y * delta;
        particle.rotation.z += particle.userData.rotationSpeed.z * delta;
        
        // 중력 효과 적용 (중력 강화)
        particle.userData.velocity.y -= 20 * delta; // 더 강한 중력으로 빠르게 떨어지게
        
        // 가속도 적용 (더 역동적인 움직임)
        particle.userData.velocity.x *= (1 - delta * 1.0); // 더 빠른 감쇠
        particle.userData.velocity.z *= (1 - delta * 1.0); // 더 빠른 감쇠
        
        // 수명 감소 (더 빠른 소멸)
        particle.userData.life -= delta * 1.5; // 1.5배 빠르게 소멸
        
        // 페이드 아웃 효과 (불투명도 감소)
        if (particle.material.opacity) {
          // 시작부터 빠르게 사라지도록
          particle.material.opacity = particle.userData.startOpacity * (particle.userData.life / particle.userData.startLife) * 0.8;
        }
        
        // 시간에 따른 크기 감소 효과
        const lifeRatio = particle.userData.life / particle.userData.startLife;
        
        // 초반에는 크기가 커지다가 후반에 작아지는 효과 (더 극적으로)
        let scaleRatio;
        if (lifeRatio > 0.8) {
          // 초반 20%는 크기가 빠르게 커짐 (1.0 -> 1.5)
          scaleRatio = 1.0 + (1.0 - lifeRatio) * 2.5;
        } else {
          // 후반 80%는 크기가 더 빠르게 작아짐 (1.5 -> 0.1)
          scaleRatio = lifeRatio * 1.5;
        }
        
        particle.scale.set(scaleRatio, scaleRatio, scaleRatio);
        
        // 파티클 위치가 너무 아래로 내려가면 바로 제거 (바닥에 닿으면 사라짐)
        if (particle.position.y < 0) {
          particle.userData.life = 0;
        }
      }
    }
    
    // 파티클 시스템 관리
    for (let i = this.particleSystems.length - 1; i >= 0; i--) {
      const system = this.particleSystems[i];
      
      // wall time 기준으로 오래된 시스템은 강제로 제거
      if (system.startTime && currentTime - system.startTime > system.maxLifeTime) {
        this.cleanupParticleSystem(system, i);
        continue;
      }
      
      // 시스템 수명 감소
      system.life -= delta;
      
      // 수명이 다한 파티클 시스템 정리
      if (system.life <= 0) {
        this.cleanupParticleSystem(system, i);
      }
    }
  },
  
  // 파티클 시스템 정리 헬퍼 함수
  cleanupParticleSystem(system, index) {
    // 모든 파티클을 장면에서 제거
    system.particles.forEach(particle => {
      if (particle.parent) {
        particle.parent.remove(particle);
      }
      
      // 파티클 자원 해제
      if (particle.geometry) particle.geometry.dispose();
      if (particle.material) particle.material.dispose();
      
      // 배열에서 파티클 제거
      const particleIndex = this.particles.indexOf(particle);
      if (particleIndex !== -1) {
        this.particles.splice(particleIndex, 1);
      }
    });
    
    // 파티클 그룹 제거
    if (system.group.parent) {
      system.group.parent.remove(system.group);
    }
    
    // 배열에서 시스템 제거
    this.particleSystems.splice(index, 1);
  }
};
