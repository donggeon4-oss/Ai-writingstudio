// ========================================
// Ultimate AI Writing Studio - Lite Server (KR)
// - 모든 모드 1회 호출 (쿼터 절약 버전)
// ========================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

// .env 로드
dotenv.config();

// __dirname 설정 (ESM 환경용)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// 캐시 방지
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// 🔥 정적 파일 제공 (public 폴더: tool.html, style.css, tool.css 등)
app.use(express.static(path.join(__dirname, "public")));

// ===============================================
// 🔥 OpenAI client
// ===============================================
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn("❌ OPENAI_API_KEY 가 환경변수에 없습니다. 반드시 설정하세요.");
}

const openai = new OpenAI({
  apiKey: OPENAI_KEY || "NO_KEY_PROVIDED"
});

// ===============================================
// 🔥 기능별 SYSTEM PROMPT
// ===============================================
const SYSTEM_PRESETS = {
  summary: `
너는 고급 요약 전문 AI다.
핵심 정보만 추출하고, 문장은 부드럽고 자연스럽게 재구성한다.
의미 왜곡 없이 깊이 있는 요약을 제공한다.
`,
  email: `
너는 비즈니스 이메일 전문 AI다.
정중하고 명료한 문장을 사용하며, 읽는 사람이 기분 좋게 받아들일 수 있게 작성한다.
`,
  reply: `
너는 감정 케어 응대 전문가다.
상대의 감정선을 고려하여 따뜻하고 편안한 답장을 작성한다.
`,
  report: `
너는 전문 보고서 작성 AI다.
논리적 구조, 문단 구성, 결론 제시를 정확히 수행하며 전문성을 유지한다.
`,
  blog: `
너는 고급 블로그 콘텐츠 전문가다.
스토리·구조·SEO·감성 글쓰기에 능하다.
`,
  rewrite_soft: `
너는 고급 리라이팅 전문가다.
전체적인 톤은 유지하면서 더 부드럽고 자연스럽게 다듬는다.
`,
  rewrite_pro: `
너는 고급 비즈니스 문서 리라이팅 전문가다.
전문적이고 신뢰감 있는 문장으로 재작성한다.
`,
  rewrite_short: `
너는 요약 리라이팅 전문가다.
핵심만 남기고 군더더기를 제거하여 짧게 정리한다.
`,
  rewrite_long: `
너는 확장 리라이팅 전문가다.
내용을 유지하면서 더 풍부하게 확장하고 예시를 추가한다.
`,
  seo: `
너는 SEO 전문 분석가다.
키워드·검색 의도·메타 설명·개선 포인트를 명확히 제시한다.
`,
  multi: `
너는 다중 스타일 리라이팅 전문가다.
같은 내용을 서로 다른 톤과 스타일 3가지 버전으로 재작성한다.
`,
  idea: `
너는 창의적인 아이디어 전문가다.
실현 가능하며 독창적인 아이디어를 제안한다.
`,
  analyze: `
너는 글 분석 전문가다.
문장력·논리·구조를 평가하여 점수 및 분석을 제공한다.
`,
  imgprompt: `
너는 이미지 프롬프트 전문 설계 AI다.
구조화된 스타일·카메라 정보·스타일 정보를 명확히 제공한다.
`
};

// ===============================================
// 🔥 메인 엔진 /generate (단일 호출 버전)
// ===============================================
app.post("/generate", async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(500).json({
      error:
        "서버에 OPENAI_API_KEY 가 설정되어 있지 않습니다. Render 환경변수를 확인하세요."
    });
  }

  let { userInput, content, mode, length, tone } = req.body;
  userInput = userInput || content;

  console.log("📥 /generate 호출:", {
    mode,
    length,
    tone,
    preview: (userInput || "").slice(0, 60)
  });

  if (!userInput) {
    return res
      .status(400)
      .json({ error: "userInput(또는 content)이 비어 있습니다." });
  }

  // 길이 옵션
  const lengthMap = {
    short: "700자 내외",
    normal: "1500자 내외",
    long: "2500~3500자 내외"
  };
  const lengthGuide = lengthMap[length] || "";

  // 톤 옵션
  const toneMap = {
    default: "",
    warm: "따뜻하고 부드러운 말투",
    professional: "전문적이고 단정한 비즈니스 톤",
    emotional: "감성적이고 공감되는 표현",
    mz: "MZ 스타일의 위트 있는 톤",
    news: "뉴스 기사처럼 간결한 톤",
    thesis: "논문체의 논리적 톤",
    copy: "카피라이팅처럼 임팩트 있게",
    sns: "SNS 스타일의 캐주얼한 톤",
    lecture: "강의처럼 설명하는 톤"
  };
  const toneGuide = toneMap[tone] || "";

  // ========================================
  // 모드별 프롬프트 구성
  // ========================================
  let systemPrompt = "";
  let userPrompt = "";

  if (mode === "auto") {
    // 자동 글 생성 전용 프롬프트
    systemPrompt = "너는 고품질 블로그 글 전문 생성 AI다.";
    userPrompt = `
당신은 최고급 블로그 자동 생성 전문가입니다.

[주제]
${userInput}

[요청]
- 길이: ${lengthGuide || "상황에 맞게 자연스럽게"}
- 톤: ${toneGuide || "자연스럽고 읽기 좋은 톤"}
- SEO 최적화 포함
- H1 제목 1개
- H2 소제목 3~6개
- 각 섹션마다 자연스러운 문단 2~4개
- 결론 포함
- 사람처럼 자연스럽게 작성
- 중복 표현 금지
`;
  } else if (mode === "summary") {
    systemPrompt = SYSTEM_PRESETS.summary;
    userPrompt = `
[요약 대상]
${userInput}

[요청]
- 길이: ${lengthGuide || "핵심 위주로 자연스럽게"}
- 톤: ${toneGuide || "부드럽고 읽기 좋은 톤"}
- 중요한 정보는 유지, 군더더기는 제거
`;
  } else if (mode === "email") {
    systemPrompt = SYSTEM_PRESETS.email;
    userPrompt = `
[이메일 작성에 참고할 내용]
${userInput}

[요청]
- 길이: ${lengthGuide || "일반적인 이메일 분량"}
- 톤: ${toneGuide || "정중하고 명료한 비즈니스 톤"}
- 제목 + 본문 형식으로 작성
`;
  } else if (mode === "reply") {
    systemPrompt = SYSTEM_PRESETS.reply;
    userPrompt = `
[상대가 보낸 메시지]
${userInput}

[요청]
- 길이: ${lengthGuide || "한두 단락 정도"}
- 톤: ${toneGuide || "상대가 기분 좋을 따뜻한 톤"}
- 구체적인 답변과 공감 표현 포함
`;
  } else if (mode === "report") {
    systemPrompt = SYSTEM_PRESETS.report;
    userPrompt = `
[보고서 작성에 참고할 내용]
${userInput}

[요청]
- 길이: ${lengthGuide || "1~2페이지 분량 느낌"}
- 톤: ${toneGuide || "전문적이고 단정한 톤"}
- 서론 / 본론 / 결론 구조로 작성
`;
  } else if (mode === "blog") {
    systemPrompt = SYSTEM_PRESETS.blog;
    userPrompt = `
[블로그 글 주제/키워드]
${userInput}

[요청]
- 길이: ${lengthGuide || "2000자 내외"}
- 톤: ${toneGuide || "자연스럽고 친근한 톤"}
- H2/H3 구조를 활용해 가독성 있게 구성
`;
  } else if (mode === "rewrite_soft") {
    systemPrompt = SYSTEM_PRESETS.rewrite_soft;
    userPrompt = `
[원문]
${userInput}

[요청]
- 길이: ${lengthGuide || "원문과 비슷한 분량"}
- 톤: ${toneGuide || "부드럽고 자연스러운 톤"}
- 의미는 유지하면서 표현만 더 자연스럽게 변경
`;
  } else if (mode === "rewrite_pro") {
    systemPrompt = SYSTEM_PRESETS.rewrite_pro;
    userPrompt = `
[원문]
${userInput}

[요청]
- 길이: ${lengthGuide || "원문과 비슷하거나 약간 더 짧게"}
- 톤: ${toneGuide || "전문적이고 신뢰감 있는 톤"}
- 비즈니스 문서/보고서에 바로 쓸 수 있게 리라이팅
`;
  } else if (mode === "rewrite_short") {
    systemPrompt = SYSTEM_PRESETS.rewrite_short;
    userPrompt = `
[원문]
${userInput}

[요청]
- 길이: ${lengthGuide || "원문의 1/2 ~ 1/3 수준"}
- 톤: ${toneGuide || "핵심만 담는 간결한 톤"}
- 가장 중요한 정보만 남기고 나머지는 과감히 삭제
`;
  } else if (mode === "rewrite_long") {
    systemPrompt = SYSTEM_PRESETS.rewrite_long;
    userPrompt = `
[원문]
${userInput}

[요청]
- 길이: ${lengthGuide || "원문보다 길게"}
- 톤: ${toneGuide || "자연스럽고 설명적인 톤"}
- 예시, 설명, 부가 정보를 추가하여 확장
`;
  } else if (mode === "seo") {
    systemPrompt = SYSTEM_PRESETS.seo;
    userPrompt = `
[분석 대상 글]
${userInput}

[요청]
- 핵심 키워드 8~12개
- 검색 의도
- 메타 설명(약 150자)
- 개선 포인트 5개
`;
  } else if (mode === "multi") {
    systemPrompt = SYSTEM_PRESETS.multi;
    userPrompt = `
[원문]
${userInput}

[요청]
- A) 따뜻한 스타일
- B) 전문 비즈니스 스타일
- C) SNS 캐주얼 스타일
각 버전을 명확히 구분해서 작성
`;
  } else if (mode === "idea") {
    systemPrompt = SYSTEM_PRESETS.idea;
    userPrompt = `
[키워드/주제]
${userInput}

[요청]
- 콘텐츠 아이디어 10개
- 각 아이디어마다 한 줄 설명 포함
`;
  } else if (mode === "analyze") {
    systemPrompt = SYSTEM_PRESETS.analyze;
    userPrompt = `
[분석 대상 글]
${userInput}

[요청]
- 점수표(예: 구조, 문장력, 설득력 등)
- 강점 3개
- 개선점 3개
- 총평
`;
  } else if (mode === "imgprompt") {
    systemPrompt = SYSTEM_PRESETS.imgprompt;
    userPrompt = `
[이미지로 만들고 싶은 내용]
${userInput}

[요청]
- 짧은 프롬프트 한 줄
- 상세 프롬프트 (구도, 스타일, 조명, 분위기 등 포함)
- 영어 버전도 함께 제공
`;
  } else {
    // 모드가 매칭 안 될 경우: 기본 정리 모드
    systemPrompt = "너는 고급 글쓰기/정리 전문 AI다.";
    userPrompt = `
[정리할 내용]
${userInput}

[요청]
- 길이: ${lengthGuide || "상황에 맞게 자연스럽게"}
- 톤: ${toneGuide || "자연스럽고 읽기 좋은 톤"}
- 가독성 좋게 정리하고 중요한 포인트를 살려 작성
`;
  }

  // ========================================
  // OpenAI 단일 호출
  // ========================================
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // 🔥 쿼터 절약을 위해 mini 사용
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res
        .status(500)
        .json({ error: "OpenAI 응답이 비어 있습니다." });
    }

    return res.json({ result: text });
  } catch (e) {
    console.error("AI 생성 오류:", e.response?.data || e.message || e);

    const detail =
      e?.response?.data?.error?.message ||
      e?.response?.data?.error ||
      e?.response?.data ||
      e.message ||
      String(e);

    return res.status(500).json({
      error: "AI 생성 중 오류가 발생했습니다.\n" + detail
    });
  }
});

// ===============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Ultimate AI Writer Lite (KR) Running on ${PORT}`);
});
