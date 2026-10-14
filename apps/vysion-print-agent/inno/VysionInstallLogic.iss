; Vysion Print Agent — Inno Setup install/uninstall logica (pilot, herstel kapotte NSIS-uninstaller)

#define VysionElectronUninstallKey "Software\Microsoft\Windows\CurrentVersion\Uninstall\a3f2d86e-d0fa-5764-849d-f349ce8b9648"
#define VysionElectronInstallKey "Software\vysion-print-agent"
#define VysionWatchdogTask "VysionPrintAgentWatchdog"
#define VysionUserDataSub "vysion-print-agent"
#define VysionAgentImage "Vysion Print Agent.exe"
#define VysionHealthUrl "http://127.0.0.1:9742/health"
#define VysionLogDir "{localappdata}\VysionPrintAgentInstaller"

var
  VysionLogPath: string;
  VysionWatchdogWasActive: Boolean;
  VysionConfigBackedUp: Boolean;
  VysionOldPilotVersion: string;
  VysionOldInstallDir: string;
  VysionRemoveUserDataOnUninstall: Boolean;

procedure VysionLog(const Msg: string);
var
  Line: string;
begin
  if VysionLogPath = '' then
    Exit;
  Line := FormatDateTime('yyyy-mm-dd hh:nn:ss', Now) + '  ' + Msg;
  try
    SaveStringToFile(VysionLogPath, Line + #13#10, True);
  except
  end;
end;

procedure VysionInitLog;
var
  Dir, Name: string;
begin
  Dir := ExpandConstant(VysionLogDir);
  if not DirExists(Dir) then
    CreateDir(Dir);
  Name := 'install-' + GetDateTimeString('yyyymmdd-hhnnss', #0, #0) + '.log';
  VysionLogPath := Dir + '\' + Name;
  VysionLog('=== Vysion Print Agent installer (Inno) ===');
  VysionLog('Versie: {#MyAppVersion}');
end;

function VysionExecHidden(const Cmd, Params: string; var ResultCode: Integer): Boolean;
begin
  Result := Exec(Cmd, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

function VysionStrContains(const Haystack, Needle: string): Boolean;
begin
  Result := Pos(LowerCase(Needle), LowerCase(Haystack)) > 0;
end;

function VysionIsSafePilotInstallDir(const Dir: string): Boolean;
var
  LocalApp, Prefix: string;
begin
  Result := False;
  if Dir = '' then
    Exit;
  LocalApp := ExpandConstant('{localappdata}');
  Prefix := LocalApp + '\Programs\';
  if Pos(LowerCase(Prefix), LowerCase(Dir)) <> 1 then
    Exit;
  if not VysionStrContains(Dir, 'vysion-print-agent') then
    Exit;
  Result := True;
end;

function VysionOldVersionIsPilotSuffix(const Ver: string): Boolean;
var
  L: Integer;
begin
  Result := False;
  L := Length(Ver);
  if L < 6 then
    Exit;
  Result := Copy(Ver, L - 5, 6) = '-pilot';
end;

function VysionIsKnownPilotVersion(const Ver: string): Boolean;
begin
  Result :=
    (Ver = '2.0.16-pilot') or
    (Ver = '2.0.17-pilot') or
    (Ver = '2.0.18-pilot') or
    (Ver = '2.0.19-pilot') or
    (Ver = '2.0.20-pilot') or
    VysionOldVersionIsPilotSuffix(Ver);
end;

procedure VysionStopWatchdog;
var
  RC: Integer;
begin
  VysionLog('Watchdog-taak stoppen...');
  VysionExecHidden(ExpandConstant('{sys}\schtasks.exe'),
    '/End /TN "' + VysionWatchdogTask + '"', RC);
  VysionExecHidden(ExpandConstant('{sys}\schtasks.exe'),
    '/Delete /TN "' + VysionWatchdogTask + '" /F', RC);
  Sleep(800);
end;

function VysionQueryWatchdogExists: Boolean;
var
  RC: Integer;
begin
  Result := VysionExecHidden(ExpandConstant('{sys}\schtasks.exe'),
    '/Query /TN "' + VysionWatchdogTask + '" /FO LIST', RC) and (RC = 0);
end;

procedure VysionKillAgentOnce;
var
  RC: Integer;
begin
  VysionLog('Proces afsluiten: ' + VysionAgentImage);
  VysionExecHidden(ExpandConstant('{sys}\taskkill.exe'),
    '/IM "' + VysionAgentImage + '" /T', RC);
  Sleep(400);
  VysionExecHidden(ExpandConstant('{sys}\taskkill.exe'),
    '/F /IM "' + VysionAgentImage + '" /T', RC);
  Sleep(600);
end;

function VysionIsAgentRunning: Boolean;
var
  RC: Integer;
begin
  Result := VysionExecHidden(ExpandConstant('{sys}\tasklist.exe'),
    '/FI "IMAGENAME eq ' + VysionAgentImage + '" /NH', RC) and (RC = 0);
  { tasklist returns 0 even when no match; check output file not practical — use WMI via powershell }
  Result := False;
  if VysionExecHidden('powershell.exe',
    '-NoProfile -Command "exit ([int]((Get-Process -Name ''Vysion Print Agent'' -ErrorAction SilentlyContinue).Count -gt 0))"',
    RC) then
    Result := RC <> 0;
end;

procedure VysionWaitUntilAgentStopped;
var
  I: Integer;
begin
  for I := 0 to 23 do
  begin
    if not VysionIsAgentRunning then
    begin
      VysionLog('Geen actief agent-proces.');
      Exit;
    end;
    VysionKillAgentOnce;
  end;
  MsgBox(
    'Installatie geblokkeerd:' + #13#10 + #13#10 +
    VysionAgentImage + ' draait nog.' + #13#10 + #13#10 +
    'Sluit via taakbalk (Afsluiten) of Taakbeheer en start de installer opnieuw.',
    mbError, MB_OK);
  Abort;
end;

function VysionBackupUserData: Boolean;
var
  AppDataDir, DestDir, Stamp, RC: string;
  RCi: Integer;
begin
  Result := False;
  AppDataDir := ExpandConstant('{userappdata}') + '\' + VysionUserDataSub;
  if not DirExists(AppDataDir) then
  begin
    VysionLog('Geen bestaande userdata-map — back-up overgeslagen.');
    Exit;
  end;
  Stamp := GetDateTimeString('yyyymmdd-hhnnss', #0, #0);
  DestDir := ExpandConstant('{localappdata}') + '\VysionPrintAgentInstallerBackup\' + Stamp;
  CreateDir(ExpandConstant('{localappdata}') + '\VysionPrintAgentInstallerBackup');
  CreateDir(DestDir);
  VysionLog('Back-up userdata naar: ' + DestDir);
  RC := '-NoProfile -ExecutionPolicy Bypass -Command "' +
    'Copy-Item -LiteralPath ''' + AppDataDir + ''' -Destination ''' + DestDir + ''' -Recurse -Force"';
  if VysionExecHidden('powershell.exe', RC, RCi) and (RCi = 0) then
  begin
    Result := True;
    VysionConfigBackedUp := True;
  end
  else
    VysionLog('WAARSCHUWING: userdata back-up mislukt (code ' + IntToStr(RCi) + ').');
end;

procedure VysionPilotBrokenUninstallRepair;
var
  OldVer, OldName, InstDir: string;
begin
  VysionOldPilotVersion := '';
  VysionOldInstallDir := '';
  if not RegQueryStringValue(HKCU, VysionElectronUninstallKey, 'DisplayVersion', OldVer) then
  begin
    VysionLog('Geen bestaande electron-uninstall sleutel (DisplayVersion).');
    Exit;
  end;
  if not RegQueryStringValue(HKCU, VysionElectronUninstallKey, 'DisplayName', OldName) then
    OldName := '';
  if Pos('Vysion Print Agent', OldName) <> 1 then
  begin
    VysionLog('Herstel geblokkeerd: onbekende DisplayName: ' + OldName);
    MsgBox(
      'Herstel geblokkeerd:' + #13#10 + #13#10 +
      'Geen herkenbare Vysion Print Agent PILOT in Windows (Apps).' + #13#10 +
      'Gevonden naam: ' + OldName,
      mbError, MB_OK);
    Abort;
  end;

  VysionOldPilotVersion := OldVer;
  VysionLog('Bestaande installatie: ' + OldVer);

  if OldVer = '{#MyAppVersion}' then
  begin
    VysionLog('Zelfde versie — herstel van bestanden niet nodig.');
    Exit;
  end;

  if not VysionIsKnownPilotVersion(OldVer) then
  begin
    VysionLog('Geen pilot-versie — standaard Inno-upgrade (geen geforceerde map-wipe).');
    Exit;
  end;

  VysionLog('Pilot-herstel: oude uninstaller wordt niet gestart (integrity-safe).');

  if not VysionBackupUserData then
  begin
    { config.json expliciet kopiëren als hele map back-up faalde }
    if FileExists(ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json') then
    begin
      CopyFile(
        ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json',
        ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json.pilot-upgrade-bak',
        False);
      VysionConfigBackedUp := True;
      VysionLog('config.json back-up (.pilot-upgrade-bak).');
    end;
  end;

  InstDir := '';
  if RegQueryStringValue(HKCU, VysionElectronInstallKey, 'InstallLocation', InstDir) then
    VysionOldInstallDir := InstDir;
  if (VysionOldInstallDir = '') and RegQueryStringValue(HKCU, VysionElectronUninstallKey, 'InstallLocation', InstDir) then
    VysionOldInstallDir := InstDir;

  if VysionOldInstallDir <> '' then
  begin
    if not VysionIsSafePilotInstallDir(VysionOldInstallDir) then
    begin
      MsgBox(
        'Herstel geblokkeerd:' + #13#10 + #13#10 +
        'Installatiepad niet veilig of niet herkend:' + #13#10 + '  ' + VysionOldInstallDir + #13#10 + #13#10 +
        'Verwacht onder %LOCALAPPDATA%\Programs\ en vysion-print-agent.' + #13#10 +
        'Er is niets verwijderd.',
        mbError, MB_OK);
      Abort;
    end;
    VysionLog('Verwijder bevestigde pilot-map: ' + VysionOldInstallDir);
    DelTree(VysionOldInstallDir, True, True, True);
    Sleep(400);
  end;

  VysionLog('Verwijder electron uninstall/install registry (alleen Vysion pilot GUID).');
  RegDeleteKeyIncludingSubkeys(HKCU, VysionElectronUninstallKey);
  RegDeleteKeyIncludingSubkeys(HKCU, VysionElectronInstallKey);
  Sleep(300);
end;

function VysionDefenderPrecheck: Boolean;
var
  RC: Integer;
  Ps: string;
begin
  { Vereist: Defender-status leesbaar; geen recente threat op Vysion-paden in quarantaine-log }
  Ps := '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$ErrorActionPreference=''Stop'';' +
    'if (-not (Get-Command Get-MpComputerStatus -ErrorAction SilentlyContinue)) { Write-Output ''NO_CMD''; exit 2 };' +
    '$s=Get-MpComputerStatus;' +
    'if (-not $s) { exit 3 };' +
    '$det=Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object { $_.Resources -match ''vysion-print-agent|Vysion Print Agent'' } | Select-Object -First 1;' +
    'if ($det) { Write-Output (''THREAT:''+$det.ThreatID); exit 4 };' +
    'exit 0"';
  if not VysionExecHidden('powershell.exe', Ps, RC) then
  begin
    VysionLog('Defender-precheck: powershell niet gestart.');
    MsgBox(
      'Installatie gestopt: beveiligingsstatus kon niet worden gecontroleerd (Defender).'+#13#10+#13#10+
      'Controleer Microsoft Defender handmatig en probeer opnieuw.'+#13#10+
      'Log: ' + VysionLogPath,
      mbError, MB_OK);
    Result := False;
    Exit;
  end;
  if RC = 2 then
  begin
    VysionLog('Defender-precheck: Get-MpComputerStatus niet beschikbaar.');
    MsgBox(
      'Installatie gestopt: Microsoft Defender-status is niet betrouwbaar vast te stellen op deze pc.'+#13#10+#13#10+
      'Gebruik een Windows 11-systeem met Defender of los eerst de eerdere waarschuwing op via Windows Beveiliging.',
      mbError, MB_OK);
    Result := False;
    Exit;
  end;
  if RC = 4 then
  begin
    VysionLog('Defender-precheck: recente threat op Vysion-pad gedetecteerd.');
    MsgBox(
      'Installatie gestopt: Microsoft Defender meldt een recente detectie op Vysion Print Agent-bestanden.'+#13#10+#13#10+
      'Open Windows Beveiliging → Beschermingsgeschiedenis, onderzoek de melding en herstel of verwijder quarantaine-bestanden vóór installatie.'+#13#10+#13#10+
      'De installer schakelt Defender niet uit en voert geen geblokkeerde bestanden uit.',
      mbError, MB_OK);
    Result := False;
    Exit;
  end;
  if (RC <> 0) and (RC <> 2) then
  begin
    VysionLog('Defender-precheck mislukt, exit=' + IntToStr(RC));
    MsgBox('Installatie gestopt: beveiligingscontrole mislukt (code ' + IntToStr(RC) + ').', mbError, MB_OK);
    Result := False;
    Exit;
  end;
  VysionLog('Defender-precheck OK.');
  Result := True;
end;

function VysionVerifyPayloadIntegrity: Boolean;
var
  Src, Ps: string;
  RC: Integer;
  Expected: string;
begin
  Expected := '{#VysionPayloadSha256}';
  if (Expected = '') or (Expected = 'PLACEHOLDER_RUN_BUILD_SCRIPT') then
  begin
    VysionLog('Payload-SHA256 niet ingebed — build opnieuw uitvoeren met build-inno-installer.ps1');
    MsgBox(
      'Deze installer is niet correct gebouwd (ontbrekende payload-controle).' + #13#10 +
      'Gebruik scripts/build-inno-installer.ps1 op een build-pc.',
      mbError, MB_OK);
    Result := False;
    Exit;
  end;
  Src := ExpandConstant('{app}\{#MyAppExeName}');
  if not FileExists(Src) then
  begin
    VysionLog('Payload-verify: exe niet in {app}: ' + Src);
    Result := False;
    Exit;
  end;
  Ps := '-NoProfile -Command "$h=(Get-FileHash -LiteralPath ''' + Src + ''' -Algorithm SHA256).Hash; if ($h -ne ''' + Expected + ''') { exit 1 } else { exit 0 }"';
  if VysionExecHidden('powershell.exe', Ps, RC) and (RC = 0) then
  begin
    VysionLog('Payload SHA256 OK.');
    Result := True;
  end
  else
  begin
    VysionLog('Payload SHA256 MISMATCH.');
    MsgBox('Installatie gestopt: integriteit van de Print Agent-bestanden klopt niet.', mbError, MB_OK);
    Result := False;
  end;
end;

procedure VysionRestoreConfigIfNeeded;
var
  Bak, Dest: string;
begin
  if not VysionConfigBackedUp then
    Exit;
  Bak := ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json.pilot-upgrade-bak';
  Dest := ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json';
  if FileExists(Bak) then
  begin
    ForceDirectories(ExpandConstant('{userappdata}') + '\' + VysionUserDataSub);
    CopyFile(Bak, Dest, False);
    VysionLog('config.json (printerinstellingen) teruggezet.');
  end;
end;

procedure VysionInstallWatchdog;
var
  Vbs, Exe, RC: Integer;
  Tr: string;
begin
  Vbs := ExpandConstant('{app}\resources\app.asar.unpacked\watchdog.vbs');
  Exe := ExpandConstant('{app}\{#MyAppExeName}');
  if not FileExists(Vbs) then
  begin
    VysionLog('watchdog.vbs niet gevonden — taak niet aangemaakt.');
    Exit;
  end;
  Tr := 'wscript.exe \"' + Vbs + '\" \"' + Exe + '\"';
  VysionLog('Watchdog-taak registreren...');
  if VysionExecHidden(ExpandConstant('{sys}\schtasks.exe'),
    '/Create /TN "' + VysionWatchdogTask + '" /TR "' + Tr + '" /SC MINUTE /MO 1 /RL LIMITED /F', RC) then
    VysionLog('Watchdog-taak OK.')
  else
    VysionLog('Watchdog-taak mislukt.');
end;

procedure VysionEnsureAutoStartConfig;
var
  Cfg, Ps: string;
  RC: Integer;
begin
  Cfg := ExpandConstant('{userappdata}') + '\' + VysionUserDataSub + '\config.json';
  Ps := '-NoProfile -ExecutionPolicy Bypass -Command "' +
    '$p=''' + Cfg + ''';' +
    'if (-not (Test-Path $p)) { $o=@{ autoStart=$true; autoUpdate=$false }; $o | ConvertTo-Json | Set-Content -LiteralPath $p -Encoding UTF8; exit 0 };' +
    'try { $j=Get-Content -Raw $p | ConvertFrom-Json } catch { exit 0 };' +
    '$j.autoStart=$true; $j.autoUpdate=$false; $j | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $p -Encoding UTF8"';
  VysionExecHidden('powershell.exe', Ps, RC);
  VysionLog('config autoStart=true (watchdog + login-item bij volgende agent-start).');
end;

function VysionWaitForHealth: Boolean;
var
  I, RC: Integer;
  Ps: string;
begin
  Ps := '-NoProfile -Command "try { $r=Invoke-WebRequest -Uri ''' + VysionHealthUrl + ''' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"';
  for I := 0 to 35 do
  begin
    if VysionExecHidden('powershell.exe', Ps, RC) and (RC = 0) then
    begin
      VysionLog('/health OK na ' + IntToStr(I) + ' poging(en).');
      Result := True;
      Exit;
    end;
    Sleep(1000);
  end;
  VysionLog('WAARSCHUWING: /health niet bereikbaar — agent mogelijk nog aan het opstarten.');
  Result := False;
end;

function InitializeSetup: Boolean;
begin
  VysionConfigBackedUp := False;
  VysionWatchdogWasActive := False;
  VysionInitLog;
  VysionLog('InitializeSetup');

  if not VysionDefenderPrecheck then
  begin
    Result := False;
    Exit;
  end;

  VysionWatchdogWasActive := VysionQueryWatchdogExists;
  if VysionWatchdogWasActive then
    VysionLog('Watchdog was actief: ja')
  else
    VysionLog('Watchdog was actief: nee');

  VysionBackupUserData;

  VysionStopWatchdog;
  VysionKillAgentOnce;
  VysionWaitUntilAgentStopped;

  VysionPilotBrokenUninstallRepair;

  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  RC: Integer;
begin
  if CurStep = ssInstall then
  begin
    VysionLog('ssInstall — bestanden kopiëren.');
  end;
  if CurStep = ssPostInstall then
  begin
    if not VysionVerifyPayloadIntegrity then
      Abort;
    VysionRestoreConfigIfNeeded;
    VysionInstallWatchdog;
    VysionEnsureAutoStartConfig;
    VysionLog('Post-install: agent starten...');
    Exec(ExpandConstant('{app}\{#MyAppExeName}'), '', ExpandConstant('{app}'), SW_SHOW, ewNoWait, RC);
    if not VysionWaitForHealth then
      MsgBox(
        'Installatie voltooid, maar de lokale printservice (/health) reageerde niet binnen 35 seconden.' + #13#10 +
        'Controleer het taakbalk-icoon of start handmatig via het menu.' + #13#10 + #13#10 +
        'Log: ' + VysionLogPath,
        mbInformation, MB_OK);
  end;
end;

function InitializeUninstall: Boolean;
begin
  VysionRemoveUserDataOnUninstall := False;
  VysionInitLog;
  VysionLog('InitializeUninstall');
  VysionStopWatchdog;
  VysionKillAgentOnce;
  VysionWaitUntilAgentStopped;
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  AppDataDir: string;
begin
  if CurUninstallStep = usUninstall then
  begin
    VysionLog('Bestanden verwijderen...');
  end;
  if CurUninstallStep = usUninstall then
  begin
    VysionStopWatchdog;
  end;
  if CurUninstallStep = usPostUninstall then
  begin
    RegDeleteKeyIncludingSubkeys(HKCU, VysionElectronUninstallKey);
    RegDeleteKeyIncludingSubkeys(HKCU, VysionElectronInstallKey);
    if VysionRemoveUserDataOnUninstall then
    begin
      AppDataDir := ExpandConstant('{userappdata}') + '\' + VysionUserDataSub;
      if DirExists(AppDataDir) then
      begin
        VysionLog('Verwijder userdata: ' + AppDataDir);
        DelTree(AppDataDir, True, True, True);
      end;
    end
    else
      VysionLog('Userdata behouden (config/printerinstellingen).');
    VysionLog('Verwijdering voltooid.');
  end;
end;

function UninstallNeedRestart: Boolean;
begin
  Result := False;
end;

procedure UninstallButtonClick(CurPageID: Integer);
begin
  if CurPageID = uninstallConfirmPageID then
  begin
    if MsgBox(
      'Ook printerinstellingen en config.json verwijderen?' + #13#10 +
      '(Standaard: NEE — instellingen blijven bewaard voor herinstallatie.)',
      mbConfirmation, MB_YESNO) = IDYES then
      VysionRemoveUserDataOnUninstall := True;
  end;
end;
