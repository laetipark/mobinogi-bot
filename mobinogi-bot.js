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

let chatRoomList = ["guild_sexy", "guild_sexy_announce"];
let devRoom = "test";
let devMessage =
	"* 개발자 :\nLaeti(아이라 서버/수도사)\n" +
	"* 연락처 :\nhttps://open.kakao.com/me/laetipark";

let deepHoleIntervals = [],
	deepHoleAlarms = [];
let deepHoleTip = "";

let abyssHoleAlarm = undefined,
	isAbyssHoleAlert = false,
	abyssAlarmTime = [];
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

function getCurrentTime(){
	const date = new Date();
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
	return `- ${header}\n"${alarm.regionName}"에 ${alarm.time}까지 열려요!\n- 제보자: ${alarm.author}`;
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
	
	let itemName;
	let npcName;
	let regionName;
	let item;
	
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
			if(!isNaN(Number(args[0]))){
				if(abyssAlarmTime && abyssAlarmTime.length > 0){
					msg.reply(
						`[어구알림] 어구 알림이 이미 ${abyssAlarmTime[0].time}에 설정되어 있습니다.\n` +
						"'/어구 확인'으로 확인해주세요.\n" +
						"'/어구 삭제'로 알림을 삭제할 수 있습니다."
					);
				}else{
					const abyssHoleTime = (new Date()).getTime(),
						abyssAlertTime = getAlarmTime(abyssHoleTime + ((Number(args[0]) - 10) * 60 * 1000));
					abyssAlarmTime = [{
						time : getAlarmTime(abyssHoleTime + (Number(args[0]) * 60 * 1000)),
						author : author.name
					}];
					if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
						for(let i = 0 ; i < chatRoomList.length ; i++){
							bot.send(chatRoomList[i],
								`[어구알림] ${abyssAlarmTime[0].time}에 열려요!\n - 제보자: ${abyssAlarmTime[0].author}` +
								`${seeAllViewText}\n\n` + abyssHoleTip
							);
						}
					}else{
						break;
					}
					
					abyssHoleAlarm = setInterval(() => {
						if(abyssAlarmTime[0] && getCurrentTime() === abyssAlarmTime[0].time){
							if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
								for(let i = 0 ; i < chatRoomList.length ; i++){
									bot.send(chatRoomList[i],
										`[어구알림] 어비스로 뚫린 검은 구멍이 열렸습니다!\n` +
										` - 제보자: ${abyssAlarmTime[0].author}` +
										`${seeAllViewText}\n\n` + abyssHoleTip
									);
								}
							}
							clearInterval(abyssHoleAlarm);
							abyssHoleAlarm = undefined;
							abyssAlarmTime = [];
							isAbyssHoleAlert = false;
						}else if(abyssAlertTime && getCurrentTime() === abyssAlertTime && !isAbyssHoleAlert){
							if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
								for(let i = 0 ; i < chatRoomList.length ; i++){
									bot.send(chatRoomList[i],
										`[어구알림] 어비스로 뚫린 검은 구멍 열리기 10분 전 입니다!\n` +
										` - 시간 : ${abyssAlarmTime[0].time}\n` +
										` - 제보자: ${abyssAlarmTime[0].author}` +
										`${seeAllViewText}\n\n` + abyssHoleTip
									);
								}
							}
							isAbyssHoleAlert = true;
						}
					}, 10000);
				}
			}else{
				if(args[0] === "확인"){
					if(abyssAlarmTime.length > 0){
						msg.reply(`[어구알림] ${abyssAlarmTime[0].time}에 열려요!\n` +
							`- 제보자 : ${abyssAlarmTime[0].author}` +
							`${seeAllViewText}\n\n` + abyssHoleTip
						);
					}else{
						msg.reply("[어구알림] 어구 정보가 없습니다.\n" +
							"'/어구 [숫자]'로 정보를 입력해주세요!\n" +
							"/어구 30 : 20분/30분 후 어구 알림"
						);
					}
				}else if(args[0] === "삭제"){
					msg.reply("[어구알림] 어구 정보가 삭제되었어요.");
					if(abyssHoleAlarm){
						clearInterval(abyssHoleAlarm);
						abyssHoleAlarm = undefined;
					}
					abyssAlarmTime = [];
				}else{
					msg.reply(
						"[어구알림] '/어구 [숫자]'로 정보를 입력해주세요!\n" +
						"/어구 30 : 20분/30분 후 어구 알림"
					);
				}
			}
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
				
				if(!isNaN(Number(args[0]))){
					const values = Object.values(regionList);
					const lastRegion = values[values.length - 1];
					
					regionName =
						!args[1] ? lastRegion :
							hasCommonChars(args[1], regionList.goddessGarden, 2) ? regionList.goddessGarden :
								hasCommonChars(args[1], regionList.iceCanyon, 2) ? regionList.iceCanyon :
									hasCommonChars(args[1], regionList.cloudWilderness, 2) ? regionList.cloudWilderness :
										hasCommonChars(args[1], regionList.senmaiPlain, 2) ? regionList.senmaiPlain :
											"none";
					
					if(regionName === "none"){
						msg.reply(
							`[심구알림] "심구 지역"을 제대로 입력해주세요!\n` +
							"🗺️ 사냥터 목록\n" +
							"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
						);
						break;
					}
					
					// 특정 regionName에 대한 알림 출력
					let hasAlarmForRegion = false;
					
					for(let i = 0 ; i < deepHoleAlarms.length ; i++){
						if(deepHoleAlarms[i].regionName === regionName){
							hasAlarmForRegion = true;
							msg.reply(
								formatDeepHoleAlarm(deepHoleAlarms[i]) + "\n\n" +
								"'/심구 확인'으로 확인해주세요.\n" +
								"'/심구 삭제 (사냥터)'로 알림을 삭제할 수 있습니다."
							);
							break;
						}
					}
					
					if(!hasAlarmForRegion){
						const deepHoleTime = new Date().getTime();
						const newAlarmTime = getAlarmTime(deepHoleTime + (Number(args[0]) * 60 * 1000));
						
						const newAlarm = {
							id : null,
							author : author.name,
							time : newAlarmTime,
							regionName : regionName,
							holeCount : holeCount
						};
						
						const alarmText = formatDeepHoleAlarm(newAlarm);
						
						if(chatRoomList.indexOf(room) > -1 || chatRoomList.includes(room)){
							for(let i = 0 ; i < chatRoomList.length ; i++){
								bot.send(chatRoomList[i],
									alarmText + `${seeAllViewText}\n\n` + deepHoleTip
								);
							}
						}else{
							msg.reply(alarmText + `${seeAllViewText}\n\n` + deepHoleTip);
							break;
						}
						
						// Add interval to deepHoleAlarms array
						const intervalID = setInterval(() => {
							if(newAlarmTime && getCurrentTime() === newAlarmTime){
								clearInterval(intervalID);
								const index = deepHoleIntervals.indexOf(intervalID);
								if(index !== -1){
									deepHoleIntervals.splice(index, 1);
								}
								const newAlarmTimeArray = [];
								for(let i = 0 ; i < deepHoleAlarms.length ; i++){
									const alarm = deepHoleAlarms[i];
									if(!(alarm.time === newAlarmTime && alarm.regionName === regionName)){
										newAlarmTimeArray.push(alarm);
									}
								}
								deepHoleAlarms = newAlarmTimeArray;
							}
						}, 10000);
						
						newAlarm.id = intervalID;
						deepHoleAlarms.push(newAlarm);
						deepHoleIntervals.push(intervalID);
					}
				}else{
					if(args[0] === "확인"){
						if(deepHoleAlarms.length > 0){
							Object.entries(deepHoleAlarms).forEach(([index, alarm]) => {
								msg.reply(
									formatDeepHoleAlarm(alarm) + `${seeAllViewText}\n\n` + deepHoleTip
								);
							});
						}else{
							msg.reply(
								"[심구알림] 현재 설정된 알림이 없습니다.\n" +
								"'/N심구 [분] (사냥터)'로 입력해주세요!\n" +
								"예시: /2심구 30 센마이\n\n" +
								"🗺️ 사냥터 목록\n" +
								"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
							);
						}
					}else if(args[0] === "삭제"){
						let inputRegion = args[1],
							inputRegionName =
								hasCommonChars(inputRegion, regionList.goddessGarden, 2) ? regionList.goddessGarden :
									hasCommonChars(inputRegion, regionList.iceCanyon, 2) ? regionList.iceCanyon :
										hasCommonChars(inputRegion, regionList.cloudWilderness, 2) ? regionList.cloudWilderness :
											hasCommonChars(inputRegion, regionList.senmaiPlain, 2) ? regionList.senmaiPlain : "";
						if(deepHoleAlarms.length > 0){
							if(inputRegionName !== ""){
								Object.entries(deepHoleAlarms).forEach(([index, alarmTime]) => {
									if(alarmTime.regionName === inputRegionName){
										clearInterval(alarmTime.id);
										deepHoleAlarms.splice(Number(index), 1);
										msg.reply(`[심구알림] "${alarmTime.regionName}" 알림을 삭제했습니다.`);
									}
								});
							}
						}else{
							msg.reply(
								`[심구알림] "${inputRegion}"에 해당하는 지역 정보를 찾을 수 없습니다.\n` +
								"🗺️ 사냥터 목록\n" +
								"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
							);
						}
					}else if(args[0] === "초기화"){
						for(let i = 0 ; i < deepHoleIntervals.length ; i++){
							const id = deepHoleIntervals[i];
							clearInterval(id);
						}
						deepHoleIntervals = [];
						deepHoleAlarms = [];
						msg.reply("[심구알림] 모든 심구 알림이 삭제되었습니다.");
					}else{
						msg.reply(
							"[심구알림] '/N심구 [분] (사냥터)'로 입력해주세요!\n" +
							"예시: /2심구 30 센마이\n\n" +
							"🗺️ 사냥터 목록\n" +
							"- 여신의 뜰, 얼음 협곡, 구름 황야, 센마이 평원"
						);
					}
				}
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
