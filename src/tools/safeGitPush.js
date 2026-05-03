const { execSync } = require("child_process");

async function safeGitPush(context) {
  const { repoPath, gitToken, repoUrl } = context;

  let pushTarget = "origin";
  if (gitToken && repoUrl && repoUrl.startsWith("https://")) {
      pushTarget = repoUrl.replace("https://", `https://${gitToken}@`);
  }

  const branch = "devops-agent-deploy";

  console.log("🔐 Pushing changes to GitHub...");

  // Set local git config to prevent "identity unknown" errors
  try {
      execSync(`git config user.email "agent@devops.com"`, { cwd: repoPath });
      execSync(`git config user.name "DevOps Agent"`, { cwd: repoPath });
  } catch (e) {
      console.log("Warning: Could not set git config");
  }

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
  
  console.log(`🔐 Pushing to ${branch}...`);

  execSync(`git push -u ${pushTarget} ${branch} --force`, {
    cwd: repoPath,
    stdio: "inherit"
  });

  console.log("✅ Code pushed to new branch");

  // 🔗 Update deep link in Firestore
  const githubBranchUrl = `${repoUrl.replace(".git", "").replace(/\/$/, "")}/tree/${branch}`;
  if (context.logger) {
    await context.logger.updateStatus("in-progress", { githubBranchUrl });
  }

  return { githubBranchUrl };
}

module.exports = safeGitPush;