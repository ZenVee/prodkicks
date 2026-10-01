import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import type { ArticleBody } from '@/types';

interface RichTextContentProps {
  body: ArticleBody;
  className?: string;
}

export default function RichTextContent({ body, className = '' }: RichTextContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-lime underline hover:text-lime-dark' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'w-full my-6' },
      }),
    ],
    content: body,
    editable: false,
    editorProps: {
      attributes: {
        class: `rich-text-content ${className}`.trim(),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(body);
  }, [body, editor]);

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
