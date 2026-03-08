/**
 * Runtime entry for messenger bot.
 * 실제 기능은 서비스/라우터 모듈로 분리하고 이 파일은 wiring만 담당한다.
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
 * 심구/어구 알림 서비스 모듈.
 * @type {object}
 */
const holeAlarmModule = require("hole-alarm-service");

/**
 * 게임 이벤트/공지 감시 서비스 모듈.
 * @type {object}
 */
const gameFeedWatchModule = require("game-feed-watch-service");

/**
 * 캐릭터/아이템 조회 서비스 모듈.
 * @type {object}
 */
const infoModule = require("game-info-service");

/**
 * 명령어 라우터 모듈.
 * @type {object}
 */
const routerModule = require("command-router");

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
 * 심구/어구 알림 서비스 인스턴스.
 * @type {object}
 */
const holeAlarmService = holeAlarmModule.createHoleAlarmService({
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
const gameFeedWatchService = gameFeedWatchModule.createGameFeedWatchService({
	mobinogiUtil,
	broadcastToChatRooms : holeAlarmService.broadcastToChatRooms,
	snapshotFilePath : gameFeedSnapshotFilePath,
	javaIo
});

/**
 * 조회 서비스 인스턴스.
 * @type {object}
 */
const infoService = infoModule.createInfoService({
	mobinogiUtil,
	seeAllViewText
});

/**
 * 명령어 라우터 핸들러.
 * @type {Function}
 */
const onCommand = routerModule.createCommandRouter({
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
