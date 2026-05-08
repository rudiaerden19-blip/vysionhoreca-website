# RAW ESC/POS naar een Windows-printer (driver zoals Epson TM via USB).
param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$Base64Data
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

  [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFOW pDocInfo);

  [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
  static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void SendBytes(string printerName, byte[] bytes) {
    IntPtr h = IntPtr.Zero;
    if (!OpenPrinter(printerName, out h, IntPtr.Zero))
      throw new Exception("OpenPrinter mislukt voor: " + printerName);

    try {
      DOCINFOW di = new DOCINFOW();
      di.pDocName = "Vysion ESC/POS";
      di.pOutputFile = null;
      di.pDataType = "RAW";

      if (!StartDocPrinter(h, 1, di))
        throw new Exception("StartDocPrinter mislukt");

      try {
        if (!StartPagePrinter(h))
          throw new Exception("StartPagePrinter mislukt");

        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, p, bytes.Length);
          int written;
          if (!WritePrinter(h, p, bytes.Length, out written) || written != bytes.Length)
            throw new Exception("WritePrinter mislukt");
        } finally {
          Marshal.FreeCoTaskMem(p);
        }

        if (!EndPagePrinter(h))
          throw new Exception("EndPagePrinter mislukt");
      } finally {
        EndDocPrinter(h);
      }
    } finally {
      ClosePrinter(h);
    }
  }
}
'@

try {
  $bytes = [Convert]::FromBase64String($Base64Data)
  [RawPrinterHelper]::SendBytes($PrinterName, $bytes)
  Write-Output "OK"
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
