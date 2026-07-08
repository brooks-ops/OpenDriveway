import { useEffect } from "react";

interface MetaHeadProps {
  title: string;
  description: string;
  keywords?: string;
}

function setMeta(name: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }
  tag.content = content;
}

export function MetaHead({ title, description, keywords }: MetaHeadProps) {
  useEffect(() => {
    document.title = title;
    setMeta("description", description);
    if (keywords) {
      setMeta("keywords", keywords);
    }
  }, [title, description, keywords]);

  return null;
}
