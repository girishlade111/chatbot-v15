'use client';

import { useMemo, useEffect, useRef } from 'react';
import { remark } from 'remark';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  const htmlContent = useMemo(() => {
    if (!content) return '';

    const result = remark()
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeKatex)
      .use(rehypeHighlight)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(content);

    return String(result);
  }, [content]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const pres = el.querySelectorAll<HTMLPreElement>('pre');
    pres.forEach((pre) => {
      if (pre.dataset.markdownProcessed) return;
      pre.dataset.markdownProcessed = 'true';

      const code = pre.querySelector<HTMLElement>('code');
      const langMatch = code?.className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';

      if (lang) {
        const label = document.createElement('span');
        label.className =
          'absolute top-0 left-0 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#cdd6f4]/50 select-none';
        label.textContent = lang;
        pre.appendChild(label);
      }

      const btn = document.createElement('button');
      btn.className =
        'copy-btn absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-[#cdd6f4]/70 bg-[#1e1e2e]/80 transition-all duration-150 hover:bg-[#1e1e2e] hover:text-[#cdd6f4]';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = code?.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied!';
          btn.classList.add('text-green-400');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('text-green-400');
          }, 2000);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          btn.textContent = 'Copied!';
          btn.classList.add('text-green-400');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('text-green-400');
          }, 2000);
        }
      });
      pre.appendChild(btn);
    });
  }, [htmlContent]);

  if (!content) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:relative prose-pre:bg-[#11111b] prose-pre:border prose-pre:border-[#313244]',
        'prose-code:text-[#cdd6f4]',
        'prose-a:text-primary hover:prose-a:underline',
        'prose-strong:text-foreground',
        'prose-headings:text-foreground',
        'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground',
        'overflow-x-auto',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
