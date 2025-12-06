// ========================================
// Frontend Logic for AI Writing Studio
// ========================================

(() => {
  console.log("✅ script.js loaded");

  let currentMode = "auto";

  // 사이드바 모드별 타이틀/설명 매핑
  const MODE_INFO = {
    auto: {
      title: "✨ 자동 글 생성",
      desc: "키워드만 입력하면 AI가 고품질 글을 자동 생성합니다."
    },
    summary: {
      title: "📝 요약",
      desc: "긴 텍스트를 핵심만 자연스럽게 요약합니다."
    },
    email: {
      title: "📧 이메일",
      desc: "업무/문의/안내용 이메일을 정중하고 깔끔하게 작성합니다."
    },
    reply: {
      title: "💬 답장",
      desc: "상대의 메시지를 기반으로 자연스럽고 공감 가는 답장을 작성합니다."
    },
    report: {
      title: "📄 보고서",
      desc: "보고서/기획서/제안서 초안을 논리적으로 구성합니다."
    },
    blog: {
      title: "✍ 블로그 전체 작성",
      desc: "블로그 본문 전체를 구조적으로 작성합니다."
    },
    blog_step1: {
      title: "1️⃣ STEP1 분석",
      desc: "키워드, 검색 의도, 타깃 독자를 먼저 분석합니다."
    },
    blog_step2: {
      title: "2️⃣ STEP2 개요",
      desc: "H2/H3 구조로 글의 전체 개요를 설계합니다."
    },
    blog_step3: {
      title: "3️⃣ STEP3 본문",
      desc: "개요를 기반으로 완성도 높은 본문을 작성합니다."
    },
    rewrite_soft: {
      title: "♻ 부드럽게 리라이팅",
      desc: "의미는 유지하면서 표현을 더 부드럽고 자연스럽게 바꿉니다."
    },
    rewrite_pro: {
      title: "💼 전문적으로 리라이팅",
      desc: "전문적이고 신뢰감 있는 비즈니스 톤으로 다시 작성합니다."
    },
    rewrite_short: {
      title: "🔍 핵심 요약 리라이팅",
      desc: "핵심만 남기고 군더더기를 줄여 짧게 정리합니다."
    },
    rewrite_long: {
      title: "🔎 확장 리라이팅",
      desc: "내용을 유지하면서 더 풍부하게 확장합니다."
    },
    seo: {
      title: "⚡ SEO 분석",
      desc: "키워드, 검색 의도, 메타 설명, 개선 포인트를 분석합니다."
    },
    multi: {
      title: "🎨 3버전 생성",
      desc: "서로 다른 스타일의 버전 3개를 한 번에 만들어 줍니다."
    },
    idea: {
      title: "💡 아이디어 생성",
      desc: "키워드를 기반으로 다양한 콘텐츠 아이디어를 제안합니다."
    },
    analyze: {
      title: "📚 글 점수 분석",
      desc: "글의 구조, 문장력, 설득력 등을 점수와 함께 분석합니다."
    },
    imgprompt: {
      title: "🖼 이미지 프롬프트",
      desc: "이미지 생성에 바로 쓸 수 있는 프롬프트를 만들어 줍니다."
    }
  };

  // =======================
  // 모드 전환
  // =======================
  function setMode(mode) {
    currentMode = mode;

    const info = MODE_INFO[mode] || MODE_INFO["auto"];

    const titleEl = document.getElementById("functionTitle");
    const descEl = document.getElementById("functionDesc");

    if (titleEl) titleEl.textContent = info.title;
    if (descEl) descEl.textContent = info.desc;

    // 사이드바 버튼 active 처리
    const buttons = document.querySelectorAll(".menu-btn");
    buttons.forEach((btn) => btn.classList.remove("active"));
    const clicked = Array.from(buttons).find((btn) =>
      btn.getAttribute("onclick")?.includes(mode)
    );
    if (clicked) clicked.classList.add("active");
  }

  // =======================
  // 기본 생성 요청
  // =======================
  async function generate() {
    const inputEl = document.getElementById("userInput");
    const lengthEl = document.getElementById("length");
    const toneEl = document.getElementById("tone");
    const resultBox = document.getElementById("resultBox");

    console.log("▶ generate() called");

    if (!inputEl || !lengthEl || !toneEl || !resultBox) {
      alert("필수 요소를 찾을 수 없습니다. HTML 구조를 확인해주세요.");
      return;
    }

    const content = inputEl.value.trim();
    const length = lengthEl.value;
    const tone = toneEl.value;

    if (!content) {
      resultBox.textContent = "⚠️ 먼저 주제 또는 텍스트를 입력해 주세요.";
      return;
    }

    // 로딩 상태 표시
    resultBox.textContent = "⏳ AI가 글을 생성하는 중입니다...";
    console.log("📡 POST /generate", { mode: currentMode, length, tone });

    try {
      const res = await fetch("/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userInput: content,  // 🔥 server.js의 userInput과 매칭
          mode: currentMode,   // auto / summary / rewrite_pro / seo 등
          length,
          tone
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        console.error("JSON 파싱 실패:", e);
        resultBox.textContent =
          "❌ 서버에서 유효한 JSON 응답을 받지 못했습니다.";
        return;
      }

      if (!res.ok) {
        console.error("❌ 서버 오류:", data);
        resultBox.textContent =
          "❌ 서버 오류가 발생했습니다.\n" +
          (data.error || data.detail || `status: ${res.status}`);
        return;
      }

      const text =
        data.result ||
        data.message ||
        data.output ||
        "";

      if (!text) {
        resultBox.textContent = "⚠️ 생성 결과가 비어 있습니다.";
      } else {
        resultBox.textContent = text;
      }
    } catch (err) {
      console.error("[generate] 에러:", err);
      resultBox.textContent =
        "❌ 요청 중 오류가 발생했습니다:\n" + (err.message || String(err));
    }
  }

  // =======================
  // 초기화
  // =======================
  function resetFields() {
    const inputEl = document.getElementById("userInput");
    const resultBox = document.getElementById("resultBox");
    if (inputEl) inputEl.value = "";
    if (resultBox) resultBox.textContent = "결과가 여기에 표시됩니다.";
  }

  // =======================
  // 복사
  // =======================
  function copyText() {
    const resultBox = document.getElementById("resultBox");
    if (!resultBox) return;

    const text = resultBox.textContent.trim();
    if (!text || text === "결과가 여기에 표시됩니다.") {
      alert("복사할 결과가 없습니다.");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => alert("결과가 복사되었습니다."))
      .catch((err) => {
        console.error("복사 실패:", err);
        alert("복사 중 오류가 발생했습니다.");
      });
  }

  // =======================
  // 전역으로 노출 (버튼에서 호출 가능하도록)
  // =======================
  window.setMode = setMode;
  window.generate = generate;
  window.resetFields = resetFields;
  window.copyText = copyText;

  // =======================
  // 초기 모드 설정
  // =======================
  window.addEventListener("DOMContentLoaded", () => {
    setMode("auto");
    console.log("✅ DOMContentLoaded → mode=auto");
  });
})();
