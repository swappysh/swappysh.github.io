# Forest Ambient Audio

- forest.webm (253KB, libopus 64kbps)
- forest.mp3 (352KB, libmp3lame 96kbps)

Both are a 30s clip (1s fade in/out) trimmed from "Forest Ambience" by TinyWorlds
(CC0, no attribution required), sourced from:
https://opengameart.org/content/forest-ambience

To re-cut or replace:
  ffmpeg -i input.mp3 -t 30 -af "afade=t=in:st=0:d=1,afade=t=out:st=29:d=1" -c:a libopus -b:a 64k static/audio/forest.webm
  ffmpeg -i input.mp3 -t 30 -af "afade=t=in:st=0:d=1,afade=t=out:st=29:d=1" -c:a libmp3lame -b:a 96k static/audio/forest.mp3
