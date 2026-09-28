$env:ELECTRON_RUN_AS_NODE = "1"
Start-Process -FilePath "C:\Users\evan0\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe" -ArgumentList "standalone_server.cjs" -RedirectStandardOutput "server_out.txt" -RedirectStandardError "server_err.txt" -NoNewWindow -Wait
