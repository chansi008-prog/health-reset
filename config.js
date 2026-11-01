// Firebase 설정값. 비어 있으면 "테스트 모드"(이 기기 안에서만 동작)로 열린다.
// apiKey 등은 웹앱에 원래 공개되는 값이고, 데이터 보호는 database.rules.json(보안 규칙)이 맡는다.
export const firebaseConfig = {
  apiKey: "AIzaSyBFBE_d1H3jjq-X8GCEv8kJSmOqs3OC2OI",
  authDomain: "health-reset.firebaseapp.com",
  databaseURL: "https://health-reset-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "health-reset",
  storageBucket: "health-reset.firebasestorage.app",
  messagingSenderId: "683510149371",
  appId: "1:683510149371:web:a4731a4d4511e6380b405e",
};

// 웹 푸시 키 (Firebase 콘솔 → 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서). 공개용 값
export const vapidKey = "BClpnShvnUY50Xdzsc56ZN_jvsyvK3qjORB9lZDcm8cpyZeyouE33ZckTCjZ4uOhpq8T1QTSgIvUq0GizfKV2_0";
