import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import hero from "@/assets/hero-volleyball.jpg";

const Index = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spotlight-x", `${x}%`);
    el.style.setProperty("--spotlight-y", `${y}%`);
  };

  return (
    <>
      <SEO
        title="Volleyball Video Editor | Balltime.ai alternative"
        description="Edit volleyball games fast: tag rallies, create clips, and export highlights. A beautiful, browser-based editor."
        canonicalPath="/"
      />
      <div className="min-h-screen bg-hero">
        <header className="container py-6 flex items-center justify-between">
          <Link to="/" className="font-semibold">VolleyCut</Link>
          <nav className="flex items-center gap-4">
            <Link to="/editor" className="text-sm text-muted-foreground">Editor</Link>
            <a href="#features" className="text-sm text-muted-foreground">Features</a>
          </nav>
        </header>

        <main className="container py-10">
          <section ref={ref} onMouseMove={onMove} className="spotlight rounded-xl border p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">Volleyball Video Editor</h1>
                <p className="text-lg text-muted-foreground mb-6">Purpose-built for volleyball. Tag serves, passes, sets, and spikes, then export highlight reels in minutes.</p>
                <div className="flex items-center gap-3">
                  <Link to="/editor"><Button variant="hero" size="lg">Start Editing</Button></Link>
                  <a href="#features"><Button variant="outline" size="lg">Learn More</Button></a>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden shadow-xl">
                <img src={hero} alt="Volleyball video editor UI with timeline and tags" loading="lazy" />
              </div>
            </div>
          </section>

          <section id="features" className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border card-glass">
              <h3 className="font-semibold mb-2">Volley-first Tagging</h3>
              <p className="text-sm text-muted-foreground">Serve, Pass, Set, Attack, Block, Dig, Error — mapped to hotkeys for blazing workflows.</p>
            </div>
            <div className="p-6 rounded-xl border card-glass">
              <h3 className="font-semibold mb-2">Fast Clip Creation</h3>
              <p className="text-sm text-muted-foreground">Mark In (I) and Out (O), then save (⇧+S). Review and export your highlights.</p>
            </div>
            <div className="p-6 rounded-xl border card-glass">
              <h3 className="font-semibold mb-2">No Install</h3>
              <p className="text-sm text-muted-foreground">Runs in the browser with local files. Your footage stays on your device.</p>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Index;
