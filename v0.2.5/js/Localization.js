/**
 * Localization.js - 다국어 지원 모듈
 * 
 * 브라우저 기본 언어를 감지하여 해당 언어로 UI 텍스트를 표시합니다.
 * 현재 지원 언어: 한국어(ko), 영어(en)
 */
const Localization = {
  currentLanguage: 'en', // 기본값은 영어
  supportedLanguages: ['en', 'ko'],
  
  // 언어 리소스
  strings: {
    'en': {
      // 메인 UI
      'score': 'Score',
      'ammo': 'Ammo',
      'timeLeft': 'Time Left',
      'seconds': 'sec',
      'settings': 'Settings',
      'health': 'Health',
      
      // 타겟 설명
      'tipTitle': 'Controls',
      'tipControls': 'WASD to move, Mouse to aim, Click to shoot',
      'tipTargets': 'Red: Standard (10pts) | Gold: Bonus (25pts) | Green: Penalty (-15pts)',
      
      // 시작 화면
      'gameTitle': 'FPS Game',
      'comboBenefit': 'Get combo points with consecutive hits!',
      'startButton': 'Start Game',
      
      // 설정 화면 - 공통
      'settingsTitle': 'Settings',
      'settingsAutoSave': 'All settings are applied immediately.',
      'returnToGame': 'Return to Game',
      
      // 설정 화면 - 언어 설정
      'languageSettings': 'Language Settings',
      'language': 'Language',
      
      // 설정 화면 - 조작 설정 (PC)
      'controlSettings': 'Keyboard Controls',
      'forwardMove': 'Move Forward',
      'backwardMove': 'Move Backward',
      'leftMove': 'Move Left',
      'rightMove': 'Move Right',
      'jump': 'Jump',
      'reload': 'Reload',
      
      // 설정 화면 - 모바일 설정
      'mobileSettings': 'Touch Controls',
      'touchSensitivity': 'Touch Sensitivity',
      
      // 설정 화면 - 소리 설정
      'audioSettings': 'Audio Settings',
      'musicVolume': 'Music Volume',
      'sfxVolume': 'SFX Volume',
      
      // 게임 종료 화면
      'gameOver': 'Game Over',
      'finalScore': 'Final Score',
      'restartButton': 'Restart',
      
      // 모바일 컨트롤
      'shoot': 'Shoot',
      
      // GitHub 타겟
      'secretTarget': '🎯 You found a secret target! 🎯',
      'githubDescription': 'Click the link below to see the game source code:',
      'visitRepo': 'Visit GitHub Repository',
      'returnToGame': 'Return to Game',
      
      // 공간 반향 설정 (새로 추가)
      'advancedAudioSettings': 'Advanced Audio Settings',
      'spatialReverb': 'Spatial Reverb',
      'spatialReverbHint': 'Sound reflections from walls',
      'reverbQuality': 'Reverb Quality',
      'qualityLow': 'Low',
      'qualityMedium': 'Medium',
      'qualityHigh': 'High',

      // BGM 관련 문자열
      'bgmSettings': 'Background Music Settings',
      'bgmEnabled': 'Enable BGM',
      'bgmEnabledHint': 'Turn on game background music',
      'dynamicBgm': 'Dynamic BGM',
      'dynamicBgmHint': 'Change music based on combo state',
      'crossfadeDuration': 'Crossfade Duration',
      'crossfade0.5': '0.5 sec (Fast)',
      'crossfade1.0': '1 second',
      'crossfade2.0': '2 seconds (Default)',
      'crossfade3.0': '3 seconds',
      'crossfade5.0': '5 seconds (Slow)',
      'bgmTest': 'BGM Track Test:',
      'bgmmenu': 'Menu BGM',
      'bgmgameplay': 'Gameplay BGM',
      'bgmintense': 'Intense BGM',
      'bgmvictory': 'Victory BGM',
      'bgmgameover': 'Game Over BGM',

      'bulletPhysicsSettings': 'Bullet Physics Settings',
      'enableBulletPhysics': 'Enable Bullet Physics',
      'maxBounces': 'Maximum Bounces',
      'showBulletTrail': 'Show Bullet Trail'
    },
    'ko': {
      // 메인 UI
      'score': '점수',
      'ammo': '탄약',
      'timeLeft': '남은 시간',
      'seconds': '초',
      'settings': '설정',
      'health': '체력',
      
      // 타겟 설명
      'tipTitle': '조작법',
      'tipControls': 'WASD로 이동, 마우스로 조준, 클릭으로 발사',
      'tipTargets': '빨간색: 일반 (10점) | 금색: 보너스 (25점) | 녹색: 페널티 (-15점)',
      
      // 시작 화면
      'gameTitle': 'FPS 게임',
      'comboBenefit': '연속 타격으로 콤보 점수를 얻으세요!',
      'startButton': '게임 시작',
      
      // 설정 화면 - 공통
      'settingsTitle': '설정',
      'settingsAutoSave': '모든 설정은 즉시 적용됩니다.',
      'returnToGame': '게임으로 돌아가기',
      
      // 설정 화면 - 언어 설정
      'languageSettings': '언어 설정',
      'language': '언어',
      
      // 설정 화면 - 조작 설정 (PC)
      'controlSettings': '키보드 조작',
      'forwardMove': '앞으로 이동',
      'backwardMove': '뒤로 이동',
      'leftMove': '왼쪽 이동',
      'rightMove': '오른쪽 이동',
      'jump': '점프',
      'reload': '재장전',
      
      // 설정 화면 - 모바일 설정
      'mobileSettings': '터치 조작',
      'touchSensitivity': '터치 감도',
      
      // 설정 화면 - 소리 설정
      'audioSettings': '소리 설정',
      'musicVolume': '음악 볼륨',
      'sfxVolume': '효과음 볼륨',
      
      // 게임 종료 화면
      'gameOver': '게임 종료',
      'finalScore': '최종 점수',
      'restartButton': '다시 시작',
      
      // 모바일 컨트롤
      'shoot': '발사',
      
      // GitHub 타겟
      'secretTarget': '🎯 비밀 타겟을 발견하셨습니다! 🎯',
      'githubDescription': '게임 소스 코드를 확인하려면 아래 링크를 클릭하세요:',
      'visitRepo': 'GitHub 저장소 방문하기',
      'returnToGame': '게임으로 돌아가기',
      
      // 공간 반향 설정 (새로 추가)
      'advancedAudioSettings': '고급 오디오 설정',
      'spatialReverb': '공간 반향',
      'spatialReverbHint': '벽에서 반사되는 소리 효과',
      'reverbQuality': '반향 품질',
      'qualityLow': '낮음',
      'qualityMedium': '중간',
      'qualityHigh': '높음',

      // BGM 관련 문자열
      'bgmSettings': '배경 음악 설정',
      'bgmEnabled': 'BGM 활성화',
      'bgmEnabledHint': '게임 배경 음악 켜기',
      'dynamicBgm': '동적 BGM',
      'dynamicBgmHint': '콤보 상태에 따라 BGM 변경',
      'crossfadeDuration': '크로스페이드 시간',
      'crossfade0.5': '0.5초 (빠름)',
      'crossfade1.0': '1초',
      'crossfade2.0': '2초 (기본)',
      'crossfade3.0': '3초',
      'crossfade5.0': '5초 (느림)',
      'bgmTest': 'BGM 트랙 테스트:',
      'bgmmenu': '메뉴 BGM',
      'bgmgameplay': '게임플레이 BGM',
      'bgmintense': '인텐스 BGM',
      'bgmvictory': '승리 BGM',
      'bgmgameover': '게임오버 BGM',

      'bulletPhysicsSettings': '총알 물리 설정',
      'enableBulletPhysics': '총알 물리 활성화',
      'maxBounces': '최대 튕김 횟수',
      'showBulletTrail': '총알 궤적 표시'
    }
  },
  
  /**
   * 초기화 함수 - 브라우저 언어를 감지하고 지원되는 언어로 설정
   */
  init() {
    // 로컬 스토리지에 저장된 언어 설정 확인
    const savedLang = localStorage.getItem('gameLanguage');
    
    if (savedLang && this.supportedLanguages.includes(savedLang)) {
      this.currentLanguage = savedLang;
    } else {
      // 브라우저 언어 감지
      const browserLang = navigator.language.split('-')[0]; // 'ko-KR'에서 'ko'만 추출
      
      // 지원하는 언어인지 확인하고 설정
      if (this.supportedLanguages.includes(browserLang)) {
        this.currentLanguage = browserLang;
      } else {
        this.currentLanguage = 'en'; // 기본값은 영어
      }
      
      // 설정 저장
      localStorage.setItem('gameLanguage', this.currentLanguage);
    }
    
    console.log(`Language set to: ${this.currentLanguage}`);
  },
  
  /**
   * 텍스트 가져오기 함수 - 현재 언어에 맞는 텍스트 반환
   * @param {string} key - 텍스트 키
   * @return {string} - 번역된 텍스트
   */
  getText(key) {
    // 현재 언어로 텍스트 조회
    if (this.strings[this.currentLanguage] && this.strings[this.currentLanguage][key]) {
      return this.strings[this.currentLanguage][key];
    }
    
    // 번역이 없을 경우 영어로 폴백
    if (this.strings['en'] && this.strings['en'][key]) {
      return this.strings['en'][key];
    }
    
    // 영어 번역도 없을 경우 키 그대로 반환
    return key;
  },
  
  /**
   * 언어 변경 함수
   * @param {string} lang - 변경할 언어 코드 ('en', 'ko')
   */
  setLanguage(lang) {
    if (this.supportedLanguages.includes(lang)) {
      this.currentLanguage = lang;
      localStorage.setItem('gameLanguage', lang);
      
      // DOM이 완전히 로드된 경우에만 텍스트 업데이트
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        this.updateAllTexts();
      }
      
      return true;
    }
    return false;
  },
  
  /**
   * 페이지 내 모든 i18n 텍스트 요소 업데이트
   */
  updateAllTexts() {
    // data-i18n 속성을 가진 모든 요소를 찾아 텍스트 업데이트
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.getText(key);
    });
    
    // 특별한 규칙이 필요한 동적 요소들 (placeholder 등)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = this.getText(key);
    });
    
    // 동적으로 생성된 UI 요소 업데이트를 위한 이벤트 발생
    const event = new CustomEvent('localizationUpdated', {
      detail: { language: this.currentLanguage }
    });
    document.dispatchEvent(event);
  },
  
  /**
   * 동적으로 생성된 텍스트 요소에 번역 적용
   * @param {HTMLElement} element - 텍스트를 적용할 HTML 요소
   * @param {string} key - 텍스트 키
   */
  applyToElement(element, key) {
    if (element) {
      element.textContent = this.getText(key);
    }
  }
};
