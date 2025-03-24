// SpatialAudioSystem.js - 로더
// 분리된 모듈을 로드하는 로더 스크립트로 변환

(function() {
  console.log('SpatialAudioSystem 로더 시작...');
  
  // 모듈 파일 목록
  var moduleFiles = [
    'js/audio/SpatialAudio/RoomAnalyzer.js',
    'js/audio/SpatialAudio/ReverbCalculator.js',
    'js/audio/SpatialAudio/AudioDebugVisualizer.js',
    'js/audio/SpatialAudio/DirectionalAudio.js',
    'js/audio/SpatialAudio/SpatialAudioSystem.js'
  ];
  
  // 모듈 로드 함수
  function loadModules(index) {
    if (index >= moduleFiles.length) {
      // 모든 모듈 로드 완료
      console.log('모든 SpatialAudio 모듈 로드 완료');
      if (window.SpatialAudioSystem && typeof SpatialAudioSystem.init === 'function') {
        console.log('SpatialAudioSystem 초기화 시작...');
        SpatialAudioSystem.init();
        
        // AudioManager 확장
        if (window.AudioManager && typeof SpatialAudioSystem.enhanceAudioManager === 'function') {
          SpatialAudioSystem.enhanceAudioManager();
        }
      }
      return;
    }
    
    var script = document.createElement('script');
    script.src = moduleFiles[index];
    script.onload = function() {
      // 다음 모듈 로드
      loadModules(index + 1);
    };
    script.onerror = function(e) {
      console.error('모듈 로드 실패:', moduleFiles[index], e);
      // 실패해도 다음 모듈 시도
      loadModules(index + 1);
    };
    
    document.head.appendChild(script);
  }
  
  // 모듈 로딩 시작
  loadModules(0);
})();
