// GitHubTarget.js - GitHub 링크 아이콘 타겟 구현
const GitHubTarget = {
  mesh: null,
  active: true,
  githubLink: 'https://github.com/ychoi-kr/vibefps',
  
  init() {
    // GitHub 로고 형태의 타겟 생성 (간단한 육면체로 표현)
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    
    // 텍스처 생성 (GitHub 로고를 표현하는 간단한 데이터 URI)
    const texture = new THREE.TextureLoader().load('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTIgMGMtNi42MjYgMC0xMiA1LjM3My0xMiAxMiAwIDUuMzAyIDMuNDM4IDkuOCA4LjIwNyAxMS4zODcuNTk5LjExMS43OTMtLjI2MS43OTMtLjU3N3YtMi4yMzRjLTMuMzM4LjcyNi00LjAzMy0xLjQxNi00LjAzMy0xLjQxNi0uNTQ2LTEuMzg3LTEuMzMzLTEuNzU2LTEuMzMzLTEuNzU2LTEuMDg5LS43NDUuMDgzLS43MjkuMDgzLS43MjkgMS4yMDUuMDg0IDEuODM5IDEuMjM3IDEuODM5IDEuMjM3IDEuMDcgMS44MzQgMi44MDcgMS4zMDQgMy40OTIuOTk3LjEwNy0uNzc1LjQxOC0xLjMwNS43NjItMS42MDQtMi42NjUtLjMwNS01LjQ2Ny0xLjMzNC01LjQ2Ny01LjkzMSAwLTEuMzExLjQ2OS0yLjM4MSAxLjIzNi0zLjIyMS0uMTI0LS4zMDMtLjUzNS0xLjUyNC4xMTctMy4xNzYgMCAwIDEuMDA4LS4zMjIgMy4zMDEgMS4yMy45NTctLjI2NiAxLjk4My0uMzk5IDMuMDAzLS40MDQgMS4wMi4wMDUgMi4wNDcuMTM4IDMuMDA2LjQwNCAyLjI5MS0xLjU1MiAzLjI5Ny0xLjIzIDMuMjk3LTEuMjMuNjUzIDEuNjUzLjI0MiAyLjg3NC4xMTggMy4xNzYuNzcuODQgMS4yMzUgMS45MTEgMS4yMzUgMy4yMjEgMCA0LjYwOS0yLjgwNyA1LjYyNC01LjQ3OSA1LjkyMS40My4zNzIuODIzIDEuMTAyLjgyMyAyLjIyMnYzLjI5M2MwIC4zMTkuMTkyLjY5NC44MDEuNTc2IDQuNzY1LTEuNTg5IDguMTk5LTYuMDg2IDguMTk5LTExLjM4NiAwLTYuNjI3LTUuMzczLTEyLTEyLTEyeiIvPjwvc3ZnPg==');
    
    // 머티리얼 생성 
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    
    // 메시 생성
    this.mesh = new THREE.Mesh(geometry, material);
    
    // 코너 위치에 배치 (맵 코너 위치로 조정)
    this.mesh.position.set(45, 5, 45); // 맵 우측 상단 코너
    
    // 회전 애니메이션을 위한 초기값 설정
    this.mesh.userData = {
      initialY: this.mesh.position.y,
      rotationSpeed: 1.5,
      floatSpeed: 0.5,
      floatRange: 0.5
    };
    
    // 씬에 추가
    Graphics.scene.add(this.mesh);
    
    console.log('GitHub 타겟 초기화 완료');
  },
  
  update(delta) {
    if (!this.active) return;
    
    // 회전 애니메이션
    this.mesh.rotation.y += this.mesh.userData.rotationSpeed * delta;
    
    // 위아래로 떠다니는 애니메이션
    const floatOffset = Math.sin(Game.timeLeft * this.mesh.userData.floatSpeed) * this.mesh.userData.floatRange;
    this.mesh.position.y = this.mesh.userData.initialY + floatOffset;
    
    // 빛나는 효과 (스케일 변화)
    const pulseScale = 1.0 + Math.sin(Game.timeLeft * 2) * 0.1;
    this.mesh.scale.set(pulseScale, pulseScale, pulseScale);
  },
  
  checkHit(raycaster) {
    if (!this.active) return false;
    
    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      this.active = false;
      this.mesh.visible = false;
      
      // GitHub 링크 표시
      this.showGitHubLink();
      
      // 효과음 재생 (보너스 타겟 효과음 재사용)
      AudioManager.play('bonusHit');
      
      // 특별 효과 생성
      if (typeof ParticleSystem !== 'undefined' && ParticleSystem.createExplosion) {
        // 특별한 색상의 파티클 폭발 생성
        ParticleSystem.createExplosion(
          this.mesh.position.clone(),
          0x6e5494, // GitHub 보라색
          50, // 더 많은 파티클
          0.2, // 큰 크기
          15  // 빠른 속도
        );
      }
      
      return true;
    }
    
    return false;
  },
  
  showGitHubLink() {
    // 게임 상태 저장 및 이벤트 발생
    const wasGameStarted = Game.gameStarted;
    
    // 이벤트 시스템을 통한 게임 일시 중지 알림
    EventSystem.emit('gameStateChanged', { 
      state: 'paused', 
      reason: 'githubPopup', 
      previousState: wasGameStarted ? 'playing' : 'menu'
    });
  
    // 중요: 포인터 락 상태인 경우 해제
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // 다국어 지원 - 현재 언어 확인
    const useLocalization = typeof Localization !== 'undefined';
    
    // 링크 컨테이너 생성
    const linkContainer = document.createElement('div');
    linkContainer.style.position = 'fixed';
    linkContainer.style.top = '50%';
    linkContainer.style.left = '50%';
    linkContainer.style.transform = 'translate(-50%, -50%)';
    linkContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    linkContainer.style.padding = '20px';
    linkContainer.style.borderRadius = '10px';
    linkContainer.style.boxShadow = '0 0 20px rgba(255, 255, 255, 0.3)';
    linkContainer.style.color = 'white';
    linkContainer.style.fontFamily = 'system-ui, sans-serif';
    linkContainer.style.textAlign = 'center';
    linkContainer.style.zIndex = '1000';
    
    // 메시지 추가
    const message = document.createElement('p');
    message.textContent = useLocalization ? 
                         Localization.getText('secretTarget') : 
                         '🎯 비밀 타겟을 발견하셨습니다! 🎯';
    message.style.fontSize = '24px';
    message.style.fontWeight = 'bold';
    message.style.margin = '0 0 15px 0';
    linkContainer.appendChild(message);
    
    // GitHub 아이콘 추가
    const githubIcon = document.createElement('div');
    githubIcon.innerHTML = '<svg width="60" height="60" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>';
    githubIcon.style.margin = '10px auto';
    linkContainer.appendChild(githubIcon);
    
    // 링크 설명 추가
    const linkDescription = document.createElement('p');
    linkDescription.textContent = useLocalization ? 
                                Localization.getText('githubDescription') : 
                                '게임 소스 코드를 확인하려면 아래 링크를 클릭하세요:';
    linkDescription.style.fontSize = '16px';
    linkDescription.style.margin = '15px 0';
    linkContainer.appendChild(linkDescription);
    
    // GitHub 링크 버튼 추가
    const link = document.createElement('a');
    link.href = this.githubLink;
    link.target = '_blank';
    link.textContent = useLocalization ? 
                      Localization.getText('visitRepo') : 
                      'GitHub 저장소 방문하기';
    link.style.display = 'inline-block';
    link.style.padding = '10px 20px';
    link.style.backgroundColor = '#6e5494';
    link.style.color = 'white';
    link.style.textDecoration = 'none';
    link.style.borderRadius = '5px';
    link.style.fontWeight = 'bold';
    link.style.margin = '10px 0';
    link.style.transition = 'background-color 0.3s';
    
    // 버튼 호버 효과
    link.onmouseover = function() {
      this.style.backgroundColor = '#8a6db1';
    };
    link.onmouseout = function() {
      this.style.backgroundColor = '#6e5494';
    };
    
    linkContainer.appendChild(link);
    
    // 계속하기 버튼 추가
    const continueButton = document.createElement('button');
    continueButton.textContent = useLocalization ? 
                               Localization.getText('returnToGame') : 
                               '게임으로 돌아가기';
    continueButton.style.display = 'block';
    continueButton.style.padding = '10px 20px';
    continueButton.style.backgroundColor = '#4CAF50';
    continueButton.style.color = 'white';
    continueButton.style.border = 'none';
    continueButton.style.borderRadius = '5px';
    continueButton.style.margin = '15px auto 0';
    continueButton.style.cursor = 'pointer';
    continueButton.style.fontWeight = 'bold';
    continueButton.style.transition = 'background-color 0.3s';
    
    // 버튼 호버 효과
    continueButton.onmouseover = function() {
      this.style.backgroundColor = '#66bb6a';
    };
    continueButton.onmouseout = function() {
      this.style.backgroundColor = '#4CAF50';
    };
    
    continueButton.onclick = function() {
      document.body.removeChild(linkContainer);
      
      // 게임 재개 - 이벤트 기반으로 수정
      if (wasGameStarted) {
        EventSystem.emit('gameStateChanged', { 
          state: 'playing', 
          reason: 'githubPopupClosed'
        });
      }
    };
    
    linkContainer.appendChild(continueButton);
    
    // 문서에 컨테이너 추가
    document.body.appendChild(linkContainer);
  }
};