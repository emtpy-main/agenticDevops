const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");

async function cloneRepo(context) {
  let { repoUrl, gitToken, jobId } = context;

  if (!repoUrl) {
    throw new Error("Repository URL is required");
  }

  // Insert git token if available and URL is HTTPS
  if (gitToken && repoUrl.startsWith("https://")) {
    repoUrl = repoUrl.replace("https://", `https://${gitToken}@`);
  }

  // Handle case where URL might now have token, extract name properly
  const repoName = context.repoUrl.split("/").pop().replace(".git", "");
  const baseDir = path.join(process.cwd(), "repos");
  const targetDir = path.join(baseDir, `${repoName}-${jobId || "default"}`);

  fs.mkdirSync(baseDir, { recursive: true });

  // ✅ If repo already exists → SKIP cloning
  if (fs.existsSync(targetDir)) {
    console.log("⚡ Repo already exists. Skipping clone.");

    return {
      repoPath: targetDir,
      repoName,
      skipped: true
    };
  }

  const git = simpleGit();

  console.log("📦 Cloning repo:", repoUrl);

  await git.clone(repoUrl, targetDir, ["--depth", "1"]);

  console.log("✅ Repo cloned at:", targetDir);

  return {
    repoPath: targetDir,
    repoName,
    skipped: false
  };
}

module.exports = cloneRepo;