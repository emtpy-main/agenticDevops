# EC2 Deployment: The Learning Log (Issues Faced) 🛠

This document tracks the technical challenges encountered while deploying the Agentic DevOps system to AWS EC2 and how they were resolved. Use this as a guide for future production deployments.

---

### 1. The "OOM" (Out of Memory) Freeze
- **Issue**: The EC2 instance (t2.micro, 1GB RAM) would completely freeze and stop responding during Docker builds.
- **Root Cause**: Kaniko’s "full filesystem snapshotting" and `npm install` for large React projects exceeded the physical RAM.
- **Solution**: 
  - Implemented a **2GB Swap file** to provide virtual memory.
  - Switched from Kaniko to **Native Docker Builds** to reduce memory overhead.

### 2. The "Bulletproof" Path Mapping Inception
- **Issue**: The Backend (running in a Docker container) was cloning repos to `/app/repos`, but when it told the Host Docker to build them, the Host couldn't find the folder.
- **Root Cause**: The Host Docker daemon does not see the container's internal paths. It only sees host-level absolute paths.
- **Solution**: Created a mapping logic that calculates the host-side path (`/home/ubuntu/agenticDevops/repos/...`) by taking the project root and joining the relative path from the container's perspective.

### 3. Linux Case-Sensitivity "Trap"
- **Issue**: `ls: cannot access repos: No such file or directory` even when the folder existed.
- **Root Cause**: Windows is case-insensitive, but Linux is case-sensitive. The project was in `agenticDevops` (lowercase 'o'), but the `.env` had `agenticDevOps` (uppercase 'O').
- **Solution**: Standardized all paths to lowercase or exact matches.

### 4. ENOSPC: Disk Space Exhaustion
- **Issue**: `npm install` failing with `no space left on device`.
- **Root Cause**: The default 8GB EBS volume was filled with failed Docker build layers and old cloned repositories.
- **Solution**: 
  - Implemented `docker system prune -a` to wipe the cache.
  - Added an **Auto-Cleanup** phase in `controller.js` that deletes the `repos/` folder immediately after every build.

### 5. Docker Hub "UNAUTHORIZED" (Kaniko)
- **Issue**: Pushing images to Docker Hub failed even with correct credentials.
- **Root Cause**: Mounting the authentication JSON file into the Kaniko container was failing because the file was being created with restricted permissions or at paths Kaniko couldn't read.
- **Solution**: Moved the auth JSON into the repository folder itself (which we already verified was visible to the builder) and ensured `666` permissions.

### 6. The "404 vs. Timeout" Mystery
- **Issue**: The domain would sometimes Timeout and sometimes show a 404.
- **Root Cause**: 
  - **Timeout**: Usually the AWS Security Group (Port 80/443) or the local Ubuntu Firewall (ufw) blocking traffic.
  - **404**: Traffic is reaching Nginx, but Nginx doesn't have a route for that domain or the backend is not responding.
- **Solution**: Used `tcpdump` and `curl -I localhost` to verify traffic flow step-by-step from AWS -> Nginx -> Node.js.

### 7. RabbitMQ Network Isolation
- **Issue**: Backend could not connect to RabbitMQ.
- **Root Cause**: Locally, the app used `localhost`, but inside Docker Compose, it must use the service name `rabbitmq`.
- **Solution**: Used `RABBITMQ_URL=amqp://rabbitmq` in the production environment.

---

## 💡 Key Lessons for Next Time:
1.  **Always enable Swap** on small instances immediately.
2.  **Monitor disk space** (`df -h`) during Docker-heavy projects.
3.  **Assume case-sensitivity** from day one.
4.  **Security Groups** are the first place to check for timeouts.
5.  **Logs are truth**: `docker compose logs -f` is your best friend.
