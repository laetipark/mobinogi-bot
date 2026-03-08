![](https://laetipark.me/thumbnail.png)

# Sexynogi Bot

## 프로그램 소개

`Sexynogi Bot`는 메신저(카카오톡 봇 런타임) 환경에서 동작하는 마비노기 모바일 보조 알림/조회 스크립트 모듈입니다.

- 길드/공지방 알림 메시지 전송
- 심층/심연 구멍 알림 관리
- 아이템/캐릭터 관련 명령 응답
- 공지/이벤트 최신글 감지 및 제목 변경 알림
- 외부 유틸(`mobinogi-api-client`) 및 API 연동 기반 운영

### :file_folder: 주요 구성

- `mobinogi-bot.js` : 메인 런타임 엔트리(리스너/서비스 wiring)
- `node_modules/hole-alarm-service.js` : 심구/어구 알림 서비스
- `node_modules/game-feed-watch-service.js` : 공지/이벤트 감시 서비스(10분 주기)
- `node_modules/game-info-service.js` : 캐릭터/아이템/공지/이벤트 조회 서비스
- `node_modules/command-router.js` : 명령어 라우팅
- `node_modules/bot-static-text.js` : 명령어/고정 문구 정의
- `node_modules/mobinogi-api-client.js` : 백엔드 API 클라이언트
- `bot.json` : 봇 설정 데이터
- `log.json` : 로그/상태 데이터
- `.aiassistant/rules/project/` : 모듈별 AI 작업 규칙 문서

### ️ 활용 기술 스택

<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111">&nbsp;
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/CommonJS-444444?style=for-the-badge&logo=javascript&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white">&nbsp;
<img src="https://img.shields.io/badge/KakaoTalk%20Bot-FFCD00?style=for-the-badge&logo=kakaotalk&logoColor=111">&nbsp;

## #️⃣ 모듈 소개

이 모듈은 일반 Node.js 서버라기보다 메신저 봇 런타임에서 실행되는 스크립트 중심 모듈입니다.

- 전역 객체(`BotManager`) 의존 구조
- 채팅방별 알림/명령 처리 로직 포함
- 시간 기반 알림 상태 관리 포함

## :speech_balloon: 주요 명령어

- `/명령어` : 명령어 안내
- `/파티 [내용]`, `/마피아 [내용]` : 채팅방 중계 메시지
- `/심구 [분] (사냥터)`, `/2심구`, `/3심구` : 심구 알림 등록
- `/어구 [숫자]` : 어구 알림 등록/조회/삭제
- `/아이템 [아이템명]` : 아이템 정보 조회
- `/캐릭터 [닉네임]` : 캐릭터 랭킹 조회
- `/공지 목록` : 백엔드 공지 정렬 결과 조회
- `/이벤트 목록` : 백엔드 이벤트 정렬 결과 조회

## :gear: 환경 설정 및 실행

- 이 모듈은 **메신저 봇 런타임(카카오톡 봇 스크립트 환경)** 기준으로 동작합니다.
- 로컬 `node`로 직접 실행하면 `BotManager` 전역 객체가 없어 정상 동작하지 않을 수 있습니다.
- `mobinogi-api-client` 의존성은 런타임 제공 또는 별도 설치/주입 환경이 필요합니다.

### 기본 준비

- `bot.json`, `log.json` 파일을 운영 환경 값에 맞게 구성합니다.
- 채팅방 이름, 개발용 방 이름, 알림 시간 정책 등은 스크립트 상수/설정 파일 기준으로 관리합니다.
- 공지/이벤트 감시 스냅샷은 `game-feed-watch-snapshot.json`(또는 런타임 저장소)로 관리됩니다.

### 로컬 점검(선택)

로컬에서는 아래 용도 위주로 사용하는 것을 권장합니다.

- 문법 점검
- 유틸 함수 테스트
- 텍스트 포맷/시간 계산 로직 확인

## :notebook: 운영 메모

- 채팅방 이름/ID, 토큰, 내부 URL 등 민감정보는 Git에 커밋하지 않습니다.
- 명령어 이름/응답 문구는 운영 사용자 영향이 크므로 변경 시 호환성을 우선합니다.
- 알림 시간 계산 로직 변경 시 KST 기준 동작/중복 알림 여부를 함께 확인합니다.
- 공지/이벤트 감시 서비스는 부팅 직후 1회 동기화 후, 10분 경계 기준으로 주기 동기화합니다.

## :memo: 규칙 문서

- `.aiassistant/rules/project/README.md`
- 모듈별 AI 작업 규칙은 위 문서를 시작점으로 확인합니다.
