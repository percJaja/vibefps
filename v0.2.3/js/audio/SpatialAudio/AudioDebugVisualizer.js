// AudioDebugVisualizer.js
// 오디오 시스템의 디버그 정보 시각화 및 표시

// 전역 네임스페이스 사용
window.AudioDebugVisualizer = {
  // 의존성 참조
  settings: null,
  
  // 시각화 요소
  visualizationGroup: null,
  castRayForReflection: null,
  
  // 초기화
  init(dependencies) {
    console.log('AudioDebugVisualizer 초기화 중...');
    this.settings = dependencies.settings;
    
    console.log('AudioDebugVisualizer 초기화 완료');
  },
  
  // RoomAnalyzer의 레이캐스팅 함수 참조 설정
  setRayCastFunction(castFn) {
    this.castRayForReflection = castFn;
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
    let newDebugDiv;
    if (!debugDiv) {
      newDebugDiv = document.createElement('div');
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
    
    // 3. 시각적 디버그 효과 (총소리 타입에 따른 다른 화면 테두리 효과)
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
  
  // 디버그: 현재 위치의 환경 특성을 시각화 (개발용)
  visualizeEnvironment(playerPosition) {
    if (!Graphics || !Graphics.scene) return;
    
    // 레이 캐스팅 함수가 없으면 경고
    if (!this.castRayForReflection) {
      console.error('레이캐스팅 함수가 설정되지 않았습니다');
      return;
    }
    
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
    
    // 레이캐스트 함수 사용
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
