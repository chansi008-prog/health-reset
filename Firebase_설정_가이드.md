# 건강 Reset 프로그램 — Firebase 설정 가이드 (약 20분)

무료 플랜(Spark)만 씁니다. 카드 등록 화면이 나오면 진행하지 마세요.

## 1. 프로젝트 만들기
1. https://console.firebase.google.com 접속 (구글 로그인, 2단계 인증)
2. **프로젝트 추가** → 이름: `health-reset` → Google 애널리틱스 **사용 안 함** → 만들기

## 2. 웹 앱 등록 (설정값 받기)
1. 프로젝트 첫 화면에서 **</> (웹)** 아이콘
2. 앱 닉네임: `health-reset` → Firebase 호스팅은 체크하지 않음 → 앱 등록
3. 화면에 나오는 `const firebaseConfig = { ... }` 부분을 **통째로 복사해서 Claude에게 붙여 넣어 주세요.**
   (apiKey 등은 웹앱에 원래 공개되는 값이라 괜찮습니다)

## 3. 로그인 방식 켜기
1. 왼쪽 메뉴 **보안 → Authentication** → 시작하기
2. **로그인 방법** 탭 → **이메일/비밀번호** → 사용 설정 → 저장
   (이메일 링크는 끄고 둡니다)
3. **설정** 탭 → **승인된 도메인** → 도메인 추가: `chansi008-prog.github.io`

## 4. 데이터베이스 만들기
1. 왼쪽 메뉴 **데이터베이스 및 스토리지 → Realtime Database** (Firestore 아님!)
2. **데이터베이스 만들기** → 위치: **싱가포르 (asia-southeast1)** → **잠금 모드로 시작** → 사용 설정
3. 위쪽 **규칙** 탭 → 내용을 모두 지우고, Claude가 드리는 `database.rules.json` 내용을 붙여 넣기 → **게시**
4. 데이터베이스 주소(예: `https://health-reset-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`)도 복사해서 Claude에게 알려 주세요.

## 5. 끝
2번의 firebaseConfig와 4번의 주소를 Claude에게 주시면 연결하고 테스트합니다.
