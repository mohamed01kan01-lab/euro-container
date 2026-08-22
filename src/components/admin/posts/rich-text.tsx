"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    IconBold,
    IconItalic,
    IconH2,
    IconH3,
    IconList,
    IconListNumbers,
    IconQuote,
    IconLink,
    IconPhoto,
    IconLibraryPhoto,
} from "@tabler/icons-react";
import { MediaPickerDialog } from "@/components/admin/media/media-picker-dialog";

interface RichTextProps {
    defaultValue?: string;
    onChange: (html: string) => void;
}

export function RichText({ defaultValue = "", onChange }: RichTextProps) {
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [imageOpen, setImageOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ link: false }),
            ImageExtension,
            LinkExtension.configure({ openOnClick: false }),
            PlaceholderExtension.configure({ placeholder: "Commencez à écrire votre contenu…" }),
        ],
        content: defaultValue,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    if (!editor) return null;

    function applyLink() {
        if (!linkUrl) return;
        editor?.chain().focus().setLink({ href: linkUrl }).run();
        setLinkUrl("");
        setLinkOpen(false);
    }

    function applyImage() {
        if (!imageUrl) return;
        editor?.chain().focus().setImage({ src: imageUrl }).run();
        setImageUrl("");
        setImageOpen(false);
    }

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30">
                <Toggle
                    size="sm"
                    pressed={editor.isActive("bold")}
                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                    aria-label="Gras"
                >
                    <IconBold size={14} />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("italic")}
                    onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                    aria-label="Italique"
                >
                    <IconItalic size={14} />
                </Toggle>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                <Toggle
                    size="sm"
                    pressed={editor.isActive("heading", { level: 2 })}
                    onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    aria-label="Titre H2"
                >
                    <IconH2 size={14} />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("heading", { level: 3 })}
                    onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    aria-label="Titre H3"
                >
                    <IconH3 size={14} />
                </Toggle>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                <Toggle
                    size="sm"
                    pressed={editor.isActive("bulletList")}
                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                    aria-label="Liste à puces"
                >
                    <IconList size={14} />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("orderedList")}
                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                    aria-label="Liste numérotée"
                >
                    <IconListNumbers size={14} />
                </Toggle>
                <Toggle
                    size="sm"
                    pressed={editor.isActive("blockquote")}
                    onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
                    aria-label="Citation"
                >
                    <IconQuote size={14} />
                </Toggle>

                <Separator orientation="vertical" className="h-5 mx-0.5" />

                {/* Link */}
                <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>
                        <Toggle size="sm" pressed={editor.isActive("link")} aria-label="Lien">
                            <IconLink size={14} />
                        </Toggle>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3" align="start">
                        <p className="text-xs font-medium mb-2">URL du lien</p>
                        <div className="flex gap-2">
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                            />
                            <Button size="sm" onClick={applyLink}>OK</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Image */}
                <Popover open={imageOpen} onOpenChange={setImageOpen}>
                    <PopoverTrigger asChild>
                        <Toggle size="sm" aria-label="Image">
                            <IconPhoto size={14} />
                        </Toggle>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 space-y-2" align="start">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                setImageOpen(false);
                                setPickerOpen(true);
                            }}
                        >
                            <IconLibraryPhoto size={14} className="mr-1.5" />
                            Choisir dans la médiathèque
                        </Button>
                        <p className="text-xs font-medium">URL de l&apos;image</p>
                        <div className="flex gap-2">
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && applyImage()}
                            />
                            <Button size="sm" onClick={applyImage}>OK</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <MediaPickerDialog
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={(url, item) => {
                    editor?.chain().focus().setImage({ src: url, alt: item.name }).run();
                    setPickerOpen(false);
                }}
                accept="image"
            />

            {/* Editor area */}
            <EditorContent
                editor={editor}
                className="min-h-72 p-4 prose prose-sm max-w-none focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-64"
            />
        </div>
    );
}
