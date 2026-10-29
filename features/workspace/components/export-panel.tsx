"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  buildSpecMarkdown,
  canPickSaveFolder,
  downloadFile,
  exportFileNames,
  planAnnotation,
  pickSaveFolder,
  renderAnnotatedImage,
  writeToFolder,
  type ExportFile,
} from "@/features/export";
import { PROJECT_FIELDS, progress } from "@/features/spec-model";

import { canExport, type WorkspaceAction, type WorkspaceState } from "../reducer";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    image.src = src;
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ExportPanel({
  state,
  dispatch,
}: {
  state: WorkspaceState;
  dispatch: (action: WorkspaceAction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  // 서버 렌더링에서는 false로 두고, 브라우저에서만 지원 여부를 확인한다.
  const canPickFolder = useSyncExternalStore(
    () => () => {},
    canPickSaveFolder,
    () => false
  );

  const { root, image, project } = state;
  const { filled, total } = root ? progress(root) : { filled: 0, total: 0 };
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  const defaultName = image?.name.replace(/\.[^.]+$/, "") ?? "";
  const names = exportFileNames(nameInput || defaultName);

  async function buildFiles(): Promise<ExportFile[]> {
    if (!root || !image) return [];
    const markdown = buildSpecMarkdown({ root, project, imageFileName: names.image });
    const png = await renderAnnotatedImage(
      await loadImage(image.dataUrl),
      planAnnotation({ imageWidth: image.width, imageHeight: image.height, root })
    );
    return [
      { name: names.markdown, content: markdown },
      { name: names.image, content: png },
    ];
  }

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    setNotice(null);
    try {
      setMessage(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const saveToChosenFolder = () =>
    run(async () => {
      // 폴더 선택 창은 클릭 직후에만 열 수 있어, 파일을 만들기 전에 먼저 연다.
      const folder = await pickSaveFolder();
      if (!folder) {
        setNotice(
          "저장하지 않았습니다. 폴더 선택을 취소했거나, 브라우저나 사내 정책이 폴더 쓰기 권한을 막았을 수 있습니다. 그럴 때는 다운로드 폴더로 내려받기를 써 주세요."
        );
        return null;
      }
      const files = await buildFiles();
      try {
        await writeToFolder(folder, files);
      } catch (e) {
        throw new Error(
          `폴더에 저장하지 못했습니다. ${e instanceof Error ? e.message : ""} 다른 폴더를 고르거나 다운로드 폴더로 내려받기를 써 주세요.`
        );
      }
      return `선택한 폴더에 ${names.markdown}, ${names.image}를 저장했습니다. 같은 이름의 파일이 있었다면 덮어썼습니다.`;
    });

  const download = () =>
    run(async () => {
      const files = await buildFiles();
      for (const [index, file] of files.entries()) {
        if (index > 0) await wait(400);
        downloadFile(file.content, file.name);
      }
      return `다운로드 폴더로 ${names.markdown}, ${names.image}를 내려받았습니다.`;
    });

  const enabled = canExport(state) && !busy;

  return (
    <Card>
      <CardHeader>
        <CardTitle>4. 내보내기</CardTitle>
        <CardDescription>
          입력한 값만 스펙 .md에 담깁니다. .md와 이미지는 같은 이름으로 같은 폴더에 저장됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="export-name">파일 이름</Label>
          <Input
            id="export-name"
            value={nameInput}
            placeholder={defaultName || "screen"}
            disabled={!root}
            onChange={(e) => setNameInput(e.target.value)}
          />
          {root && (
            <p className="text-xs text-muted-foreground" data-testid="export-file-names">
              {names.markdown}, {names.image}
            </p>
          )}
        </div>

        {PROJECT_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`project-${field.key}`}>{field.label} (선택)</Label>
            <Input
              id={`project-${field.key}`}
              value={project[field.key] ?? ""}
              placeholder={field.placeholder}
              disabled={!root}
              onChange={(e) =>
                dispatch({ type: "setProject", key: field.key, value: e.target.value })
              }
            />
          </div>
        ))}

        <div className="flex flex-col gap-1.5" data-testid="progress">
          <div className="flex items-center justify-between text-sm">
            <span>입력한 필드</span>
            <span data-testid="progress-text">
              {filled}/{total}
            </span>
          </div>
          <Progress value={percent} />
        </div>

        <div className="flex flex-col gap-2">
          {canPickFolder && (
            <Button onClick={saveToChosenFolder} disabled={!enabled}>
              {busy ? "만드는 중..." : "저장 위치를 골라 저장"}
            </Button>
          )}
          <Button
            variant={canPickFolder ? "outline" : "default"}
            onClick={download}
            disabled={!enabled}
          >
            {busy ? "만드는 중..." : "다운로드 폴더로 내려받기"}
          </Button>
        </div>
        {root && canPickFolder && (
          <p className="text-xs text-muted-foreground">
            문서, 바탕 화면, 다운로드 같은 시스템 폴더는 브라우저가 막으므로 그 안에 만든 하위 폴더를 고르세요. 고른 뒤 파일 편집 같은 권한 확인이 뜨면 허용해야 저장됩니다.
          </p>
        )}
        {root && !canPickFolder && (
          <p className="text-xs text-muted-foreground">
            이 브라우저는 저장 위치 선택을 지원하지 않아 브라우저의 다운로드 폴더로 내려받습니다.
          </p>
        )}
        {root && filled < total && (
          <p className="text-xs text-muted-foreground">
            비워 둔 {total - filled}개 필드는 스펙 .md에 쓰지 않습니다.
          </p>
        )}
        {message && (
          <p className="text-sm" data-testid="export-done">
            {message} .md와 이미지를 Copilot 채팅에 함께 전달해 구현을 요청하세요.
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground" data-testid="export-notice">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
