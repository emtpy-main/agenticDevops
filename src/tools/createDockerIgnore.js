const fs = require("fs");
const path = require("path");

async function createDockerIgnore(context) {
  const { repoPath } = context;

  const content = `
node_modules
.git
.env
Dockerfile
npm-debug.log
`;

  const filePath = path.join(repoPath, ".dockerignore");

  fs.writeFileSync(filePath, content.trim());

  console.log("📦 .dockerignore created");

  return {};
}

module.exports = createDockerIgnore;