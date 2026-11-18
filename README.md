# ReLoopVSR: One-Step Recurrent Autoregressive Diffusion Refinement for Streaming Video Super-Resolution

**Project page:** https://ming053l.github.io/ReLoopVSR/

**Paper:** coming soon · **Code:** coming soon

## Abstract

Streaming video super-resolution (VSR) inherently demands high-quality reconstruction without future frames and within a bounded per-frame budget. However, existing diffusion-based streaming VSR methods buffer future frames into chunks, accumulate errors over long streams, and need dedicated acceleration for their large backbones even with one-step sampling. We propose ReLoopVSR, a compact recurrent autoregressive diffusion framework that extends refinement across frames through a shared one-step denoiser. The model aligns and re-noises the previous denoised latent to initialize the current update, then refines it using the current low-resolution observation. Repeated updates to temporally corresponding content form a spatiotemporal momentum that extends effective computational depth with fixed parameters and one denoising step per frame. Lightweight temporal modules reduce conditioning and decoding costs. Since local inconsistencies and scene cuts cause error spiking, local and global reliability control stops this momentum where errors are predicted, while rollout training and perceptual temporal supervision adapt the model to correct inherited errors. Building on this compact backbone, ReLoopVSR-fast exploits temporal redundancy by running the denoiser only on keyframes and restoring other frames with a lightweight fast decoder. ReLoopVSR achieves leading perceptual quality on six paired benchmarks with far lower peak memory and first-frame latency than existing streaming VSR methods, and the fast variant exceeds 240 FPS at 720p and 28 FPS at 4K, well above existing methods, with only 2.2 GiB of peak memory at 720p.

## Highlights

- **No future frames:** each frame is restored from the current and past frames only, with a first-frame latency of about 0.04 s.
- **One denoising step per frame:** a shared one-step denoiser refines the aligned, re-noised previous restoration.
- **Reliability control:** unreliable tiles and scene cuts restart from the current observation, so errors do not accumulate over long streams.
- **ReLoopVSR-fast:** the denoiser runs only on keyframes, reaching more than 240 FPS at 720p with 2.2 GiB of peak memory.

## Repository contents

This repository hosts the project page only (`index.html`, `assets/`, `media/`), served with GitHub Pages.
