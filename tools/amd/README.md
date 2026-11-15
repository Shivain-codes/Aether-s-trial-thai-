# AMD asset-generation handoff

Status: historical, unexecuted planning notes. The game is built and played locally; the user chose not to use cloud GPU resources. No cloud connection, installation or paid job was performed. These notes are not required for the current build. Do not place credentials in this repository.

## Verified route

AMD documents ComfyUI 0.18.2 on Linux with ROCm 7.1/7.2 and Instinct MI300X/MI325X/MI355X, including its Hunyuan3D 2.1 template. DigitalOcean's AMD AI/ML-ready image uses Ubuntu 24.04. Check the actual image's ROCm version before selecting the container.

- https://rocm.docs.amd.com/projects/comfyui/en/docs-26.04/install/comfyui-install.html
- https://rocm.docs.amd.com/projects/comfyui/en/docs-26.04/how-to/hunyuan3d-workflow.html
- https://docs.digitalocean.com/products/droplets/getting-started/recommended-gpu-setup/

Run `preflight.sh` remotely first. It reads OS, devices, driver/runtime versions, disk/RAM, and existing PyTorch detection. It installs nothing and prints no environment variables or credentials.

## First asset batch

Start with static assets: one timber-frame house, one irregular rock/cliff, and one broadleaf tree. A successful inference output is only a draft mesh. Inspect its silhouette, textures, topology, dimensions and licensing; repair and reduce geometry before importing it into the game. Target small GLB assets with 1K–2K atlases, collision proxies, and distance LODs. Reuse/instance vegetation. Test on the local browser after every import.

Characters need separate retopology, skeleton fitting, skin weights, facial setup, and authored animations. Image-to-3D output does not automatically replace those steps or reproduce Genshin's production quality.

Keep any ComfyUI service private: bind the host port to loopback and access through an SSH tunnel. Do not expose port 8188 publicly. Do not provision a second GPU or start downloads until the existing VM has been checked. The local browser remains the game renderer; the cloud machine is for asset production.
