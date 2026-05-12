@echo off
echo Sluit Vysion Print Agent volledig voor je dit draait (Taakbeheer).
echo.
for %%D in (
  "%AppData%\Vysion Print Agent"
  "%AppData%\vysion-print-agent"
  "%AppData%\VysionPrintAgent"
  "%LocalAppData%\Vysion Print Agent"
  "%LocalAppData%\vysion-print-agent"
  "%LocalAppData%\VysionPrintAgent"
) do (
  if exist "%%~D\config.json" (
    del /f /q "%%~D\config.json"
    echo Verwijderd: %%~D\config.json
  )
)
echo.
echo Klaar. Nu Vysion opnieuw starten - het instellingenscherm zou moeten komen.
pause
