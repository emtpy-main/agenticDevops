const { execSync } = require("child_process");

async function safeGitPush(context) {
  const { repoPath, gitToken, repoUrl } = context;

  if (gitToken && repoUrl && repoUrl.startsWith("https://")) {
      const authUrl = repoUrl.replace("https://", `https://${gitToken}@`);
      execSync(`git remote set-url origin ${authUrl}`, { cwd: repoPath });
  }

  const branch = "devops-agent-deploy";

  console.log("🔐 Pushing changes to GitHub...");

  try {
      execSync(`git checkout -b ${branch}`, { cwd: repoPath });
  } catch (e) {
      execSync(`git checkout ${branch}`, { cwd: repoPath });
  }
  
  execSync(`git add .`, { cwd: repoPath });
  
  try {
      execSync(`git commit -m "Add Dockerfile + render config"`, {
        cwd: repoPath
      });
  } catch (e) {
      console.log("No changes to commit");
  }
  
  execSync(`git push -u origin ${branch}`, {
    cwd: repoPath,
    stdio: "inherit"
  });

  console.log("✅ Code pushed to new branch");

  return {};
}

module.exports = safeGitPush;