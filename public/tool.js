async function generate(mode) {
  const input = document.getElementById("input").value;
  const length = document.getElementById("length").value;
  const output = document.getElementById("output");

  output.innerText = "✨ 따뜻하게 생성 중입니다...";

  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput: input, mode, length })
    });

    const data = await response.json();

    if (!data || !data.result) {
      output.innerText = "⚠️ 결과를 불러오지 못했습니다. 다시 시도해주세요!";
      return;
    }

    output.innerText = data.result;

  } catch (err) {
    output.innerText = "⚠️ 서버와 통신 중 문제가 발생했습니다.";
  }
}

function copyOutput() {
  const text = document.getElementById("output").innerText;
  navigator.clipboard.writeText(text);
  alert("📋 복사 완료!");
}

function resetFields() {
  document.getElementById("input").value = "";
  document.getElementById("output").innerText = "결과가 여기에 표시됩니다.";
}
