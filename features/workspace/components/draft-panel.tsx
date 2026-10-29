"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DRAFT_PROMPT,
  buildFixPrompt,
  findContainmentWarnings,
  parseDraft,
  type DraftIssue,
} from "@/features/draft";
import { flatten, type SpecNode } from "@/features/spec-model";

import type { WorkspaceAction } from "../reducer";
import { copyText } from "./copy-text";

export function DraftPanel({
  root,
  dispatch,
}: {
  root: SpecNode | undefined;
  dispatch: (action: WorkspaceAction) => void;
}) {
  const [raw, setRaw] = useState("");
  const [errors, setErrors] = useState<DraftIssue[]>([]);
  const [copied, setCopied] = useState<"prompt" | "fix" | "failed" | null>(null);
  const [replacing, setReplacing] = useState(false);

  const warnings = root ? findContainmentWarnings(root) : [];
  const showEditor = !root || replacing;

  async function copy(kind: "prompt" | "fix", text: string) {
    setCopied((await copyText(text)) ? kind : "failed");
    setTimeout(() => setCopied(null), 2500);
  }

  function apply() {
    const result = parseDraft(raw);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setRaw("");
    setReplacing(false);
    dispatch({ type: "draftAccepted", root: result.root });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. 영역 초안</CardTitle>
        <CardDescription>
          프롬프트를 복사해 승인된 Copilot 채팅에 붙여넣고 스크린샷을 첨부한 뒤, 응답 JSON을 아래에 붙여넣으세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {root && !replacing && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span data-testid="draft-status">
              초안 적용됨 · 노드 {flatten(root).length}개
            </span>
            <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
              새 초안 붙여넣기
            </Button>
          </div>
        )}

        {showEditor && (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Copilot에 붙여넣을 프롬프트</span>
                <Button size="sm" onClick={() => copy("prompt", DRAFT_PROMPT)}>
                  {copied === "prompt" ? "복사됨" : "프롬프트 복사"}
                </Button>
              </div>
              {copied === "failed" && (
                <p role="status" className="text-xs text-destructive">
                  복사하지 못했습니다. 아래 프롬프트를 직접 선택해 복사해 주세요.
                </p>
              )}
              <pre
                data-testid="draft-prompt"
                className="max-h-48 overflow-auto rounded-md border bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap"
              >
                {DRAFT_PROMPT}
              </pre>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="draft-json" className="text-sm font-medium">
                Copilot 응답 JSON
              </label>
              <Textarea
                id="draft-json"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder="여기에 응답 JSON을 붙여넣으세요"
                className="h-32 font-mono text-xs"
              />
              {root && (
                <p className="text-xs text-muted-foreground">
                  새 초안을 적용하면 지금까지 입력한 값이 모두 사라집니다.
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={apply} disabled={raw.trim().length === 0}>
                  초안 적용
                </Button>
                {replacing && (
                  <Button variant="ghost" onClick={() => setReplacing(false)}>
                    취소
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {errors.length > 0 && (
          <div
            role="alert"
            data-testid="draft-errors"
            className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <p className="font-medium text-destructive">초안을 읽을 수 없습니다. 아래 항목을 고쳐 다시 요청하세요.</p>
            <ul className="list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>
                  <code className="font-mono text-xs">{e.path}</code>: {e.message}
                </li>
              ))}
            </ul>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy("fix", buildFixPrompt(errors))}
              >
                {copied === "fix" ? "복사됨" : "수정 요청 문구 복사"}
              </Button>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div
            data-testid="draft-warnings"
            className="flex flex-col gap-1 rounded-md border border-dashed border-destructive/50 p-3 text-sm"
          >
            <p className="font-medium">경고 {warnings.length}건 (작업은 계속할 수 있습니다)</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {warnings.map((w) => (
                <li key={w.path}>
                  <code className="font-mono text-xs">{w.path}</code>: {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
