// ========================================
// Ultimate AI Writing Studio - PRO Optimized Server
// (Multi-Pass + Speed Boost + High Quality)
// ========================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// ---- 기본 서버 설정 ----
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.static("public"));

// ---- OpenAI 설정 ----
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.log("❌ OPENAI_API_KEY 없음(.env 확인)");

const openai = new OpenAI({
  apiKey: OPENAI_KEY,
});

// ---- 모델 선택 ----
const FAST_MODEL = "gpt-4o-mini";
const FAST_MODEL_2 = "gpt-4o-mini-tts";  // Multi-Pass용
const QUALITY_MODEL = "gpt-4o";

// ---- 입력 텍스트 정리 (속도 향상) ----
function cleanText(t = "") {
  return t.replace(/\s+/g, " ").trim();
}

// ---- SYSTEM 프리셋 ----
const SYSTEM_PRESETS = {
  summary: `너는 고급 요약 AI다. 핵심을 정확하게 추출한다.`,
  email: `너는 비즈니스 이메일 작성 전문가다.`,
  reply: `너는 따뜻한 감정 케어 답변 전문가다.`,
  report: `너는 전문 보고서 작성 AI다.`,
  blog: `너는 고급 블로그 글쓰기 전문가다.`,
  rewrite: `너는 고급 리라이팅 전문가다.`,
  seo: `너는 SEO 전문 분석가다.`,
  idea: `너는 창의적 아이디어 전문가다.`,
  analyze: `너는 글 분석 전문가다.`,
  imgprompt: `너는 이미지 프롬프트 전문가다.`,
};

// ===============================================
// 🔥 Multi-Pass 엔진 (품질 강화)
// 1) 초안 → 2) 고급 리라이팅 → 3) 최종 정제
// ===============================================
async function multiPass(prompt, systemPrompt) {
  // --- 1차 생성 ---
  const p1 = await openai.chat.completions.create({
    model: FAST_MODEL_2,
    temperature: 0.8,
    max_tokens: 1100,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ]
  });
  const pass1 = p1.choices[0].message.content;

  // --- 2차 자연스러운 문장 흐름 조정 ---
  const p2 = await openai.chat.completions.create({
    model: FAST_MODEL_2,
    temperature: 0.65,
    max_tokens: 900,
    messages: [
      { role: "system", content: "너는 고급 문장 다듬기 전문가다. 흐름을 자연스럽게 재작성하라." },
      { role: "user", content: pass1 }
    ]
  });
  const pass2 = p2.choices[0].message.content;

  // --- 3차 최종 정제 ---
  const p3 = await openai.chat.completions.create({
    model: FAST_MODEL_2,
    temperature: 0.55,
    max_tokens: 850,
    messages: [
      { role: "system", content: "너는 글 정제 전문가다. 자연스럽고 고급스럽게 정리하라." },
      { role: "user", content: pass2 }
    ]
  });

  return p3.choices[0].message.content;
}

// ===============================================
// 🔥 /generate 메인 엔진
// ===============================================
app.post("/generate", async (req, res) => {
  let { userInput, mode, length, tone } = req.body;

  userInput = cleanText(userInput);

  const lengthMap = {
    short: "700자 내외",
    normal: "1500자 내외",
    long: "2500~3500자 내외",
  };
  const lengthGuide = lengthMap[length] || "";

  const toneMap = {
    default: "",
    warm: "따뜻하고 부드러운 톤",
    professional: "전문적이고 단정한 톤",
    emotional: "감성적이고 공감되는 표현",
    mz: "위트 있는 MZ 스타일",
    news: "뉴스 기사처럼 간결한 톤",
    thesis: "논문체의 논리적 톤",
    copy: "카피라이팅 톤",
    sns: "SNS 스타일",
    lecture: "강의처럼 친절한 톤"
  };
  const toneGuide = toneMap[tone] || "";

  // ===============================================
  // AUTO → 최고품질 모델 (gpt-4o 단일 패스)
  // ===============================================
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
- 각 소제목마다 2~4문단
- 사람처럼 자연스럽게
- 중복 금지
    `.trim();

    try {
      const r = await openai.chat.completions.create({
        model: QUALITY_MODEL,
        temperature: 0.75,
        max_tokens: 2600,
        messages: [
          { role: "system", content: "너는 최고급 블로그 글 생성 AI다." },
          { role: "user", content: autoPrompt }
        ]
      });

      return res.json({ result: r.choices[0].message.content });
    } catch (e) {
      return res.status(500).json({ error: "AUTO 생성 오류" });
    }
  }

  // ===============================================
  // 그 외 모든 기능 → Multi-Pass 고품질 엔진
  // ===============================================
  const systemPrompt = SYSTEM_PRESETS[mode] || "너는 고급 글쓰기 전문가다.";

  const finalPrompt = `
[입력 내용]
${userInput}

[요청]
- 길이: ${lengthGuide}
- 톤: ${toneGuide}
- 고급스럽고 자연스러운 문장
- 논리 구조 유지
- 매끄러운 흐름
  `.trim();

  try {
    const text = await multiPass(finalPrompt, systemPrompt);
    return res.json({ result: text });
  } catch (err) {
    console.error("Multi-Pass Error:", err);
    return res.status(500).json({ error: "AI 생성 오류" });
  }
});

// ===============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Ultimate AI Writing Studio PRO Running on ${PORT}`)
);
