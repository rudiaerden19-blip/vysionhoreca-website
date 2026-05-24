; NSIS-hooks voor electron-builder: oude exe mag niet draaien tijdens installeren of deïnstalleren,
; anders blijven bestanden vergrendeld en faalt uninstall/reinstall ("sluit andere versie niet af").
;
; Zie: https://electron.build/configuration/nsis#custom-nsis-script (macros customInit / customUnInit).

!macro customInit
  DetailPrint "Stop lopende Vysion Print Agent (install/update)..."
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM $\"Vysion Print Agent.exe$\" /T' $R9
  ClearErrors
  Sleep 750
!macroend

!macro customUnInit
  DetailPrint "Stop lopende Vysion Print Agent (deïnstallatie)..."
  ExecWait '"$WINDIR\System32\taskkill.exe" /F /IM $\"Vysion Print Agent.exe$\" /T' $R9
  ClearErrors
  Sleep 750
!macroend
