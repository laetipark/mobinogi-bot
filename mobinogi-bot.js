/**
 * Entry bootstrap.
 * 실제 기능 구현은 node_modules/mobinogi-bot-runtime.js 로 분리한다.
 */

/**
 * 스크립트 이름.
 * @type {string}
 */
const scriptName = "mobinogi-bot";

/**
 * Runtime 모듈 로드 시 BotManager 리스너가 등록된다.
 */
require("mobinogi-bot-runtime");
