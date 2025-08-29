import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  jsonLd?: Record<string, any>;
}

const upsertTag = (selector: string, create: () => HTMLElement) => {
  let el = document.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el as HTMLElement;
};

export default function SEO({ title, description, canonicalPath, jsonLd }: SEOProps) {
  useEffect(() => {
    if (title) document.title = title;

    if (description !== undefined) {
      const metaDesc = upsertTag('meta[name="description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('name', 'description');
        return m;
      });
      metaDesc.setAttribute('content', description || '');

      const ogTitle = upsertTag('meta[property="og:title"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:title');
        return m;
      });
      ogTitle.setAttribute('content', title);

      const ogDesc = upsertTag('meta[property="og:description"]', () => {
        const m = document.createElement('meta');
        m.setAttribute('property', 'og:description');
        return m;
      });
      ogDesc.setAttribute('content', description || '');
    }

    if (canonicalPath) {
      const canonical = upsertTag('link[rel="canonical"]', () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      });
      const url = new URL(canonicalPath, window.location.origin);
      canonical.setAttribute('href', url.toString());
    }

    const existingJsonLd = document.getElementById('structured-data');
    if (existingJsonLd) existingJsonLd.remove();

    const data = jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: title,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      description: description,
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'structured-data';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }, [title, description, canonicalPath, jsonLd]);

  return null;
}
