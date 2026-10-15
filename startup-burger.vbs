' ═══════════════════════════════════════════════════════════════════════════
' SR & SRA BURGER — Script de autostart para Windows
' ═══════════════════════════════════════════════════════════════════════════
' 1) Inicia el servidor Node.js en background (minimizado)
' 2) Espera a que el puerto 3000 esté listo
' 3) Abre notifi.html en el navegador predeterminado

Set objShell = CreateObject("WScript.Shell")
Set objFSO   = CreateObject("Scripting.FileSystemObject")

strScriptDirectory = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatchFile       = strScriptDirectory & "\start-server.bat"

If NOT objFSO.FileExists(strBatchFile) Then
    WScript.Echo "Error: No se encontró start-server.bat en: " & strBatchFile
    WScript.Quit 1
End If

' Lanzar el servidor minimizado, sin esperar
objShell.CurrentDirectory = strScriptDirectory
objShell.Run """" & strBatchFile & """", 7, False

' Esperar a que el servidor responda en localhost:3000 (máx ~60 s)
Dim intentos, listo, http
listo = False
For intentos = 1 To 30
    WScript.Sleep 2000
    On Error Resume Next
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", "http://localhost:3000/notifi.html", False
    http.Send
    If Err.Number = 0 And http.Status >= 200 And http.Status < 500 Then
        listo = True
        On Error GoTo 0
        Exit For
    End If
    Err.Clear
    On Error GoTo 0
Next

' Abrir notifi.html en el navegador predeterminado del sistema
objShell.Run "cmd /c start """" ""http://localhost:3000/notifi.html""", 0, False
