' Vysion Print Agent — Watchdog
'
' Wordt elke minuut door Windows Taakplanner uitgevoerd. Als de agent
' niet draait én de gebruiker actief ingelogd is, start hij hem stilletjes
' opnieuw. Geen UI, geen consolevenster.
'
' Argumenten:  CScript watchdog.vbs "<volledig pad naar exe>"
'
Option Explicit

Dim args, exePath, shell, wmi, procs
Set args = WScript.Arguments
If args.Count < 1 Then WScript.Quit 0
exePath = args(0)

' Alleen handelen wanneer de exe daadwerkelijk bestaat.
Dim fso : Set fso = CreateObject("Scripting.FileSystemObject")
If Not fso.FileExists(exePath) Then WScript.Quit 0

' Check of er al een instance van "Vysion Print Agent.exe" draait voor
' deze user. Zo ja → niets doen.
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set procs = wmi.ExecQuery("SELECT Name FROM Win32_Process WHERE Name = 'Vysion Print Agent.exe'")
If procs.Count > 0 Then WScript.Quit 0

' Geen instance → start de exe verborgen (vbHide=0 toont niets, taakbalk-icoon
' verschijnt zodra Electron klaar is met opstarten).
Set shell = CreateObject("WScript.Shell")
shell.Run """" & exePath & """", 0, False
WScript.Quit 0
