const scriptName = 'mobinogi-bot';
const config = require('config');

/**
 * 메신저봇에 대한 BotManager 불러오기
 */
const bot = BotManager.getCurrentBot();

const commandList = new CommandList();
const seeAllViewText = '\u200b'.repeat(500);

/**
 * @constructor
 * @description 명령어 리스트
 */
function CommandList() {
  this.barrier = {
    name: '결계알림',
    description: '3시간 간격으로 결계 알림을 시작합니다.'
  };
}

function getCurrentTime() {
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
function onMessage(msg) {}

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
function onCommand(msg) {
  const room = msg.room,
      author = msg.author,
      content = msg.content,
      command = msg.command,
      args = msg.args,
      image = msg.image,
      isMention = msg.isMention,
      isGroupChat = msg.isGroupChat,
      packageName = msg.packageName;
  
  let alarm = undefined,
      isAlarm = false,
      isAlert = false;
  
  // if (!isGroupChat) {
  //   msg.reply('[BLOSSOM] 해당 카카오톡 계정은 명령어봇입니다!');
  //   return;
  // }
  
  switch (command) {
    case commandList.barrier.name:
      if (!isAlarm) {
        msg.reply('[BLOSSOM] 불길한 소환의 결계 알림이 시작되었습니다.');
        alarm = setInterval(() => {
          if (
              !isAlert &&
              (getCurrentTime().indexOf(':50') !== -1 ||
                  getCurrentTime().indexOf(':00') !== -1)
          ) {
            Log.info(`[${isAlert}] : ${getCurrentTime()}`);
            if (getCurrentTime().indexOf(':50') !== -1) {
              msg.reply('[결계알림] 불길한 소환의 결계 열리기 10분 전입니다.');
            } else if (getCurrentTime().indexOf(':00') !== -1) {
              msg.reply('[결계알림] 불길한 소환의 결계가 열렸습니다!');
            }
            
            isAlert = true;
          } else if (
              isAlert &&
              (getCurrentTime().indexOf(':50') === -1 ||
                  getCurrentTime().indexOf(':00') === -1)
          ) {
            Log.info(`[${isAlert}] : ${getCurrentTime()}`);
            isAlert = false;
          }
        }, 10000);
        
        isAlarm = true;
      } else {
        msg.reply('[BLOSSOM] 불길한 소환의 결계 알림이 종료되었습니다.');
        clearInterval(alarm);
        alarm = undefined;
        
        isAlarm = false;
      }
      break;
    case commandList.rotation.name:
      break;
    case commandList.map.name:
      break;
    case commandList.ranking.name:
      break;
    default:
      break;
  }
}

bot.setCommandPrefix('/'); // /로 시작하는 메시지를 command로 판단
bot.addListener(Event.COMMAND, onCommand);

function onCreate(savedInstanceState, activity) {
  const textView = new android.widget.TextView(activity);
  textView.setText('Hello, World!');
  textView.setTextColor(android.graphics.Color.DKGRAY);
  activity.setContentView(textView);
}

function onStart(activity) {}

function onResume(activity) {}

function onPause(activity) {}

function onStop(activity) {}

function onRestart(activity) {}

function onDestroy(activity) {}

function onBackPressed(activity) {}

bot.addListener(Event.Activity.CREATE, onCreate);
bot.addListener(Event.Activity.START, onStart);
bot.addListener(Event.Activity.RESUME, onResume);
bot.addListener(Event.Activity.PAUSE, onPause);
bot.addListener(Event.Activity.STOP, onStop);
bot.addListener(Event.Activity.RESTART, onRestart);
bot.addListener(Event.Activity.DESTROY, onDestroy);
bot.addListener(Event.Activity.BACK_PRESSED, onBackPressed);
