const axios = require("axios");

async function fixDockerfile(dockerfile, errors, { groqApiKey }) {
  console.log("🔧 Fixing Dockerfile via Groq...");

  const prompt = `
You are an expert DevOps engineer.

Fix the Dockerfile based on these errors:

${errors.join("\n")}

STRICT RULES:
- Output ONLY valid Dockerfile
- NO explanations
- NO markdown
- ONLY valid Docker instructions
- Use Node 18+
- Use npm ci
- No dev commands

Current Dockerfile:
${dockerfile}
`;

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You output ONLY clean Dockerfile. No text. No explanation."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0
    },
    {
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  let fixed = response.data.choices[0].message.content;

  // 🔒 Clean output strictly
  fixed = fixed
    .replace(/```dockerfile/gi, "")
    .replace(/```/g, "")
    .trim();

  return fixed;
}

module.exports = fixDockerfile;