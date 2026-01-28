'use client';

import '@blocknote/core/fonts/inter.css';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { useEffect } from 'react';

interface EditorProps {
  initialContent?: any;
  onChange?: (content: any) => void;
  editable?: boolean;
}

export default function Editor({ initialContent, onChange, editable = true }: EditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent || undefined,
  });

  useEffect(() => {
    if (!onChange) return;

    // Subscribe to editor changes
    const unsubscribe = editor.onChange(() => {
      onChange(editor.document);
    });

    return unsubscribe;
  }, [editor, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme="dark"
      className="min-h-[300px]"
    />
  );
}
