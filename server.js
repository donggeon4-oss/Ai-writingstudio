import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// 모바일 404 / 캐시 문제 방지
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// 정적 파일 제공 (public/tool.html, public/script.js 등)
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ------------------------------------------------------------
// MAIN AI ENGINE
// ------------------------------------------------------------
app.post("/generate", async (req, res) => {
  // ✅ content로 보내든 userInput으로 보내든 둘 다 받게 처리
  let { userInput, content, mode, length, tone } = req.body;
  userInput = userInput || content;

  console.log("📥 /generate body:", {
    mode,
    length,
    tone,
    userInputPreview: (userInput || "").slice(0, 50)
  });

  if (!userInput) {
    return res
      .status(400)
      .json({ error: "userInput(또는 content)가 비어 있습니다." });
  }

  // 길이 옵션
  let style = "";
  if (length === "short") style = "약 700자 내외로 핵심만 간결하게.";
  if (length === "normal") style = "약 1500자 내외로 자연스럽게.";
  if (length === "long") style = "약 2500~3500자 정도로 풍부하게.";

  // 톤 옵션
  const toneMap = {
    default: "",
    warm: "따뜻하고 부드러운 말투로 작성해줘.",
    professional: "전문적이고 단정한 비즈니스 톤으로 작성해줘.",
    emotional: "감성적이고 공감되는 표현을 사용해줘.",
    mz: "MZ 세대 스타일로 위트 있게 작성해줘.",
    news: "뉴스 기사 스타일로 간결하게 작성해줘.",
    thesis: "논문체로 논리적이고 형식을 갖춰 작성해줘.",
    copy: "카피라이팅 톤으로 임팩트 있게 작성해줘.",
    sns: "SNS 스타일로 짧고 캐주얼하게.",
    lecture: "강의하듯 이해하기 쉽게 작성해줘."
  };
  const toneGuide = toneMap[tone] || "";

  //----------------------------------------------------------------
  // 🚀 1) 자동 글 생성 기능 (auto)
  //----------------------------------------------------------------
  if (mode === "auto") {
    const prompt = `
당신은 최고급 블로그/문서 자동 생성 전문 AI입니다.

[주제]
${userInput}

[요청]
- ${style}
- ${toneGuide}
- SEO 최적화 자동 포함
- H1 제목 1개
- H2 소제목 3~6개
- 각 소제목별 문단 2~4개
- 결론 포함
- 자연스럽고 사람처럼 쓰기
- 가독성, 흐름, 논리 우선
- 중복 문장 금지
- 실제 블로그에 바로 올릴 수 있는 고품질 글 생성

이 조건을 충족하는 완성된 고품질 글을 작성해줘.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        max_tokens: 2600,
        messages: [
          {
            role: "system",
            content: "너는 고품질 문서/블로그 자동생성 전문 AI다."
          },
          { role: "user", content: prompt }
        ]
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      console.log("✅ auto result preview:", (text || "").slice(0, 100));

      if (!text) {
        return res
          .status(500)
          .json({ error: "OpenAI 응답이 비어 있습니다.(auto)" });
      }

      return res.json({ result: text });
    } catch (err) {
      console.error(
        "AI Error(auto):",
        err.response?.data || err.message || err
      );
      return res.status(500).json({
        error: "자동 글 생성 중 오류 발생",
        detail: err.response?.data || err.message || String(err)
      });
    }
  }

  //----------------------------------------------------------------
  // 이하 summary / email / blog / rewrite / seo / step 등
  //----------------------------------------------------------------

  let prompt = "";

  // SUMMARY
  if (mode === "summary") {
    prompt = `
아래 내용을 ${style}
${toneGuide}
자연스럽고 따뜻하게 요약해줘.

[내용]
${userInput}
`;
  }

  // EMAIL
  if (mode === "email") {
    prompt = `
아래 내용을 기반으로 ${toneGuide}
정중하고 자연스러운 이메일을 작성해줘.

${userInput}
`;
  }

  // REPLY
  if (mode === "reply") {
    prompt = `
아래 메시지에 대한 답장을 ${toneGuide} 작성해줘.

[메시지]
${userInput}
`;
  }

  // REPORT
  if (mode === "report") {
    prompt = `
아래 내용을 바탕으로 1페이지 분량의 보고서를 작성해줘.
${style}
${toneGuide}

${userInput}
`;
  }

  // BLOG FULL
  if (mode === "blog") {
    prompt = `
당신은 최고급 블로그 작가입니다.

[주제]
${userInput}

요청:
${style}
${toneGuide}
`;
  }

  // REWRITES
  if (mode === "rewrite_soft") {
    prompt = `더 부드럽고 자연스럽게 다시 작성해줘.\n${toneGuide}\n\n${userInput}`;
  }

  if (mode === "rewrite_pro") {
    prompt = `전문적이고 고급스럽게 다시 작성해줘.\n${toneGuide}\n\n${userInput}`;
  }

  if (mode === "rewrite_short") {
    prompt = `핵심만 남겨 짧게 정리해줘.\n${toneGuide}\n\n${userInput}`;
  }

  if (mode === "rewrite_long") {
    prompt = `내용 유지하면서 더 길고 풍부하게 확장해줘.\n${toneGuide}\n\n${userInput}`;
  }

  // SEO
  if (mode === "seo") {
    prompt = `
아래 글 SEO 분석:

${userInput}

요청:
- 키워드 8~12개
- 검색 의도
- 메타 설명(150자)
- 개선 포인트 5개
`;
  }

  // MULTI
  if (mode === "multi") {
    prompt = `
아래 글을 세 가지 스타일로 재작성:

${userInput}

A) 따뜻한 스타일  
B) 전문 비즈니스  
C) SNS형  
`;
  }

  // STEP1
  if (mode === "blog_step1") {
    prompt = `
키워드 분석:

${userInput}

요청:
- 검색 의도
- 핵심 키워드
- 타깃 독자
- 글 방향성
`;
  }

  // STEP2
  if (mode === "blog_step2") {
    prompt = `
아래 분석 기반 개요 작성:

${userInput}

요청:
- H2 4~6개
- 각 H2 아래 H3 2~3개
`;
  }

  // STEP3
  if (mode === "blog_step3") {
    prompt = `
아래 개요 기반 블로그 2000~3000자 작성:

${userInput}

조건:
- H2/H3 구성 유지
- SEO 키워드
- 자연스럽고 따뜻하게
`;
  }

  // IDEA
  if (mode === "idea") {
    prompt = `
키워드: ${userInput}
아이디어 10개 + 한 줄 설명 작성
`;
  }

  // SCORE
  if (mode === "analyze") {
    prompt = `
아래 글 분석:

${userInput}

요청:
- 점수표
- 강점 3개
- 개선점 3개
- 총평  
`;
  }

  // IMAGE PROMPT
  if (mode === "imgprompt") {
    prompt = `
아래 내용을 기반으로 이미지 생성 프롬프트 작성:

${userInput}

요청:
- 짧은 프롬프트
- 상세 프롬프트
- 영어 버전도 함께 제공
`;
  }

  // 모드가 위에서 하나도 안 걸렸으면 기본 요약 모드로 처리
  if (!prompt) {
    prompt = `
아래 내용을 자연스럽고 읽기 좋게 정리해줘.
${style}
${toneGuide}

${userInput}
`;
  }

  // ---------------------------------------------------------
  // OPENAI CALL (공통 처리)
  // ---------------------------------------------------------
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 2200,
      messages: [
        {
          role: "system",
          content: "너는 프리미엄 문서/콘텐츠 생성 전문 AI다."
        },
        { role: "user", content: prompt }
      ]
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    console.log("✅ common result preview:", (text || "").slice(0, 100));

    if (!text) {
      return res
        .status(500)
        .json({ error: "OpenAI 응답이 비어 있습니다.(common)" });
    }

    res.json({ result: text });
  } catch (err) {
    console.error(
      "AI Error(common):",
      err.response?.data || err.message || err
    );
    res.status(500).json({
      error: "AI 생성 중 오류 발생",
      detail: err.response?.data || err.message || String(err)
    });
  }
});

// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Ultimate AI Writer Running on ${PORT}`)
);
