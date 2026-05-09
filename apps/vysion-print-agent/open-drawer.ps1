# Probeer de kassa-lade te openen via ALLE bekende drivermethoden:
#   1) GDI ExtEscape PASSTHROUGH  (werkt voor Epson APD die RAW bytes filtert)
#   2) WritePrinter RAW           (klassiek, werkt voor Generic/Text-Only)
# Het script geeft pas een fout terug als BEIDE methoden falen.
param(
  [Parameter(Mandatory = $true)][string]$PrinterName
)

$ErrorActionPreference = 'Continue'

# 4 drawer-kick varianten in 1 buffer (pin 2 + pin 5, ESC p + DLE DC4)
$kick = [byte[]]@(
  0x1B, 0x70, 0x00, 0x32, 0x32,
  0x1B, 0x70, 0x01, 0x32, 0x32,
  0x10, 0x14, 0x01, 0x00, 0x32,
  0x10, 0x14, 0x01, 0x01, 0x32
)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class DrawerHelper {
  // ---------- Methode 1: GDI ExtEscape PASSTHROUGH ----------
  [DllImport("gdi32.dll", EntryPoint="CreateDCW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern IntPtr CreateDC(string lpszDriver, string lpszDevice, string lpszOutput, IntPtr lpInitData);

  [DllImport("gdi32.dll", SetLastError=true)]
  static extern bool DeleteDC(IntPtr hdc);

  [DllImport("gdi32.dll", EntryPoint="ExtEscape", SetLastError=true)]
  static extern int ExtEscape(IntPtr hdc, int nEscape, int cbInput, byte[] lpInData, int cbOutput, IntPtr lpOutData);

  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFO {
    public int    cbSize = 20;
    [MarshalAs(UnmanagedType.LPWStr)] public string lpszDocName = "Vysion Drawer";
    [MarshalAs(UnmanagedType.LPWStr)] public string lpszOutput = null;
    [MarshalAs(UnmanagedType.LPWStr)] public string lpszDatatype = null;
    public int    fwType = 0;
  }

  [DllImport("gdi32.dll", EntryPoint="StartDocW", CharSet=CharSet.Unicode, SetLastError=true)]
  static extern int StartDoc(IntPtr hdc, [In] DOCINFO lpdi);

  [DllImport("gdi32.dll", SetLastError=true)] static extern int StartPage(IntPtr hdc);
  [DllImport("gdi32.dll", SetLastError=true)] static extern int EndPage(IntPtr hdc);
  [DllImport("gdi32.dll", SetLastError=true)] static extern int EndDoc(IntPtr hdc);

  const int PASSTHROUGH = 19;

  public static bool TryPassthrough(string printerName, byte[] bytes) {
    IntPtr hdc = CreateDC(null, printerName, null, IntPtr.Zero);
    if (hdc == IntPtr.Zero) return false;
    try {
      DOCINFO di = new DOCINFO();
      if (StartDoc(hdc, di) <= 0) return false;
      try {
        if (StartPage(hdc) <= 0) return false;
        // PASSTHROUGH: eerste 2 bytes = grootte (LE), daarna data
        byte[] payload = new byte[bytes.Length + 2];
        payload[0] = (byte)(bytes.Length & 0xFF);
        payload[1] = (byte)((bytes.Length >> 8) & 0xFF);
        Array.Copy(bytes, 0, payload, 2, bytes.Length);
        int r = ExtEscape(hdc, PASSTHROUGH, payload.Length, payload, 0, IntPtr.Zero);
        EndPage(hdc);
        return r > 0;
      } finally { EndDoc(hdc); }
    } finally { DeleteDC(hdc); }
  }

  // ---------- Methode 2: Klassieke WritePrinter RAW ----------
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public class DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", EntryPoint="ClosePrinter", SetLastError=true)]
  static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode)]
  static extern bool StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFOW pDocInfo);
  [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true)]
  static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true)]
  static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true)]
  static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true)]
  static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static bool TryRawWrite(string printerName, byte[] bytes) {
    IntPtr h = IntPtr.Zero;
    if (!OpenPrinter(printerName, out h, IntPtr.Zero)) return false;
    try {
      DOCINFOW di = new DOCINFOW();
      di.pDocName = "Vysion Drawer RAW";
      di.pOutputFile = null;
      di.pDataType = "RAW";
      if (!StartDocPrinter(h, 1, di)) return false;
      try {
        if (!StartPagePrinter(h)) return false;
        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, p, bytes.Length);
          int written;
          bool ok = WritePrinter(h, p, bytes.Length, out written);
          EndPagePrinter(h);
          return ok && written == bytes.Length;
        } finally { Marshal.FreeCoTaskMem(p); }
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
'@

# Probeer eerst PASSTHROUGH (werkt voor Epson APD) — daarna RAW als fallback.
$ok1 = $false
$ok2 = $false
try { $ok1 = [DrawerHelper]::TryPassthrough($PrinterName, $kick) } catch { }
Start-Sleep -Milliseconds 150
try { $ok2 = [DrawerHelper]::TryRawWrite($PrinterName, $kick) } catch { }

if ($ok1 -or $ok2) {
  Write-Output ("OK passthrough=" + $ok1 + " raw=" + $ok2)
  exit 0
} else {
  Write-Error "Beide methoden faalden voor: $PrinterName"
  exit 1
}
