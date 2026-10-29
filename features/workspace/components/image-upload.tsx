"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { WorkspaceImage } from "../reducer";
import { imageFileFrom } from "./image-source";

function readImage(file: File): Promise<WorkspaceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const image = new Image();
      image.onload = () =>
        resolve({ dataUrl, width: image.naturalWidth, height: image.naturalHeight, name: file.name });
      image.onerror = () => reject(new Error("이미지 파일이 아닙니다."));
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  fileName,
  hasWork,
  onLoaded,
}: {
  fileName: string | undefined;
  hasWork: boolean;
  onLoaded: (image: WorkspaceImage) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept(file: File) {
    if (hasWork && !window.confirm("새 스크린샷을 올리면 지금까지의 작업이 사라집니다. 계속할까요?")) {
      return;
    }
    try {
      setError(null);
      onLoaded(await readImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 올릴 수 없습니다.");
    }
  }

  // 이벤트 핸들러가 항상 최신 props를 보도록 ref에 담아 둔다.
  const acceptRef = useRef(accept);
  useEffect(() => {
    acceptRef.current = accept;
  });

  // 파일 선택창을 쓸 수 없는 환경을 위해 Ctrl+V 붙여넣기도 받는다. 텍스트 붙여넣기는 건드리지 않는다.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = imageFileFrom(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      void acceptRef.current(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 스크린샷</CardTitle>
        <CardDescription>
          이미지는 이 브라우저 안에서만 처리하며 어디로도 전송하지 않습니다.
          {fileName && <> 현재: {fileName}</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          data-testid="image-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = imageFileFrom(e.dataTransfer);
            if (file) void accept(file);
            else setError("이미지 파일을 끌어다 놓아 주세요.");
          }}
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
            dragging && "border-primary bg-primary/5 text-foreground"
          )}
        >
          <p className="font-medium text-foreground">
            스크린샷을 Ctrl+V로 붙여넣거나 이 영역에 끌어다 놓으세요
          </p>
          <p>파일 선택창이 막혀 있어도 화면 캡처 도구로 복사한 이미지를 바로 붙여넣을 수 있습니다.</p>
        </div>
        <Input
          type="file"
          accept="image/*"
          aria-label="스크린샷 파일 선택"
          data-testid="image-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void accept(file);
            e.target.value = "";
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
