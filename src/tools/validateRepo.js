const fs = require("fs");
const path = require("path");

async function validateRepo({ repoPath }) {
  const pkgPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(pkgPath)) {
    throw new Error("Invalid repo: package.json missing");
  }

  console.log("✅ Repo validated");

  return {};
}

module.exports = validateRepo;