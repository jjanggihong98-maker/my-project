"use client";

import { useState } from "react";

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
  addableFields,
  fieldsOf,
  nodeProgress,
  type SpecNode,
} from "@/features/spec-model";

import type { WorkspaceAction } from "../reducer";

/** 기본 필드에 없는 분류를 필요할 때 노드에 더한다. */
function AddFieldMenu({
  node,
  dispatch,
}: {
  node: SpecNode;
  dispatch: (action: WorkspaceAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const addable = addableFields(node);
  if (addable.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          variant="outline"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          필드 추가
        </Button>
      </div>
      {open && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="추가할 필드">
          {addable.map((field) => (
            <Button
              key={field.key}
              variant="secondary"
              size="sm"
              onClick={() => {
                dispatch({ type: "addField", id: node.id, key: field.key });
                setOpen(false);
              }}
            >
              {field.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const defaultKeys = new Set(FIELDS_BY_KIND[node.kind].map((f) => f.key));

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
        {fieldsOf(node).map((field) => {
          const value = node.values[field.key] ?? "";
          const isExtra = !defaultKeys.has(field.key);
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`${node.id}-${field.key}`}>{field.label}</Label>
                {isExtra && (
                  <Button
                    variant="ghost"
                    size="xs"
                    aria-label={`${field.label} 필드 제거`}
                    onClick={() => dispatch({ type: "removeField", id: node.id, key: field.key })}
                  >
                    제거
                  </Button>
                )}
              </div>
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
        <AddFieldMenu node={node} dispatch={dispatch} />
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
