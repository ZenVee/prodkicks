import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ImageIcon,
  Undo,
  Redo,
  Minus,
} from 'lucide-react';
import type { ArticleBody } from '@/types';

const EMPTY_DOC: ArticleBody = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

interface RichTextEditorProps {
  value: ArticleBody | null | undefined;
  onChange: (value: ArticleBody) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing…',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-lime underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-none max-w-full' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? EMPTY_DOC,
    editorProps: {
      attributes: {
        class: 'rich-text-editor focus:outline-none min-h-[280px] px-4 py-3',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as ArticleBody);
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const setImage = () => {
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  const btn = (active: boolean) =>
    `p-1.5 transition-colors ${active ? 'text-lime bg-lime/10' : 'text-bone-muted hover:text-bone'}`;

  return (
    <div className="border border-white/10 bg-ink-raised">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 p-1.5">
        <button type="button" title="Bold" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </button>
        <button type="button" title="Italic" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button type="button" title="Heading 2" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </button>
        <button type="button" title="Heading 3" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button type="button" title="Bullet list" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </button>
        <button type="button" title="Ordered list" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </button>
        <button type="button" title="Quote" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </button>
        <button type="button" title="Divider" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button type="button" title="Link" className={btn(editor.isActive('link'))} onClick={setLink}>
          <LinkIcon size={15} />
        </button>
        <button type="button" title="Image" className={btn(false)} onClick={setImage}>
          <ImageIcon size={15} />
        </button>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <button type="button" title="Undo" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={15} />
        </button>
        <button type="button" title="Redo" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={15} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export { EMPTY_DOC };
