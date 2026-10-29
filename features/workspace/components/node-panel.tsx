"use client";

import { Badge } from "@/components/ui/badge";
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
import {
  FIELDS_BY_KIND,
  KIND_LABELS,
  nodeProgress,
  type SpecNode,
} from "@/features/spec-model";

import type { WorkspaceAction } from "../reducer";

export function NodePanel({
  node,
  number,
  isRoot,
  dispatch,
}: {
  node: SpecNode | undefined;
  number: number | undefined;
  isRoot: boolean;
  dispatch: (action: WorkspaceAction) => void;
}) {
  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>3. 노드 입력</CardTitle>
          <CardDescription>
            초안을 적용하고 스크린샷에서 영역을 선택하면 입력 필드가 나타납니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { filled, total } = nodeProgress(node);

  return (
    <Card data-testid="node-panel" key={node.id}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>
            [{number}] {node.id}
          </span>
          <Badge variant="secondary">{KIND_LABELS[node.kind]}</Badge>
          <Badge variant="outline">
            입력 {filled}/{total}
          </Badge>
        </CardTitle>
        <CardDescription>
          필요한 토큰 이름만 입력하세요. 비워 둔 항목은 스펙 .md에 쓰지 않습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {node.kind === "text" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${node.id}-text`}>문구</Label>
            <Input
              id={`${node.id}-text`}
              value={node.text ?? ""}
              onChange={(e) => dispatch({ type: "setText", id: node.id, text: e.target.value })}
            />
          </div>
        )}
        {FIELDS_BY_KIND[node.kind].map((field) => {
          const value = node.values[field.key] ?? "";
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`${node.id}-${field.key}`}>{field.label}</Label>
              <Input
                id={`${node.id}-${field.key}`}
                value={value}
                placeholder={field.placeholder}
                onChange={(e) =>
                  dispatch({ type: "setValue", id: node.id, key: field.key, value: e.target.value })
                }
              />
            </div>
          );
        })}
        {!isRoot && (
          <div className="pt-1">
            <Button variant="destructive" size="sm" onClick={() => dispatch({ type: "deleteSelected" })}>
              이 노드 삭제
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
