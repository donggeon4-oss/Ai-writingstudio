let currentMode = "auto";

// ⭐ 모드 변경 함수
function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById("functionTitle");
  const desc = document.getElementById("functionDesc");

  const modeText = {
    auto: ["✨ 자동 글 생성", "키워드만 입력하면 고품질 문서를 자동 생성합니다."],
    summary: ["📝 요약", "긴 글을 핵심만 요약합니다."],
    email: ["📧 이메일", "자연스럽고 정중한 이메일을 작성합니다."],
    reply: ["💬 답장", "부드럽고 따뜻한 답장을 생성합니다."],
    report: ["📄 보고서", "1페이지 보고서를 자동 생성합니다."],
    blog: ["✍ 블로그 전체 작성", "키워드 기반 블로그 전문 글을 작성합니다."],
    blog_step1: ["1️⃣ STEP1 분석", "검색 의도 분석 및 핵심 키워드 도출"],
    blog_step2: ["2️⃣ STEP2 개요", "SEO 최적화 개요 구성"],
    blog_step3: ["3️⃣ STEP3 본문", "2000자 이상의 본문 생성"],
    rewrite_soft: ["♻ 부드럽게", "부드럽고 자연스럽게 다시 작성"],
    rewrite_pro: ["💼 전문적으로", "전문적인 비즈니스 톤으로 재작성"],
    rewrite_short: ["🔍 핵심 요약", "핵심만 압축해서 요약"],
    rewrite_long: ["🔎 확장", "내용을 풍부하게 확장"],
    seo: ["⚡ SEO 분석", "키워드 / 메타설명 / 개선점 분석"],
    multi: ["🎨 3버전 생성", "세 가지 톤으로 자동 변환"],
    idea: ["💡 아이디어", "10가지 콘텐츠 아이디어 생성"],
    analyze: ["📚 글 점수 분석", "점수 기반 자동 분석"],
    imgprompt: ["🖼 이미지 프롬프트", "이미지 생성용 프롬프트 제작"]
  };

  title.innerText = modeText[mode][0];
  desc.innerText = modeText[mode][1];
}

// ⭐ 생성 함수
async function generate() {
  const input = document.getElementById("userInput").value;
  const length = document.getElementById("length").value;
  const tone = document.getElementById("tone").value;
  const output = document.getElementById("resultBox");

  output.innerText = "⏳ AI가 작업 중입니다...";

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userInput: input,
        mode: currentMode,
        length,
        tone
      })
    });

    const data = await res.json();
    output.innerText = data.result || "⚠️ 결과 없음";

  } catch (err) {
    output.innerText = "⚠️ 오류 발생";
  }
}

// Reset
function resetFields() {
  document.getElementById("userInput").value = "";
  document.getElementById("resultBox").innerText = "결과가 여기에 표시됩니다.";
}

// Copy
function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("resultBox").innerText
  );
  alert("📋 복사 완료!");
}
