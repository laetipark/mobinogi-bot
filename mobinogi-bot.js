/**
 * Runtime entry for messenger bot.
 * 서비스/라우터 팩토리를 이 파일에 인라인해 런타임 wiring과 함께 관리한다.
 */

/**
 * 스크립트 이름.
 * @type {string}
 */
const scriptName = "mobinogi-bot";

/**
 * API/유틸 모듈.
 * @type {object}
 */
const mobinogiUtil = require("mobinogi-api-client");

/**
 * 정적 텍스트/명령어 메타 모듈.
 * @type {object}
 */
const staticText = require("bot-static-text");

/**
 * Java I/O 클래스 캐시.
 * - 런타임 시작 시 1회만 초기화해 하위 모듈에서 재사용한다.
 * @type {object|null}
 */
const javaIo = (() => {
	try{
		return {
			File : Packages.java.io.File,
			FileReader : Packages.java.io.FileReader,
			FileWriter : Packages.java.io.FileWriter,
			BufferedReader : Packages.java.io.BufferedReader,
			BufferedWriter : Packages.java.io.BufferedWriter
		};
	}catch(e){
		console.error("[runtime] Java I/O classes are unavailable: " + e);
		return null;
	}
})();

/**
 * 현재 봇 인스턴스.
 * @type {object}
 */
const bot = BotManager.getCurrentBot();

/**
 * 명령어 메타데이터 사전.
 * @type {object}
 */
const commandList = staticText.commandList;

/**
 * 더보기 펼침용 zero-width space 텍스트.
 * @type {string}
 */
const seeAllViewText = "\u200b".repeat(staticText.seeAllViewRepeatCount);

/**
 * 주요 채팅방 목록.
 * @type {string[]}
 */
let chatRoomList = ["guild_sexy", "guild_sexy_announce"];
	// ["test1", "test2"];

/**
 * 개발 테스트용 채팅방.
 * @type {string}
 */
let devRoom = "test";

/**
 * 새벽 공지 제한 시작 시각(시).
 * @type {number}
 */
const dawnQuietStartHour = 0;

/**
 * 새벽 공지 제한 종료 시각(시).
 * @type {number}
 */
const dawnQuietEndHour = 6;

/**
 * 공지방 판별 키워드.
 * @type {string}
 */
const announceRoomKeyword = "_announce";

/**
 * 게임 이벤트/공지 스냅샷 저장 파일 경로.
 * @type {string}
 */
const gameFeedSnapshotFilePath = (() => {
	try{
		if(typeof FileStream !== "undefined" && FileStream && typeof FileStream.getSdcardPath === "function"){
			return `${FileStream.getSdcardPath()}/VESTA/game-feed-watch-snapshot.json`;
		}
	}catch(e){
	}
	return "/sdcard/VESTA/game-feed-watch-snapshot.json";
})();

/**
 * 개발자 고정 안내 문구.
 * @type {string}
 */
let devMessage = staticText.devMessage;


/**
 * 심구/어구 알림 서비스 팩토리.
 * @param {object} options
 * @param {object} options.bot
 * @param {object} options.mobinogiUtil
 * @param {object} options.staticText
 * @param {string[]} options.chatRoomList
 * @param {string} options.announceRoomKeyword
 * @param {number} options.dawnQuietStartHour
 * @param {number} options.dawnQuietEndHour
 * @returns {object}
 */
function createHoleAlarmService(options){
	/**
	 * 봇 전송 객체.
	 * @type {object}
	 */
	const bot = options.bot;
	
	/**
	 * API 유틸 모듈.
	 * @type {object}
	 */
	const mobinogiUtil = options.mobinogiUtil;
	
	/**
	 * 정적 텍스트 모듈.
	 * @type {object}
	 */
	const staticText = options.staticText;
	
	/**
	 * 알림 송신 대상 채팅방 목록.
	 * @type {string[]}
	 */
	const chatRoomList = options.chatRoomList;
	
	/**
	 * 명령 실행 room이 브로드캐스트 대상인지 확인한다.
	 * - 관리방 목록 정확 일치
	 * - 테스트방(`test1`, `test2`)은 강제 허용
	 * @param {string|null|undefined} room
	 * @returns {boolean}
	 */
	function shouldBroadcastFromRoom(room){
		if(room == null){
			return false;
		}
		const roomText = `${room}`.trim();
		if(!roomText){
			return false;
		}
		if(roomText === "test1" || roomText === "test2"){
			return true;
		}
		return chatRoomList.indexOf(roomText) > -1 || chatRoomList.includes(roomText);
	}
	
	/**
	 * 공지방 판별 키워드.
	 * @type {string}
	 */
	const announceRoomKeyword = options.announceRoomKeyword;
	
	/**
	 * 새벽 공지 제한 시작 시각(시).
	 * @type {number}
	 */
	const dawnQuietStartHour = options.dawnQuietStartHour;
	
	/**
	 * 새벽 공지 제한 종료 시각(시).
	 * @type {number}
	 */
	const dawnQuietEndHour = options.dawnQuietEndHour;
	
	/**
	 * 심구 지역 목록.
	 * @type {object}
	 */
	const regionList = staticText.regionList;
	
	/**
	 * 더보기 펼침용 zero-width space 텍스트.
	 * @type {string}
	 */
	const seeAllViewText = "\u200b".repeat(staticText.seeAllViewRepeatCount);
	
	/**
	 * 심구 추가 안내 텍스트.
	 * @type {string}
	 */
	const deepHoleTip = staticText.deepHoleTip;
	
	/**
	 * 어구 추가 안내 텍스트.
	 * @type {string}
	 */
	const abyssHoleTip = staticText.abyssHoleTip;
	
	/**
	 * 구멍 타입 상수.
	 * @type {object}
	 */
	const holeType = {
		deep : "DEEP",
		abyss : "ABYSS"
	};
	
	/**
	 * KST 시간대 오프셋(분).
	 * @type {number}
	 */
	const holeAlarmTimezoneOffsetMinutes = 9 * 60;
	
	/**
	 * 어구 오픈 지속 시간(분).
	 * @type {number}
	 */
	const abyssOpenDurationMinutes = 15;
	
	/**
	 * 어구 오픈 지속 시간(ms).
	 * @type {number}
	 */
	const abyssOpenDurationMs = abyssOpenDurationMinutes * 60 * 1000;
	
	/**
	 * 어구 1시간 전 알림 기준(ms).
	 * @type {number}
	 */
	const abyssOneHourNoticeLeadMs = 60 * 60 * 1000;
	
	/**
	 * 어구 자동 생성 간격(분).
	 * @type {number}
	 */
	const abyssRefillIntervalMinutes = (36 * 60) + 15;
	
	/**
	 * 어구 자동 생성 개수.
	 * @type {number}
	 */
	const abyssAutoGenerateCount = 10;
	
	/**
	 * 알림 엔트리 처리 주기(ms).
	 * @type {number}
	 */
	const holeAlarmCheckIntervalMs = 10000;
	
	/**
	 * 백엔드 동기화 주기(ms).
	 * @type {number}
	 */
	const holeAlarmSyncIntervalMs = 60000;
	
	/**
	 * 동기화 경계 감시 tick 주기(ms).
	 * @type {number}
	 */
	const holeAlarmSyncTickIntervalMs = 250;
	
	/**
	 * 로컬 알림 캐시 테이블.
	 * key: alarmId
	 * value: { data, isAbyssPreAlertSent }
	 * @type {object}
	 */
	let holeAlarmTable = {};
	
	/**
	 * 동기화 타이머 핸들.
	 * @type {object|null}
	 */
	let holeAlarmSyncTimer = null;
	
	/**
	 * 엔트리 처리 타이머 핸들.
	 * @type {object|null}
	 */
	let holeAlarmProcessTimer = null;
	
	/**
	 * 다음 동기화 경계 시각(ms).
	 * @type {number}
	 */
	let holeAlarmNextSyncBoundaryMs = 0;
	
	/**
	 * 동기화 루프 시작 여부.
	 * @type {boolean}
	 */
	let isHoleAlarmSyncStarted = false;
	
	/**
	 * 시작 로그 1회 출력 여부.
	 * @type {boolean}
	 */
	let isHoleAlarmSyncStartLogged = false;
	
	/**
	 * 마지막 1시간 전 알림 키(`alarmId:openTime`).
	 * @type {string}
	 */
	let abyssOneHourNoticeSentKey = "";
	
	/**
	 * 1시간 전 알림 잠금 종료 시각(ms).
	 * @type {number}
	 */
	let abyssOneHourNoticeActiveEndTimeMs = 0;
	
	/**
	 * 시각(ms)을 `HH:mm` 문자열로 변환한다.
	 * @param {number} time
	 * @returns {string}
	 */
	function getAlarmTime(time){
		const date = new Date(time);
		let h = date.getHours();
		let m = date.getMinutes();
		h = h < 10 ? `0${h}` : h;
		m = m < 10 ? `0${m}` : m;
		return `${h}:${m}`;
	}
	
	/**
	 * 시각(ms)을 `yyyy-mm-dd HH:mm` 문자열로 변환한다.
	 * @param {number} time
	 * @returns {string}
	 */
	function getAlarmDate(time){
		const date = new Date(time);
		return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
	}
	
	/**
	 * 입력 문자열과 지역명 간 공통 문자 개수를 계산한다.
	 * @param {string} input
	 * @param {string} regionName
	 * @param {number} minCount
	 * @returns {boolean}
	 */
	function hasCommonChars(input, regionName, minCount){
		const requiredCount = minCount || 2;
		let commonCount = 0;
		for(let i = 0 ; i < input.length ; i++){
			const char = input.charAt(i);
			if(regionName.indexOf(char) > -1){
				commonCount++;
			}
		}
		return commonCount >= requiredCount;
	}
	
	/**
	 * 심구 알림 헤더 문자열을 만든다.
	 * @param {number} holeCount
	 * @returns {string}
	 */
	function getDeepHoleHeader(holeCount){
		if(holeCount > 0){
			return `[심구알림] ${holeCount}심구 알림! 🕳️`;
		}
		return "[심구알림]";
	}
	
	/**
	 * 심구 알림 텍스트를 포맷한다.
	 * @param {object} alarm
	 * @param {string} alarm.regionName
	 * @param {string} alarm.time
	 * @param {number} alarm.holeCount
	 * @returns {string}
	 */
	function formatDeepHoleAlarm(alarm){
		const header = getDeepHoleHeader(alarm.holeCount || 0);
		return `${header}\n- "${alarm.regionName}"에 ${alarm.time}까지 열려있어요`;
	}
	
	/**
	 * 숫자를 두 자리 문자열로 패딩한다.
	 * @param {number} value
	 * @returns {string}
	 */
	function padNumber(value){
		return value < 10 ? `0${value}` : `${value}`;
	}
	
	/**
	 * 시각(ms)을 API 전송용 `yyyy-mm-ddTHH:mm:ss`로 변환한다.
	 * @param {number} time
	 * @returns {string}
	 */
	function toDateTimeText(time){
		const date = new Date(time);
		return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
	}
	
	/**
	 * 시각(ms)을 로그용 `yyyy-mm-dd HH:mm:ss`로 변환한다.
	 * @param {number} time
	 * @returns {string}
	 */
	function toDateTimeLogText(time){
		const date = new Date(time);
		return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
	}
	
	/**
	 * 날짜 문자열을 타임스탬프로 파싱한다.
	 * - KST 로컬 형식(`yyyy-mm-dd hh:mm[:ss]`) 우선
	 * - 그 외는 `Date` 기본 파서 사용
	 * @param {string} dateTimeText
	 * @returns {number|null}
	 */
	function parseDateTimeText(dateTimeText){
		// 입력값이 비어 있으면 파싱할 수 없다.
		if(!dateTimeText){
			return null;
		}
		
		// 공백 구분 입력은 ISO 형태와 맞추기 위해 `T`로 치환한다.
		const normalizedText = `${dateTimeText}`.trim().replace(" ", "T");
		const localMatch = normalizedText.match(
			/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d{1,3}))?$/
		);
		
		// 로컬 형식으로 매칭되면 KST 기준 UTC 밀리초를 직접 계산한다.
		if(localMatch){
			const year = Number(localMatch[1]);
			const month = Number(localMatch[2]) - 1;
			const day = Number(localMatch[3]);
			const hour = Number(localMatch[4]);
			const minute = Number(localMatch[5]);
			const second = localMatch[6] ? Number(localMatch[6]) : 0;
			const millisecond = localMatch[7] ? Number(localMatch[7]) : 0;
			const utcTime = Date.UTC(year, month, day, hour, minute, second, millisecond);
			const kstTime = utcTime - (holeAlarmTimezoneOffsetMinutes * 60 * 1000);
			return isNaN(kstTime) ? null : kstTime;
		}
		
		// 나머지 포맷은 런타임 기본 파서에 위임한다.
		const parsedTime = new Date(normalizedText).getTime();
		return isNaN(parsedTime) ? null : parsedTime;
	}
	
	/**
	 * 알림 행에서 종료 시각(ms)을 추출한다.
	 * @param {object} alarm
	 * @returns {number|null}
	 */
	function getAlarmMillisFromTableRow(alarm){
		if(!alarm){
			return null;
		}
		
		// 최신 필드(holeEndTime)를 최우선으로 사용한다.
		const holeEndTime = parseDateTimeText(alarm.holeEndTime);
		if(holeEndTime != null){
			return holeEndTime;
		}
		
		// 레거시 필드(deepHoleEndTime)도 호환 지원한다.
		const deepEndTime = parseDateTimeText(alarm.deepHoleEndTime);
		if(deepEndTime != null){
			return deepEndTime;
		}
		
		// 구형 abyssOpenTime만 있는 경우, 지속시간을 더해 종료 시각으로 환산한다.
		const legacyAbyssOpenTime = parseDateTimeText(alarm.abyssOpenTime);
		if(legacyAbyssOpenTime != null){
			return legacyAbyssOpenTime + abyssOpenDurationMs;
		}
		
		return null;
	}
	
	/**
	 * 알림 행에서 어구 오픈 시각(ms)을 추출한다.
	 * @param {object} alarm
	 * @returns {number|null}
	 */
	function getAbyssOpenMillisFromTableRow(alarm){
		// abyssOpenTime이 있으면 그대로 사용한다.
		const abyssOpenTime = parseDateTimeText(alarm && alarm.abyssOpenTime);
		if(abyssOpenTime != null){
			return abyssOpenTime;
		}
		
		// 없으면 종료 시각에서 지속시간을 역산한다.
		const endTime = getAlarmMillisFromTableRow(alarm);
		if(endTime == null){
			return null;
		}
		return endTime - abyssOpenDurationMs;
	}
	
	/**
	 * 알림 목록을 시각 오름차순으로 정렬한다.
	 * @param {object[]} alarms
	 * @returns {object[]}
	 */
	function sortHoleAlarms(alarms){
		return alarms.slice().sort((left, right) => {
			const leftTime = getAlarmMillisFromTableRow(left);
			const rightTime = getAlarmMillisFromTableRow(right);
			if(leftTime == null && rightTime == null){
				return (left.id || 0) - (right.id || 0);
			}
			if(leftTime == null){
				return 1;
			}
			if(rightTime == null){
				return -1;
			}
			return leftTime - rightTime;
		});
	}
	
	/**
	 * 백엔드에서 알림 목록을 조회한다.
	 * @param {string} typeName
	 * @returns {object[]}
	 */
	function fetchHoleAlarmsFromBackend(typeName){
		try{
			const result = mobinogiUtil.getHoleAlarms(typeName);
			if(result && result.success && Array.isArray(result.alarms)){
				return sortHoleAlarms(result.alarms);
			}
		}catch(e){
			console.error("[hole-alarm] Failed to fetch alarms: " + e);
		}
		return [];
	}
	
	/**
	 * 사용자 입력 지역명을 표준 지역명으로 정규화한다.
	 * @param {string} inputRegion
	 * @returns {string}
	 */
	function normalizeRegionName(inputRegion){
		if(!inputRegion){
			return "";
		}
		
		// 공통 문자 2개 이상 매칭을 기준으로 표준 지역명을 반환한다.
		return hasCommonChars(inputRegion, regionList.goddessGarden, 2) ? regionList.goddessGarden :
			hasCommonChars(inputRegion, regionList.iceCanyon, 2) ? regionList.iceCanyon :
				hasCommonChars(inputRegion, regionList.cloudWilderness, 2) ? regionList.cloudWilderness :
					hasCommonChars(inputRegion, regionList.senmaiPlain, 2) ? regionList.senmaiPlain : "";
	}
	
	/**
	 * 현재 시각이 새벽 공지 제한 시간인지 확인한다.
	 * @returns {boolean}
	 */
	function isInDawnQuietHours(){
		const hour = new Date().getHours();
		if(dawnQuietStartHour <= dawnQuietEndHour){
			return hour >= dawnQuietStartHour && hour < dawnQuietEndHour;
		}
		return hour >= dawnQuietStartHour || hour < dawnQuietEndHour;
	}
	
	/**
	 * 특정 채팅방 전송을 스킵해야 하는지 판단한다.
	 * @param {string} room
	 * @returns {boolean}
	 */
	function shouldSkipChatRoom(room){
		return isInDawnQuietHours() && room && room.indexOf(announceRoomKeyword) > -1;
	}
	
	/**
	 * 채팅방으로 메시지를 보낸다.
	 * @param {string} room
	 * @param {string} message
	 */
	function sendToChatRoom(room, message){
		// 조용 시간대의 공지방은 전송하지 않는다.
		if(!room){
			console.log("[hole-alarm] sendToChatRoom skipped: empty room");
			return;
		}
		if(shouldSkipChatRoom(room)){
			console.log(`[hole-alarm] sendToChatRoom skipped by dawn quiet hours: room=${room}`);
			return;
		}
		const text = message == null ? "" : `${message}`;
		const preview = text.replace(/\n/g, "\\n").substring(0, 80);
		try{
			const sendResult = bot.send(room, text);
			console.log(`[hole-alarm] sendToChatRoom: room=${room}, sendResult=${sendResult}, length=${text.length}, preview=${preview}`);
		}catch(e){
			console.error(`[hole-alarm] sendToChatRoom failed: room=${room}, length=${text.length}, error=${e}`);
		}
	}
	
	/**
	 * 등록된 모든 채팅방으로 메시지를 브로드캐스트한다.
	 * @param {string} message
	 */
	function broadcastToChatRooms(message){
		console.log(`[hole-alarm] broadcastToChatRooms: fromList=${JSON.stringify(chatRoomList)}, roomCount=${chatRoomList.length}`);
		for(let i = 0 ; i < chatRoomList.length ; i++){
			sendToChatRoom(chatRoomList[i], message);
		}
	}
	
	/**
	 * 테이블 행 기반 심구 알림을 포맷한다.
	 * @param {object} alarm
	 * @returns {string}
	 */
	function formatDeepHoleAlarmFromTable(alarm){
		const alarmTime = getAlarmMillisFromTableRow(alarm);
		return formatDeepHoleAlarm({
			regionName : alarm.regionName || "-",
			time : alarmTime ? getAlarmTime(alarmTime) : "-",
			holeCount : alarm.holeCount || 0
		});
	}
	
	/**
	 * 로컬 테이블의 특정 알림 엔트리를 제거한다.
	 * @param {number} alarmId
	 */
	function clearHoleAlarmEntry(alarmId){
		const alarm = holeAlarmTable[alarmId];
		if(!alarm){
			return;
		}
		delete holeAlarmTable[alarmId];
	}
	
	/**
	 * 특정 타입(DEEP/ABYSS)의 로컬 알림을 모두 제거한다.
	 * @param {string} typeName
	 */
	function clearLocalHoleAlarmsByType(typeName){
		Object.keys(holeAlarmTable).forEach((id) => {
			const alarm = holeAlarmTable[id];
			if(alarm && alarm.data && alarm.data.holeType === typeName){
				clearHoleAlarmEntry(Number(id));
			}
		});
	}
	
	/**
	 * 특정 지역의 로컬 심구 알림을 제거한다.
	 * @param {string} regionName
	 */
	function removeLocalDeepAlarmByRegion(regionName){
		Object.keys(holeAlarmTable).forEach((id) => {
			const alarm = holeAlarmTable[id];
			if(alarm && alarm.data && alarm.data.holeType === holeType.deep && alarm.data.regionName === regionName){
				clearHoleAlarmEntry(Number(id));
			}
		});
	}
	
	/**
	 * 로컬 테이블에서 어구 알림만 추출한다.
	 * @returns {object[]}
	 */
	function getAbyssAlarmsFromLocalTable(){
		const alarms = [];
		Object.keys(holeAlarmTable).forEach((id) => {
			const row = holeAlarmTable[id];
			if(row && row.data && row.data.holeType === holeType.abyss){
				alarms.push(row.data);
			}
		});
		return sortHoleAlarms(alarms);
	}
	
	/**
	 * 어구 10분 전 알림을 전송한다.
	 * @param {object} alarm
	 */
	function sendAbyssPreAlert(alarm){
		const openTime = getAbyssOpenMillisFromTableRow(alarm);
		const timeText = openTime ? getAlarmTime(openTime) : "-";
		broadcastToChatRooms(
			`[어구알림] 어비스로 뚫린 검은 구멍 열리기 10분 전입니다.\n` +
			` - 시간 : ${timeText}\n` +
			`${seeAllViewText}\n\n${abyssHoleTip}`
		);
	}
	
	/**
	 * 어구 1시간 이내 알림을 전송한다.
	 * @param {object} alarm
	 * @param {number} remainingMs
	 */
	function sendAbyssOneHourAlert(alarm, remainingMs){
		const openTime = getAbyssOpenMillisFromTableRow(alarm);
		const timeText = openTime ? getAlarmTime(openTime) : "-";
		const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
		broadcastToChatRooms(
			`[어구알림] 어비스로 뚫린 검은 구멍 오픈 1시간 이내입니다.\n` +
			` - 시간 : ${timeText}\n` +
			` - 남은 시간 : 약 ${remainingMinutes}분`
		);
	}
	
	/**
	 * 어구 오픈 알림을 전송한다.
	 * @param {object} alarm
	 */
	function sendAbyssOpenAlert(alarm){
		broadcastToChatRooms(
			`[어구알림] 어비스로 뚫린 검은 구멍이 열렸습니다.\n` +
			`${seeAllViewText}\n\n${abyssHoleTip}`
		);
	}
	
	/**
	 * 1시간 이내 어구 알림 대상을 찾는다.
	 * @param {object[]} alarms
	 * @param {number} now
	 * @returns {object}
	 */
	function findAbyssAlarmWithinOneHour(alarms, now){
		let targetAlarm = null;
		let targetOpenTime = null;
		let targetRemainingMs = null;
		let nearestFutureOpenTime = null;
		let nearestFutureRemainingMs = null;
		
		for(let i = 0 ; i < alarms.length ; i++){
			const alarm = alarms[i];
			if(!alarm || alarm.holeType !== holeType.abyss || alarm.id == null){
				continue;
			}
			
			const openTime = getAbyssOpenMillisFromTableRow(alarm);
			if(openTime == null){
				continue;
			}
			
			const remainingMs = openTime - now;
			if(remainingMs > 0 && (nearestFutureOpenTime == null || openTime < nearestFutureOpenTime)){
				nearestFutureOpenTime = openTime;
				nearestFutureRemainingMs = remainingMs;
			}
			
			const isWithinOneHour = remainingMs > 0 && remainingMs <= abyssOneHourNoticeLeadMs;
			if(!isWithinOneHour){
				continue;
			}
			
			if(targetOpenTime == null || openTime < targetOpenTime){
				targetAlarm = alarm;
				targetOpenTime = openTime;
				targetRemainingMs = remainingMs;
			}
		}
		
		return {
			alarm : targetAlarm,
			openTime : targetOpenTime,
			remainingMs : targetRemainingMs,
			nearestFutureOpenTime,
			nearestFutureRemainingMs
		};
	}
	
	/**
	 * 어구 1시간 전 알림 전송 여부를 처리한다.
	 * @param {object[]} alarms
	 */
	function processAbyssOneHourNotices(alarms){
		const now = new Date().getTime();
		
		// 잠금 만료 시 키를 초기화해 다음 스케줄을 다시 알릴 수 있게 한다.
		if(abyssOneHourNoticeActiveEndTimeMs > 0 && now >= abyssOneHourNoticeActiveEndTimeMs){
			console.log(`[hole-alarm] Abyss notice lock released at endTime=${toDateTimeLogText(abyssOneHourNoticeActiveEndTimeMs)}`);
			abyssOneHourNoticeSentKey = "";
			abyssOneHourNoticeActiveEndTimeMs = 0;
		}
		
		// 잠금 구간에서는 중복 전송을 막기 위해 종료한다.
		if(abyssOneHourNoticeActiveEndTimeMs > now){
			return;
		}
		
		const target = findAbyssAlarmWithinOneHour(alarms, now);
		if(!target.alarm || target.openTime == null || target.remainingMs == null){
			const abyssCount = alarms.filter((alarm) => alarm && alarm.holeType === holeType.abyss).length;
			if(abyssCount > 0){
				const nearestText = target.nearestFutureOpenTime == null ?
					"nearestOpen=-" :
					`nearestOpen=${toDateTimeLogText(target.nearestFutureOpenTime)}, nearestRemainingMinutes=${Math.ceil(target.nearestFutureRemainingMs / (60 * 1000))}`;
				console.log(`[hole-alarm] No abyss within 60m. now=${toDateTimeLogText(now)}, abyssCount=${abyssCount}, ${nearestText}`);
			}
			return;
		}
		
		// 같은 어구 오픈 시각에 대해서는 1회만 알리도록 키를 구성한다.
		const nextNoticeKey = `${target.alarm.id}:${target.openTime}`;
		if(abyssOneHourNoticeSentKey !== nextNoticeKey){
			const alarmEndTime = getAlarmMillisFromTableRow(target.alarm);
			const lockEndTime = alarmEndTime == null ? (target.openTime + abyssOpenDurationMs) : alarmEndTime;
			console.log(
				`[hole-alarm] Found abyss within 60m: id=${target.alarm.id}, openTime=${toDateTimeLogText(target.openTime)}, remainingMinutes=${Math.ceil(target.remainingMs / (60 * 1000))}, lockUntil=${toDateTimeLogText(lockEndTime)}`
			);
			sendAbyssOneHourAlert(target.alarm, target.remainingMs);
			abyssOneHourNoticeSentKey = nextNoticeKey;
			abyssOneHourNoticeActiveEndTimeMs = lockEndTime;
		}
	}
	
	/**
	 * 알림을 consume 처리하고 로컬 캐시를 정리한다.
	 * @param {number} alarmId
	 */
	function consumeHoleAlarmEntry(alarmId){
		try{
			// consume 결과로 생성된 후속 스케줄이 있으면 로컬 테이블에 반영한다.
			const result = mobinogiUtil.consumeHoleAlarm(alarmId);
			clearHoleAlarmEntry(alarmId);
			if(result && result.success && Array.isArray(result.generated)){
				for(let i = 0 ; i < result.generated.length ; i++){
					registerHoleAlarmEntry(result.generated[i]);
				}
			}
		}catch(e){
			console.error("[hole-alarm] Failed to consume alarm: " + e);
			clearHoleAlarmEntry(alarmId);
		}
	}
	
	/**
	 * 단일 알림 엔트리를 처리한다.
	 * @param {number} alarmId
	 */
	function processHoleAlarmEntry(alarmId){
		const row = holeAlarmTable[alarmId];
		if(!row || !row.data){
			return;
		}
		
		const alarm = row.data;
		const targetTime = getAlarmMillisFromTableRow(alarm);
		if(!targetTime){
			return;
		}
		
		const now = new Date().getTime();
		if(alarm.holeType === holeType.deep){
			// 심구는 종료 시각이 지나면 바로 consume 처리한다.
			if(now >= targetTime){
				consumeHoleAlarmEntry(alarmId);
			}
			return;
		}
		
		const abyssOpenTime = getAbyssOpenMillisFromTableRow(alarm);
		if(abyssOpenTime == null){
			return;
		}
		
		// 오픈 10분 전에 1회 사전 알림을 전송한다.
		const preAlertTime = abyssOpenTime - (10 * 60 * 1000);
		if(!row.isAbyssPreAlertSent && now >= preAlertTime && now < abyssOpenTime){
			sendAbyssPreAlert(alarm);
			row.isAbyssPreAlertSent = true;
		}
		
		// 오픈 시각이 되면 오픈 알림을 보내고 consume 처리한다.
		if(now >= abyssOpenTime){
			sendAbyssOpenAlert(alarm);
			consumeHoleAlarmEntry(alarmId);
		}
	}
	
	/**
	 * 로컬 테이블의 모든 알림 엔트리를 처리한다.
	 */
	function processAllHoleAlarmEntries(){
		const alarmIds = Object.keys(holeAlarmTable);
		for(let i = 0 ; i < alarmIds.length ; i++){
			processHoleAlarmEntry(Number(alarmIds[i]));
		}
	}
	
	/**
	 * 알림 처리 타이머를 보장한다.
	 */
	function ensureHoleAlarmProcessTimer(){
		if(holeAlarmProcessTimer){
			return;
		}
		
		holeAlarmProcessTimer = setInterval(() => {
			try{
				processAllHoleAlarmEntries();
			}catch(e){
				console.error("[hole-alarm] Failed to process alarm entries: " + e);
			}
		}, holeAlarmCheckIntervalMs);
	}
	
	/**
	 * 알림 엔트리를 로컬 테이블에 등록한다.
	 * @param {object} alarm
	 */
	function registerHoleAlarmEntry(alarm){
		if(!alarm || alarm.id == null){
			return;
		}
		
		const alarmId = Number(alarm.id);
		if(isNaN(alarmId)){
			return;
		}
		
		const previous = holeAlarmTable[alarmId];
		holeAlarmTable[alarmId] = {
			data : alarm,
			isAbyssPreAlertSent : previous ? previous.isAbyssPreAlertSent : false
		};
		
		// 신규 등록 직후에도 즉시 처리 조건을 한 번 검사한다.
		processHoleAlarmEntry(alarmId);
	}
	
	/**
	 * 백엔드 상태로 로컬 테이블을 동기화한다.
	 */
	function syncHoleAlarmTable(){
		const alarms = fetchHoleAlarmsFromBackend();
		const syncedIdMap = {};
		
		// 백엔드 기준 목록을 로컬 캐시에 반영한다.
		for(let i = 0 ; i < alarms.length ; i++){
			const alarm = alarms[i];
			syncedIdMap[alarm.id] = true;
			registerHoleAlarmEntry(alarm);
		}
		
		// 백엔드에서 사라진 엔트리는 로컬에서도 제거한다.
		Object.keys(holeAlarmTable).forEach((id) => {
			if(!syncedIdMap[id]){
				clearHoleAlarmEntry(Number(id));
			}
		});
		
		// 동기화 시점마다 1시간 전 어구 알림 발송 조건을 검사한다.
		processAbyssOneHourNotices(getAbyssAlarmsFromLocalTable());
	}
	
	/**
	 * 알림 동기화 루프를 시작한다.
	 */
	function startHoleAlarmSync(){
		if(!isHoleAlarmSyncStartLogged){
			console.log("[hole-alarm] startHoleAlarmSync started.");
			isHoleAlarmSyncStartLogged = true;
		}
		
		// 기존 타이머가 있으면 교체해 중복 루프를 막는다.
		if(holeAlarmSyncTimer){
			clearInterval(holeAlarmSyncTimer);
		}
		ensureHoleAlarmProcessTimer();
		
		// 시작 직후 1회 즉시 동기화한다.
		try{
			syncHoleAlarmTable();
		}catch(e){
			console.error("[hole-alarm] Failed to run initial sync: " + e);
		}
		
		// 다음 분 경계 시각을 계산해 정시 동기화를 보장한다.
		const nowMs = new Date().getTime();
		holeAlarmNextSyncBoundaryMs = nowMs - (nowMs % holeAlarmSyncIntervalMs) + holeAlarmSyncIntervalMs;
		console.log("[hole-alarm] minute sync armed at " + toDateTimeText(holeAlarmNextSyncBoundaryMs));
		
		holeAlarmSyncTimer = setInterval(() => {
			try{
				const currentTime = new Date().getTime();
				if(currentTime < holeAlarmNextSyncBoundaryMs){
					return;
				}
				
				syncHoleAlarmTable();
				do{
					holeAlarmNextSyncBoundaryMs += holeAlarmSyncIntervalMs;
				}while(holeAlarmNextSyncBoundaryMs <= currentTime);
			}catch(e){
				console.error("[hole-alarm] Failed to run minute sync: " + e);
			}
		}, holeAlarmSyncTickIntervalMs);
	}
	
	/**
	 * `/어구` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string} room
	 * @param {string[]} args
	 */
	function handleAbyssHoleCommand(msg, room, args){
		const canRequestBackend = shouldBroadcastFromRoom(room);
		if(!canRequestBackend){
			console.log(`[hole-alarm][어구] skip backend request: room=${room}, args=${JSON.stringify(args)}`);
			return;
		}
		
		const minutes = Number(args[0]);
		if(!isNaN(minutes)){
			// 분 입력은 양수만 허용한다.
			if(minutes <= 0){
				msg.reply(staticText.getAbyssHoleUsageText());
				return;
			}
			
			const currentAbyssAlarms = fetchHoleAlarmsFromBackend(holeType.abyss);
			let deletedCount = 0;
			const openTime = new Date().getTime() + (minutes * 60 * 1000);
			
			try{
				// 기존 어구 스케줄은 먼저 정리하고 새 일정으로 재등록한다.
				if(currentAbyssAlarms.length > 0){
					const clearResult = mobinogiUtil.clearAbyssHoleAlarms();
					if(!clearResult || !clearResult.success){
						throw new Error("clearAbyssAlarms failed.");
					}
					clearLocalHoleAlarmsByType(holeType.abyss);
					abyssOneHourNoticeSentKey = "";
					abyssOneHourNoticeActiveEndTimeMs = 0;
					deletedCount = clearResult.deletedCount || currentAbyssAlarms.length;
				}
				
				const createResult = mobinogiUtil.createAbyssHoleAlarm(toDateTimeText(openTime));
				if(!createResult || !createResult.success || !createResult.alarm){
					throw new Error("createAbyssHoleAlarm failed.");
				}
				
				registerHoleAlarmEntry(createResult.alarm);
				const generated = Array.isArray(createResult.generated) ? createResult.generated : [];
				for(let i = 0 ; i < generated.length ; i++){
					registerHoleAlarmEntry(generated[i]);
				}
				
				const createText =
					`[어구알림] ${getAlarmTime(openTime)}에 열려요\n` +
					` - 자동 예약: ${generated.length}개 추가 (기본 ${abyssAutoGenerateCount}개/ ${abyssRefillIntervalMinutes}분 간격)` +
					`${deletedCount > 0 ? `\n - 기존 일정: ${deletedCount}개 삭제 후 재설정` : ""}`;
				
				// 관리 채팅방에서 실행한 경우에만 전체 브로드캐스트한다.
				const isBroadcastTargetRoom = shouldBroadcastFromRoom(room);
				console.log(`[hole-alarm][어구] room=${room}, isBroadcastTargetRoom=${isBroadcastTargetRoom}, chatRoomList=${JSON.stringify(chatRoomList)}`);
				if(isBroadcastTargetRoom){
					broadcastToChatRooms(`${createText}${seeAllViewText}\n\n${abyssHoleTip}`);
				}
			}catch(e){
				console.error("[hole-alarm] Failed to create abyss alarm: " + e);
				msg.reply("[어구알림] 어구 알림 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
			}
			return;
		}
		
		if(args[0] === "확인"){
			const currentAbyssAlarms = fetchHoleAlarmsFromBackend(holeType.abyss);
			if(currentAbyssAlarms.length === 0){
				msg.reply("[어구알림] 어구 정보가 없습니다.\n" +
					staticText.getAbyssHoleUsageBodyText()
				);
				return;
			}
			
			let output = `[어구알림] 등록된 일정 (${currentAbyssAlarms.length}개)\n`;
			const previewCount = Math.min(currentAbyssAlarms.length, 10);
			for(let i = 0 ; i < previewCount ; i++){
				const alarm = currentAbyssAlarms[i];
				const time = getAbyssOpenMillisFromTableRow(alarm);
				output += `- ${time ? getAlarmDate(time) : "-"}\n`;
			}
			if(currentAbyssAlarms.length > previewCount){
				output += `- ... 외 ${currentAbyssAlarms.length - previewCount}개`;
			}
			
			msg.reply(`${output}${seeAllViewText}\n\n${abyssHoleTip}`);
			return;
		}
		
		if(args[0] === "삭제"){
			try{
				const result = mobinogiUtil.clearAbyssHoleAlarms();
				clearLocalHoleAlarmsByType(holeType.abyss);
				abyssOneHourNoticeSentKey = "";
				abyssOneHourNoticeActiveEndTimeMs = 0;
				const deletedCount = result && result.success ? (result.deletedCount || 0) : 0;
				msg.reply(`[어구알림] 어구 정보 ${deletedCount}개를 삭제했어요.`);
			}catch(e){
				console.error("[hole-alarm] Failed to clear abyss alarms: " + e);
				msg.reply("[어구알림] 어구 정보 삭제에 실패했습니다.");
			}
			return;
		}
		
		msg.reply(staticText.getAbyssHoleUsageText());
	}
	
	/**
	 * `/심구`, `/2심구`, `/3심구` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string} room
	 * @param {string[]} args
	 * @param {number} holeCount
	 */
	function handleDeepHoleCommand(msg, room, args, holeCount){
		console.log(`[hole-alarm][심구][entry] room=${room}, args=${JSON.stringify(args)}, holeCount=${holeCount}`);
		const parsedRequestedHoleCount = Number(holeCount);
		const normalizedHoleCount = isNaN(parsedRequestedHoleCount) ? 1 : Math.max(1, Math.min(parsedRequestedHoleCount, 3));
		if(normalizedHoleCount !== holeCount){
			console.log(`[hole-alarm][심구] normalize holeCount: before=${holeCount}, after=${normalizedHoleCount}`);
		}
		
		const canRequestBackend = shouldBroadcastFromRoom(room);
		if(!canRequestBackend){
			console.log(`[hole-alarm][심구] skip backend request: room=${room}, args=${JSON.stringify(args)}, holeCount=${holeCount}`);
			return;
		}
		
		const minutes = Number(args[0]);
		if(!isNaN(minutes)){
			console.log(`[hole-alarm][심구][minutes] parsedMinutes=${minutes}`);
			// 분 입력은 양수만 허용한다.
			if(minutes <= 0){
				console.log("[hole-alarm][심구][exit] invalid minutes");
				msg.reply(staticText.getDeepHoleUsageText());
				return;
			}
			const underThirtyMinuteGuide = minutes >= 31 ? "\n- 30분 미만 심구 명령어도 작성 가능해요." : "";
			
			const values = Object.values(regionList);
			const lastRegion = values[values.length - 1];
			const regionName = !args[1] ? lastRegion : normalizeRegionName(args[1]);
			
			if(!regionName){
				console.log(`[hole-alarm][심구][exit] invalid region, rawRegion=${args[1] || ""}`);
				msg.reply(
					`[심구알림] "심구 지역명" 형태로 입력해주세요!\n` +
					staticText.getRegionListGuideText()
				);
				return;
			}
			
			const currentDeepAlarms = fetchHoleAlarmsFromBackend(holeType.deep);
			const existingRegionAlarm = currentDeepAlarms.find((alarm) => alarm.regionName === regionName);
			const endTime = new Date().getTime() + (minutes * 60 * 1000);
			
			if(existingRegionAlarm){
				const parsedExistingHoleCount = Number(existingRegionAlarm.holeCount);
				const existingHoleCount = isNaN(parsedExistingHoleCount) ? 1 : Math.max(1, Math.min(parsedExistingHoleCount, 3));
				if(existingHoleCount === normalizedHoleCount){
					console.log(`[hole-alarm][심구] skip update: same holeCount=${normalizedHoleCount}, region=${regionName}`);
					const sameCountText =
						`${formatDeepHoleAlarmFromTable(existingRegionAlarm)}\n` +
						`- 같은 심구 개수(${normalizedHoleCount})로 이미 등록되어 있어 갱신하지 않았어요.` +
						`${underThirtyMinuteGuide}` +
						`${seeAllViewText}\n\n${deepHoleTip}`;
					broadcastToChatRooms(sameCountText);
					return;
				}
			}
			
			try{
				let isUpdated = false;
				
				// 같은 지역 알림이 있으면 삭제 후 재생성해 심구 개수를 갱신한다.
				if(existingRegionAlarm){
					const deleteResult = mobinogiUtil.deleteDeepHoleAlarmsByRegion(regionName);
					if(!deleteResult || !deleteResult.success){
						throw new Error("deleteDeepHoleAlarmsByRegion failed.");
					}
					removeLocalDeepAlarmByRegion(regionName);
					isUpdated = true;
				}
				
				const createResult = mobinogiUtil.createDeepHoleAlarm(
					regionName,
					toDateTimeText(endTime),
					normalizedHoleCount
				);
				console.log(`[hole-alarm][심구][create] room=${room}, regionName=${regionName}, endTime=${toDateTimeText(endTime)}, holeCount=${normalizedHoleCount}`);
				if(!createResult || !createResult.success || !createResult.alarm){
					throw new Error("createDeepHoleAlarm failed.");
				}
				
				registerHoleAlarmEntry(createResult.alarm);
				const alarmText = formatDeepHoleAlarmFromTable(createResult.alarm);
				const multiCommandGuide = normalizedHoleCount === 1 ? `\n\n${staticText.getDeepHoleMultiCommandGuideText()}` : "";
				const updatedText = isUpdated ? "\n- 같은 지역 기존 알림을 새 심구 개수로 갱신했어요." : "";
				const outputText = `${alarmText}${updatedText}${underThirtyMinuteGuide}${multiCommandGuide}${seeAllViewText}\n\n${deepHoleTip}`;
				
				// 관리 채팅방에서 실행한 경우에만 전체 브로드캐스트한다.
				const isBroadcastTargetRoom = shouldBroadcastFromRoom(room);
				console.log(`[hole-alarm][심구] room=${room}, isBroadcastTargetRoom=${isBroadcastTargetRoom}, chatRoomList=${JSON.stringify(chatRoomList)}`);
				if(isBroadcastTargetRoom){
					broadcastToChatRooms(outputText);
				}
			}catch(e){
				console.error(`[hole-alarm] Failed to create deep alarm: ${e}, room=${room}, args=${JSON.stringify(args)}, holeCount=${normalizedHoleCount}`);
				msg.reply("[심구알림] 심구 알림 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
			}
			return;
		}
		
		if(args[0] === "확인"){
			const currentDeepAlarms = fetchHoleAlarmsFromBackend(holeType.deep);
			if(currentDeepAlarms.length > 0){
				for(let i = 0 ; i < currentDeepAlarms.length ; i++){
					msg.reply(`${formatDeepHoleAlarmFromTable(currentDeepAlarms[i])}${seeAllViewText}\n\n${deepHoleTip}`);
				}
			}else{
				msg.reply("[심구알림] 현재 설정된 알림이 없습니다.\n" + staticText.getDeepHoleUsageText());
			}
			return;
		}
		
		if(args[0] === "삭제"){
			const inputRegion = args[1];
			const inputRegionName = normalizeRegionName(inputRegion);
			if(!inputRegionName){
				msg.reply(
					`[심구알림] "${inputRegion || "-"}"에 해당하는 지역 정보를 찾을 수 없습니다.\n` +
					staticText.getRegionListGuideText()
				);
				return;
			}
			
			try{
				const result = mobinogiUtil.deleteDeepHoleAlarmsByRegion(inputRegionName);
				removeLocalDeepAlarmByRegion(inputRegionName);
				const deletedCount = result && result.success ? (result.deletedCount || 0) : 0;
				if(deletedCount > 0){
					msg.reply(`[심구알림] "${inputRegionName}" 알림을 삭제했습니다.`);
				}else{
					msg.reply(
						`[심구알림] "${inputRegionName}" 지역 알림이 없습니다.\n` +
						staticText.getRegionListGuideText()
					);
				}
			}catch(e){
				console.error("[hole-alarm] Failed to delete deep alarm by region: " + e);
				msg.reply("[심구알림] 지역 알림 삭제에 실패했습니다.");
			}
			return;
		}
		
		if(args[0] === "초기화"){
			try{
				mobinogiUtil.clearHoleAlarms(holeType.deep);
				clearLocalHoleAlarmsByType(holeType.deep);
				msg.reply("[심구알림] 모든 심구 알림을 삭제했습니다.");
			}catch(e){
				console.error("[hole-alarm] Failed to clear deep alarms: " + e);
				msg.reply("[심구알림] 심구 알림 초기화에 실패했습니다.");
			}
			return;
		}
		
		msg.reply(staticText.getDeepHoleUsageText());
	}
	
	/**
	 * 동기화 루프 시작 여부를 확인 후 필요 시 시작한다.
	 */
	function startIfNeeded(){
		if(isHoleAlarmSyncStarted){
			return;
		}
		startHoleAlarmSync();
		isHoleAlarmSyncStarted = true;
	}
	
	return {
		startIfNeeded,
		sendToChatRoom,
		broadcastToChatRooms,
		handleAbyssHoleCommand,
		handleDeepHoleCommand
	};
}

/**
 * 게임 이벤트/공지 감시 서비스 팩토리.
 * @param {object} options
 * @param {object} options.mobinogiUtil
 * @param {Function} options.broadcastToChatRooms
 * @param {string} options.snapshotFilePath
 * @param {object|null} options.javaIo
 * @returns {object}
 */
function createGameFeedWatchService(options){
	/**
	 * API 유틸 모듈.
	 * @type {object}
	 */
	const mobinogiUtil = options.mobinogiUtil;
	
	/**
	 * 전체 채팅방 브로드캐스트 함수.
	 * @type {Function}
	 */
	const broadcastToChatRooms = options.broadcastToChatRooms;
	
	/**
	 * 런타임에서 전달된 Java I/O 클래스 캐시.
	 * @type {object|null}
	 */
	const javaIo = options.javaIo || null;
	
	/**
	 * 스냅샷 저장 파일 경로.
	 * @type {string}
	 */
	const snapshotFilePath = normalizeText(options.snapshotFilePath) || "game-feed-watch-snapshot.json";
	
	/**
	 * 런타임 키-값 저장소(DataBase) 키.
	 * @type {string}
	 */
	const snapshotStorageKey = "game-feed-watch-snapshot";
	
	/**
	 * 스냅샷 저장 포맷 버전.
	 * @type {number}
	 */
	const snapshotStorageVersion = 1;
	
	/**
	 * 백엔드 동기화 주기(ms) - 10분.
	 * @type {number}
	 */
	const gameFeedSyncIntervalMs = 10 * 60 * 1000;
	
	/**
	 * 동기화 경계 감시 tick 주기(ms).
	 * @type {number}
	 */
	const gameFeedSyncTickIntervalMs = 250;
	
	/**
	 * 공지 스냅샷 테이블.
	 * key: noticeId
	 * value: { title }
	 * @type {object}
	 */
	let noticeSnapshotById = {};
	
	/**
	 * 이벤트 스냅샷 테이블.
	 * key: eventId
	 * value: { title }
	 * @type {object}
	 */
	let eventSnapshotById = {};
	
	/**
	 * 공지 초기 스냅샷 로드 완료 여부.
	 * @type {boolean}
	 */
	let isNoticeSnapshotInitialized = false;
	
	/**
	 * 이벤트 초기 스냅샷 로드 완료 여부.
	 * @type {boolean}
	 */
	let isEventSnapshotInitialized = false;
	
	/**
	 * 동기화 타이머 핸들.
	 * @type {object|null}
	 */
	let gameFeedSyncTimer = null;
	
	/**
	 * 다음 동기화 경계 시각(ms).
	 * @type {number}
	 */
	let gameFeedNextSyncBoundaryMs = 0;
	
	/**
	 * 동기화 루프 시작 여부.
	 * @type {boolean}
	 */
	let isGameFeedSyncStarted = false;
	
	/**
	 * 시작 로그 1회 출력 여부.
	 * @type {boolean}
	 */
	let isGameFeedSyncStartLogged = false;
	
	/**
	 * 동기화 실행 중 여부.
	 * @type {boolean}
	 */
	let isGameFeedSyncRunning = false;
	
	/**
	 * 스냅샷 영속 저장 비활성화 여부.
	 * @type {boolean}
	 */
	let isSnapshotPersistenceDisabled = false;
	
	/**
	 * 스냅샷 영속 저장 비활성화 로그 출력 여부.
	 * @type {boolean}
	 */
	let isSnapshotPersistenceDisabledLogged = false;
	
	/**
	 * 최신 감지 결과 메타데이터.
	 * @type {object|null}
	 */
	let latestDetectionInfo = null;
	
	/**
	 * 시각(ms)을 `yyyy-mm-dd HH:mm:ss` 문자열로 변환한다.
	 * @param {number} time
	 * @returns {string}
	 */
	function toDateTimeText(time){
		const date = new Date(time);
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, "0");
		const day = `${date.getDate()}`.padStart(2, "0");
		const hour = `${date.getHours()}`.padStart(2, "0");
		const minute = `${date.getMinutes()}`.padStart(2, "0");
		const second = `${date.getSeconds()}`.padStart(2, "0");
		return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	}
	
	/**
	 * plain object 여부를 확인한다.
	 * @param {any} value
	 * @returns {boolean}
	 */
	function isPlainObject(value){
		return !!value && typeof value === "object" && !Array.isArray(value);
	}
	
	/**
	 * 입력값을 공백 제거된 문자열로 정규화한다.
	 * @param {string|number|null|undefined} value
	 * @returns {string}
	 */
	function normalizeText(value){
		if(value == null){
			return "";
		}
		return `${value}`.trim();
	}
	
	/**
	 * 스냅샷 영속 저장을 비활성화한다.
	 * @param {string} reason
	 */
	function disableSnapshotPersistence(reason){
		isSnapshotPersistenceDisabled = true;
		if(!isSnapshotPersistenceDisabledLogged){
			console.error(`[game-feed-watch] Snapshot persistence disabled: ${reason}`);
			isSnapshotPersistenceDisabledLogged = true;
		}
	}
	
	/**
	 * Java I/O 클래스 묶음을 반환한다.
	 * - mobinogi-bot.js에서 주입한 클래스 캐시를 우선 사용한다.
	 * @returns {object|null}
	 */
	function getJavaIoClasses(){
		if(
			javaIo &&
			javaIo.File &&
			javaIo.FileReader &&
			javaIo.FileWriter &&
			javaIo.BufferedReader &&
			javaIo.BufferedWriter
		){
			return javaIo;
		}
		
		try{
			if(typeof Packages === "undefined" || !Packages || !Packages.java || !Packages.java.io){
				return null;
			}
			return {
				File : Packages.java.io.File,
				FileReader : Packages.java.io.FileReader,
				FileWriter : Packages.java.io.FileWriter,
				BufferedReader : Packages.java.io.BufferedReader,
				BufferedWriter : Packages.java.io.BufferedWriter
			};
		}catch(e){
			return null;
		}
	}
	
	/**
	 * 스냅샷 키로 사용할 문자열 ID를 정규화한다.
	 * @param {string|number|null|undefined} value
	 * @returns {string}
	 */
	function toIdText(value){
		return normalizeText(value);
	}
	
	/**
	 * 스냅샷 맵을 저장 가능한 형태로 정규화한다.
	 * @param {object} sourceMap
	 * @returns {object}
	 */
	function sanitizeSnapshotMap(sourceMap){
		const normalizedMap = {};
		if(!isPlainObject(sourceMap)){
			return normalizedMap;
		}
		
		const sourceIds = Object.keys(sourceMap);
		for(let i = 0 ; i < sourceIds.length ; i++){
			const sourceId = sourceIds[i];
			const normalizedId = toIdText(sourceId);
			if(!normalizedId){
				continue;
			}
			
			const sourceValue = sourceMap[sourceId];
			normalizedMap[normalizedId] = {
				title : normalizeText(sourceValue && sourceValue.title)
			};
		}
		
		return normalizedMap;
	}
	
	/**
	 * Java I/O로 텍스트 파일을 읽는다.
	 * @param {string} filePath
	 * @returns {string|null}
	 */
	function readTextByJavaIo(filePath){
		if(!filePath){
			return null;
		}
		
		try{
			const classes = getJavaIoClasses();
			if(!classes){
				return null;
			}
			const JavaFile = classes.File;
			const FileReader = classes.FileReader;
			const BufferedReader = classes.BufferedReader;
			const file = new JavaFile(filePath);
			if(!file.exists()){
				return null;
			}
			
			const reader = new BufferedReader(new FileReader(file));
			const lines = [];
			let line = null;
			while((line = reader.readLine()) != null){
				lines.push(`${line}`);
			}
			reader.close();
			return lines.join("\n");
		}catch(e){
			return null;
		}
	}
	
	/**
	 * Java I/O로 텍스트 파일을 저장한다.
	 * @param {string} filePath
	 * @param {string} content
	 * @returns {boolean|null}
	 */
	function writeTextByJavaIo(filePath, content){
		if(!filePath){
			return false;
		}
		
		try{
			const classes = getJavaIoClasses();
			if(!classes){
				return null;
			}
			const JavaFile = classes.File;
			const FileWriter = classes.FileWriter;
			const BufferedWriter = classes.BufferedWriter;
			const file = new JavaFile(filePath);
			const parentDir = file.getParentFile();
			if(parentDir && !parentDir.exists()){
				parentDir.mkdirs();
			}
			
			const writer = new BufferedWriter(new FileWriter(file));
			writer.write(content);
			writer.close();
			return true;
		}catch(e){
			return false;
		}
	}
	
	/**
	 * FileStream으로 텍스트를 읽는다.
	 * - 최신 런타임 API(`readJson`)를 우선 사용한다.
	 * @param {string} filePath
	 * @returns {string|null}
	 */
	function readTextByFileStream(filePath){
		if(!filePath){
			return null;
		}
		
		try{
			if(typeof FileStream === "undefined" || !FileStream){
				return null;
			}
			
			if(typeof FileStream.readJson === "function"){
				const jsonObject = FileStream.readJson(filePath);
				if(jsonObject == null){
					return null;
				}
				return JSON.stringify(jsonObject);
			}
			
			// 구형 런타임 호환용.
			if(typeof FileStream.read === "function"){
				return `${FileStream.read(filePath) || ""}`;
			}
		}catch(e){
			return null;
		}
		
		return null;
	}
	
	/**
	 * FileStream으로 텍스트를 저장한다.
	 * - 최신 런타임 API(`writeJson/saveJson`)를 우선 사용한다.
	 * @param {string} filePath
	 * @param {string} content
	 * @returns {boolean|null}
	 */
	function writeTextByFileStream(filePath, content){
		if(!filePath){
			return false;
		}
		
		try{
			if(typeof FileStream === "undefined" || !FileStream){
				return null;
			}
			
			const slashIndex = filePath.lastIndexOf("/");
			if(slashIndex > 0 && typeof FileStream.createDir === "function"){
				const directoryPath = filePath.substring(0, slashIndex);
				FileStream.createDir(directoryPath);
			}
			
			let parsedJson = null;
			let isJsonContent = false;
			try{
				parsedJson = JSON.parse(content);
				isJsonContent = true;
			}catch(e){
			}
			
			if(isJsonContent){
				if(typeof FileStream.writeJson === "function"){
					const writeResult = FileStream.writeJson(filePath, parsedJson);
					if(writeResult === true || writeResult === undefined){
						return true;
					}
				}
				
				if(typeof FileStream.saveJson === "function"){
					FileStream.saveJson(filePath, parsedJson);
					return true;
				}
			}
			
			if(typeof FileStream.save === "function"){
				FileStream.save(filePath, content, false);
				return true;
			}
			
			// 구형 런타임 호환용.
			if(typeof FileStream.write === "function"){
				FileStream.write(filePath, content);
				return true;
			}
		}catch(e){
			return false;
		}
		
		return null;
	}
	
	/**
	 * 파일에서 텍스트를 읽는다.
	 * - FileStream > Java I/O > Node fs > DataBase 순으로 시도한다.
	 * @param {string} filePath
	 * @returns {string}
	 */
	function readTextFile(filePath){
		if(isSnapshotPersistenceDisabled){
			return "";
		}
		
		const fileStreamReadResult = readTextByFileStream(filePath);
		if(fileStreamReadResult != null){
			return fileStreamReadResult;
		}
		
		const javaIoReadResult = readTextByJavaIo(filePath);
		if(javaIoReadResult != null){
			return javaIoReadResult;
		}
		
		try{
			if(filePath && typeof require === "function"){
				const fs = require("fs");
				if(fs.existsSync(filePath)){
					return `${fs.readFileSync(filePath, "utf8") || ""}`;
				}
			}
		}catch(e){
			// fs 모듈이 없는 런타임은 빈값으로 처리한다.
		}
		
		// 파일 기반 로드가 실패하면 DataBase 저장소를 폴백으로 사용한다.
		try{
			if(typeof DataBase !== "undefined" && DataBase && typeof DataBase.getDataBase === "function"){
				return `${DataBase.getDataBase(snapshotStorageKey) || ""}`;
			}
		}catch(e){
			// DataBase 조회 실패 시 빈값을 반환한다.
		}
		
		return "";
	}
	
	/**
	 * 파일에 텍스트를 저장한다.
	 * - FileStream > Java I/O > Node fs > DataBase 순으로 시도한다.
	 * @param {string} filePath
	 * @param {string} content
	 * @returns {boolean}
	 */
	function writeTextFile(filePath, content){
		if(isSnapshotPersistenceDisabled){
			return false;
		}
		
		const fileStreamWriteResult = writeTextByFileStream(filePath, content);
		if(fileStreamWriteResult === true){
			return true;
		}
		
		const javaIoWriteResult = writeTextByJavaIo(filePath, content);
		if(javaIoWriteResult === true){
			return true;
		}
		
		try{
			if(filePath && typeof require === "function"){
				const fs = require("fs");
				fs.writeFileSync(filePath, content, "utf8");
				return true;
			}
		}catch(e){
			// Node fs가 없는 런타임이면 영속 저장을 끈다.
		}
		
		// 파일 저장이 불가능하면 DataBase 저장소를 최종 폴백으로 사용한다.
		try{
			if(typeof DataBase !== "undefined" && DataBase && typeof DataBase.setDataBase === "function"){
				DataBase.setDataBase(snapshotStorageKey, content);
				return true;
			}
		}catch(e){
			// DataBase 저장 실패 시 아래 비활성화 처리로 진행한다.
		}
		
		disableSnapshotPersistence("No writable snapshot storage backend (FileStream/Java I/O/fs/DataBase).");
		return false;
	}
	
	/**
	 * FileStream JSON API로 스냅샷 객체를 읽는다.
	 * @param {string} filePath
	 * @returns {object|null}
	 */
	function readSnapshotObjectByFileStream(filePath){
		if(!filePath){
			return null;
		}
		
		try{
			if(typeof FileStream === "undefined" || !FileStream || typeof FileStream.readJson !== "function"){
				return null;
			}
			
			const snapshotObject = FileStream.readJson(filePath);
			return isPlainObject(snapshotObject) ? snapshotObject : null;
		}catch(e){
			return null;
		}
	}
	
	/**
	 * FileStream JSON API로 스냅샷 객체를 저장한다.
	 * @param {string} filePath
	 * @param {object} snapshotPayload
	 * @returns {boolean}
	 */
	function writeSnapshotObjectByFileStream(filePath, snapshotPayload){
		if(!filePath){
			return false;
		}
		
		try{
			if(typeof FileStream === "undefined" || !FileStream){
				return false;
			}
			
			const slashIndex = filePath.lastIndexOf("/");
			if(slashIndex > 0 && typeof FileStream.createDir === "function"){
				FileStream.createDir(filePath.substring(0, slashIndex));
			}
			
			if(typeof FileStream.writeJson === "function"){
				const writeResult = FileStream.writeJson(filePath, snapshotPayload);
				if(writeResult === true || writeResult === undefined){
					return true;
				}
			}
			
			if(typeof FileStream.saveJson === "function"){
				FileStream.saveJson(filePath, snapshotPayload);
				return true;
			}
		}catch(e){
			const errorText = `${e || ""}`;
			if(errorText.indexOf("Read-only file system") > -1){
				return false;
			}
		}
		
		return false;
	}
	
	/**
	 * 스냅샷 파일을 로드해 메모리 상태를 복원한다.
	 * @returns {boolean}
	 */
	function loadSnapshotFromStorage(){
		try{
			const parsedSnapshot = readSnapshotObjectByFileStream(snapshotFilePath) || (() => {
				const rawSnapshotText = readTextFile(snapshotFilePath);
				if(!rawSnapshotText){
					return null;
				}
				return JSON.parse(rawSnapshotText);
			})();
			if(!parsedSnapshot){
				return false;
			}
			if(!isPlainObject(parsedSnapshot)){
				throw new Error("snapshot root is not object");
			}
			
			// savedAt이 비어 있으면 아직 기준선이 저장되지 않은 초기 파일로 본다.
			const savedAtText = normalizeText(parsedSnapshot.savedAt);
			if(!savedAtText){
				return false;
			}
			
			noticeSnapshotById = sanitizeSnapshotMap(
				parsedSnapshot.noticeSnapshotById || parsedSnapshot.notices
			);
			eventSnapshotById = sanitizeSnapshotMap(
				parsedSnapshot.eventSnapshotById || parsedSnapshot.events
			);
			latestDetectionInfo = isPlainObject(parsedSnapshot.latestDetectionInfo) ?
				parsedSnapshot.latestDetectionInfo :
				null;
			isNoticeSnapshotInitialized = true;
			isEventSnapshotInitialized = true;
			console.log(
				`[game-feed-watch] Snapshot restored from ${snapshotFilePath} ` +
				`(notices=${Object.keys(noticeSnapshotById).length}, events=${Object.keys(eventSnapshotById).length})`
			);
			return true;
		}catch(e){
			console.error(`[game-feed-watch] Failed to parse snapshot file ${snapshotFilePath}: ${e}`);
			return false;
		}
	}
	
	/**
	 * 현재 메모리 스냅샷을 파일에 저장한다.
	 */
	function saveSnapshotToStorage(){
		if(isSnapshotPersistenceDisabled){
			return;
		}
		
		const snapshotPayload = {
			version : snapshotStorageVersion,
			savedAt : toDateTimeText(new Date().getTime()),
			noticeSnapshotById,
			eventSnapshotById,
			latestDetectionInfo
		};
		
		if(writeSnapshotObjectByFileStream(snapshotFilePath, snapshotPayload)){
			return;
		}
		
		const snapshotJsonText = JSON.stringify(snapshotPayload, null, 2);
		console.log(snapshotJsonText);
		writeTextFile(snapshotFilePath, snapshotJsonText);
	}
	
	/**
	 * 목록을 스냅샷 테이블로 변환한다.
	 * @param {object[]} rows
	 * @param {string} idField
	 * @returns {object}
	 */
	function buildSnapshotMap(rows, idField){
		const snapshot = {};
		for(let i = 0 ; i < rows.length ; i++){
			const row = rows[i];
			if(!row){
				continue;
			}
			
			const rowId = toIdText(row[idField]);
			if(!rowId){
				continue;
			}
			
			snapshot[rowId] = {
				title : normalizeText(row.title)
			};
		}
		return snapshot;
	}
	
	/**
	 * 백엔드에서 게임 공지 목록을 조회한다.
	 * @returns {object[]|null}
	 */
	function fetchGameNoticesFromBackend(){
		try{
			const result = mobinogiUtil.getGameNotices();
			if(result && result.success && Array.isArray(result.data)){
				return result.data;
			}
		}catch(e){
			console.error("[game-feed-watch] Failed to fetch game notices: " + e);
		}
		return null;
	}
	
	/**
	 * 백엔드에서 게임 이벤트 목록을 조회한다.
	 * @returns {object[]|null}
	 */
	function fetchGameEventsFromBackend(){
		try{
			const result = mobinogiUtil.getGameEvents();
			if(result && result.success && Array.isArray(result.data)){
				return result.data;
			}
		}catch(e){
			console.error("[game-feed-watch] Failed to fetch game events: " + e);
		}
		return null;
	}
	
	/**
	 * 신규 공지 알림 텍스트를 만든다.
	 * @param {object} notice
	 * @returns {string}
	 */
	function formatNewNoticeMessage(notice){
		const title = normalizeText(notice && notice.title) || "-";
		const noticeType = normalizeText(notice && notice.noticeType);
		const noticeId = toIdText(notice && notice.noticeId);
		const publishedDate = normalizeText(notice && notice.publishedDate) || "-";
		const noticeLink = getNoticeLink(noticeType, noticeId);
		return `[공지알림] 신규 공지가 등록되었습니다.\n- 제목: ${title}\n- 일자: ${publishedDate}\n- 링크: ${noticeLink}`;
	}
	
	/**
	 * 공지 제목 변경 알림 텍스트를 만든다.
	 * @param {string} previousTitle
	 * @param {object} notice
	 * @returns {string}
	 */
	function formatUpdatedNoticeMessage(previousTitle, notice){
		const currentTitle = normalizeText(notice && notice.title) || "-";
		const beforeTitle = normalizeText(previousTitle) || "-";
		const noticeType = normalizeText(notice && notice.noticeType);
		const noticeId = toIdText(notice && notice.noticeId);
		const publishedDate = normalizeText(notice && notice.publishedDate) || "-";
		const noticeLink = getNoticeLink(noticeType, noticeId);
		return `[공지알림] 공지 제목이 변경되었습니다.\n- 이전: ${beforeTitle}\n- 현재: ${currentTitle}\n- 일자: ${publishedDate}\n- 링크: ${noticeLink}`;
	}
	
	/**
	 * 신규 이벤트 알림 텍스트를 만든다.
	 * @param {object} event
	 * @returns {string}
	 */
	function formatNewEventMessage(event){
		const title = normalizeText(event && event.title) || "-";
		const eventId = toIdText(event && event.eventId);
		const startDate = normalizeText(event && event.startDate) || "-";
		const endDate = normalizeText(event && event.endDate) || "-";
		const eventLink = getEventLink(eventId);
		const periodText = `\n- 기간: ${formatEventPeriodText(startDate, endDate)}`;
		return `[이벤트알림] 신규 이벤트가 등록되었습니다.\n- 제목: ${title}${periodText}\n- 링크: ${eventLink}`;
	}
	
	/**
	 * 이벤트 제목 변경 알림 텍스트를 만든다.
	 * @param {string} previousTitle
	 * @param {object} event
	 * @returns {string}
	 */
	function formatUpdatedEventMessage(previousTitle, event){
		const currentTitle = normalizeText(event && event.title) || "-";
		const beforeTitle = normalizeText(previousTitle) || "-";
		const eventId = toIdText(event && event.eventId);
		const startDate = normalizeText(event && event.startDate) || "-";
		const endDate = normalizeText(event && event.endDate) || "-";
		const eventLink = getEventLink(eventId);
		return `[이벤트알림] 이벤트 제목이 변경되었습니다.\n- 이전: ${beforeTitle}\n- 현재: ${currentTitle}\n- 기간: ${formatEventPeriodText(startDate, endDate)}\n- 링크: ${eventLink}`;
	}
	
	/**
	 * 공지 타입/ID 기준 공식 공지 링크를 만든다.
	 * @param {string} noticeType
	 * @param {string} noticeId
	 * @returns {string}
	 */
	function getNoticeLink(noticeType, noticeId){
		const normalizedType = normalizeText(noticeType);
		const normalizedId = toIdText(noticeId) || "-";
		switch(normalizedType){
			case "updateNote":
				return `https://mabinogimobile.nexon.com/News/Update/${normalizedId}`;
			case "erinNote":
				return `https://mabinogimobile.nexon.com/News/Devnote/${normalizedId}`;
			default:
				return `https://mabinogimobile.nexon.com/News/Notice/${normalizedId}`;
		}
	}
	
	/**
	 * 이벤트 ID 기준 공식 이벤트 링크를 만든다.
	 * @param {string} eventId
	 * @returns {string}
	 */
	function getEventLink(eventId){
		const normalizedId = toIdText(eventId) || "-";
		return `https://mabinogimobile.nexon.com/News/Events/${normalizedId}`;
	}
	
	/**
	 * 날짜/시간 문자열을 표시용 `yyyy-mm-dd`로 변환한다.
	 * @param {string} value
	 * @returns {string}
	 */
	function formatDateOnly(value){
		const normalized = normalizeText(value).replace("T", " ");
		if(!normalized){
			return "-";
		}
		return normalized.length >= 10 ? normalized.substring(0, 10) : normalized;
	}
	
	/**
	 * 날짜/시간 문자열을 표시용 `yyyy-mm-dd HH:mm`으로 변환한다.
	 * @param {string} value
	 * @returns {string}
	 */
	function formatDateTimeToMinute(value){
		const normalized = normalizeText(value).replace("T", " ");
		if(!normalized){
			return "-";
		}
		return normalized.length >= 16 ? normalized.substring(0, 16) : normalized;
	}
	
	/**
	 * 이벤트 기간 문자열을 `yyyy-mm-dd ~ yyyy-mm-dd HH:mm` 형식으로 만든다.
	 * @param {string} startDate
	 * @param {string} endDate
	 * @returns {string}
	 */
	function formatEventPeriodText(startDate, endDate){
		return `${formatDateOnly(startDate)} ~ ${formatDateTimeToMinute(endDate)}`;
	}
	
	/**
	 * 최신 감지 결과 메타데이터를 생성한다.
	 * @param {number|null} noticeCount
	 * @param {number|null} eventCount
	 * @param {object|null} latestNotice
	 * @param {object|null} latestEvent
	 * @param {string[]} detectedMessages
	 * @returns {object}
	 */
	function buildLatestDetectionInfo(noticeCount, eventCount, latestNotice, latestEvent, detectedMessages){
		const safeDetectedMessages = Array.isArray(detectedMessages) ? detectedMessages.slice(0, 20) : [];
		const notice = latestNotice ? {
			noticeId : toIdText(latestNotice.noticeId) || "-",
			title : normalizeText(latestNotice.title) || "-",
			noticeType : normalizeText(latestNotice.noticeType) || "-",
			publishedDate : normalizeText(latestNotice.publishedDate) || "-",
			link : getNoticeLink(latestNotice.noticeType, latestNotice.noticeId)
		} : null;
		const event = latestEvent ? {
			eventId : toIdText(latestEvent.eventId) || "-",
			title : normalizeText(latestEvent.title) || "-",
			startDate : normalizeText(latestEvent.startDate) || "-",
			endDate : normalizeText(latestEvent.endDate) || "-",
			link : getEventLink(latestEvent.eventId)
		} : null;
		
		return {
			syncedAt : toDateTimeText(new Date().getTime()),
			noticeCount : noticeCount == null ? null : Number(noticeCount),
			eventCount : eventCount == null ? null : Number(eventCount),
			detectedCount : safeDetectedMessages.length,
			detectedMessages : safeDetectedMessages,
			latestNotice : notice,
			latestEvent : event
		};
	}
	
	/**
	 * 감지된 변경 사항들을 단일 메시지로 합친다.
	 * @param {string[]} detectedMessages
	 * @returns {string}
	 */
	function formatDetectedChangesSummaryMessage(detectedMessages){
		let output = `[공지/이벤트 알림] 변경 ${detectedMessages.length}건 감지`;
		for(let i = 0 ; i < detectedMessages.length ; i++){
			output += `\n\n[${i + 1}]\n${detectedMessages[i]}`;
		}
		return output;
	}
	
	/**
	 * 공지 변경 사항을 감지하고 알림 메시지를 만든다.
	 * @param {object[]} notices
	 * @returns {string[]}
	 */
	function detectNoticeChanges(notices){
		const messages = [];
		const nextSnapshot = buildSnapshotMap(notices, "noticeId");
		
		// 첫 스냅샷 로드는 기준선만 만들고 알림을 보내지 않는다.
		if(!isNoticeSnapshotInitialized){
			noticeSnapshotById = nextSnapshot;
			isNoticeSnapshotInitialized = true;
			console.log(`[game-feed-watch] Notice snapshot initialized: ${Object.keys(nextSnapshot).length} rows`);
			return messages;
		}
		
		for(let i = 0 ; i < notices.length ; i++){
			const notice = notices[i];
			const noticeId = toIdText(notice && notice.noticeId);
			if(!noticeId){
				continue;
			}
			
			const previous = noticeSnapshotById[noticeId];
			if(!previous){
				messages.push(formatNewNoticeMessage(notice));
				continue;
			}
			
			const currentTitle = normalizeText(notice.title);
			if(previous.title !== currentTitle){
				messages.push(formatUpdatedNoticeMessage(previous.title, notice));
			}
		}
		
		noticeSnapshotById = nextSnapshot;
		return messages;
	}
	
	/**
	 * 이벤트 변경 사항을 감지하고 알림 메시지를 만든다.
	 * @param {object[]} events
	 * @returns {string[]}
	 */
	function detectEventChanges(events){
		const messages = [];
		const nextSnapshot = buildSnapshotMap(events, "eventId");
		
		// 첫 스냅샷 로드는 기준선만 만들고 알림을 보내지 않는다.
		if(!isEventSnapshotInitialized){
			eventSnapshotById = nextSnapshot;
			isEventSnapshotInitialized = true;
			console.log(`[game-feed-watch] Event snapshot initialized: ${Object.keys(nextSnapshot).length} rows`);
			return messages;
		}
		
		for(let i = 0 ; i < events.length ; i++){
			const eventRow = events[i];
			const eventId = toIdText(eventRow && eventRow.eventId);
			if(!eventId){
				continue;
			}
			
			const previous = eventSnapshotById[eventId];
			if(!previous){
				messages.push(formatNewEventMessage(eventRow));
				continue;
			}
			
			const currentTitle = normalizeText(eventRow.title);
			if(previous.title !== currentTitle){
				messages.push(formatUpdatedEventMessage(previous.title, eventRow));
			}
		}
		
		eventSnapshotById = nextSnapshot;
		return messages;
	}
	
	/**
	 * 게임 이벤트/공지 스냅샷을 동기화하고 변경 알림을 전송한다.
	 */
	function syncGameFeeds(){
		// 중복 실행으로 인한 이중 알림을 방지한다.
		if(isGameFeedSyncRunning){
			return;
		}
		isGameFeedSyncRunning = true;
		
		try{
			const allMessages = [];
			const detectedMessages = [];
			let isSnapshotUpdated = false;
			let noticeCount = null;
			let eventCount = null;
			let latestNotice = null;
			let latestEvent = null;
			
			const notices = fetchGameNoticesFromBackend();
			if(Array.isArray(notices)){
				noticeCount = notices.length;
				latestNotice = notices.length > 0 ? notices[0] : null;
				const noticeMessages = detectNoticeChanges(notices);
				for(let i = 0 ; i < noticeMessages.length ; i++){
					detectedMessages.push(noticeMessages[i]);
				}
				isSnapshotUpdated = true;
			}
			
			const events = fetchGameEventsFromBackend();
			if(Array.isArray(events)){
				eventCount = events.length;
				latestEvent = events.length > 0 ? events[0] : null;
				const eventMessages = detectEventChanges(events);
				for(let i = 0 ; i < eventMessages.length ; i++){
					detectedMessages.push(eventMessages[i]);
				}
				isSnapshotUpdated = true;
			}
			
			latestDetectionInfo = buildLatestDetectionInfo(
				noticeCount,
				eventCount,
				latestNotice,
				latestEvent,
				detectedMessages
			);
			
			if(detectedMessages.length > 0){
				allMessages.push(formatDetectedChangesSummaryMessage(detectedMessages));
			}
			
			// 스냅샷이 갱신된 경우 파일에 영속 저장한다.
			if(isSnapshotUpdated){
				saveSnapshotToStorage();
			}
			
			for(let i = 0 ; i < allMessages.length ; i++){
				broadcastToChatRooms(allMessages[i]);
			}
			
			if(allMessages.length > 0){
				console.log(`[game-feed-watch] Broadcasted ${allMessages.length} message(s).`);
			}
		}catch(e){
			console.error("[game-feed-watch] Failed to sync game feeds: " + e);
		}finally{
			isGameFeedSyncRunning = false;
		}
	}
	
	/**
	 * 이벤트/공지 동기화 루프를 시작한다.
	 */
	function startGameFeedSync(){
		if(!isGameFeedSyncStartLogged){
			console.log("[game-feed-watch] startGameFeedSync started.");
			isGameFeedSyncStartLogged = true;
		}
		
		// 기존 타이머가 있으면 교체해 중복 루프를 막는다.
		if(gameFeedSyncTimer){
			clearInterval(gameFeedSyncTimer);
		}
		
		// 저장된 스냅샷이 있으면 먼저 복원한다.
		loadSnapshotFromStorage();
		
		// 시작 직후 1회 즉시 동기화해 기준 스냅샷을 갱신한다.
		syncGameFeeds();
		
		// 다음 10분 경계 시각을 계산해 정시 동기화를 보장한다.
		const nowMs = new Date().getTime();
		gameFeedNextSyncBoundaryMs = nowMs - (nowMs % gameFeedSyncIntervalMs) + gameFeedSyncIntervalMs;
		console.log("[game-feed-watch] 10-minute sync armed at " + toDateTimeText(gameFeedNextSyncBoundaryMs));
		
		gameFeedSyncTimer = setInterval(() => {
			try{
				const currentTime = new Date().getTime();
				if(currentTime < gameFeedNextSyncBoundaryMs){
					return;
				}
				
				syncGameFeeds();
				do{
					gameFeedNextSyncBoundaryMs += gameFeedSyncIntervalMs;
				}while(gameFeedNextSyncBoundaryMs <= currentTime);
			}catch(e){
				console.error("[game-feed-watch] Failed to run 10-minute sync: " + e);
			}
		}, gameFeedSyncTickIntervalMs);
	}
	
	/**
	 * 동기화 루프 시작 여부를 확인 후 필요 시 시작한다.
	 */
	function startIfNeeded(){
		if(isGameFeedSyncStarted){
			return;
		}
		startGameFeedSync();
		isGameFeedSyncStarted = true;
	}
	
	return {
		startIfNeeded
	};
}

/**
 * 캐릭터 랭킹/아이템 조회 서비스 팩토리.
 * @param {object} options
 * @param {object} options.mobinogiUtil
 * @param {string} options.seeAllViewText
 * @returns {object}
 */
function createInfoService(options){
	/**
	 * API 유틸 모듈.
	 * @type {object}
	 */
	const mobinogiUtil = options.mobinogiUtil;
	
	/**
	 * 더보기 펼침용 zero-width space 텍스트.
	 * @type {string}
	 */
	const seeAllViewText = options.seeAllViewText;
	
	/**
	 * KST 시간대 오프셋(분).
	 * @type {number}
	 */
	const holeAlarmTimezoneOffsetMinutes = 9 * 60;
	
	/**
	 * 한 자리 숫자를 두 자리 문자열로 변환한다.
	 * @param {number} value
	 * @returns {string}
	 */
	function padNumber(value){
		return value < 10 ? `0${value}` : `${value}`;
	}
	
	/**
	 * 날짜 문자열을 타임스탬프로 파싱한다.
	 * - KST 로컬 형식(`yyyy-mm-dd hh:mm[:ss]`) 우선
	 * - 그 외는 `Date` 기본 파서 사용
	 * @param {string} dateTimeText
	 * @returns {number|null}
	 */
	function parseDateTimeText(dateTimeText){
		// 입력값이 비어 있으면 파싱할 수 없으므로 null을 반환한다.
		if(!dateTimeText){
			return null;
		}
		
		// 공백 구분 날짜는 ISO 형태와 맞추기 위해 `T`로 치환한다.
		const normalizedText = `${dateTimeText}`.trim().replace(" ", "T");
		const localMatch = normalizedText.match(
			/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d{1,3}))?$/
		);
		
		// 로컬 형식으로 매칭되면 KST 기준 UTC 밀리초로 직접 계산한다.
		if(localMatch){
			const year = Number(localMatch[1]);
			const month = Number(localMatch[2]) - 1;
			const day = Number(localMatch[3]);
			const hour = Number(localMatch[4]);
			const minute = Number(localMatch[5]);
			const second = localMatch[6] ? Number(localMatch[6]) : 0;
			const millisecond = localMatch[7] ? Number(localMatch[7]) : 0;
			const utcTime = Date.UTC(year, month, day, hour, minute, second, millisecond);
			const kstTime = utcTime - (holeAlarmTimezoneOffsetMinutes * 60 * 1000);
			return isNaN(kstTime) ? null : kstTime;
		}
		
		// 그 외 입력은 런타임 기본 파서로 위임한다.
		const parsedTime = new Date(normalizedText).getTime();
		return isNaN(parsedTime) ? null : parsedTime;
	}
	
	/**
	 * 랭킹 숫자를 `ko-KR` 포맷으로 표시한다.
	 * @param {number|string} value
	 * @returns {string}
	 */
	function formatRankNumber(value){
		if(value == null || isNaN(Number(value))){
			return "-";
		}
		return Number(value).toLocaleString("ko-KR");
	}
	
	/**
	 * 갱신 시각 문자열을 표시용 `yyyy-mm-dd hh:mm`으로 변환한다.
	 * @param {string} updatedAt
	 * @returns {string}
	 */
	function formatRankUpdatedAt(updatedAt){
		const time = parseDateTimeText(updatedAt);
		if(!time){
			return "-";
		}
		
		// 파싱된 시각을 사람이 읽기 쉬운 고정 포맷으로 구성한다.
		const date = new Date(time);
		return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
	}
	
	/**
	 * 명령어 인자를 공백 제거 문자열로 정규화한다.
	 * @param {string|number|null|undefined} value
	 * @returns {string}
	 */
	function normalizeArgText(value){
		if(value == null){
			return "";
		}
		return `${value}`.trim();
	}
	
	/**
	 * `/공지` 사용 가이드 문구를 반환한다.
	 * @returns {string}
	 */
	function getNoticeUsageText(){
		return "[공지 조회] '/공지 목록'으로 입력해주세요.\n예시: /공지 목록";
	}
	
	/**
	 * `/이벤트` 사용 가이드 문구를 반환한다.
	 * @returns {string}
	 */
	function getEventUsageText(){
		return "[이벤트 조회] '/이벤트 목록'으로 입력해주세요.\n예시: /이벤트 목록";
	}
	
	/**
	 * 공지 유형과 ID로 공식 공지 링크를 반환한다.
	 * @param {string} noticeType
	 * @param {string|number} noticeId
	 * @returns {string}
	 */
	function getNoticeLink(noticeType, noticeId){
		const normalizedType = normalizeArgText(noticeType);
		const normalizedId = normalizeArgText(noticeId) || "-";
		switch(normalizedType){
			case "updateNote":
				return `https://mabinogimobile.nexon.com/News/Update/${normalizedId}`;
			case "erinNote":
				return `https://mabinogimobile.nexon.com/News/Devnote/${normalizedId}`;
			default:
				return `https://mabinogimobile.nexon.com/News/Notice/${normalizedId}`;
		}
	}
	
	/**
	 * 이벤트 ID로 공식 이벤트 링크를 반환한다.
	 * @param {string|number} eventId
	 * @returns {string}
	 */
	function getEventLink(eventId){
		const normalizedId = normalizeArgText(eventId) || "-";
		return `https://mabinogimobile.nexon.com/News/Events/${normalizedId}`;
	}
	
	/**
	 * 날짜/시간 문자열을 `yyyy-mm-dd` 형태로 변환한다.
	 * @param {string} value
	 * @returns {string}
	 */
	function formatListDateOnly(value){
		const text = normalizeArgText(value).replace("T", " ");
		if(!text){
			return "-";
		}
		return text.length >= 10 ? text.substring(0, 10) : text;
	}
	
	/**
	 * 날짜/시간 문자열을 `yyyy-mm-dd HH:mm` 형태로 변환한다.
	 * @param {string} value
	 * @returns {string}
	 */
	function formatListDateTimeToMinute(value){
		const text = normalizeArgText(value).replace("T", " ");
		if(!text){
			return "-";
		}
		return text.length >= 16 ? text.substring(0, 16) : text;
	}
	
	/**
	 * 이벤트 기간 문자열을 `yyyy-mm-dd ~ yyyy-mm-dd HH:mm` 형태로 반환한다.
	 * @param {string} startDate
	 * @param {string} endDate
	 * @returns {string}
	 */
	function formatEventPeriodText(startDate, endDate){
		return `${formatListDateOnly(startDate)} ~ ${formatListDateTimeToMinute(endDate)}`;
	}
	
	/**
	 * `/공지 목록` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string[]} args
	 */
	function handleNoticeListCommand(msg, args){
		const action = normalizeArgText(args && args[0]);
		if(action !== "목록"){
			msg.reply(getNoticeUsageText());
			return;
		}
		
		try{
			// 백엔드 최신 공지 정렬 결과를 그대로 조회한다.
			const result = mobinogiUtil.getGameNotices();
			if(!result || !result.success || !Array.isArray(result.data)){
				msg.reply("[공지 조회] 공지 목록 조회에 실패했습니다.");
				return;
			}
			
			const notices = result.data;
			if(notices.length === 0){
				msg.reply("[공지 목록] 데이터가 없습니다.");
				return;
			}
			
			const previewCount = Math.min(notices.length, 10);
			let outputText =
				`[공지 목록]\n` +
				`- 총 ${notices.length}건` +
				`${seeAllViewText}\n`;
			
			for(let i = 0 ; i < previewCount ; i++){
				const notice = notices[i] || {};
				const noticeTitle = normalizeArgText(notice.title) || "-";
				const noticeId = normalizeArgText(notice.noticeId) || "-";
				const noticeType = normalizeArgText(notice.noticeType) || "-";
				const publishedDate = normalizeArgText(notice.publishedDate) || "-";
				const noticeLink = getNoticeLink(noticeType, noticeId);
				
				outputText +=
					`\n${i + 1}. ${noticeTitle}\n` +
					`- 일자: ${publishedDate}\n` +
					`- 링크: ${noticeLink}\n`;
			}
			
			if(notices.length > previewCount){
				outputText += `\n... 외 ${notices.length - previewCount}건: https://laetipark.me/news/notice`;
			}
			
			msg.reply(outputText.trim());
		}catch(e){
			console.error("[notice] Failed to fetch notice list: " + e);
			msg.reply("[공지 조회] 공지 목록 조회 중 오류가 발생했습니다.");
		}
	}
	
	/**
	 * `/이벤트 목록` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string[]} args
	 */
	function handleEventListCommand(msg, args){
		const action = normalizeArgText(args && args[0]);
		if(action !== "목록"){
			msg.reply(getEventUsageText());
			return;
		}
		
		try{
			// 백엔드 이벤트(마감 임박 포함) 정렬 결과를 그대로 조회한다.
			const result = mobinogiUtil.getGameEvents();
			if(!result || !result.success || !Array.isArray(result.data)){
				msg.reply("[이벤트 조회] 이벤트 목록 조회에 실패했습니다.");
				return;
			}
			
			const events = result.data;
			if(events.length === 0){
				msg.reply("[이벤트 목록] 데이터가 없습니다.");
				return;
			}
			
			const previewCount = Math.min(events.length, 10);
			let outputText =
				`[이벤트 목록]\n` +
				`- 총 ${events.length}건` +
				`${seeAllViewText}\n`;
			
			for(let i = 0 ; i < previewCount ; i++){
				const eventRow = events[i] || {};
				const eventTitle = normalizeArgText(eventRow.title) || "-";
				const eventId = normalizeArgText(eventRow.eventId) || "-";
				const eventPeriodText = formatEventPeriodText(eventRow.startDate, eventRow.endDate);
				const eventLink = getEventLink(eventId);
				
				outputText +=
					`\n${i + 1}. ${eventTitle}\n` +
					`- 기간: ${eventPeriodText}\n` +
					`- 링크: ${eventLink}\n`;
			}
			
			if(events.length > previewCount){
				outputText += `\n... 외 ${events.length - previewCount}건: https://laetipark.me/news/events`;
			}
			
			msg.reply(outputText.trim());
		}catch(e){
			console.error("[event] Failed to fetch event list: " + e);
			msg.reply("[이벤트 조회] 이벤트 목록 조회 중 오류가 발생했습니다.");
		}
	}
	
	/**
	 * `/캐릭터` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string[]} args
	 */
	function handleRankingCommand(msg, args){
		// 닉네임 인자가 없으면 사용 예시를 먼저 안내한다.
		if(!args || args.length === 0){
			msg.reply(
				"[캐릭터 조회] '/캐릭터 (닉네임)'으로 입력해주세요.\n" +
				"예시: /캐릭터 Laeti"
			);
			return;
		}
		
		/**
		 * 조회 대상 닉네임.
		 * @type {string}
		 */
		const nickname = args.join(" ").trim();
		if(!nickname){
			msg.reply(
				"[캐릭터 조회] '/캐릭터 (닉네임)'으로 입력해주세요.\n" +
				"예시: /캐릭터 Laeti"
			);
			return;
		}
		
		try{
			// 닉네임 기준 랭킹 데이터를 백엔드에서 조회한다.
			const result = mobinogiUtil.getUserRankByNickname(nickname);
			if(!result || !result.success){
				msg.reply(`[캐릭터 조회] "${nickname}" 조회에 실패했습니다.`);
				return;
			}
			
			// 조회 결과가 없으면 유사 닉네임 제안을 함께 보여준다.
			if(!result.found){
				let notFoundText = `[캐릭터 조회] "${nickname}" 정보를 찾지 못했어요.`;
				if(Array.isArray(result.suggestions) && result.suggestions.length > 0){
					notFoundText += "\n\n비슷한 닉네임\n";
					for(let i = 0 ; i < result.suggestions.length ; i++){
						notFoundText += `- ${result.suggestions[i]}\n`;
					}
					notFoundText = notFoundText.trim();
				}
				msg.reply(notFoundText);
				return;
			}
			
			// 전투력 내림차순으로 정렬해 상단부터 읽기 쉽게 노출한다.
			const rankRows = Array.isArray(result.ranks) ? result.ranks.slice() : [];
			rankRows.sort((left, right) => {
				const leftPower = left && left.userPower != null ? Number(left.userPower) : -1;
				const rightPower = right && right.userPower != null ? Number(right.userPower) : -1;
				return rightPower - leftPower;
			});
			
			let outputText = `[캐릭터 조회] ${result.nickname || nickname}\n` +
				`━━━━━━━━━━━━━━━━\n` +
				`조회 건수: ${rankRows.length}개` +
				`${seeAllViewText}\n`;
			
			// 서버별 랭킹 행을 순회하며 상세 스탯을 붙인다.
			for(let i = 0 ; i < rankRows.length ; i++){
				const rank = rankRows[i] || {};
				const serverName = rank.serverName || "알 수 없음";
				const serverId = rank.serverId != null ? rank.serverId : "-";
				outputText +=
					`\n[${i + 1}] ${serverName} (서버ID: ${serverId})\n` +
					`- 전투력      : ${formatRankNumber(rank.userPower)}\n` +
					`- 생활력      : ${formatRankNumber(rank.userVitality)}\n` +
					`- 매력        : ${formatRankNumber(rank.userAttractiveness)}\n` +
					`- 갱신 시각   : ${formatRankUpdatedAt(rank.updatedAt)}\n`;
			}
			
			msg.reply(outputText.trim());
		}catch(e){
			console.error("[rank] Failed to fetch user rank: " + e);
			msg.reply(`[캐릭터 조회] "${nickname}" 조회 중 오류가 발생했습니다.`);
		}
	}
	
	/**
	 * `/아이템` 명령어를 처리한다.
	 * @param {object} msg
	 * @param {string[]} args
	 */
	function handleItemUseCommand(msg, args){
		// 아이템명이 없으면 기본 사용 예시를 반환한다.
		if(args.length === 0){
			msg.reply("[아이템 정보] 아이템 획득 경로 및 재료 정보를 제공해드려요.\n" +
				"'/아이템 (아이템명)'으로 검색해주세요!\n" +
				"예시: /아이템 미스틱 다이스 열쇠 상자");
			return;
		}
		
		/**
		 * 조회 대상 아이템명.
		 * @type {string}
		 */
		const itemName = args.join(" ").trim();
		
		try{
			// 아이템 상세(물교/제작)를 백엔드 API에서 조회한다.
			const data = mobinogiUtil.getMobinogiItem(itemName);
			if(!data || !data.itemName){
				msg.reply(`[아이템 정보] '${itemName}' 아이템을 찾을 수 없습니다.`);
				return;
			}
			
			let outputText = `[아이템 정보] ${data.itemName}\n${seeAllViewText}\n`;
			
			const bartersByItemId = data.bartersByItemId || [];
			const bartersByExchangeId = data.bartersByExchangeId || [];
			const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
			
			// 아이템을 획득하는 쪽 물물교환 루트를 먼저 렌더링한다.
			if(bartersByItemId.length > 0){
				outputText += "\n🔄 획득 가능한 물물교환\n\n";
				for(let i = 0 ; i < bartersByItemId.length ; i++){
					const barter = bartersByItemId[i];
					outputText += ` 🚢 교환 경로 ${i + 1}\n`;
					outputText +=
						`  - 지역: ${barter.gameRegion?.regionName || "-"}\n` +
						`  - NPC: ${barter.gameNpc?.npcName || "-"}\n` +
						`  - 필요: ${barter.exchangeItem?.itemName || "-"} x${barter.exchangeCost}\n` +
						`  - 획득: ${barter.gameItem?.itemName || "-"} x${barter.barterQty}\n`;
					if(barter.barterServer || barter.barterNpc){
						outputText += `  - 비고: ${barter.barterServer ? "서버 공유" : ""}${barter.barterServer && barter.barterNpc ? " / " : ""}${barter.barterNpc ? "NPC 공유" : ""}\n`;
					}
					outputText += "\n";
				}
			}
			
			// 아이템이 재료로 사용되는 물물교환 루트를 별도 섹션으로 렌더링한다.
			if(bartersByExchangeId.length > 0){
				outputText += "🔄 재료로 사용되는 물물교환\n\n";
				for(let i = 0 ; i < bartersByExchangeId.length ; i++){
					const barter = bartersByExchangeId[i];
					outputText += ` 🚢 교환 경로 ${i + 1}\n`;
					outputText +=
						`  - 지역: ${barter.gameRegion?.regionName || "-"}\n` +
						`  - NPC: ${barter.gameNpc?.npcName || "-"}\n` +
						`  - 필요: ${barter.exchangeItem?.itemName || "-"} x${barter.exchangeCost}\n` +
						`  - 획득: ${barter.gameItem?.itemName || "-"} x${barter.barterQty}\n`;
					if(barter.barterServer || barter.barterNpc){
						outputText += `  - 비고: ${barter.barterServer ? "서버 공유" : ""}${barter.barterServer && barter.barterNpc ? " / " : ""}${barter.barterNpc ? "NPC 공유" : ""}\n`;
					}
					outputText += "\n";
				}
			}
			
			const craftsBySubId = data.craftsBySubId || {};
			const craftKeys = Object.keys(craftsBySubId);
			const hasCrafts = craftKeys.length > 0;
			
			// 제작 레시피가 있으면 레시피 단위로 필요한 재료를 출력한다.
			if(hasCrafts){
				outputText += `🛠 제작 (레시피 ${craftKeys.length}개)\n\n`;
				for(let i = 0 ; i < craftKeys.length ; i++){
					const crafts = craftsBySubId[craftKeys[i]];
					outputText += ` 📋 레시피 ${i + 1}: ${crafts[0]?.gameItem?.itemName || "-"}\n`;
					for(let j = 0 ; j < crafts.length ; j++){
						outputText += `  - ${crafts[j].ingredientItem?.itemName || "-"} x${crafts[j].craftIngredientCost}\n`;
					}
					outputText += "\n";
				}
			}
			
			// 물교/제작 정보가 모두 없으면 빈 데이터임을 명시한다.
			if(!hasBarters && !hasCrafts){
				outputText += "\n물물교환 및 제작 관련 정보가 없습니다.";
			}
			
			msg.reply(outputText);
		}catch(e){
			console.error("[item] Failed to fetch item info: " + e);
			msg.reply(`[아이템 정보] '${itemName}' 아이템을 찾을 수 없습니다.`);
		}
	}
	
	return {
		handleRankingCommand,
		handleItemUseCommand,
		handleNoticeListCommand,
		handleEventListCommand
	};
}

/**
 * 심구/어구 알림 서비스 인스턴스.
 * @type {object}
 */
const holeAlarmService = createHoleAlarmService({
	bot,
	mobinogiUtil,
	staticText,
	chatRoomList,
	announceRoomKeyword,
	dawnQuietStartHour,
	dawnQuietEndHour
});

/**
 * 게임 이벤트/공지 감시 서비스 인스턴스.
 * @type {object}
 */
const gameFeedWatchService = createGameFeedWatchService({
	mobinogiUtil,
	broadcastToChatRooms : holeAlarmService.broadcastToChatRooms,
	snapshotFilePath : gameFeedSnapshotFilePath,
	javaIo
});

/**
 * 조회 서비스 인스턴스.
 * @type {object}
 */
const infoService = createInfoService({
	mobinogiUtil,
	seeAllViewText
});

/**
 * 명령어 라우터 핸들러.
 * @type {Function}
 */
/**
 * 명령어 라우터 핸들러를 생성한다.
 * @param {object} options
 * @param {object} options.commandList
 * @param {string[]} options.chatRoomList
 * @param {string} options.devMessage
 * @param {object} options.staticText
 * @param {object} options.holeAlarmService
 * @param {object} options.infoService
 * @returns {Function}
 */
function createCommandRouter(options){
	/**
	 * 명령어 메타데이터 사전.
	 * @type {object}
	 */
	const commandList = options.commandList;
	
	/**
	 * 브로드캐스트 대상 채팅방 목록.
	 * @type {string[]}
	 */
	const chatRoomList = options.chatRoomList;
	
	/**
	 * 명령 실행 room이 브로드캐스트 대상인지 확인한다.
	 * - 관리방 목록 정확 일치
	 * - 테스트방(`test1`, `test2`)은 강제 허용
	 * @param {string|null|undefined} room
	 * @returns {boolean}
	 */
	function shouldBroadcastFromRoom(room){
		if(room == null){
			return false;
		}
		const roomText = `${room}`.trim();
		if(!roomText){
			return false;
		}
		if(roomText === "test1" || roomText === "test2"){
			return true;
		}
		return chatRoomList.indexOf(roomText) > -1 || chatRoomList.includes(roomText);
	}
	
	/**
	 * 개발 공지 메시지 고정 문구.
	 * @type {string}
	 */
	const devMessage = options.devMessage;
	
	/**
	 * 정적 텍스트 모듈.
	 * @type {object}
	 */
	const staticText = options.staticText;
	
	/**
	 * 심구/어구 알림 서비스.
	 * @type {object}
	 */
	const holeAlarmService = options.holeAlarmService;
	
	/**
	 * 캐릭터/아이템 조회 서비스.
	 * @type {object}
	 */
	const infoService = options.infoService;
	
	/**
	 * commandList 항목에서 명령어 이름을 안전하게 읽는다.
	 * @param {string} key
	 * @param {string} fallback
	 * @returns {string}
	 */
	function getCommandName(key, fallback){
		const entry = commandList && commandList[key];
		if(entry && typeof entry.name === "string" && entry.name){
			return entry.name;
		}
		console.error(`[command-router] Missing commandList entry: key=${key}, fallback=${fallback}`);
		return fallback;
	}
	
	const helpCommandName = getCommandName("help", "명령어");
	const partyCommandName = getCommandName("party", "파티");
	const mafiaCommandName = getCommandName("mafia", "마피아");
	const devCommandName = getCommandName("dev", "개발");
	const abyssHoleCommandName = getCommandName("abyssHole", "어구");
	const characterCommandName = getCommandName("character", "캐릭터");
	const itemUseCommandName = getCommandName("itemUse", "아이템");
	const noticeCommandName = getCommandName("notice", "공지");
	const eventCommandName = getCommandName("event", "이벤트");
	
	/**
	 * `/명령어` 안내를 응답한다.
	 * @param {object} msg
	 * @param {string[]} args
	 */
	function handleCommandGuideCommand(msg, args){
		// `/명령어 [명령어 이름]` 형태를 지원하기 위해 인자를 공백으로 합친다.
		const targetCommandName = Array.isArray(args) ? args.join(" ").trim() : "";
		msg.reply(staticText.createCommandGuideText(targetCommandName));
	}
	
	/**
	 * BotManager `Event.COMMAND` 리스너.
	 * @param {object} msg
	 */
	return function onCommand(msg){
		/**
		 * 명령어를 받은 채팅방 이름.
		 * @type {string}
		 */
		const room = msg.room;
		
		/**
		 * 명령어를 보낸 사용자.
		 * @type {object}
		 */
		const author = msg.author;
		
		/**
		 * 파싱된 명령어 이름(`/` 제외).
		 * @type {string}
		 */
		const command = msg.command;
		
		/**
		 * 명령어 인자 배열.
		 * @type {string[]}
		 */
		const args = msg.args;
		console.log(`[command-router][entry] room=${room}, content=${msg.content}, command=${command}, args=${JSON.stringify(args)}, chatRoomList=${JSON.stringify(chatRoomList)}`);
		
		// 명령어 메타데이터 기준으로 기능 핸들러를 라우팅한다.
		switch(command){
			case helpCommandName:
				handleCommandGuideCommand(msg, args);
				break;
			case partyCommandName:
				// 파티 모집은 공지방으로만 중계한다.
				const canBroadcastParty = shouldBroadcastFromRoom(room);
				console.log(`[command-router][파티] room=${room}, canBroadcast=${canBroadcastParty}, chatRoomList=${JSON.stringify(chatRoomList)}`);
				if(canBroadcastParty){
					holeAlarmService.sendToChatRoom(chatRoomList[1], `[파티 모집 - by. ${author.name}]\n${args.join(" ")}`);
				}
				break;
			case mafiaCommandName:
				// 마피아 모집은 일반 길드방으로만 중계한다.
				const canBroadcastMafia = shouldBroadcastFromRoom(room);
				console.log(`[command-router][마피아] room=${room}, canBroadcast=${canBroadcastMafia}, chatRoomList=${JSON.stringify(chatRoomList)}`);
				if(canBroadcastMafia){
					holeAlarmService.sendToChatRoom(chatRoomList[0], `[마피아 메시지 - by. ${author.name}]\n${args.join(" ")}`);
				}
				break;
			case devCommandName:
				// 개발 메시지는 등록된 모든 룸으로 보낸다.
				const canBroadcastDev = shouldBroadcastFromRoom(room);
				console.log(`[command-router][개발] room=${room}, canBroadcast=${canBroadcastDev}, chatRoomList=${JSON.stringify(chatRoomList)}`);
				if(canBroadcastDev){
					for(let i = 0 ; i < chatRoomList.length ; i++){
						holeAlarmService.sendToChatRoom(chatRoomList[i], `[개발 메시지] ${args.join(" ")}\n${devMessage}`);
					}
				}
				break;
			case abyssHoleCommandName:
				holeAlarmService.handleAbyssHoleCommand(msg, room, args);
				break;
			case characterCommandName:
				infoService.handleRankingCommand(msg, args);
				break;
			case itemUseCommandName:
				infoService.handleItemUseCommand(msg, args);
				break;
			case noticeCommandName:
				infoService.handleNoticeListCommand(msg, args);
				break;
			case eventCommandName:
				infoService.handleEventListCommand(msg, args);
				break;
			default:
				// `/심구`, `/2심구`, `/3심구`는 동일 핸들러로 보내되 holeCount만 다르게 계산한다.
				const deepHoleMatch = command.match(/^(\d*)?심구$/);
				if(command.indexOf("심구") > -1){
					console.log(`[command-router][심구][route-check] room=${room}, command=${command}, args=${JSON.stringify(args)}, deepHoleMatch=${deepHoleMatch ? "Y" : "N"}`);
				}
				if(deepHoleMatch){
					const parsedHoleCount = parseInt(deepHoleMatch[1], 10);
					const holeCount = isNaN(parsedHoleCount) ? 1 : Math.max(1, Math.min(parsedHoleCount, 3));
					console.log(`[command-router][심구][route-hit] holeCount=${holeCount}`);
					holeAlarmService.handleDeepHoleCommand(msg, room, args, holeCount);
				}
				break;
		}
	};
}

const onCommand = createCommandRouter({
	commandList,
	chatRoomList,
	devMessage,
	staticText,
	holeAlarmService,
	infoService
});

/**
 * 백그라운드 동기화 루프를 부팅 직후 시작한다.
 */
function startBackgroundSyncOnBoot(){
	try{
		holeAlarmService.startIfNeeded();
	}catch(e){
		console.error("[hole-alarm] Failed to start sync from boot: " + e);
	}
	
	try{
		gameFeedWatchService.startIfNeeded();
	}catch(e){
		console.error("[game-feed-watch] Failed to start sync from boot: " + e);
	}
}

// 런타임 로드 직후 동기화 루프를 시작한다.
startBackgroundSyncOnBoot();

/**
 * 일반 메시지 이벤트 핸들러.
 * - 부팅 시 시작 실패한 동기화 루프를 메시지 수신 시 재시도한다.
 * - `/` 단독 입력은 디버깅 정보 로깅 용도로 사용한다.
 * @param {object} msg
 */
function onMessage(msg){
	// 부팅 시 시작에 실패한 경우를 대비해 메시지 시점에도 재시도한다.
	try{
		holeAlarmService.startIfNeeded();
	}catch(e){
		console.error("[hole-alarm] Failed to start sync from onMessage: " + e);
	}
	
	// 부팅 시 시작에 실패한 경우를 대비해 메시지 시점에도 재시도한다.
	try{
		gameFeedWatchService.startIfNeeded();
	}catch(e){
		console.error("[game-feed-watch] Failed to start sync from onMessage: " + e);
	}
	
	if(typeof msg.content === "string" && msg.content.indexOf("/") === 0){
		console.log(`[message][slash] room=${msg.room}, content=${msg.content}, channelId=${msg.channelId}`);
	}
	
	// `/` 단독 입력은 디버깅 로그를 출력한다.
	if(msg.content === "/"){
		console.log("channelId : " + msg.channelId + "\n" +
			"room : " + msg.room + "\n" +
			"author : " + msg.author.name + "\n" +
			"command : " + msg.content + "\n" +
			"image : " + JSON.stringify(msg.image) + "\n" +
			"isMention : " + msg.isMention + "\n" +
			"packageName : " + msg.packageName
		);
	}
}

// 메시지/명령어 이벤트를 런타임에 등록한다.
bot.addListener(Event.MESSAGE, onMessage);
bot.setCommandPrefix("/");
bot.addListener(Event.COMMAND, onCommand);

/**
 * 액티비티 생성 이벤트 핸들러.
 * @param {object} savedInstanceState
 * @param {object} activity
 */
function onCreate(savedInstanceState, activity){
	// 기본 텍스트뷰를 렌더링해 액티비티 레이아웃을 구성한다.
	const textView = new android.widget.TextView(activity);
	textView.setText("Hello, World!");
	textView.setTextColor(android.graphics.Color.DKGRAY);
	activity.setContentView(textView);
}

/**
 * 액티비티 시작 이벤트 핸들러.
 * @param {object} activity
 */
function onStart(activity){
}

/**
 * 액티비티 재개 이벤트 핸들러.
 * @param {object} activity
 */
function onResume(activity){
}

/**
 * 액티비티 일시정지 이벤트 핸들러.
 * @param {object} activity
 */
function onPause(activity){
}

/**
 * 액티비티 정지 이벤트 핸들러.
 * @param {object} activity
 */
function onStop(activity){
}

/**
 * 액티비티 재시작 이벤트 핸들러.
 * @param {object} activity
 */
function onRestart(activity){
}

/**
 * 액티비티 종료 이벤트 핸들러.
 * @param {object} activity
 */
function onDestroy(activity){
}

/**
 * 액티비티 뒤로가기 이벤트 핸들러.
 * @param {object} activity
 */
function onBackPressed(activity){
}

// 액티비티 라이프사이클 이벤트를 런타임에 등록한다.
bot.addListener(Event.Activity.CREATE, onCreate);
bot.addListener(Event.Activity.START, onStart);
bot.addListener(Event.Activity.RESUME, onResume);
bot.addListener(Event.Activity.PAUSE, onPause);
bot.addListener(Event.Activity.STOP, onStop);
bot.addListener(Event.Activity.RESTART, onRestart);
bot.addListener(Event.Activity.DESTROY, onDestroy);
bot.addListener(Event.Activity.BACK_PRESSED, onBackPressed);

