import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: string;
}

/**
 * Rich Text Editor component using Quill
 * Supports: Bold, Italic, Lists, Links, Images (Base64), Tables
 */
const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = '내용을 입력하세요...',
    minHeight = '150px'
}) => {
    // Quill modules configuration
    const modules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            [{ 'align': [] }],
            ['blockquote', 'code-block'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false,
        }
    }), []);

    // Supported formats
    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'indent',
        'link', 'image',
        'align',
        'blockquote', 'code-block'
    ];

    return (
        <div className="rich-text-editor" style={{ minHeight }}>
            <style>{`
                .rich-text-editor .ql-container {
                    min-height: ${minHeight};
                    font-size: 14px;
                    font-family: inherit;
                }
                .rich-text-editor .ql-editor {
                    min-height: ${minHeight};
                }
                .rich-text-editor .ql-toolbar {
                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;
                    background: #f8fafc;
                    border-color: #e2e8f0;
                }
                .rich-text-editor .ql-container {
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                    border-color: #e2e8f0;
                }
                .rich-text-editor .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
                .rich-text-editor .ql-editor img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 8px;
                    margin: 8px 0;
                }
                .rich-text-editor .ql-editor table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 8px 0;
                }
                .rich-text-editor .ql-editor p {
                    margin-bottom: 1.25em;
                    line-height: 1.75;
                }
                .rich-text-editor .ql-editor h1,
                .rich-text-editor .ql-editor h2,
                .rich-text-editor .ql-editor h3 {
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    font-weight: bold;
                }
                .rich-text-editor .ql-editor ul,
                .rich-text-editor .ql-editor ol {
                    margin-bottom: 1.25em;
                    padding-left: 1.5em;
                }
                .rich-text-editor .ql-editor li {
                    margin-bottom: 0.5em;
                }
                .rich-text-editor .ql-editor td, 
                .rich-text-editor .ql-editor th {
                    border: 1px solid #e2e8f0;
                    padding: 8px;
                }
            `}</style>
            <ReactQuill
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
            />
        </div>
    );
};

export default RichTextEditor;
