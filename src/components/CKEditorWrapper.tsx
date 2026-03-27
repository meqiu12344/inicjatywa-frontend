'use client';

import { useEffect, useState } from 'react';

interface CKEditorWrapperProps {
  value: string;
  onChange: (data: string) => void;
}

export default function CKEditorWrapper({ value, onChange }: CKEditorWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [Editor, setEditor] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Dynamic import to avoid SSR window issues
    Promise.all([
      import('@ckeditor/ckeditor5-react'),
      import('@ckeditor/ckeditor5-build-classic'),
    ]).then(([ckeditorReact, classicEditor]) => {
      setEditor({ CKEditor: ckeditorReact.CKEditor, ClassicEditor: classicEditor.default });
    });
  }, []);

  if (!mounted || !Editor) {
    return <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px]">Ładowanie edytora...</div>;
  }

  return (
    <Editor.CKEditor
      editor={Editor.ClassicEditor as any}
      data={value}
      onChange={(event: any, editor: any) => {
        const data = editor.getData();
        onChange(data);
      }}
      config={{
        toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|', 'undo', 'redo']
      }}
    />
  );
}
