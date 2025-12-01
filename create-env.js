import fs from "fs";
import readline from "readline";

// ────────────────────────────────────────
// 터미널 입력 인터페이스 생성
// ────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ────────────────────────────────────────
// .env 파일 생성 함수
// ────────────────────────────────────────
function createEnvFile(apiKey) {
  const content = `OPENAI_API_KEY=${apiKey}\n`;

  // 파일 생성
  fs.writeFile(".env", content, (err) => {
    if (err) {
      console.log("❌ .env 파일 생성 실패:", err);
    } else {
      console.log("✅ .env 파일 생성 완료!");
      console.log("📌 저장된 내용:", content);
    }
    rl.close();
  });
}

// ────────────────────────────────────────
// 실행 시작
// ────────────────────────────────────────
console.log("🔧 .env 자동 생성 도구");
console.log("-----------------------------");

rl.question("🔑 OpenAI API KEY를 입력하세요: ", (key) => {
  const trimmed = key.trim();

  if (!trimmed) {
    console.log("⚠️ API 키가 비어있습니다. 다시 실행하세요.");
    rl.close();
    return;
  }

  createEnvFile(trimmed);
});