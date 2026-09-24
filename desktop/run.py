"""Launch LCA·AI Desktop — Python engine + React UI."""
import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def main():
    desktop_dir = Path(__file__).parent
    react_dir = desktop_dir / "react-ui"

    print("=== LCA·AI Desktop ===")
    print()

    # 1. Start Python RPC server
    print("[1/3] Starting Python LCA engine...")
    engine_proc = subprocess.Popen(
        [sys.executable, "-m", "lca_engine.rpc_server"],
        cwd=str(desktop_dir),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(1)

    # Check if engine started
    if engine_proc.poll() is not None:
        print("  ERROR: Python engine failed to start")
        return
    print("  OK — engine running (PID: {})".format(engine_proc.pid))

    # 2. Install React dependencies if needed
    node_modules = react_dir / "node_modules"
    npm = r"C:\Program Files\nodejs\npm.cmd"
    if not node_modules.exists():
        print("[2/3] Installing React dependencies...")
        subprocess.run([npm, "install"], cwd=str(react_dir), check=True)
    else:
        print("[2/3] React dependencies already installed")

    # 3. Start React dev server
    print("[3/3] Starting React UI...")
    react_proc = subprocess.Popen(
        [npm, "run", "dev"],
        cwd=str(react_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(3)

    # Open browser
    url = "http://localhost:5173"
    print(f"\n  Opening {url} in browser...")
    webbrowser.open(url)

    print("\n=== LCA·AI Desktop is running ===")
    print("Press Ctrl+C to stop")
    print()

    try:
        # Wait for processes
        engine_proc.wait()
        react_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        engine_proc.terminate()
        react_proc.terminate()
        engine_proc.wait()
        react_proc.wait()
        print("Done.")

if __name__ == "__main__":
    main()
