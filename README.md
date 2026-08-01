# x-export

# Kensho Reset Portal

Personal one-day reset portal with optional NVIDIA-powered reflection, automatic browser data persistence, and zero-VPS Vercel serverless deployment.

## Features

- **Automatic Browser Persistence**: All answers and state are saved automatically in `localStorage`. No VPS required.
- **Reset Button**: One-click reset to clear all browser data and restore a clean slate.
- **Vercel Serverless Ready**: Native deployment on Vercel with `/api/clarity` serverless function.

## Run Locally

1. Copy `.env.example` to `.env` (optional for AI mirror):
```text
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
PORT=8000
```

2. Start the local server:
```bash
npm start
```

3. Open http://127.0.0.1:8000/index.html in your browser.

## Deploy on Vercel

1. Import this repository into Vercel.
2. (Optional) Set `NVIDIA_API_KEY` in Vercel Environment Variables.
3. Deploy!
