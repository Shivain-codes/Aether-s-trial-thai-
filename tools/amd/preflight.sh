#!/usr/bin/env bash
# Read-only AMD cloud inspection. Run on the user's VM after SSH access is supplied.
set -u
printf 'Operating system\n'
cat /etc/os-release
printf '\nKernel\n'
uname -r
printf '\nGPU devices\n'
ls -l /dev/kfd /dev/dri/render* 2>/dev/null || true
printf '\nROCm version\n'
cat /opt/rocm/.info/version 2>/dev/null || true
if command -v amd-smi >/dev/null 2>&1; then amd-smi list; fi
if command -v rocm-smi >/dev/null 2>&1; then rocm-smi --showproductname --showmeminfo vram; fi
printf '\nRAM and available storage\n'
free -h
df -h .
printf '\nContainer runtime\n'
docker --version 2>/dev/null || true
printf '\nPython and installed PyTorch GPU support\n'
python3 --version
python3 - <<'PY'
try:
 import torch
 print('PyTorch:', torch.__version__)
 print('HIP:', torch.version.hip)
 print('GPU visible:', torch.cuda.is_available())
 if torch.cuda.is_available():
  print('Device:', torch.cuda.get_device_name(0))
except ImportError:
 print('PyTorch is not installed in the current environment; no packages were changed.')
PY
