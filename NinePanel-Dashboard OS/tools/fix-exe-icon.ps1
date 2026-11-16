# Repara el grupo de iconos que Windows muestra en el Explorador.
#
# `bun build --compile --windows-icon` inserta los 7 tamaños del .ico en un grupo
# nuevo (ID 0), pero deja el grupo original de Bun ("IDI_MYICON") apuntando a una
# sola imagen. El Explorador usa "IDI_MYICON" y por eso muestra un icono distinto.
# Este script copia el grupo bueno (ID 0) sobre "IDI_MYICON" sin tocar los recursos
# de imagen (RT_ICON).
param(
  [string]$Exe = "ninepanel.exe",
  [string]$GroupName = "IDI_MYICON",
  [int]$Language = 1033
)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class NinePanelIcons {
  const int RT_ICON = 3;
  const int RT_GROUP_ICON = 14;
  const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint dwFlags);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool FreeLibrary(IntPtr hModule);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr FindResource(IntPtr hModule, IntPtr lpName, IntPtr lpType);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "FindResourceW")]
  public static extern IntPtr FindResourceByName(IntPtr hModule, string lpName, IntPtr lpType);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr LoadResource(IntPtr hModule, IntPtr hResInfo);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr LockResource(IntPtr hResData);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint SizeofResource(IntPtr hModule, IntPtr hResInfo);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern IntPtr BeginUpdateResource(string pFileName, bool bDeleteExistingResources);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "UpdateResourceW")]
  public static extern bool UpdateResourceByName(IntPtr hUpdate, IntPtr lpType, string lpName, ushort wLanguage, byte[] lpData, uint cbData);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool EndUpdateResource(IntPtr hUpdate, bool fDiscard);

  public static byte[] ReadGroupById(IntPtr module, int id) {
    IntPtr info = FindResource(module, (IntPtr)id, (IntPtr)RT_GROUP_ICON);
    if (info == IntPtr.Zero)
      throw new Exception("No se encontró el grupo de iconos #" + id + " (error " + Marshal.GetLastWin32Error() + ")");
    uint size = SizeofResource(module, info);
    IntPtr data = LockResource(LoadResource(module, info));
    if (data == IntPtr.Zero)
      throw new Exception("No se pudo leer el grupo de iconos #" + id);
    byte[] bytes = new byte[size];
    Marshal.Copy(data, bytes, 0, (int)size);
    return bytes;
  }

  public static bool HasGroupNamed(IntPtr module, string name) {
    return FindResourceByName(module, name, (IntPtr)RT_GROUP_ICON) != IntPtr.Zero;
  }

  public static int GroupImageCount(byte[] group) {
    return BitConverter.ToUInt16(group, 4);
  }
}
"@

$exePath = (Resolve-Path -LiteralPath $Exe).Path

$module = [NinePanelIcons]::LoadLibraryEx($exePath, [IntPtr]::Zero, 0x2)
if ($module -eq [IntPtr]::Zero) { throw "No se pudo abrir '$exePath'." }
try {
  if (-not [NinePanelIcons]::HasGroupNamed($module, $GroupName)) {
    Write-Host "AVISO: '$GroupName' no existe; no hace falta reparar el icono."
    exit 0
  }
  $good = [NinePanelIcons]::ReadGroupById($module, 0)
} finally {
  [NinePanelIcons]::FreeLibrary($module) | Out-Null
}

$count = [NinePanelIcons]::GroupImageCount($good)
if ($count -lt 2) { throw "El grupo #0 no contiene varios tamaños; se cancela la reparación." }

$update = [NinePanelIcons]::BeginUpdateResource($exePath, $false)
if ($update -eq [IntPtr]::Zero) { throw "No se pudo abrir el .exe para editar sus recursos (¿está en ejecución?)." }
try {
  if (-not [NinePanelIcons]::UpdateResourceByName($update, [IntPtr]14, $GroupName, $Language, $good, $good.Length)) {
    throw "No se pudo reemplazar el grupo '$GroupName' (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
  }
} catch {
  [NinePanelIcons]::EndUpdateResource($update, $true) | Out-Null
  throw
}
if (-not [NinePanelIcons]::EndUpdateResource($update, $false)) {
  throw "No se pudieron guardar los cambios (error $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
}

Write-Host "Icono reparado: '$GroupName' ahora usa los $count tamaños del grupo principal."
