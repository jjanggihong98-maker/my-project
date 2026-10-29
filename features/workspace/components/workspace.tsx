"use client";

import { useEffect, useReducer, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { nodeNumbers } from "@/features/export";
import { KIND_LABELS, type NodeKind } from "@/features/spec-model";

import { loadWorkspace, saveWorkspace } from "../persistence";
import { initialWorkspace, selectedNode, workspaceReducer } from "../reducer";
import { DraftPanel } from "./draft-panel";
import { ExportPanel } from "./export-panel";
import { ImageUpload } from "./image-upload";
import { NodePanel } from "./node-panel";
import { ScreenCanvas } from "./screen-canvas";
import { StructurePanel } from "./structure-panel";

const ADD_KINDS: NodeKind[] = ["frame", "text", "shape", "icon"];

export function Workspace() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [addKind, setAddKind] = useState<NodeKind | null>(null);

  // 새로고침 후에도 작업이 남도록 저장된 상태를 한 번 불러온다.
  useEffect(() => {
    let cancelled = false;
    loadWorkspace().then((saved) => {
      if (cancelled) return;
      if (saved) dispatch({ type: "restore", state: saved });
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void saveWorkspace(state), 300);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  const node = selectedNode(state);
  const numbers = state.root ? nodeNumbers(state.root) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">UI Spec Builder</h1>
        <p className="text-sm text-muted-foreground">
          스크린샷의 영역에 디자인 토큰 이름을 붙여, AI가 그대로 구현할 수 있는 스펙 .md와 주석 이미지를 만듭니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ImageUpload
            fileName={state.image?.name}
            hasWork={Boolean(state.root)}
            onLoaded={(image) => {
              setAddKind(null);
              dispatch({ type: "imageLoaded", image });
            }}
          />

          {state.image && (
            <Card>
              <CardHeader>
                <CardTitle>영역 선택</CardTitle>
                <CardDescription>
                  클릭으로 선택하고, 더블클릭이나 Enter로 자식 영역에 들어갑니다. Shift+Enter는 부모로, Tab은 형제로 이동합니다.
                  선택한 박스는 끌어서 옮기고 모서리로 크기를 바꿀 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {state.root && (
                  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="박스 추가">
                    <span className="text-sm text-muted-foreground">박스 추가</span>
                    {ADD_KINDS.map((kind) => (
                      <Button
                        key={kind}
                        size="sm"
                        variant={addKind === kind ? "default" : "outline"}
                        aria-pressed={addKind === kind}
                        onClick={() => setAddKind(addKind === kind ? null : kind)}
                      >
                        {KIND_LABELS[kind]}
                      </Button>
                    ))}
                    {addKind && (
                      <span className="text-xs text-muted-foreground">
                        스크린샷 위에서 끌어 {KIND_LABELS[addKind]} 박스를 그리세요.
                      </span>
                    )}
                  </div>
                )}
                {state.root ? (
                  <ScreenCanvas
                    image={state.image}
                    state={state}
                    dispatch={dispatch}
                    addKind={addKind}
                    onAddDone={() => setAddKind(null)}
                  />
                ) : (
                  // 초안이 없을 때는 원본만 보여 준다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.image.dataUrl}
                    alt="업로드한 스크린샷"
                    className="w-full rounded-lg border"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {state.image && <DraftPanel root={state.root} dispatch={dispatch} />}
          {state.root && (
            <StructurePanel
              root={state.root}
              selectedId={state.selection?.selectedId}
              dispatch={dispatch}
            />
          )}
          <NodePanel
            node={node}
            number={node ? numbers?.get(node.id) : undefined}
            isRoot={node?.id === state.root?.id}
            dispatch={dispatch}
          />
          <ExportPanel state={state} dispatch={dispatch} />
        </div>
      </div>
    </main>
  );
}
