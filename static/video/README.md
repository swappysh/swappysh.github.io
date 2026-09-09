# Summer mode background clip

leaves-wall.mp4 (1280x720, ~15s loop, 2.7MB, h264, no audio track)

Trimmed/recompressed from "Plant's Shadow On A Wall" by Kaboompics.com,
Pexels license (free for commercial and personal use, no attribution required):
https://www.pexels.com/video/plant-s-shadow-on-a-wall-4238475/

To re-cut or replace:
  ffmpeg -i input.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 26 -preset slow -profile:v main -pix_fmt yuv420p -movflags +faststart -an static/video/leaves-wall.mp4
