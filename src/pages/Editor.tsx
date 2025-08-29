import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { toast } from "sonner";
import { Play, Pause, SkipBack, SkipForward, Scissors, Flag, Download, Copy, Sparkles } from "lucide-react";

interface Clip {
  id: string;
  start: number;
  end: number;
  tag: string;
}

const TAGS = [
  { key: "S", label: "Serve" },
  { key: "P", label: "Pass" },
  { key: "T", label: "Set" },
  { key: "A", label: "Attack" },
  { key: "B", label: "Block" },
  { key: "D", label: "Dig" },
  { key: "E", label: "Error" },
];

const format = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t % 1) * 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

export default function Editor() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeTag, setActiveTag] = useState<string>(TAGS[0].label);
  // Playback source: local file or YouTube
  const [sourceType, setSourceType] = useState<'file' | 'youtube'>('file');
  const [youtubeLink, setYoutubeLink] = useState("");
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const clipEndRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const canSave = useMemo(() => markIn !== null && markOut !== null && markOut > markIn, [markIn, markOut]);
  const onFile = (file?: File) => {
    if (!file) return;
    // If switching from YouTube, destroy previous player
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
    setSourceType('file');
    setYoutubeLink("");
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setPlaying(false);
    setDuration(0);
    setCurrent(0);
    setMarkIn(null);
    setMarkOut(null);
    setClips([]);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    toast.success("Video loaded. Happy editing!");
  };

  const parseYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.split('/')[1];
        return id || null;
      }
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return v;
        const parts = u.pathname.split('/');
        const idx = parts.findIndex(p => ['embed', 'shorts', 'v'].includes(p));
        if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
      }
      return null;
    } catch {
      const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      return m ? m[1] : null;
    }
  };

  const loadYouTubeAPI = (): Promise<any> => {
    return new Promise((resolve) => {
      const w = window as any;
      if (w.YT && w.YT.Player) return resolve(w.YT);
      const existing = document.getElementById('youtube-iframe-api');
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      (window as any).onYouTubeIframeAPIReady = () => {
        resolve((window as any).YT);
      };
    });
  };

  const loadYouTube = async () => {
    const id = parseYouTubeId(youtubeLink.trim());
    if (!id) {
      toast.error("Invalid YouTube URL");
      return;
    }
    setSourceType('youtube');
    setVideoUrl(null);
    setPlaying(false);
    setDuration(0);
    setCurrent(0);
    setMarkIn(null);
    setMarkOut(null);
    setClips([]);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch {}
      ytPlayerRef.current = null;
    }
    const YT = await loadYouTubeAPI();
    ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
      videoId: id,
      playerVars: { controls: 0, modestbranding: 1, rel: 0 },
      events: {
        onReady: () => {
          try {
            const d = ytPlayerRef.current?.getDuration?.() || 0;
            setDuration(d);
            setCurrent(ytPlayerRef.current?.getCurrentTime?.() || 0);
            toast.success("YouTube video loaded.");
          } catch {}
        },
        onStateChange: (e: any) => {
          const state = e.data;
          if (state === YT.PlayerState.PLAYING) {
            setPlaying(true);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            timerRef.current = window.setInterval(() => {
              try {
                const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
                setCurrent(t);
                const clipEnd = clipEndRef.current;
                if (clipEnd !== null && t >= clipEnd) {
                  ytPlayerRef.current?.pauseVideo?.();
                  setPlaying(false);
                  clipEndRef.current = null;
                }
              } catch {}
            }, 200);
          } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            setPlaying(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            if (state === YT.PlayerState.ENDED) {
              clipEndRef.current = null;
            }
          }
        },
      },
    });
  };

  const seekBy = (delta: number) => {
    if (sourceType === 'youtube' && ytPlayerRef.current) {
      const curr = ytPlayerRef.current.getCurrentTime();
      const t = Math.min(Math.max(0, curr + delta), duration || ytPlayerRef.current.getDuration() || 0);
      ytPlayerRef.current.seekTo(t, true);
      setCurrent(t);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    const t = Math.min(Math.max(0, v.currentTime + delta), duration || v.duration || 0);
    v.currentTime = t;
    setCurrent(t);
  };
  const togglePlay = () => {
    if (sourceType === 'youtube' && ytPlayerRef.current) {
      const YT = (window as any).YT;
      const state = ytPlayerRef.current.getPlayerState();
      if (state === YT.PlayerState.PLAYING) {
        ytPlayerRef.current.pauseVideo();
        setPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setPlaying(true);
      }
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const saveClip = () => {
    if (!canSave) return;
    const clip: Clip = {
      id: `${Date.now()}`,
      start: markIn!,
      end: markOut!,
      tag: activeTag,
    };
    setClips((c) => [clip, ...c]);
    toast.success(`Saved clip ${format(clip.start)} → ${format(clip.end)} (${clip.tag})`);
  };

  const playClip = (clip: Clip) => {
    if (sourceType === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(clip.start, true);
      clipEndRef.current = clip.end;
      ytPlayerRef.current.playVideo();
      setPlaying(true);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = clip.start;
    v.play();
    setPlaying(true);
    const onTime = () => {
      if (v.currentTime >= clip.end) {
        v.pause();
        setPlaying(false);
        v.removeEventListener("timeupdate", onTime);
      }
    };
    v.addEventListener("timeupdate", onTime);
  };

  useEffect(() => {
    if (sourceType !== 'file') return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onEnded = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [videoRef.current, sourceType]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toUpperCase();
      if (k === ' ') { e.preventDefault(); togglePlay(); }
      if (k === 'I') setMarkIn(current);
      if (k === 'O') setMarkOut(current);
      if (k === 'S' && e.shiftKey) saveClip();
      if (k === 'ARROWLEFT') seekBy(-5);
      if (k === 'ARROWRIGHT') seekBy(5);
      const found = TAGS.find(t => t.key === k);
      if (found) setActiveTag(found.label);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, canSave, activeTag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { ytPlayerRef.current?.destroy?.(); } catch {}
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(clips, null, 2));
      toast.success("Clips JSON copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const getAnthropicKey = async () => {
    let key = localStorage.getItem("ANTHROPIC_API_KEY") || "";
    if (!key) {
      key = window.prompt("Enter your Anthropic API Key (stored locally)") || "";
      if (key) localStorage.setItem("ANTHROPIC_API_KEY", key);
    }
    return key;
  };

  const normalizeTag = (text: string) => {
    const candidates = TAGS.map(t => t.label.toLowerCase());
    const lower = text.toLowerCase();
    const found = candidates.find(c => lower.includes(c));
    return found ? (found.charAt(0).toUpperCase() + found.slice(1)) : "Error";
  };

  const captureFrameAt = (t: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const v = videoRef.current;
      if (!v) return reject(new Error("No video"));
      const wasPlaying = !v.paused;
      v.pause();
      const seek = () => {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (!w || !h) { reject(new Error("Video not ready")); return; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error("Canvas")); return; }
        ctx.drawImage(v, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (wasPlaying) v.play();
        v.removeEventListener('seeked', seek);
        resolve(dataUrl);
      };
      v.addEventListener('seeked', seek);
      v.currentTime = Math.max(0, Math.min(t, v.duration || t));
    });
  };

  const classifyWithAnthropic = async (frames: string[]) => {
    // Try dev proxy first (avoids exposing keys and CORS). Falls back to direct call using user-provided key.
    try {
      const resp = await fetch('/api/auto-tag', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ frames }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text: string = data?.text || '';
        return normalizeTag(text);
      }
    } catch {}

    const key = await getAnthropicKey();
    if (!key) throw new Error("API key required");

    const content: any[] = [
      { type: "text", text: "You are labeling volleyball actions. From the provided frames of a short clip, choose exactly one label from: Serve, Pass, Set, Attack, Block, Dig, Error. Respond with only the single word label." }
    ];
    for (const d of frames) {
      const base64 = d.split(',')[1] || d;
      content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 50,
        temperature: 0,
        messages: [{ role: "user", content }],
      }),
    });
    if (!resp.ok) throw new Error("Anthropic error");
    const data = await resp.json();
    const text: string = data?.content?.[0]?.text || "";
    return normalizeTag(text);
  };

  const autoClassifyClip = async (clip: Clip) => {
    if (sourceType === 'youtube') {
      toast.info("Auto-tagging is not available for YouTube videos. Download the video to use auto-tagging.");
      return;
    }
    if (!videoRef.current) return;
    const dur = Math.max(clip.end - clip.start, 0.5);
    const times = [clip.start + 0.1 * dur, clip.start + 0.5 * dur, clip.end - 0.1 * dur]
      .map(t => Math.max(clip.start, Math.min(t, clip.end)));

    try {
      toast.message(`Analyzing clip ${format(clip.start)} → ${format(clip.end)}...`);
      const frames = [] as string[];
      for (const t of times) {
        // eslint-disable-next-line no-await-in-loop
        frames.push(await captureFrameAt(t));
      }
      const tag = await classifyWithAnthropic(frames);
      setClips(cs => cs.map(c => c.id === clip.id ? { ...c, tag } : c));
      toast.success(`Auto-tagged as ${tag}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to classify");
    }
  };

  const autoClassifyAll = async () => {
    if (sourceType === 'youtube') {
      toast.info("Auto-tagging is not available for YouTube videos.");
      return;
    }
    for (const c of clips) {
      // eslint-disable-next-line no-await-in-loop
      await autoClassifyClip(c);
    }
  };
  return (
    <>
      <SEO
        title="Volleyball Video Editor | Balltime.ai alternative"
        description="Tag rallies, mark clips, and export highlights fast. Volleyball-focused video editing in your browser."
        canonicalPath="/editor"
      />
      <main className="min-h-screen container py-8">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-hero" aria-hidden />
            <span className="font-semibold">VolleyCut</span>
          </div>
          <div className="text-sm text-muted-foreground">Keyboard: Space, I, O, ⇧+S, ←/→, S/P/T/A/B/D/E</div>
        </header>

        <section className="grid lg:grid-cols-3 gap-6">
          <article className="lg:col-span-2 space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Game Timeline</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="video/*" onChange={(e) => onFile(e.target.files?.[0])} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      placeholder="YouTube link (watch, share, shorts)"
                      value={youtubeLink}
                      onChange={(e) => setYoutubeLink(e.target.value)}
                    />
                    <Button variant="secondary" onClick={loadYouTube}>Load</Button>
                  </div>
                  {((sourceType === 'file' && videoUrl) || (sourceType === 'youtube' && ytPlayerRef.current)) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (sourceType === 'file') {
                          const v = videoRef.current;
                          if (v) { try { v.pause(); } catch {} }
                          setVideoUrl(null);
                        } else {
                          try { ytPlayerRef.current?.destroy?.(); } catch {}
                          ytPlayerRef.current = null;
                        }
                        setPlaying(false);
                        setDuration(0);
                        setCurrent(0);
                        setMarkIn(null);
                        setMarkOut(null);
                        setClips([]);
                        if (timerRef.current) {
                          clearInterval(timerRef.current);
                          timerRef.current = null;
                        }
                        toast("Session reset");
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-md overflow-hidden">
                  {sourceType === 'file' ? (
                    videoUrl ? (
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="h-full w-full"
                        onLoadedMetadata={(e) => {
                          const d = (e.target as HTMLVideoElement).duration;
                          setDuration(d);
                          setCurrent(0);
                        }}
                        controls={false}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        Upload a volleyball match video or paste a YouTube link to begin
                      </div>
                    )
                  ) : (
                    <div ref={ytContainerRef} className="h-full w-full" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                    {playing ? <Pause /> : <Play />}
                  </Button>
                  <Button variant="secondary" onClick={() => seekBy(-5)} aria-label="Back 5 seconds"><SkipBack /></Button>
                  <Button variant="secondary" onClick={() => seekBy(5)} aria-label="Forward 5 seconds"><SkipForward /></Button>
                  <Button variant="outline" onClick={() => setMarkIn(current)} aria-label="Mark In"><Flag className="mr-1" />In {markIn !== null && format(markIn)}</Button>
                  <Button variant="outline" onClick={() => setMarkOut(current)} aria-label="Mark Out"><Flag className="mr-1" />Out {markOut !== null && format(markOut)}</Button>
                  <Button disabled={!canSave} onClick={saveClip} aria-label="Save Clip"><Scissors className="mr-1" />Save</Button>
                </div>

                <div className="px-2">
                  <Slider
                    value={[current]}
                    min={0}
                    max={Math.max(duration, 0.0001)}
                    step={0.01}
                    onValueChange={(v) => {
                      const t = v[0];
                      setCurrent(t);
                      if (sourceType === 'youtube' && ytPlayerRef.current) {
                        ytPlayerRef.current.seekTo(t, true);
                      } else {
                        const vid = videoRef.current;
                        if (vid) {
                          vid.currentTime = t;
                        }
                      }
                    }}
                  />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>{format(current)}</span>
                    <span>{format(duration)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {TAGS.map(t => (
                    <Button
                      key={t.label}
                      variant={activeTag === t.label ? 'default' : 'outline'}
                      onClick={() => setActiveTag(t.label)}
                      aria-label={`Tag ${t.label} (${t.key})`}
                    >
                      <Badge variant="secondary" className="mr-2">{t.key}</Badge>
                      {t.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </article>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>Saved Clips ({clips.length})</CardTitle>
                {clips.length > 0 && (
                  <Button size="sm" onClick={autoClassifyAll}><Sparkles className="mr-1" />Auto-tag all</Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {clips.length === 0 && (
                  <div className="text-sm text-muted-foreground">No clips yet. Mark In (I), Out (O), then Save (⇧+S).</div>
                )}
                {clips.map((clip) => (
                  <div key={clip.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <Badge>{clip.tag}</Badge>
                      <span className="text-sm">{format(clip.start)} → {format(clip.end)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => playClip(clip)} aria-label="Play clip"><Play /></Button>
                      <Button size="sm" onClick={() => autoClassifyClip(clip)} aria-label="Auto-tag clip"><Sparkles className="mr-1" />Auto</Button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" onClick={copyJSON}><Copy className="mr-1" />Copy JSON</Button>
                  <Button variant="outline" disabled><Download className="mr-1" />Export (coming soon)</Button>
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </>
  );
}
