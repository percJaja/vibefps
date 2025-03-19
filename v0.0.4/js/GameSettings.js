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
  saveSettings() {
    const keySelects = document.querySelectorAll('.keyBinding');
    keySelects.forEach(select => {
      // key id의 "Key" 접두어 제거 후 소문자 변환
      const key = select.id.replace('Key', '').toLowerCase();
      this.keyBindings[key] = select.value;
    });
    
    this.volumes.music = parseFloat(document.getElementById('musicVolume').value);
    this.volumes.sfx = parseFloat(document.getElementById('sfxVolume').value);
    
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
  }
};
