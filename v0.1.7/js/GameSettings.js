const GameSettings = {
  keyBindings: {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    reload: 'KeyR'
  },
  volumes: {
    music: 0.5,
    sfx: 0.7
  },
  audio: {
    spatialReverb: true, // 공간 반향 효과 켜기/끄기
    reverbQuality: 'medium' // 'low', 'medium', 'high'
  },
  debug: false, // 디버그 모드 설정
  
  saveSettings() {
    const keySelects = document.querySelectorAll('.keyBinding');
    keySelects.forEach(select => {
      // key id의 "Key" 접두어 제거 후 소문자 변환
      const key = select.id.replace('Key', '').toLowerCase();
      this.keyBindings[key] = select.value;
    });
    
    this.volumes.music = parseFloat(document.getElementById('musicVolume').value);
    this.volumes.sfx = parseFloat(document.getElementById('sfxVolume').value);
    
    // 공간 반향 설정 저장
    const spatialReverbCheckbox = document.getElementById('spatialReverb');
    if (spatialReverbCheckbox) {
      this.audio.spatialReverb = spatialReverbCheckbox.checked;
    }

    const reverbQualitySelect = document.getElementById('reverbQuality');
    if (reverbQualitySelect) {
      this.audio.reverbQuality = reverbQualitySelect.value;
    }
    
    // 디버그 모드 설정 저장
    const debugCheckbox = document.getElementById('debugAudioToggle');
    if (debugCheckbox) {
      this.debug = debugCheckbox.checked;
      window.DEBUG_AUDIO = this.debug;
    }
    
    // 볼륨 변경 적용
    AudioManager.setVolume('music', this.volumes.music);
    AudioManager.setVolume('sfx', this.volumes.sfx);
    
    // 로컬 스토리지에 설정 저장 (선택 사항)
    this.saveToLocalStorage();
  },
  
  loadSettings() {
    // 로컬 스토리지에서 설정 로드 (선택 사항)
    this.loadFromLocalStorage();
    
    // UI에 키 바인딩 설정 반영
    if (document.getElementById('forwardKey')) {
      document.getElementById('forwardKey').value = this.keyBindings.forward;
    }
    if (document.getElementById('backwardKey')) {
      document.getElementById('backwardKey').value = this.keyBindings.backward;
    }
    if (document.getElementById('leftKey')) {
      document.getElementById('leftKey').value = this.keyBindings.left;
    }
    if (document.getElementById('rightKey')) {
      document.getElementById('rightKey').value = this.keyBindings.right;
    }
    
    // UI에 볼륨 설정 반영
    if (document.getElementById('musicVolume')) {
      document.getElementById('musicVolume').value = this.volumes.music;
    }
    if (document.getElementById('sfxVolume')) {
      document.getElementById('sfxVolume').value = this.volumes.sfx;
    }
    
    // 공간 반향 설정 UI에 로드
    const spatialReverbCheckbox = document.getElementById('spatialReverb');
    if (spatialReverbCheckbox) {
      spatialReverbCheckbox.checked = this.audio.spatialReverb;
    }

    const reverbQualitySelect = document.getElementById('reverbQuality');
    if (reverbQualitySelect) {
      reverbQualitySelect.value = this.audio.reverbQuality || 'medium';
    }
    
    // 디버그 모드 설정 반영
    const debugCheckbox = document.getElementById('debugAudioToggle');
    if (debugCheckbox) {
      debugCheckbox.checked = this.debug;
    }
    
    // 디버그 모드 글로벌 변수 설정
    window.DEBUG_AUDIO = this.debug;
    
    // 설정 화면에 오디오 테스트 UI 추가
    this.initAudioTestUI();
  },
  
  // 로컬 스토리지 저장/로드 (선택 사항)
  saveToLocalStorage() {
    try {
      localStorage.setItem('gameSettings', JSON.stringify({
        keyBindings: this.keyBindings,
        volumes: this.volumes,
        audio: this.audio,
        debug: this.debug
      }));
    } catch (e) {
      console.warn('설정을 로컬 스토리지에 저장할 수 없습니다:', e);
    }
  },
  
  loadFromLocalStorage() {
    try {
      const savedSettings = localStorage.getItem('gameSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // 키 바인딩 로드
        if (settings.keyBindings) {
          this.keyBindings = {...this.keyBindings, ...settings.keyBindings};
        }
        
        // 볼륨 로드
        if (settings.volumes) {
          this.volumes = {...this.volumes, ...settings.volumes};
        }
        
        // 오디오 설정 로드
        if (settings.audio) {
          this.audio = {...this.audio, ...settings.audio};
        }
        
        // 디버그 모드 로드
        if (settings.debug !== undefined) {
          this.debug = settings.debug;
        }
      }
    } catch (e) {
      console.warn('로컬 스토리지에서 설정을 로드할 수 없습니다:', e);
    }
  },
  
  /**
   * 설정 화면에 오디오 테스트 UI 추가
   */
  initAudioTestUI() {
    // 설정 화면이 열린 후에 UI 추가하기 위해 약간 지연
    setTimeout(() => this.addAudioTestUI(), 100);
  },
  
  /**
   * 오디오 테스트 UI를 설정 화면에 추가
   */
  addAudioTestUI() {
    // 설정 화면 콘텐츠 요소 가져오기
    const settingsContent = document.querySelector('.settings-content');
    if (!settingsContent) return;
    
    // 이미 존재하는 경우 제거
    const existingTestSection = document.getElementById('audioTestSection');
    if (existingTestSection) {
      existingTestSection.remove();
    }
    
    // 테스트 섹션 생성
    const testSection = document.createElement('div');
    testSection.id = 'audioTestSection';
    testSection.className = 'settings-section';
    
    // 로컬라이제이션 지원 확인
    const useLocalization = typeof Localization !== 'undefined';
    
    // 타이틀 추가
    const testHeader = document.createElement('div');
    testHeader.className = 'settings-header';
    testHeader.textContent = useLocalization ? 
      Localization.getText('audioTestTitle') || '오디오 시스템 테스트' : 
      '오디오 시스템 테스트';
    testSection.appendChild(testHeader);
    
    // 테스트 설명
    const testDescription = document.createElement('p');
    testDescription.style.fontSize = '14px';
    testDescription.style.opacity = '0.8';
    testDescription.style.margin = '10px 0';
    testDescription.textContent = useLocalization ? 
      Localization.getText('audioTestDescription') || '각 버튼을 클릭하여 다른 오디오 시스템을 테스트하세요.' : 
      '각 버튼을 클릭하여 다른 오디오 시스템을 테스트하세요.';
    testSection.appendChild(testDescription);
    
    // 테스트 버튼 컨테이너
    const testButtons = document.createElement('div');
    testButtons.style.display = 'flex';
    testButtons.style.flexDirection = 'column';
    testButtons.style.gap = '10px';
    testButtons.style.margin = '15px 0';
    testSection.appendChild(testButtons);
    
    // 테스트 버튼 1: 방향성 오디오 테스트
    const testDirectionalBtn = document.createElement('button');
    testDirectionalBtn.textContent = useLocalization ? 
      Localization.getText('directionalAudioTest') || '방향성 오디오 테스트 (좌우 상태 확인)' : 
      '방향성 오디오 테스트 (좌우 상태 확인)';
    testDirectionalBtn.className = 'button';
    testDirectionalBtn.style.backgroundColor = '#3498db';
    testDirectionalBtn.style.color = 'white';
    testDirectionalBtn.style.padding = '10px';
    testDirectionalBtn.style.cursor = 'pointer';
    testDirectionalBtn.style.border = 'none';
    testDirectionalBtn.style.borderRadius = '4px';
    testButtons.appendChild(testDirectionalBtn);
    
    // 테스트 버튼 2: 3D 오디오 테스트
    const test3DBtn = document.createElement('button');
    test3DBtn.textContent = useLocalization ? 
      Localization.getText('3dAudioTest') || '3D 오디오 테스트 (공간감 확인)' : 
      '3D 오디오 테스트 (공간감 확인)';
    test3DBtn.className = 'button';
    test3DBtn.style.backgroundColor = '#e67e22';
    test3DBtn.style.color = 'white';
    test3DBtn.style.padding = '10px';
    test3DBtn.style.cursor = 'pointer';
    test3DBtn.style.border = 'none';
    test3DBtn.style.borderRadius = '4px';
    testButtons.appendChild(test3DBtn);
    
    // 테스트 버튼 3: 기존 오디오 테스트
    const testLegacyBtn = document.createElement('button');
    testLegacyBtn.textContent = useLocalization ? 
      Localization.getText('legacyAudioTest') || '기존 오디오 시스템 테스트' : 
      '기존 오디오 시스템 테스트';
    testLegacyBtn.className = 'button';
    testLegacyBtn.style.backgroundColor = '#7f8c8d';
    testLegacyBtn.style.color = 'white';
    testLegacyBtn.style.padding = '10px';
    testLegacyBtn.style.cursor = 'pointer';
    testLegacyBtn.style.border = 'none';
    testLegacyBtn.style.borderRadius = '4px';
    testButtons.appendChild(testLegacyBtn);
    
    // 디버그 모드 토글
    const debugToggle = document.createElement('div');
    debugToggle.style.display = 'flex';
    debugToggle.style.alignItems = 'center';
    debugToggle.style.margin = '15px 0';
    
    const debugCheckbox = document.createElement('input');
    debugCheckbox.type = 'checkbox';
    debugCheckbox.id = 'debugAudioToggle';
    debugCheckbox.checked = this.debug || window.DEBUG_AUDIO || false;
    
    const debugLabel = document.createElement('label');
    debugLabel.htmlFor = 'debugAudioToggle';
    debugLabel.textContent = useLocalization ? 
      Localization.getText('debugAudioToggle') || '오디오 디버그 모드 활성화' : 
      '오디오 디버그 모드 활성화';
    debugLabel.style.marginLeft = '8px';
    
    debugToggle.appendChild(debugCheckbox);
    debugToggle.appendChild(debugLabel);
    testSection.appendChild(debugToggle);
    
    // 설정 화면에 추가
    settingsContent.appendChild(testSection);
    
    // 이벤트 핸들러 등록
    testDirectionalBtn.addEventListener('click', () => {
      this.testDirectionalAudio();
    });
    
    test3DBtn.addEventListener('click', () => {
      this.test3DAudio();
    });
    
    testLegacyBtn.addEventListener('click', () => {
      this.testLegacyAudio();
    });
    
    debugCheckbox.addEventListener('change', (e) => {
      this.debug = e.target.checked;
      window.DEBUG_AUDIO = e.target.checked;
      
      // 설정 저장
      this.saveSettings();
    });
  },
  
  /**
   * 방향성 오디오 테스트 함수
   */
  testDirectionalAudio() {
    // SpatialAudioSystem이 정의되어 있는지 안전하게 확인
    if (typeof SpatialAudioSystem === 'undefined') {
      console.warn('SpatialAudioSystem이 정의되지 않았습니다. 테스트를 진행할 수 없습니다.');
      this.showErrorMessage('SpatialAudioSystem을 찾을 수 없습니다.');
      return;
    }
    
    if (!this.audio) return;
    
    // 임시로 품질 설정 저장
    const originalQuality = this.audio.reverbQuality;
    
    // 품질을 'medium'으로 설정하여 방향성 오디오 강제 사용
    this.audio.reverbQuality = 'medium';
    
    // 플레이어 위치 가져오기
    const playerPosition = this.getPlayerPosition();
    
    // 총 소리 직접 재생 (AudioManager 사용)
    if (typeof AudioManager !== 'undefined') {
      AudioManager.play('shoot', { type: 'powerful', volume: 1.0 });
    }
    
    // 방향성 반향 효과 생성
    SpatialAudioSystem.createGunSoundWithReverb('shoot', playerPosition);
    
    // 원래 설정 복원
    setTimeout(() => {
      this.audio.reverbQuality = originalQuality;
    }, 3000);
  },
  
  /**
   * 3D 오디오 테스트 함수
   */
  test3DAudio() {
    // SpatialAudioSystem이 정의되어 있는지 안전하게 확인
    if (typeof SpatialAudioSystem === 'undefined') {
      console.warn('SpatialAudioSystem이 정의되지 않았습니다. 테스트를 진행할 수 없습니다.');
      this.showErrorMessage('SpatialAudioSystem을 찾을 수 없습니다.');
      return;
    }
    
    if (!this.audio) return;
    
    // 임시로 품질 설정 저장
    const originalQuality = this.audio.reverbQuality;
    
    // 품질을 'high'으로 설정하여 3D 오디오 강제 사용
    this.audio.reverbQuality = 'high';
    
    // 플레이어 위치 가져오기
    const playerPosition = this.getPlayerPosition();
    
    // 총 소리 직접 재생 (AudioManager 사용)
    if (typeof AudioManager !== 'undefined') {
      AudioManager.play('shoot', { type: 'powerful', volume: 1.0 });
    }
    
    // 3D 반향 효과 생성
    SpatialAudioSystem.createGunSoundWithReverb('shoot', playerPosition);
    
    // 원래 설정 복원
    setTimeout(() => {
      this.audio.reverbQuality = originalQuality;
    }, 3000);
  },
  
  /**
   * 기존 오디오 시스템 테스트 함수
   */
  testLegacyAudio() {
    if (typeof AudioManager === 'undefined') {
      console.warn('AudioManager가 정의되지 않았습니다. 테스트를 진행할 수 없습니다.');
      this.showErrorMessage('AudioManager를 찾을 수 없습니다.');
      return;
    }
    
    if (!AudioManager.playSpatialGunshot) {
      console.warn('AudioManager.playSpatialGunshot 함수가 없습니다. 테스트를 진행할 수 없습니다.');
      this.showErrorMessage('AudioManager.playSpatialGunshot 함수를 찾을 수 없습니다.');
      return;
    }
    
    // 플레이어 위치 가져오기
    const playerPosition = this.getPlayerPosition();
    
    // 총 소리 직접 재생 (AudioManager 사용)
    AudioManager.play('shoot', { type: 'powerful', volume: 1.0 });
    
    // 기존 공간 오디오 시스템 사용
    AudioManager.playSpatialGunshot('shoot', playerPosition);
    
    // 디버그 표시
    if (window.DEBUG_AUDIO) {
      const legacyIndicator = document.createElement('div');
      legacyIndicator.style.position = 'fixed';
      legacyIndicator.style.top = '70px';
      legacyIndicator.style.right = '10px';
      legacyIndicator.style.backgroundColor = 'rgba(100, 100, 100, 0.7)';
      legacyIndicator.style.color = '#fff';
      legacyIndicator.style.padding = '10px';
      legacyIndicator.style.borderRadius = '5px';
      legacyIndicator.style.fontFamily = 'monospace';
      legacyIndicator.style.fontSize = '12px';
      legacyIndicator.style.zIndex = '1000';
      legacyIndicator.style.pointerEvents = 'none';
      legacyIndicator.innerHTML = "🔊 Legacy Spatial Audio Test";
      document.body.appendChild(legacyIndicator);
      
      // 3초 후 제거
      setTimeout(() => {
        legacyIndicator.style.opacity = '0';
        legacyIndicator.style.transition = 'opacity 1s';
        setTimeout(() => {
          if (document.body.contains(legacyIndicator)) {
            document.body.removeChild(legacyIndicator);
          }
        }, 1000);
      }, 3000);
    }
  },
  
  /**
   * 오류 메시지를 UI에 표시
   * @param {string} message - 표시할 오류 메시지
   */
  showErrorMessage(message) {
    // 오류 메시지 UI 생성
    const errorMsg = document.createElement('div');
    errorMsg.style.position = 'fixed';
    errorMsg.style.top = '70px';
    errorMsg.style.right = '10px';
    errorMsg.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    errorMsg.style.color = 'white';
    errorMsg.style.padding = '10px 15px';
    errorMsg.style.borderRadius = '5px';
    errorMsg.style.fontFamily = 'system-ui, sans-serif';
    errorMsg.style.fontSize = '14px';
    errorMsg.style.zIndex = '1000';
    errorMsg.style.pointerEvents = 'none';
    errorMsg.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    errorMsg.innerHTML = `❌ ${message}`;
    
    document.body.appendChild(errorMsg);
    
    // 5초 후 제거
    setTimeout(() => {
      errorMsg.style.opacity = '0';
      errorMsg.style.transition = 'opacity 1s';
      setTimeout(() => {
        if (document.body.contains(errorMsg)) {
          document.body.removeChild(errorMsg);
        }
      }, 1000);
    }, 5000);
  },

  /**
   * 플레이어 위치 가져오기 헬퍼 함수
   * @return {THREE.Vector3} 플레이어 위치
   */
  getPlayerPosition() {
    const position = new THREE.Vector3();
    
    if (Physics && Physics.playerBody) {
      position.copy(Physics.playerBody.position);
    } else if (Graphics && Graphics.camera) {
      position.copy(Graphics.camera.position);
    }
    
    return position;
  }
};
