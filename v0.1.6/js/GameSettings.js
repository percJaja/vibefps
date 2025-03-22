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
    
    // 볼륨 변경 적용
    AudioManager.setVolume('music', this.volumes.music);
    AudioManager.setVolume('sfx', this.volumes.sfx);
  },
  loadSettings() {
    // UI에 키 바인딩 설정 반영
    document.getElementById('forwardKey').value = this.keyBindings.forward;
    document.getElementById('backwardKey').value = this.keyBindings.backward;
    document.getElementById('leftKey').value = this.keyBindings.left;
    document.getElementById('rightKey').value = this.keyBindings.right;
    
    // UI에 볼륨 설정 반영
    document.getElementById('musicVolume').value = this.volumes.music;
    document.getElementById('sfxVolume').value = this.volumes.sfx;
    
    // 공간 반향 설정 UI에 로드
    const spatialReverbCheckbox = document.getElementById('spatialReverb');
    if (spatialReverbCheckbox) {
      spatialReverbCheckbox.checked = this.audio.spatialReverb;
    }

    const reverbQualitySelect = document.getElementById('reverbQuality');
    if (reverbQualitySelect) {
      reverbQualitySelect.value = this.audio.reverbQuality || 'medium';
    }
  }
};