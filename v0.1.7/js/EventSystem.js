/**
 * EventSystem.js - 게임 모듈 간 통신을 위한 이벤트 시스템
 *
 * 각 게임 모듈 간 통신을 위한 이벤트 기반 통신 시스템을 구현합니다.
 * 이 시스템을 통해 모듈 간의 느슨한 결합(loose coupling)을 유지하며
 * 효율적인 통신이 가능합니다.
 */
const EventSystem = {
  events: {},

  /**
   * 이벤트에 리스너 등록
   * @param {string} eventName - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   * @param {Object} context - 콜백 함수 내부의 this 값(선택 사항)
   */
  on(eventName, callback, context = null) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push({
      callback,
      context
    });

    return this; // 메서드 체이닝을 위해 반환
  },

  /**
   * 이벤트 리스너 제거
   * @param {string} eventName - 이벤트 이름
   * @param {Function} callback - 제거할 콜백 함수(선택 사항)
   * @param {Object} context - 제거할 콘텍스트(선택 사항)
   */
  off(eventName, callback = null, context = null) {
    // 이벤트가 없으면 무시
    if (!this.events[eventName]) return this;

    // 콜백이 주어지지 않았으면 이벤트의 모든 리스너 제거
    if (!callback) {
      delete this.events[eventName];
      return this;
    }

    // 특정 콜백(과 선택적으로 컨텍스트)와 일치하는 리스너만 제거
    this.events[eventName] = this.events[eventName].filter(listener => {
      return callback !== listener.callback ||
             (context && context !== listener.context);
    });

    return this;
  },

  /**
   * 이벤트 발생
   * @param {string} eventName - 이벤트 이름
   * @param {...any} args - 리스너에 전달할 인자들
   */
  emit(eventName, ...args) {
    // 이벤트가 없으면 무시
    if (!this.events[eventName]) return this;

    // 모든 리스너에게 이벤트 전달
    this.events[eventName].forEach(listener => {
      listener.callback.apply(listener.context, args);
    });

    return this;
  },

  /**
   * 한 번만 실행되는 이벤트 리스너 등록
   * @param {string} eventName - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   * @param {Object} context - 콜백 함수 내부의 this 값(선택 사항)
   */
  once(eventName, callback, context = null) {
    const onceCallback = (...args) => {
      this.off(eventName, onceCallback);
      callback.apply(context, args);
    };

    return this.on(eventName, onceCallback);
  },

  /**
   * 특정 이벤트에 등록된 모든 리스너 제거
   * @param {string} eventName - 이벤트 이름 (선택 사항)
   */
  clear(eventName = null) {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }

    return this;
  },

  /**
   * 특정 이벤트에 등록된 리스너 수 반환
   * @param {string} eventName - 이벤트 이름
   * @return {number} 리스너 수
   */
  listenerCount(eventName) {
    return this.events[eventName] ? this.events[eventName].length : 0;
  },

  /**
   * 등록된 모든 이벤트 이름 목록 반환
   * @return {Array<string>} 이벤트 이름 배열
   */
  eventNames() {
    return Object.keys(this.events);
  },

  /**
   * 디버깅을 위한 현재 이벤트 상태 로깅
   */
  debug() {
    console.group('EventSystem Debug:');

    const eventNames = this.eventNames();
    console.log(`Total registered events: ${eventNames.length}`);

    eventNames.forEach(name => {
      console.group(`Event: ${name}`);
      console.log(`Listeners: ${this.listenerCount(name)}`);
      console.groupEnd();
    });

    console.groupEnd();
    return this;
  }
};
