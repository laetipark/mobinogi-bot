const scriptName = "mobinogi-bot";
const config = require("config");

/**
 * 메신저봇에 대한 BotManager 불러오기
 */
const bot = BotManager.getCurrentBot();

const commandList = new CommandList();
const seeAllViewText = "\u200b".repeat(500);

let barrierAlarm = undefined,
	isBarrierAlarm = false,
	isBarrierAlert = false;

let deepHoleAlarm = undefined,
	isDeepHoleAlert = false,
	alarmTime = [];

/**
 * @constructor
 * @description 명령어 리스트
 */
function CommandList(){
	this.barrier = {
		name : "결계",
		description : "1시간 간격으로 결계 알림을 시작합니다."
	};
	this.deepHole = {
		name : "심구",
		description : "심층으로 뚫린 검은 구멍 알림을 제공합니다."
	};
	this.itemUse = {
		name : "아이템",
		description : "아이템 획득 경로 및 재료 정보를 제공합니다."
	};
}

/**
 * get data from server api
 * @param url
 * @param query
 * @returns {*}
 */
function getMobinogiApi(url, query){
	try{
		return config.getResponse(config.getMobinogiServerUrl(url + query));
	}catch(error){
		Log.error(error);
		throw error;
	}
}

function getAlarmTime(time){
	const date = new Date(time);
	let h = date.getHours();
	let m = date.getMinutes();
	h = h < 10 ? `0${h}` : h;
	m = m < 10 ? `0${m}` : m;
	return `${h}:${m}`;
}

function getCurrentTime(){
	const date = new Date();
	let h = date.getHours();
	let m = date.getMinutes();
	h = h < 10 ? `0${h}` : h;
	m = m < 10 ? `0${m}` : m;
	return `${h}:${m}`;
}

/**
 * (string) msg.content: 메시지의 내용
 * (string) msg.room: 메시지를 받은 방 이름
 * (User) msg.author: 메시지 전송자
 * (string) msg.author.name: 메시지 전송자 이름
 * (Image) msg.author.avatar: 메시지 전송자 프로필 사진
 * (string) msg.author.avatar.getBase64()
 * (string | null) msg.author.userHash: 사용자의 고유 id
 * (boolean) msg.isGroupChat: 단체/오픈채팅 여부
 * (boolean) msg.isDebugRoom: 디버그룸에서 받은 메시지일 시 true
 * (string) msg.packageName: 메시지를 받은 메신저의 패키지명
 * (void) msg.reply(string): 답장하기
 * (boolean) msg.isMention: 메세지 맨션 포함 여부
 * (bigint) msg.logId: 각 메세지의 고유 id
 * (bigint) msg.channelId: 각 방의 고유 id
 */
function onMessage(msg){
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
		content = msg.content,
		command = msg.command,
		args = msg.args,
		image = msg.image,
		isMention = msg.isMention,
		isGroupChat = msg.isGroupChat,
		packageName = msg.packageName;
	
	Log.info("room" + room + "\n" +
		"author" + JSON.stringify(author) + "\n" +
		"content" + content + "\n" +
		"command" + command + "\n" +
		"args" + args + "\n" +
		"image" + JSON.stringify(image) + "\n" +
		"isMention" + isMention + "\n" +
		"isGroupChat" + isGroupChat + "\n" +
		"packageName" + packageName
	);
	
	switch(command){
		case commandList.barrier.name:
			if(barrierAlarm){
				clearInterval(barrierAlarm);
				barrierAlarm = undefined;
			}
			
			if(!isBarrierAlarm){
				msg.reply("[BLOSSOM] 불길한 소환의 결계 알림이 시작되었습니다.");
				barrierAlarm = setInterval(() => {
					if(
						!isBarrierAlert &&
						(getCurrentTime().indexOf(":50") !== -1 ||
							getCurrentTime().indexOf(":00") !== -1)
					){
						Log.info(`[${isBarrierAlert}] : ${getCurrentTime()}`);
						if(getCurrentTime().indexOf(":50") !== -1){
							msg.reply("[결계알림] 불길한 소환의 결계 열리기 10분 전입니다.");
						}else if(getCurrentTime().indexOf(":00") !== -1){
							msg.reply("[결계알림] 불길한 소환의 결계가 열렸습니다!");
						}
						
						isBarrierAlert = true;
					}else if(
						isBarrierAlert &&
						(getCurrentTime().indexOf(":50") === -1 &&
							getCurrentTime().indexOf(":00") === -1)
					){
						Log.info(`[${isBarrierAlert}] : ${getCurrentTime()}`);
						isBarrierAlert = false;
					}
				}, 10000);
				
				isBarrierAlarm = true;
			}else{
				msg.reply("[BLOSSOM] 불길한 소환의 결계 알림이 종료되었습니다.");
				clearInterval(barrierAlarm);
				barrierAlarm = undefined;
				
				isBarrierAlarm = false;
			}
			break;
		case commandList.deepHole.name:
			if(!isNaN(Number(args[0]))){
				if(alarmTime && alarmTime.length > 0){
					msg.reply("[심구알림] 심구 알림이 이미 설정되어 있습니다.\n" +
						"'/심구 확인'으로 확인해주세요.\n" +
						"'/심구 삭제'로 알림을 삭제할 수 있습니다.");
				}else{
					const time = (new Date()).getTime();
					alarmTime = [
						getAlarmTime(time + (Number(args[0]) * 60 * 1000))
					];
					msg.reply(`[심구알림] ${alarmTime[0]}까지 열려요!` + `${seeAllViewText}\n` +
						`- 제보자 : ${author.name}\n\n` +
						`- 심층으로 뚫린 검은 구멍이 ${Number(args[0])}분 동안 열립니다!\n` +
						`🕳️ 지하로 뚫린 검은 구멍\n` +
						"==============================\n" +
						" 이름: 폭주하는(불안정한) 결전의 공간\n" +
						" 보상: 골드, 엠블럼 룬, 미스틱 다이스 열쇠 상자(확률)\n" +
						"==============================\n" +
						" 이름: 미지의 탐사의 공간\n" +
						" 보상: 골드, 엠블럼 룬, 보석, 미스틱 다이스 열쇠 상자(확률)\n" +
						" 방식: 열쇠를 찾아 보물상자 여는 형태\n" +
						"==============================\n" +
						" 이름: 미지의 별의 공간\n" +
						" 보상: 골드, 엠블럼 룬, 별의 인장\n" +
						" 방식: '남아 있는 의문' 퀘스트 클리어 시 입장 가능\n" +
						"==============================\n" +
						" 이름: 미지의 추적의 공간\n" +
						" 보상: 골드, 미스틱 다이스 열쇠 상자(확률)\n" +
						" 방식: 황금 버섯 출현 시 다량 골드\n" +
						"==============================\n\n" +
						`🕳️ 심층으로 뚫린 검은 구멍\n` +
						"==============================\n" +
						" 이름: 폭주하는 결전의 공간\n" +
						" 보상: 골드, 엠블럼 룬(2성 포함), 룬의 파편, 미스틱 다이스 열쇠 상자(확률)\n" +
						"=============================="
					);
					
					deepHoleAlarm = setInterval(() => {
						if(alarmTime[0] && getCurrentTime() === alarmTime[0]){
							clearInterval(deepHoleAlarm);
							deepHoleAlarm = undefined;
							alarmTime = [];
						}
					}, 10000);
				}
			}else{
				if(args[0] === "확인"){
					if(alarmTime.length > 0){
						msg.reply(`[심구알림] ${alarmTime[0]}까지 열려요!` + `${seeAllViewText}\n` +
							`- 제보자 : ${author.name}\n\n` +
							`🕳️ 지하로 뚫린 검은 구멍\n` +
							"==============================\n" +
							" 이름: 폭주하는 결전의 공간\n" +
							" 보상: 골드, 엠블럼 룬, 미스틱 다이스 열쇠 상자(확률)\n" +
							"==============================\n" +
							" 이름: 불안정한 시험의 공간\n" +
							" 보상: 골드, 엠블럼 룬, 미스틱 다이스 열쇠 상자(확률)\n" +
							"==============================\n" +
							" 이름: 미지의 탐사의 공간\n" +
							" 보상: 골드, 엠블럼 룬, 보석, 미스틱 다이스 열쇠 상자(확률)\n" +
							" 방식: 열쇠를 찾아 보물상자 여는 형태\n" +
							"==============================\n" +
							" 이름: 미지의 별의 공간\n" +
							" 보상: 골드, 엠블럼 룬, 별의 인장\n" +
							" 방식: '남아 있는 의문' 퀘스트 클리어 시 입장 가능\n" +
							"==============================\n" +
							" 이름: 미지의 추적의 공간\n" +
							" 보상: 골드, 미스틱 다이스 열쇠 상자(확률)\n" +
							" 방식: 황금 버섯 출현 시 다량 골드\n" +
							"==============================\n\n" +
							`🕳️ 심층으로 뚫린 검은 구멍\n` +
							"==============================\n" +
							" 이름: 폭주하는 결전의 공간\n" +
							" 보상: 골드, 엠블럼 룬(2성 포함), 룬의 파편, 미스틱 다이스 열쇠 상자(확률)\n" +
							"=============================="
						);
					}else{
						msg.reply("[심구알림] 심구 정보가 없습니다.\n" +
							"'/심구 (숫자)'로 발견된 심구를 추가해주세요!\n" +
							"예시: /심구 30 (30분 동안 심구 알림)");
					}
				}else if(args[0] === "삭제"){
					msg.reply("[심구알림] 심구 정보가 삭제되었어요.");
					if(deepHoleAlarm){
						clearInterval(deepHoleAlarm);
						deepHoleAlarm = undefined;
					}
					alarmTime = [];
				}else{
					msg.reply("[심구알림] '/심구 (숫자)'로 정보를 입력해주세요!\n" +
						"예시: /심구 30 (30분 동안 심구 알림)");
				}
			}
			break;
		case commandList.itemUse.name:
			let itemName = "";
			
			for(let i = 0 ; i < args.length ; i++){
				itemName += args[i];
			}
			
			const query = `?itemName=${encodeURIComponent(itemName)}`;
			const result = getMobinogiApi("/item/itemUse.do", query);
			Log.info(`[Item Name] : ${JSON.stringify(result)}`);
			break;
		default:
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
