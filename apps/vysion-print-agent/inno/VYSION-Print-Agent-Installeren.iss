; Vysion Print Agent — professionele USB-installer (Inno Setup 6)
; Onafhankelijk van electron-builder NSIS. Printengine ongewijzigd (win-unpacked payload).
;
; Bouwen (Windows):  powershell -File ..\scripts\build-inno-installer.ps1

#include "payload-sha256.inc"

#define MyAppName "Vysion Print Agent"
#define MyAppVersion "2.0.21-pilot"
#define MyAppPublisher "Vysion Horeca"
#define MyAppExeName "Vysion Print Agent.exe"
#define MyAppId "{A3F2D86E-D0FA-5764-849D-F349CE8B9648}"
#define PayloadDir "..\dist\win-unpacked"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\vysion-print-agent
DefaultGroupName=Vysion
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=output
OutputBaseFilename=VYSION Print Agent Installeren
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
CloseApplications=force
RestartApplications=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern
SolidCompression=yes
Compression=lzma2/max
MinVersion=10.0
; Extra log naast VysionLogPath: /LOG="C:\pad\install-inno.log"

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Snelkoppeling op bureaublad (Vysion Kassa)"; GroupDescription: "Snelkoppelingen:"; Flags: checkedonce

[Files]
Source: "{#PayloadDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Vysion Kassa"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--open-kassa"
Name: "{autodesktop}\Vysion Kassa"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--open-kassa"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\vysion-print-agent"; ValueType: string; ValueName: "InstallLocation"; ValueData: "{app}"; Flags: uninsdeletekey

[Run]
; Start gebeurt in Pascal (ssPostInstall) na integriteitscontrole.

[UninstallDelete]
Type: filesandordirs; Name: "{group}"

[Code]
#include "VysionInstallLogic.iss"
