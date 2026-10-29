import { contains, type Bounds, type NodeKind, type SpecNode } from "@/features/spec-model";

export interface DraftIssue {
  /** 문제가 있는 노드 id. 노드를 특정할 수 없으면 위치 설명이다. */
  path: string;
  message: string;
}

export type ParseResult =
  | { ok: true; root: SpecNode; warnings: DraftIssue[] }
  | { ok: false; errors: DraftIssue[] };

export const ALLOWED_KINDS: readonly NodeKind[] = ["frame", "text", "shape", "icon"];

/** 이 오차 이내의 어긋남은 오류도 경고도 내지 않는다. */
const TOLERANCE = 0.01;

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseDraft(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return {
      ok: false,
      errors: [
        {
          path: "(전체)",
          message: "JSON 형식이 아닙니다. 설명 없이 JSON만 응답하도록 다시 요청해 주세요.",
        },
      ],
    };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      return {
        ok: false,
        errors: [{ path: "(전체)", message: `루트 노드는 하나여야 합니다. (현재 ${parsed.length}개)` }],
      };
    }
    parsed = parsed[0];
  }
  if (!isRecord(parsed)) {
    return {
      ok: false,
      errors: [{ path: "(전체)", message: "루트가 노드 객체가 아닙니다." }],
    };
  }

  const errors: DraftIssue[] = [];
  const seenIds = new Set<string>();

  function readBounds(value: unknown, path: string): Bounds | null {
    if (
      !Array.isArray(value) ||
      value.length !== 4 ||
      !value.every((v) => typeof v === "number" && Number.isFinite(v))
    ) {
      errors.push({ path, message: "bounds는 숫자 4개 [x, y, w, h] 여야 합니다." });
      return null;
    }
    const [x, y, w, h] = value as number[];
    const outOfRange = value.find((v: number) => v < -TOLERANCE || v > 1 + TOLERANCE);
    if (outOfRange !== undefined) {
      errors.push({
        path,
        message: `bounds 값 ${outOfRange}이(가) 0～1 범위를 벗어났습니다.`,
      });
      return null;
    }
    if (w <= 0 || h <= 0) {
      errors.push({ path, message: "bounds의 폭과 높이(w, h)는 0보다 커야 합니다." });
      return null;
    }
    if (x + w > 1 + TOLERANCE || y + h > 1 + TOLERANCE) {
      errors.push({
        path,
        message: "bounds의 x+w 또는 y+h가 1을 넘어 이미지 밖으로 나갑니다.",
      });
      return null;
    }
    const cx = clamp(x, 0, 1);
    const cy = clamp(y, 0, 1);
    return [cx, cy, Math.min(w, 1 - cx), Math.min(h, 1 - cy)];
  }

  function readNode(value: unknown, where: string): SpecNode | null {
    if (!isRecord(value)) {
      errors.push({ path: where, message: "노드가 객체가 아닙니다." });
      return null;
    }
    const id = typeof value.id === "string" && value.id.trim() ? value.id : null;
    const path = id ?? where;
    if (!id) errors.push({ path, message: "id가 없거나 문자열이 아닙니다." });
    else if (seenIds.has(id)) errors.push({ path, message: `id "${id}"가 중복되었습니다.` });
    else seenIds.add(id);

    const kind = ALLOWED_KINDS.find((k) => k === value.type);
    if (!kind) {
      errors.push({
        path,
        message: `type "${String(value.type)}"은(는) 쓸 수 없습니다. ${ALLOWED_KINDS.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const bounds = readBounds(value.bounds, path);

    let text: string | undefined;
    if (kind === "text") {
      if (typeof value.text === "string") text = value.text;
      else errors.push({ path, message: "text 노드에는 text(문구) 필드가 필요합니다." });
    }

    let children: SpecNode[] = [];
    if (value.children !== undefined) {
      if (Array.isArray(value.children)) {
        children = value.children
          .map((c, i) => readNode(c, `${path}.children[${i}]`))
          .filter((c): c is SpecNode => c !== null);
      } else {
        errors.push({ path, message: "children은 배열이어야 합니다." });
      }
    }

    if (!id || !kind || !bounds) return null;
    return { id, kind, bounds, values: {}, children, ...(text !== undefined ? { text } : {}) };
  }

  const root = readNode(parsed, "(루트)");
  if (errors.length > 0 || !root) return { ok: false, errors };

  return { ok: true, root, warnings: findContainmentWarnings(root) };
}

/** 자식이 부모 박스를 벗어난 노드를 찾는다. 박스를 보정하면 그에 맞춰 달라지므로 현재 트리에서 매번 구한다. */
export function findContainmentWarnings(root: SpecNode): DraftIssue[] {
  const warnings: DraftIssue[] = [];
  (function check(parent: SpecNode) {
    for (const child of parent.children) {
      if (!contains(parent.bounds, child.bounds, TOLERANCE)) {
        warnings.push({
          path: child.id,
          message: `부모 ${parent.id}의 박스를 벗어났습니다. 박스를 보정해 주세요.`,
        });
      }
      check(child);
    }
  })(root);
  return warnings;
}
