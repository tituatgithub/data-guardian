import subprocess, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(cmd):
    print("RUN:", cmd)
    p = subprocess.run(cmd, shell=True, cwd=ROOT)
    if p.returncode != 0:
        raise RuntimeError("Command failed:", cmd)

class Agent:
    def setup_branch(self):
        run("git checkout -B mvp")
        run("git add -A")
        run('git commit -m "agent: setup" || true')
        run("git push origin mvp --set-upstream")

    def run_tests(self):
        run("pytest backend/tests -q")

    def build_extension(self):
        run("mkdir -p artifacts")
        run("cd extension && zip -r ../artifacts/extension.zip .")

if __name__ == "__main__":
    a = Agent()
    a.run_tests()
    a.build_extension()
    print("Agent finished.")
