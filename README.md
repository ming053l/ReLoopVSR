# ReLoopVSR: One-Step Recurrent Autoregressive Diffusion Refinement for Streaming Video Super-Resolution

**Project page:** https://ming053l.github.io/ReLoopVSR/

**Paper:** coming soon · **Code:** coming soon

**Authors:** [Chia-Ming Lee](https://ming053l.github.io/), [Ming-Ching Chang](https://mingching.github.io/), [Xin Li](https://scholar.google.com/citations?user=gMBvzGoAAAAJ&hl=en), [Yu-Lun Liu](https://yulunalexliu.github.io/), [Chih-Chung Hsu](https://cchsu.info/)

## Overview

ReLoopVSR restores a video stream without future frames, in one denoising step per frame. It aligns and re-noises the previous restoration, refines it with the current low-resolution frame, and restarts wherever errors are predicted or the scene cuts. It leads in perceptual quality with far lower memory and latency, and ReLoopVSR-fast exceeds 240 FPS at 720p.

## Highlights

- **No future frames:** each frame is restored from the current and past frames only, with a first-frame latency of about 0.04 s.
- **One denoising step per frame:** a shared one-step denoiser refines the aligned, re-noised previous restoration.
- **Reliability control:** unreliable tiles and scene cuts restart from the current observation, so errors do not accumulate over long streams.
- **ReLoopVSR-fast:** the denoiser runs only on keyframes, reaching more than 240 FPS at 720p with 2.2 GiB of peak memory.

## Repository contents

This repository hosts the project page only (`index.html`, `assets/`, `media/`), served with GitHub Pages.
