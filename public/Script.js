let currentMode = "auto";

function setMode(mode) {
  currentMode = mode;

  const title = document.getElementById("functionTitle");
  const desc = document.getElementById("functionDesc");

  const modeText = {
    auto: ["✨ 자동 글 생성", "키워드만 입력하면 고품질 문서를 생성합니다."],
    summary: ["📝 요약", "긴 글을 핵심만 요약합니다."],
    email: ["📧 이메일", "자연스러운 이메일을 작성합니다."],
    reply: ["💬 답장", "상대가 기분 좋은 답장을 생성합니다."],
    report: ["📄 보고서", "1페이지 보고서를 생성합니다."],
    blog: ["✍ 블로그", "전체 블로그 글을 자동 생성합니다."],
    blog_step1: ["1️⃣ STEP1 분석", "키워드 기반 검색 의도를 분석합니다."],
    blog_step2: ["2️⃣ STEP2 개요", "SEO 기반 개요를 생성합니다."],
    blog_step3: ["3️⃣ STEP3 본문", "2000자 이상의 본문을 작성합니다."],
    rewrite_soft: ["♻ 부드럽게", "글을 자연스럽게 다듬습니다."],
    rewrite_pro: ["💼 전문적으로", "비즈니스 문체로 재작성합니다."],
    rewrite_short: ["🔍 짧게", "핵심만 압축합니다."],
    rewrite_long: ["🔎 확장", "내용을 풍부하게 확장합니다."],
    seo: ["⚡ SEO 분석", "키워드·메타·개선점을 분석합니다."],
    multi: ["🎨 3버전", "세 가지 톤으로 다시 작성합니다."],
    idea: ["💡 아이디어", "콘텐츠 아이디어를 생성합니다."],
    analyze: ["📚 분석", "점수 기반 글 평가를 제공합니다."],
    imgprompt: ["🖼 프롬프트", "이미지 생성용 프롬프트를 생성합니다."]
  };

  title.innerText = modeText[mode][0];
  desc.innerText = modeText[mode][1];
}

async function generate() {
  const input = document.getElementById("userInput").value;
  const length = document.getElementById("length").value;
  const tone = document.getElementById("tone").value;
  const output = document.getElementById("resultBox");

  output.innerText = "⏳ 생성 중입니다...";

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

  } catch {
    output.innerText = "⚠️ 오류 발생";
  }
}

function resetFields() {
  document.getElementById("userInput").value = "";
  document.getElementById("resultBox").innerText = "결과가 여기에 표시됩니다.";
}

function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("resultBox").innerText
  );
  alert("📋 복사 완료!");
}
