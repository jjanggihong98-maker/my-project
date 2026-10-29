"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { nodeNumbers } from "@/features/export";
import { KIND_LABELS, nodeProgress, type SpecNode } from "@/features/spec-model";
import { cn } from "@/lib/utils";

import type { WorkspaceAction } from "../reducer";

interface Row {
  node: SpecNode;
  depth: number;
  parentId: string;
}

function rows(node: SpecNode, depth: number, parentId: string): Row[] {
  return [
    { node, depth, parentId },
    ...node.children.flatMap((c) => rows(c, depth + 1, node.id)),
  ];
}

/** 트리의 모든 노드를 들여쓴 목록으로 보여 주고, 클릭하면 안쪽 노드도 바로 고른다. */
export function StructurePanel({
  root,
  selectedId,
  dispatch,
}: {
  root: SpecNode;
  selectedId: string | undefined;
  dispatch: (action: WorkspaceAction) => void;
}) {
  const numbers = nodeNumbers(root);

  return (
    <Card>
      <CardHeader>
        <CardTitle>구조</CardTitle>
        <CardDescription>
          초안의 모든 노드입니다. 스크린샷에서 고르기 어려운 작은 요소는 여기서 바로 선택하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex max-h-80 flex-col gap-0.5 overflow-auto" data-testid="structure-list">
          {rows(root, 0, root.id).map(({ node, depth, parentId }) => {
            const { filled, total } = nodeProgress(node);
            const isSelected = node.id === selectedId;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  aria-current={isSelected}
                  aria-label={`${node.id} (${KIND_LABELS[node.kind]}) ${filled}/${total}`}
                  style={{ paddingLeft: `${depth * 14 + 8}px` }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm hover:bg-muted",
                    isSelected && "bg-primary/10 font-medium"
                  )}
                  onClick={() =>
                    dispatch({
                      type: "select",
                      selection: { selectedId: node.id, scopeId: parentId },
                    })
                  }
                >
                  <span className="text-xs text-muted-foreground">[{numbers.get(node.id)}]</span>
                  <span className="truncate">{node.id}</span>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {KIND_LABELS[node.kind]}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {filled}/{total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
