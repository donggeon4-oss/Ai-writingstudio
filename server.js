// ========================================
// Ultimate AI Writing Studio - Korean Server (Final Optimized)
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

// 🔥 Render / Stackblitz 모두 호환되는 정적 파일 경로
app.use(express.static(path.join(__dirname, "public")));

// ===============================================
// 🔥 OpenAI client
// ===============================================
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn("❌ OPENAI_API_KEY 가 .env 에 없습니다. .env 를 확인하세요.");
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
  rewrite: `
너는 고급 리라이팅 전문가다.
원문의 의미는 유지하되 문장력·가독성을 강화하여 재작성한다.
`,
  seo: `
너는 SEO 전문 분석가다.
키워드·검색 의도·개선 포인트를 명확히 제시한다.
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
// 🔥 Multi-Pass 품질 향상 엔진
// 1차 생성 → 2차 문장 다듬기 → 3차 정제
// ===============================================
async function multiPass(prompt, systemPrompt) {
  // 1차: 기본 생성 (빠르고 저렴한 4o-mini)
  const first = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_tokens: 1100,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });

  const pass1 = first.choices[0].message.content;

  // 2차: 고급 리라이팅
  const second = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.65,
    max_tokens: 1000,
    messages: [
      {
        role: "system",
        content:
          "너는 고급 문장 다듬기 전문가다. 더 자연스럽고 읽기 좋은 문장 흐름으로 재작성해라."
      },
      { role: "user", content: pass1 }
    ]
  });

  const pass2 = second.choices[0].message.content;

  // 3차: 최종 정제
  const third = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content:
          "너는 글 정제 전문가다. 문장을 더 매끄럽고 고급스럽게 정리해라."
      },
      { role: "user", content: pass2 }
    ]
  });

  return third.choices[0].message.content;
}

// ===============================================
// 🔥 메인 엔진 /generate
// ===============================================
app.post("/generate", async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(500).json({
      error: "서버에 OPENAI_API_KEY 가 설정되어 있지 않습니다. .env 를 확인하세요."
    });
  }

  const { userInput, mode, length, tone } = req.body;

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
    professional: "전문적이고 단정한 톤",
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
  // AUTO 모드: gpt-4o 단일 패스로 풀 블로그 생성
  // ========================================
  if (mode === "auto") {
    const autoPrompt = `
당신은 최고급 블로그 자동 생성 전문가입니다.

[주제]
${userInput}

[요청]
- ${lengthGuide}
- ${toneGuide}
- SEO 최적화 포함
- H1 제목 1개
- H2 소제목 3~6개
- 각 섹션마다 자연스러운 문단 2~4개
- 결론 포함
- 사람처럼 자연스럽게 작성
- 중복 표현 금지
`;

    try {
      const r = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 2600,
        messages: [
          { role: "system", content: "너는 고품질 블로그 글 전문 생성 AI다." },
          { role: "user", content: autoPrompt }
        ]
      });

      return res.json({ result: r.choices[0].message.content });
    } catch (e) {
      console.error("AUTO 생성 오류:", e);
      return res.status(500).json({ error: "AUTO 생성 중 오류가 발생했습니다." });
    }
  }

  // ========================================
  // 그 외 모드: Multi-Pass + SYSTEM_PRESETS
  // ========================================
  const systemPrompt = SYSTEM_PRESETS[mode] || "너는 고급 글쓰기 전문가다.";

  const finalPrompt = `
[사용자 입력]
${userInput}

[요청]
- 길이: ${lengthGuide}
- 톤: ${toneGuide}
- 자연스럽고 고급스럽게 작성
- 논리적 구조 유지
`;

  try {
    const aiText = await multiPass(finalPrompt, systemPrompt);
    return res.json({ result: aiText });
  } catch (e) {
    console.error("AI 생성 오류:", e);
    return res.status(500).json({ error: "AI 생성 중 오류가 발생했습니다." });
  }
});

// ===============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Ultimate AI Writer PRO (KR) Running on ${PORT}`);
});
