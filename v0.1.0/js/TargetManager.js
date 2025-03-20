const TargetManager = {
  targets: [],
  comboCount: 0,
  comboMultiplier: 1,
  comboTimer: 0,
  comboTimeout: 3, // 3초 동안 타격이 없으면 콤보 초기화
  
  init() {
    this.createTargets();
    this.comboCount = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    
    // 다국어 이벤트 리스너 등록
    if (typeof Localization !== 'undefined') {
      document.addEventListener('localizationUpdated', this.updateComboUI.bind(this));
    }
  },
  
  createTargets() {
    // 기본 타겟 생성 (20개)
    this.createStandardTargets(15);
    
    // 보너스 타겟 생성 (5개)
    this.createBonusTargets(3);
    
    // 페널티 타겟 생성 (2개)
    this.createPenaltyTargets(2);
  },
  
  createStandardTargets(count) {
    const targetGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.5,
      metalness: 0.5,
      emissive: 0x330000
    });
    
    for (let i = 0; i < count; i++) {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.position.x = Math.random() * 80 - 40;
      target.position.y = Math.random() * 5 + 1;
      target.position.z = Math.random() * 80 - 40;
      target.castShadow = true;
      target.receiveShadow = true;
      Graphics.scene.add(target);
      
      this.targets.push({
        mesh: target,
        active: true,
        respawnTime: 0,
        type: 'standard',
        points: 10,
        movementType: Math.random() > 0.5 ? 'stationary' : 'moving',
        movementSpeed: Math.random() * 2 + 1,
        movementDirection: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 0.5, // 약간의 수직 이동
          Math.random() * 2 - 1
        ).normalize(),
        initialPosition: target.position.clone(),
        movementRange: Math.random() * 5 + 3 // 이동 범위
      });
    }
  },
  
  createBonusTargets(count) {
    const targetGeometry = new THREE.SphereGeometry(0.4, 16, 16); // 약간 작은 크기
    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700, // 골드 색상
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x554400
    });
    
    for (let i = 0; i < count; i++) {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.position.x = Math.random() * 80 - 40;
      target.position.y = Math.random() * 5 + 1;
      target.position.z = Math.random() * 80 - 40;
      target.castShadow = true;
      target.receiveShadow = true;
      Graphics.scene.add(target);
      
      this.targets.push({
        mesh: target,
        active: true,
        respawnTime: 0,
        type: 'bonus',
        points: 25, // 더 많은 점수
        movementType: 'moving', // 보너스는 항상 움직임
        movementSpeed: Math.random() * 3 + 2, // 더 빠른 속도
        movementDirection: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 0.8, // 더 많은 수직 이동
          Math.random() * 2 - 1
        ).normalize(),
        initialPosition: target.position.clone(),
        movementRange: Math.random() * 8 + 5 // 더 넓은 이동 범위
      });
    }
  },
  
  createPenaltyTargets(count) {
    const targetGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8); // 상자 모양
    const targetMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // 녹색
      roughness: 0.7,
      metalness: 0.2,
      emissive: 0x003300
    });
    
    for (let i = 0; i < count; i++) {
      const target = new THREE.Mesh(targetGeometry, targetMaterial);
      target.position.x = Math.random() * 80 - 40;
      target.position.y = Math.random() * 5 + 1;
      target.position.z = Math.random() * 80 - 40;
      target.castShadow = true;
      target.receiveShadow = true;
      target.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ); // 랜덤 회전
      Graphics.scene.add(target);
      
      this.targets.push({
        mesh: target,
        active: true,
        respawnTime: 0,
        type: 'penalty',
        points: -15, // 감점
        movementType: 'moving',
        movementSpeed: Math.random() * 1.5 + 0.5, // 느린 속도
        movementDirection: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 0.3, // 최소한의 수직 이동
          Math.random() * 2 - 1
        ).normalize(),
        initialPosition: target.position.clone(),
        movementRange: Math.random() * 4 + 2 // 좁은 이동 범위
      });
    }
  },
  
  update() {
    const delta = Graphics.clock.getDelta();
    
    // 콤보 타이머 업데이트
    if (this.comboCount > 0) {
      this.comboTimer += delta;
      if (this.comboTimer >= this.comboTimeout) {
        // 콤보 초기화
        this.resetCombo();
        // UI 업데이트
        this.updateComboUI();
      }
    }
    
    // 타겟 이동 및 리스폰 처리
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      
      // 비활성화된 타겟 리스폰 처리
      if (!target.active && Game.timeLeft <= target.respawnTime) {
        target.active = true;
        target.mesh.visible = true;
        
        // 새로운 위치에 리스폰
        target.mesh.position.x = Math.random() * 80 - 40;
        target.mesh.position.y = Math.random() * 5 + 1;
        target.mesh.position.z = Math.random() * 80 - 40;
        
        // 초기 위치 업데이트
        target.initialPosition.copy(target.mesh.position);
        
        // 새로운 이동 방향 설정 (리스폰 시에만)
        target.movementDirection.set(
          Math.random() * 2 - 1,
          Math.random() * (target.type === 'bonus' ? 0.8 : 0.5),
          Math.random() * 2 - 1
        ).normalize();
      }
      
      // 활성화된 타겟 이동 처리
      if (target.active && target.movementType === 'moving') {
        // 현재 위치가 초기 위치에서 이동 범위를 벗어나면 방향 전환
        const distanceFromInitial = target.mesh.position.distanceTo(target.initialPosition);
        if (distanceFromInitial >= target.movementRange) {
          // 초기 위치 방향으로 다시 이동하도록 방향 조정
          target.movementDirection.subVectors(target.initialPosition, target.mesh.position).normalize();
        }
        
        // 장애물과 충돌 방지를 위한 레이캐스팅 (간단한 구현)
        const raycaster = new THREE.Raycaster();
        raycaster.set(target.mesh.position, target.movementDirection);
        const intersects = raycaster.intersectObjects(Environment.obstacles.map(o => o.mesh));
        
        if (intersects.length > 0 && intersects[0].distance < 1.0) {
          // 장애물과 가까우면 방향 약간 바꿈
          target.movementDirection.reflect(intersects[0].face.normal);
        }
        
        // 타겟 이동
        target.mesh.position.x += target.movementDirection.x * target.movementSpeed * delta;
        target.mesh.position.y += target.movementDirection.y * target.movementSpeed * delta;
        target.mesh.position.z += target.movementDirection.z * target.movementSpeed * delta;
        
        // 바닥 아래로 내려가지 않도록 제한
        if (target.mesh.position.y < 0.5) {
          target.mesh.position.y = 0.5;
          target.movementDirection.y *= -1; // 방향 반전
        }
        
        // 너무 높이 올라가지 않도록 제한
        if (target.mesh.position.y > 8) {
          target.mesh.position.y = 8;
          target.movementDirection.y *= -1; // 방향 반전
        }
        
        // 페널티 타겟은 회전 애니메이션 추가
        if (target.type === 'penalty') {
          target.mesh.rotation.x += 0.5 * delta;
          target.mesh.rotation.y += 0.8 * delta;
        }
        
        // 보너스 타겟은 크기가 약간 변하는 애니메이션 추가
        if (target.type === 'bonus') {
          const scale = 0.9 + Math.sin(Game.timeLeft * 3) * 0.1;
          target.mesh.scale.set(scale, scale, scale);
        }
      }
    }
    
    // 파티클 시스템 업데이트 (ParticleSystem이 있는 경우)
    if (typeof ParticleSystem !== 'undefined' && ParticleSystem.update) {
      ParticleSystem.update(delta);
    }
  },
  
  checkHit(raycaster) {
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (!target.active) continue;
      
      const intersects = raycaster.intersectObject(target.mesh);
      if (intersects.length > 0) {
        // 타겟 위치 저장 (파티클 효과를 위해)
        const targetPosition = target.mesh.position.clone();
        const targetType = target.type;
        
        // 타겟 비활성화
        target.active = false;
        target.mesh.visible = false;
        
        // 타겟 유형에 따른 리스폰 타임 조정
        const respawnDelay = target.type === 'bonus' ? 8 : 
                            target.type === 'penalty' ? 3 : 5;
                            
        target.respawnTime = Game.timeLeft - respawnDelay;
        
        // 타겟 유형에 따른 점수 적용
        const basePoints = target.points;
        
        // 콤보 시스템 업데이트 (페널티 타겟은 콤보를 초기화)
        if (target.type === 'penalty') {
          this.resetCombo();
        } else {
          this.incrementCombo();
        }
        
        // 총 점수 = 기본 점수 x 콤보 배율
        const totalPoints = Math.floor(basePoints * this.comboMultiplier);
        
        // 점수 추가
        Game.addScore(totalPoints);
        
        // 타겟 유형에 따른 효과음 재생
        if (target.type === 'bonus') {
          AudioManager.play('bonusHit');
          Graphics.showBonusEffect(); // 보너스 효과 표시
        } else if (target.type === 'penalty') {
          AudioManager.play('penaltyHit');
          Graphics.showPenaltyEffect(); // 페널티 효과 표시
        } else {
          AudioManager.play('hit');
          Graphics.showHitMarker();
        }
        
        // 점수 텍스트 이펙트 표시
        Graphics.showScoreText(totalPoints, intersects[0].point);
        
        // UI 업데이트
        this.updateComboUI();
        
        // 파티클 시스템을 사용하여 풍선 파편 효과 생성
        if (typeof ParticleSystem !== 'undefined' && ParticleSystem.createTargetExplosion) {
          ParticleSystem.createTargetExplosion(targetPosition, targetType);
        }
        
        return true;
      }
    }
    return false;
  },
  
  incrementCombo() {
    this.comboCount++;
    this.comboTimer = 0; // 타이머 리셋
    
    // 콤보 배율 계산 (최대 3배)
    if (this.comboCount >= 10) {
      this.comboMultiplier = 3.0;
    } else if (this.comboCount >= 5) {
      this.comboMultiplier = 2.0;
    } else if (this.comboCount >= 3) {
      this.comboMultiplier = 1.5;
    } else {
      this.comboMultiplier = 1.0;
    }
  },
  
  resetCombo() {
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
  },
  
  updateComboUI() {
    // UI 엘리먼트가 있는지 확인
    const comboElement = document.getElementById('combo');
    if (comboElement) {
      // 콤보 카운트에 따라 UI 업데이트
      if (this.comboCount >= 3) {
        // 다국어 지원 확인
        let comboText;
        
        if (typeof Localization !== 'undefined') {
          // 직접 번역된 문자열이 없으므로 각 언어별 포맷 사용
          if (Localization.currentLanguage === 'ko') {
            comboText = `${this.comboCount}x 콤보 (${this.comboMultiplier}배)`;
          } else {
            comboText = `${this.comboCount}x Combo (${this.comboMultiplier}x)`;
          }
        } else {
          comboText = `${this.comboCount}x Combo (${this.comboMultiplier}x)`;
        }
        
        comboElement.textContent = comboText;
        comboElement.style.display = 'block';
        comboElement.style.opacity = '1';
        
        // 콤보 효과 애니메이션
        comboElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
          if (comboElement) comboElement.style.transform = 'scale(1)';
        }, 200);
      } else {
        comboElement.style.opacity = '0';
        setTimeout(() => {
          if (comboElement) comboElement.style.display = 'none';
        }, 500);
      }
    }
  }
};
