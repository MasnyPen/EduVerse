import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import type { AnchorHTMLAttributes } from "react";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content?: string | null;
  className?: string;
  inline?: boolean;
}

const combineClassNames = (...values: Array<string | null | undefined>) => values.filter(Boolean).join(" ");

const InlineFragment = ({ children }: { children?: ReactNode }) => <>{children}</>;

const InlineListItem = ({ children }: { children?: ReactNode }) => (
  <span className="markdown-content__inline-list-item">{children}</span>
);

const MarkdownLink = ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
    {children}
  </a>
);

const baseComponents: Components = {
  a: MarkdownLink,
};

const inlineComponents: Components = {
  ...baseComponents,
  p: InlineFragment,
  ul: InlineFragment,
  ol: InlineFragment,
  li: InlineListItem,
};

const MarkdownContent = ({ content, className = "", inline = false }: MarkdownContentProps) => {
  const text = content?.trim();
  if (!text) {
    return null;
  }

  const baseClassName = combineClassNames("markdown-content", inline ? "markdown-content--inline" : null, className);

  return (
    <ReactMarkdown
      className={baseClassName}
      remarkPlugins={[remarkBreaks as any, remarkGfm as any, remarkMath as any]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={inline ? inlineComponents : baseComponents}
    >
      {text}
    </ReactMarkdown>
  );
};

export default MarkdownContent;
