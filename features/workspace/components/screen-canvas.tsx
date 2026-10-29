"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { findContainmentWarnings } from "@/features/draft";
import {
  enter,
  exit,
  flatten,
  locate,
  nextSibling,
  type Bounds,
  type NodeKind,
  type Point,
  type SpecNode,
} from "@/features/spec-model";
import { cn } from "@/lib/utils";

import type { WorkspaceAction, WorkspaceImage, WorkspaceState } from "../reducer";

type Corner = "nw" | "ne" | "sw" | "se";
type Drag =
  | { type: "draw"; start: Point }
  | { type: "move"; last: Point; start: Point; moved: boolean }
  | { type: "resize"; corner: Corner; origin: Bounds }
  | { type: "click"; start: Point };

const MIN_SIZE = 0.01;
/** 이 거리(화면 폭 대비)보다 적게 움직이면 클릭으로 본다. */
const CLICK_SLOP = 0.008;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

function boxStyle(bounds: Bounds) {
  return {
    left: `${bounds[0] * 100}%`,
    top: `${bounds[1] * 100}%`,
    width: `${bounds[2] * 100}%`,
    height: `${bounds[3] * 100}%`,
  };
}

function rectFrom(a: Point, b: Point): Bounds {
  const x = Math.min(a[0], b[0]);
  const y = Math.min(a[1], b[1]);
  return [x, y, Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])];
}

function resized(origin: Bounds, corner: Corner, p: Point): Bounds {
  let left = origin[0];
  let top = origin[1];
  let right = origin[0] + origin[2];
  let bottom = origin[1] + origin[3];
  if (corner.includes("w")) left = Math.min(p[0], right - MIN_SIZE);
  else right = Math.max(p[0], left + MIN_SIZE);
  if (corner.includes("n")) top = Math.min(p[1], bottom - MIN_SIZE);
  else bottom = Math.max(p[1], top + MIN_SIZE);
  return [left, top, right - left, bottom - top];
}

export function ScreenCanvas({
  image,
  state,
  dispatch,
  addKind,
  onAddDone,
}: {
  image: WorkspaceImage;
  state: WorkspaceState;
  dispatch: (action: WorkspaceAction) => void;
  addKind: NodeKind | null;
  onAddDone: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Bounds | null>(null);

  const { root, selection } = state;
  const warned = new Set(root ? findContainmentWarnings(root).map((w) => w.path) : []);
  const nodes = root ? flatten(root) : [];
  const selected = nodes.find((n) => n.id === selection?.selectedId);

  function toPoint(e: PointerEvent): Point {
    const rect = overlayRef.current!.getBoundingClientRect();
    return [clamp01((e.clientX - rect.left) / rect.width), clamp01((e.clientY - rect.top) / rect.height)];
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!root || !selection) return;
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPoint(e);
    const handle = (e.target as HTMLElement).dataset.handle as Corner | undefined;

    if (addKind) {
      drag.current = { type: "draw", start: p };
      setDrawing([p[0], p[1], 0, 0]);
    } else if (handle && selected) {
      drag.current = { type: "resize", corner: handle, origin: selected.bounds };
    } else if (selected && selected.id !== root.id && isInside(selected, p)) {
      drag.current = { type: "move", last: p, start: p, moved: false };
    } else {
      drag.current = { type: "click", start: p };
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!root || !selection) return;
    const p = toPoint(e);
    const current = drag.current;

    if (!current) {
      setHoverId(locate(root, selection.scopeId, p).selectedId);
      return;
    }
    if (current.type === "draw") {
      setDrawing(rectFrom(current.start, p));
    } else if (current.type === "resize" && selected) {
      dispatch({ type: "resizeBox", id: selected.id, bounds: resized(current.origin, current.corner, p) });
    } else if (current.type === "move" && selected) {
      const travelled = Math.hypot(p[0] - current.start[0], p[1] - current.start[1]);
      if (!current.moved && travelled < CLICK_SLOP) return;
      current.moved = true;
      dispatch({ type: "moveBox", id: selected.id, dx: p[0] - current.last[0], dy: p[1] - current.last[1] });
      current.last = p;
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    drag.current = null;
    if (!current || !root || !selection) return;
    const p = toPoint(e);

    if (current.type === "draw") {
      const box = rectFrom(current.start, p);
      setDrawing(null);
      if (addKind && box[2] >= MIN_SIZE && box[3] >= MIN_SIZE) {
        dispatch({ type: "addBox", kind: addKind, bounds: box });
        onAddDone();
      }
    } else if (current.type === "click" || (current.type === "move" && !current.moved)) {
      dispatch({ type: "select", selection: locate(root, selection.scopeId, p) });
    }
  }

  function onDoubleClick(e: PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) {
    if (!root || !selection || addKind) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const p: Point = [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
    dispatch({ type: "select", selection: enter(root, selection, p) });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!root || !selection) return;
    if (e.key === "Enter") {
      e.preventDefault();
      dispatch({
        type: "select",
        selection: e.shiftKey ? exit(root, selection) : enter(root, selection),
      });
    } else if (e.key === "Tab") {
      e.preventDefault();
      dispatch({ type: "select", selection: nextSibling(root, selection, e.shiftKey ? -1 : 1) });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      dispatch({ type: "deleteSelected" });
    }
  }

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-lg border bg-muted"
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      {/* 사용자가 올린 data URL이라 next/image 최적화 대상이 아니다. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.dataUrl}
        alt="업로드한 스크린샷"
        className="absolute inset-0 size-full object-fill"
        draggable={false}
      />
      <div
        ref={overlayRef}
        role="application"
        aria-label="스크린샷 영역 선택. Enter는 자식으로, Shift+Enter는 부모로, Tab은 형제로 이동합니다."
        tabIndex={0}
        data-testid="screen-canvas"
        className={cn(
          "absolute inset-0 touch-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          addKind ? "cursor-crosshair" : "cursor-default"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHoverId(null)}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        {nodes.map((node) => {
          const isSelected = node.id === selection?.selectedId;
          const isHover = node.id === hoverId && !isSelected;
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              className={cn(
                "pointer-events-none absolute border",
                warned.has(node.id) ? "border-dashed border-destructive/70" : "border-primary/25",
                isHover && "border-primary/70 bg-primary/10",
                isSelected && "border-2 border-primary bg-primary/5"
              )}
              style={boxStyle(node.bounds)}
            >
              {isSelected && (
                <span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                  {node.id}
                </span>
              )}
            </div>
          );
        })}
        {selected && selected.id !== root?.id && (
          <div className="pointer-events-none absolute" style={boxStyle(selected.bounds)}>
            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
              <span
                key={corner}
                data-handle={corner}
                className={cn(
                  "pointer-events-auto absolute size-2.5 rounded-sm border border-primary bg-background",
                  corner.includes("n") ? "-top-1.5" : "-bottom-1.5",
                  corner.includes("w") ? "-left-1.5" : "-right-1.5",
                  corner === "nw" || corner === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"
                )}
              />
            ))}
          </div>
        )}
        {drawing && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
            style={boxStyle(drawing)}
          />
        )}
      </div>
    </div>
  );
}

function isInside(node: SpecNode, p: Point): boolean {
  const [x, y, w, h] = node.bounds;
  return p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h;
}
