import type { NodeKind, SpecNode } from "./types";

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
}

const LAYOUT: FieldDef = {
  key: "layout",
  label: "레이아웃 layout",
  placeholder: "방향, 정렬, 간격 토큰 이름 (예: row, center, space-2)",
};
const COLORS: FieldDef = { key: "colors", label: "색상 colors", placeholder: "color 토큰 이름" };
const BORDERS: FieldDef = { key: "borders", label: "테두리 borders", placeholder: "border, radius 토큰 이름" };
const SHADOWS: FieldDef = {
  key: "shadows",
  label: "그림자·블러 shadows and blurs",
  placeholder: "shadow, blur 토큰 이름",
};
const TYPOGRAPHY: FieldDef = {
  key: "typography",
  label: "타이포 typography",
  placeholder: "typography 토큰 이름",
};

/** 노드 종류별로 입력할 수 있는 필드. 모두 선택 입력이며, 비워 두면 스펙 .md에 쓰지 않는다. */
export const FIELDS_BY_KIND: Record<NodeKind, FieldDef[]> = {
  frame: [LAYOUT, COLORS, BORDERS, SHADOWS],
  text: [LAYOUT, COLORS, TYPOGRAPHY],
  shape: [COLORS, BORDERS, SHADOWS],
  icon: [
    { key: "asset", label: "에셋 이름 또는 경로", placeholder: "예: icon-chevron-up" },
    COLORS,
  ],
};

export const PROJECT_FIELDS: FieldDef[] = [
  { key: "stack", label: "대상 스택", placeholder: "예: React + Tailwind" },
];

export const KIND_LABELS: Record<NodeKind, string> = {
  frame: "Frame",
  text: "Text",
  shape: "Shape",
  icon: "Icon/Image",
};

export function isFilled(value: string | undefined): boolean {
  return (value ?? "").trim().length > 0;
}

/** 루트부터 깊이 우선(부모 → 자식, 위 → 아래) 순서로 모든 노드를 나열한다. */
export function flatten(root: SpecNode): SpecNode[] {
  return [root, ...root.children.flatMap(flatten)];
}

export interface Progress {
  filled: number;
  total: number;
}

export function progress(root: SpecNode): Progress {
  let filled = 0;
  let total = 0;
  for (const node of flatten(root)) {
    const { filled: f, total: t } = nodeProgress(node);
    filled += f;
    total += t;
  }
  return { filled, total };
}

export function nodeProgress(node: SpecNode): Progress {
  const fields = FIELDS_BY_KIND[node.kind];
  return {
    filled: fields.filter((f) => isFilled(node.values[f.key])).length,
    total: fields.length,
  };
}
