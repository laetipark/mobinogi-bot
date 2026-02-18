const scriptName = "mobinogi-bot";
const mobinogiUtil = require("mobinogi-util");

/**
 * 메신저봇에 대한 BotManager 불러오기
 */
const bot = BotManager.getCurrentBot();

/**
 * @constructor
 * @description 명령어 리스트
 */
function CommandList(){
	this.party = {
		name : "파티",
		description : "공지방에 알림을 제공합니다."
	};
	this.mafia = {
		name : "마피아",
		description : "공지방에 알림을 제공합니다."
	};
	this.deepHole = {
		name : "심구",
		description : "심층으로 뚫린 검은 구멍 알림을 제공합니다."
	};
	this.abyssHole = {
		name : "어구",
		description : "어비스로 뚫린 검은 구멍 알림을 제공합니다."
	};
	this.itemUse = {
		name : "아이템",
		description : "아이템 획득 경로 및 재료 정보를 제공합니다."
	};
	this.character = {
		name : "캐릭터",
		description : "닉네임 기준 캐릭터 정보를 조회합니다."
	};
	this.dev = {
		name : "개발0205",
		description : "개발 메시지를 전송합니다."
	};
}

function RegionList(){
	this.iceCanyon = "얼음 협곡";
	this.cloudWilderness = "구름 황야";
	this.goddessGarden = "여신의 뜰";
	this.senmaiPlain = "센마이 평원";
}

const commandList = new CommandList();
const regionList = new RegionList();
const seeAllViewText = "\u200b".repeat(500);

let chatRoomList = ["test1", "test2"];
//let chatRoomList = ["guild_sexy", "guild_sexy_announce"];
let devRoom = "test";
let devMessage =
	"* 개발자 :\nLaeti(아이라 서버/수도사)\n" +
	"* 연락처 :\nhttps://open.kakao.com/me/laetipark";

const holeType = {
	deep : "DEEP",
	abyss : "ABYSS"
};
const holeAlarmTimezoneOffsetMinutes = 9 * 60; // Asia/Seoul (KST)
const abyssOpenDurationMinutes = 15;
const abyssOpenDurationMs = abyssOpenDurationMinutes * 60 * 1000;
const abyssOneHourNoticeLeadMs = 60 * 60 * 1000;
const abyssRefillIntervalMinutes = (36 * 60) + 15;
const abyssAutoGenerateCount = 10;
const holeAlarmCheckIntervalMs = 10000;
const holeAlarmSyncIntervalMs = 60000;
const holeAlarmSyncTickIntervalMs = 250;
let holeAlarmTable = {};
let holeAlarmSyncTimer = null;
let holeAlarmNextSyncBoundaryMs = 0;
let isHoleAlarmSyncStarted = false;
let isHoleAlarmSyncStartLogged = false;
let abyssOneHourNoticeSentKey = "";
let abyssOneHourNoticeActiveEndTimeMs = 0;
let deepHoleTip = "";

let abyssHoleTip =
	"* 파티를 구성해 최초 클리어에 도전하세요! 모두 같은 장소에 있어야 원활하게 입장할 수 있어요.\n\n" +
	"- \"어비스로 뚫린 검은 구멍\"은 \"여신의 뜰/얼음 협곡/구름 황야\" 사냥터에 등장하며, 각 사냥터에 65레벨 기준의 동일한 난이도로 등장합니다.\n" +
	"- \"어비스\" 입문 단계 1회 이상 클리어 시 \"어비스로 뚫린 검은 구멍\"에 입장할 수 있습니다.\n" +
	"- \"어비스로 뚫린 검은 구멍\"은 등장 1시간 전부터 각 사냥터의 타운맵에 등장 정보가 표시됩니다.\n" +
	"- \"기존 검은 구멍 일일 횟수와 별도로 입장 횟수에 제한이 없습니다.\"\n" +
	"- 사냥터 별로 최초 클리어 한 캐릭터명 또는 파티명이 월드 채팅에 노출되며, 1회 한하여 \"아득한 지하를 밝힌 자\" 타이틀을 획득합니다.\n" +
	"- \"아득한 지하를 밝힌 자\" 타이틀은 장착 효과 외 보유 효과를 가지고 있습니다.";

function getAlarmTime(time){
	const date = new Date(time);
	let h = date.getHours();
	let m = date.getMinutes();
	h = h < 10 ? `0${h}` : h;
	m = m < 10 ? `0${m}` : m;
	return `${h}:${m}`;
}

function hasCommonChars(input, regionName, minCount){
	if(!minCount) minCount = 2;
	let commonCount = 0;
	for(let i = 0 ; i < input.length ; i++){
		const char = input.charAt(i);
		if(regionName.indexOf(char) > -1){
			commonCount++;
		}
	}
	return commonCount >= minCount;
}

function getDeepHoleHeader(holeCount){
	if(holeCount > 0){
		return `[심구알림] 심층 구멍 ${holeCount}개 알림! 🕳️`;
	}
	return "[심구알림]";
}

function formatDeepHoleAlarm(alarm){
	const header = getDeepHoleHeader(alarm.holeCount || 0);
	return `${header}\n- "${alarm.regionName}"에 ${alarm.time}까지 열려요!`;
}

function padNumber(value){
	return value < 10 ? `0${value}` : `${value}`;
}

function toDateTimeText(time){
	const date = new Date(time);
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
}

function parseDateTimeText(dateTimeText){
	if(!dateTimeText){
		return null;
	}
	const normalizedText = `${dateTimeText}`.trim().replace(" ", "T");

	// Timezone-less datetime from backend is treated as KST.
	const localMatch = normalizedText.match(
		/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})T(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.(\d{1,3}))?$/
	);
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

	// For explicit timezone formats (e.g. ...Z, ...+09:00), rely on Date parser.
	const parsedTime = new Date(normalizedText).getTime();
	return isNaN(parsedTime) ? null : parsedTime;
}

function getAlarmMillisFromTableRow(alarm){
	if(!alarm){
		return null;
	}
	
	const holeEndTime = parseDateTimeText(alarm.holeEndTime);
	if(holeEndTime != null){
		return holeEndTime;
	}
	
	const deepEndTime = parseDateTimeText(alarm.deepHoleEndTime);
	if(deepEndTime != null){
		return deepEndTime;
	}
	
	const legacyAbyssOpenTime = parseDateTimeText(alarm.abyssOpenTime);
	if(legacyAbyssOpenTime != null){
		return legacyAbyssOpenTime + abyssOpenDurationMs;
	}
	
	return null;
}

function getAbyssOpenMillisFromTableRow(alarm){
	const abyssOpenTime = parseDateTimeText(alarm && alarm.abyssOpenTime);
	if(abyssOpenTime != null){
		return abyssOpenTime;
	}

	const endTime = getAlarmMillisFromTableRow(alarm);
	if(endTime == null){
		return null;
	}
	return endTime - abyssOpenDurationMs;
}

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

function normalizeRegionName(inputRegion){
	if(!inputRegion){
		return "";
	}
	return hasCommonChars(inputRegion, regionList.goddessGarden, 2) ? regionList.goddessGarden :
		hasCommonChars(inputRegion, regionList.iceCanyon, 2) ? regionList.iceCanyon :
			hasCommonChars(inputRegion, regionList.cloudWilderness, 2) ? regionList.cloudWilderness :
				hasCommonChars(inputRegion, regionList.senmaiPlain, 2) ? regionList.senmaiPlain : "";
}

function broadcastToChatRooms(message){
	for(let i = 0 ; i < chatRoomList.length ; i++){
		bot.send(chatRoomList[i], message);
	}
}

function formatDeepHoleAlarmFromTable(alarm){
	const alarmTime = getAlarmMillisFromTableRow(alarm);
	return formatDeepHoleAlarm({
		regionName : alarm.regionName || "-",
		time : alarmTime ? getAlarmTime(alarmTime) : "-",
		holeCount : alarm.holeCount || 0
	});
}

function clearHoleAlarmEntry(alarmId){
	const alarm = holeAlarmTable[alarmId];
	if(!alarm){
		return;
	}
	if(alarm.intervalId){
		clearInterval(alarm.intervalId);
	}
	delete holeAlarmTable[alarmId];
}

function clearLocalHoleAlarmsByType(typeName){
	Object.keys(holeAlarmTable).forEach((id) => {
		const alarm = holeAlarmTable[id];
		if(alarm && alarm.data && alarm.data.holeType === typeName){
			clearHoleAlarmEntry(Number(id));
		}
	});
}

function removeLocalDeepAlarmByRegion(regionName){
	Object.keys(holeAlarmTable).forEach((id) => {
		const alarm = holeAlarmTable[id];
		if(alarm && alarm.data && alarm.data.holeType === holeType.deep && alarm.data.regionName === regionName){
			clearHoleAlarmEntry(Number(id));
		}
	});
}

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

function sendAbyssPreAlert(alarm){
	const openTime = getAbyssOpenMillisFromTableRow(alarm);
	const timeText = openTime ? getAlarmTime(openTime) : "-";
	broadcastToChatRooms(
		`[어구알림] 어비스로 뚫린 검은 구멍 열리기 10분 전입니다.\n` +
		` - 시간 : ${timeText}\n` +
		`${seeAllViewText}\n\n` + abyssHoleTip
	);
}

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

function sendAbyssOpenAlert(alarm){
	broadcastToChatRooms(
		`[어구알림] 어비스로 뚫린 검은 구멍이 열렸습니다!\n` +
		`${seeAllViewText}\n\n` + abyssHoleTip
	);
}

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

function processAbyssOneHourNotices(alarms){
	const now = new Date().getTime();

	if(abyssOneHourNoticeActiveEndTimeMs > 0 && now >= abyssOneHourNoticeActiveEndTimeMs){
		console.log(
			`[hole-alarm] Abyss notice lock released at endTime=${toDateTimeText(abyssOneHourNoticeActiveEndTimeMs)}`
		);
		abyssOneHourNoticeSentKey = "";
		abyssOneHourNoticeActiveEndTimeMs = 0;
	}

	if(abyssOneHourNoticeActiveEndTimeMs > now){
		return;
	}

	const target = findAbyssAlarmWithinOneHour(alarms, now);
	if(!target.alarm || target.openTime == null || target.remainingMs == null){
		const abyssCount = alarms.filter((alarm) => alarm && alarm.holeType === holeType.abyss).length;
		if(abyssCount > 0){
			const nearestText = target.nearestFutureOpenTime == null ?
				"nearestOpen=-" :
				`nearestOpen=${toDateTimeText(target.nearestFutureOpenTime)}, nearestRemainingMinutes=${Math.ceil(target.nearestFutureRemainingMs / (60 * 1000))}`;
			console.log(`[hole-alarm] No abyss within 60m. now=${toDateTimeText(now)}, abyssCount=${abyssCount}, ${nearestText}`);
		}
		return;
	}

	const nextNoticeKey = `${target.alarm.id}:${target.openTime}`;
	if(abyssOneHourNoticeSentKey !== nextNoticeKey){
		const alarmEndTime = getAlarmMillisFromTableRow(target.alarm);
		const lockEndTime = alarmEndTime == null ? (target.openTime + abyssOpenDurationMs) : alarmEndTime;
		console.log(
			`[hole-alarm] Found abyss within 60m: id=${target.alarm.id}, openTime=${toDateTimeText(target.openTime)}, remainingMinutes=${Math.ceil(target.remainingMs / (60 * 1000))}, lockUntil=${toDateTimeText(lockEndTime)}`
		);
		sendAbyssOneHourAlert(target.alarm, target.remainingMs);
		abyssOneHourNoticeSentKey = nextNoticeKey;
		abyssOneHourNoticeActiveEndTimeMs = lockEndTime;
	}
}

function consumeHoleAlarmEntry(alarmId){
	try{
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
		if(now >= targetTime){
			consumeHoleAlarmEntry(alarmId);
		}
		return;
	}
	
	const abyssOpenTime = getAbyssOpenMillisFromTableRow(alarm);
	if(abyssOpenTime == null){
		return;
	}
	
	const preAlertTime = abyssOpenTime - (10 * 60 * 1000);
	if(!row.isAbyssPreAlertSent && now >= preAlertTime && now < abyssOpenTime){
		sendAbyssPreAlert(alarm);
		row.isAbyssPreAlertSent = true;
	}
	
	if(now >= abyssOpenTime){
		sendAbyssOpenAlert(alarm);
		consumeHoleAlarmEntry(alarmId);
	}
}

function registerHoleAlarmEntry(alarm){
	if(!alarm || alarm.id == null){
		return;
	}
	const alarmId = Number(alarm.id);
	if(isNaN(alarmId)){
		return;
	}
	
	const previous = holeAlarmTable[alarmId];
	if(previous && previous.intervalId){
		clearInterval(previous.intervalId);
	}
	
	holeAlarmTable[alarmId] = {
		data : alarm,
		isAbyssPreAlertSent : previous ? previous.isAbyssPreAlertSent : false,
		intervalId : setInterval(() => {
			processHoleAlarmEntry(alarmId);
		}, holeAlarmCheckIntervalMs)
	};
	
	processHoleAlarmEntry(alarmId);
}

function syncHoleAlarmTable(){
	const alarms = fetchHoleAlarmsFromBackend();
	const syncedIdMap = {};
	for(let i = 0 ; i < alarms.length ; i++){
		const alarm = alarms[i];
		syncedIdMap[alarm.id] = true;
		registerHoleAlarmEntry(alarm);
	}
	
	Object.keys(holeAlarmTable).forEach((id) => {
		if(!syncedIdMap[id]){
			clearHoleAlarmEntry(Number(id));
		}
	});
	
	processAbyssOneHourNotices(getAbyssAlarmsFromLocalTable());
}

function startHoleAlarmSync(){
	if(!isHoleAlarmSyncStartLogged){
		console.log("[hole-alarm] startHoleAlarmSync started.");
		isHoleAlarmSyncStartLogged = true;
	}

	if(holeAlarmSyncTimer){
		clearInterval(holeAlarmSyncTimer);
	}

	try{
		syncHoleAlarmTable();
	}catch(e){
		console.error("[hole-alarm] Failed to run initial sync: " + e);
	}

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

function handleAbyssHoleCommand(msg, room, args){
	const minutes = Number(args[0]);
	if(!isNaN(minutes)){
		if(minutes <= 0){
			msg.reply(
				"[어구알림] '/어구 [숫자]'로 정보를 입력해주세요!\n" +
				"/어구 30 : 20분/30분 후 어구 알림"
			);
			return;
		}
		
		const currentAbyssAlarms = fetchHoleAlarmsFromBackend(holeType.abyss);
		let deletedCount = 0;
		const openTime = new Date().getTime() + (minutes * 60 * 1000);
		try{
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
				`[어구알림] ${getAlarmTime(openTime)}에 열려요!\n` +
				` - 자동 예약: ${generated.length}개 추가 (기본 ${abyssAutoGenerateCount}개 / ${abyssRefillIntervalMinutes}분 간격)` +
				`${deletedCount > 0 ? `\n - 기존 일정: ${deletedCount}개 삭제 후 재설정` : ""}`;
			if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
				broadcastToChatRooms(createText + `${seeAllViewText}\n\n` + abyssHoleTip);
			}else{
				msg.reply(createText + `${seeAllViewText}\n\n` + abyssHoleTip);
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
				"'/어구 [숫자]'로 정보를 입력해주세요!\n" +
				"/어구 30 : 20분/30분 후 어구 알림"
			);
			return;
		}
		
		let output = `[어구알림] 등록된 일정 (${currentAbyssAlarms.length}개)\n`;
		const previewCount = Math.min(currentAbyssAlarms.length, 10);
		for(let i = 0 ; i < previewCount ; i++){
			const alarm = currentAbyssAlarms[i];
			const time = getAbyssOpenMillisFromTableRow(alarm);
			output += `- ${time ? getAlarmTime(time) : "-"}\n`;
		}
		if(currentAbyssAlarms.length > previewCount){
			output += `- ... 외 ${currentAbyssAlarms.length - previewCount}개`;
		}
		msg.reply(output + `${seeAllViewText}\n\n` + abyssHoleTip);
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
	
	msg.reply(
		"[어구알림] '/어구 [숫자]'로 정보를 입력해주세요!\n" +
		"/어구 30 : 20분/30분 후 어구 알림"
	);
}

function handleDeepHoleCommand(msg, room, args, holeCount){
	const minutes = Number(args[0]);
	if(!isNaN(minutes)){
		if(minutes <= 0){
			msg.reply(
				"[심구알림] '/N심구 [분] (사냥터)'로 입력해주세요!\n" +
				"예시: /2심구 30 센마이\n\n" +
				"현재 지역명 목록\n" +
				"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
			);
			return;
		}
		
		const values = Object.values(regionList);
		const lastRegion = values[values.length - 1];
		const regionName = !args[1] ? lastRegion : normalizeRegionName(args[1]);
		
		if(!regionName){
			msg.reply(
				`[심구알림] "심구 지역명" 형태로 입력해주세요!\n` +
				"현재 지역명 목록\n" +
				"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
			);
			return;
		}
		
		const currentDeepAlarms = fetchHoleAlarmsFromBackend(holeType.deep);
		const existingRegionAlarm = currentDeepAlarms.find((alarm) => alarm.regionName === regionName);
		if(existingRegionAlarm){
			msg.reply(
				formatDeepHoleAlarmFromTable(existingRegionAlarm) + "\n\n" +
				"'/심구 확인'으로 확인해주세요.\n" +
				"'/심구 삭제 (사냥터)'로 알림을 삭제할 수 있습니다."
			);
			return;
		}
		
		const endTime = new Date().getTime() + (minutes * 60 * 1000);
		try{
			const createResult = mobinogiUtil.createDeepHoleAlarm(
				regionName,
				toDateTimeText(endTime),
				holeCount
			);
			if(!createResult || !createResult.success || !createResult.alarm){
				throw new Error("createDeepHoleAlarm failed.");
			}
			
			registerHoleAlarmEntry(createResult.alarm);
			const alarmText = formatDeepHoleAlarmFromTable(createResult.alarm);
			if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
				broadcastToChatRooms(alarmText + `${seeAllViewText}\n\n` + deepHoleTip);
			}else{
				msg.reply(alarmText + `${seeAllViewText}\n\n` + deepHoleTip);
			}
		}catch(e){
			console.error("[hole-alarm] Failed to create deep alarm: " + e);
			msg.reply("[심구알림] 심구 알림 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
		}
		return;
	}
	
	if(args[0] === "확인"){
		const currentDeepAlarms = fetchHoleAlarmsFromBackend(holeType.deep);
		if(currentDeepAlarms.length > 0){
			for(let i = 0 ; i < currentDeepAlarms.length ; i++){
				msg.reply(
					formatDeepHoleAlarmFromTable(currentDeepAlarms[i]) + `${seeAllViewText}\n\n` + deepHoleTip
				);
			}
		}else{
			msg.reply(
				"[심구알림] 현재 설정된 알림이 없습니다.\n" +
				"'/N심구 [분] (사냥터)'로 입력해주세요!\n" +
				"예시: /2심구 30 센마이\n\n" +
				"현재 지역명 목록\n" +
				"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
			);
		}
		return;
	}
	
	if(args[0] === "삭제"){
		const inputRegion = args[1];
		const inputRegionName = normalizeRegionName(inputRegion);
		if(!inputRegionName){
			msg.reply(
				`[심구알림] "${inputRegion || "-"}"에 해당하는 지역 정보를 찾을 수 없습니다.\n` +
				"현재 지역명 목록\n" +
				"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
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
					"현재 지역명 목록\n" +
					"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
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
	
	msg.reply(
		"[심구알림] '/N심구 [분] (사냥터)'로 입력해주세요!\n" +
		"예시: /2심구 30 센마이\n\n" +
		"현재 지역명 목록\n" +
		"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
	);
}

function formatRankNumber(value){
	if(value == null || isNaN(Number(value))){
		return "-";
	}
	return Number(value).toLocaleString("ko-KR");
}

function formatRankUpdatedAt(updatedAt){
	const time = parseDateTimeText(updatedAt);
	if(!time){
		return "-";
	}
	const date = new Date(time);
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function handleRankingCommand(msg, args){
	if(!args || args.length === 0){
		msg.reply(
			"[캐릭터 조회] '/캐릭터 (닉네임)'으로 입력해주세요.\n" +
			"예시: /캐릭터 Laeti"
		);
		return;
	}
	
	const nickname = args.join(" ").trim();
	if(!nickname){
		msg.reply(
			"[캐릭터 조회] '/캐릭터 (닉네임)'으로 입력해주세요.\n" +
			"예시: /캐릭터 Laeti"
		);
		return;
	}
	
	try{
		const result = mobinogiUtil.getUserRankByNickname(nickname);
		if(!result || !result.success){
			msg.reply(`[캐릭터 조회] "${nickname}" 조회에 실패했습니다.`);
			return;
		}
		
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
		
		for(let i = 0 ; i < rankRows.length ; i++){
			const rank = rankRows[i] || {};
			const serverName = rank.serverName || "알 수 없음";
			const serverId = rank.serverId != null ? rank.serverId : "-";
			outputText +=
				`\n[${i + 1}] ${serverName} (서버ID: ${serverId})\n` +
				`- 전투력      : ${formatRankNumber(rank.userPower)}\n` +
				`- 생활력  : ${formatRankNumber(rank.userVitality)}\n` +
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
 * (string) msg.content: 메시지의 내용
 * (string) msg.room: 메시지를 받은 방 이름
 * (User) msg.author: 메시지 전송자
 * (string) msg.author.name: 메시지 전송자 이름
 * (Image) msg.author.avatar: 메시지 전송자 프로필 사진
 * (string) msg.author.avatar.getBase64()
 * (string | null) msg.author.hash: 사용자의 고유 id
 * (boolean) msg.isGroupChat: 단체/오픈채팅 여부
 * (boolean) msg.isDebugRoom: 디버그룸에서 받은 메시지일 시 true
 * (string) msg.packageName: 메시지를 받은 메신저의 패키지명
 * (void) msg.reply(string): 답장하기
 * (boolean) msg.isMention: 메세지 맨션 포함 여부
 * (bigint) msg.logId: 각 메세지의 고유 id
 * (bigint) msg.channelId: 각 방의 고유 id
 */
function onMessage(msg){
	if(!isHoleAlarmSyncStarted){
		try{
			startHoleAlarmSync();
			isHoleAlarmSyncStarted = true;
		}catch(e){
			console.error("[hole-alarm] Failed to start sync from onMessage: " + e);
		}
	}
	
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

bot.addListener(Event.MESSAGE, onMessage);

/**
 * (string) msg.content: 메시지의 내용
 * (string) msg.room: 메시지를 받은 방 이름
 * (User) msg.author: 메시지 전송자
 * (string) msg.author.name: 메시지 전송자 이름
 * (Image) msg.author.avatar: 메시지 전송자 프로필 사진
 * (string) msg.author.avatar.getBase64()
 * (boolean) msg.isDebugRoom: 디버그룸에서 받은 메시지일 시 true
 * (boolean) msg.isGroupChat: 단체/오픈채팅 여부
 * (string) msg.packageName: 메시지를 받은 메신저의 패키지명
 * (void) msg.reply(string): 답장하기
 * (string) msg.command: 명령어 이름
 * (Array) msg.args: 명령어 인자 배열
 */
function onCommand(msg){
	const room = msg.room,
		author = msg.author,
		command = msg.command,
		args = msg.args;
	
	switch(command){
		case commandList.party.name:
			if(chatRoomList.includes(room)){
				bot.send(chatRoomList[0], `[파티 모집 - by. ${author.name}]\n${args.join(" ")}`);
			}
			break;
		case commandList.mafia.name:
			if(chatRoomList.includes(room)){
				bot.send(chatRoomList[0], `[마피아 메시지 - by. ${author.name}]\n${args.join(" ")}`);
			}
			break;
		case commandList.dev.name:
			if(chatRoomList.includes(room)){
				for(let i = 0 ; i < chatRoomList.length ; i++){
					bot.send(chatRoomList[i], `[개발 메시지] ${args.join(" ")}\n` + devMessage);
				}
			}
			break;
		case commandList.abyssHole.name:
			handleAbyssHoleCommand(msg, room, args);
			break;
		case commandList.character.name:
			handleRankingCommand(msg, args);
			break;
		case commandList.itemUse.name:
			if(args.length === 0){
				msg.reply("[아이템 정보] 아이템 획득 경로 및 재료 정보를 제공해드려요.\n" +
					"'/아이템 (아이템명)'으로 검색해주세요!\n" +
					"예시: /아이템 미스틱 다이스 열쇠 상자");
			}else{
				try{
					const data = mobinogiUtil.getMobinogiItem(args.join(" ").trim());
					
					if(!data || !data.itemName){
						msg.reply("[아이템 정보] '" + args.join(" ") + "' 아이템을 찾을 수 없습니다.");
						break;
					}
					
					let outputText = `[아이템 정보] ${data.itemName}\n${seeAllViewText}\n`;
					
					// 물물교환 - 획득 경로
					const bartersByItemId = data.bartersByItemId || [];
					const bartersByExchangeId = data.bartersByExchangeId || [];
					const hasBarters = bartersByItemId.length > 0 || bartersByExchangeId.length > 0;
					
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
					
					// 물물교환 - 재료로 사용
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
					
					// 제작 정보
					const craftsBySubId = data.craftsBySubId || {};
					const craftKeys = Object.keys(craftsBySubId);
					const hasCrafts = craftKeys.length > 0;
					
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
					
					// 교환/제작 정보 없는 경우
					if(!hasBarters && !hasCrafts){
						outputText += "\n물물교환 및 제작 관련 정보가 없습니다.";
					}
					
					msg.reply(outputText);
				}catch(e){
					msg.reply("[아이템 정보] '" + args.join(" ") + "' 아이템을 찾을 수 없습니다.");
				}
			}
			break;
		default:
			const deepHoleMatch = command.match(/^(\d*)심구$/);
			if(deepHoleMatch){
				const parsedHoleCount = parseInt(deepHoleMatch[1]);
				const holeCount = isNaN(parsedHoleCount) ? 0 : Math.min(parsedHoleCount, 3);
				handleDeepHoleCommand(msg, room, args, holeCount);
			}
			break;
	}
}

bot.setCommandPrefix("/"); // /로 시작하는 메시지를 command로 판단
bot.addListener(Event.COMMAND, onCommand);

function onCreate(savedInstanceState, activity){
	const textView = new android.widget.TextView(activity);
	textView.setText("Hello, World!");
	textView.setTextColor(android.graphics.Color.DKGRAY);
	activity.setContentView(textView);
}

function onStart(activity){
}

function onResume(activity){
}

function onPause(activity){
}

function onStop(activity){
}

function onRestart(activity){
}

function onDestroy(activity){
}

function onBackPressed(activity){
}

bot.addListener(Event.Activity.CREATE, onCreate);
bot.addListener(Event.Activity.START, onStart);
bot.addListener(Event.Activity.RESUME, onResume);
bot.addListener(Event.Activity.PAUSE, onPause);
bot.addListener(Event.Activity.STOP, onStop);
bot.addListener(Event.Activity.RESTART, onRestart);
bot.addListener(Event.Activity.DESTROY, onDestroy);
bot.addListener(Event.Activity.BACK_PRESSED, onBackPressed);
