export type NodeKind = "frame" | "text" | "shape" | "icon";

/** [x, y, w, h], 이미지 전체 크기에 대한 0～1 비율 */
export type Bounds = readonly [number, number, number, number];

export type Point = readonly [number, number];

export interface SpecNode {
  id: string;
  kind: NodeKind;
  bounds: Bounds;
  /** Text 노드의 문구 */
  text?: string;
  /** 필드 key별로 사용자가 입력한 토큰 이름 */
  values: Record<string, string>;
  children: SpecNode[];
}

/** selectedId: 선택된 노드, scopeId: 클릭으로 고를 수 있는 자식들의 부모 */
export interface Selection {
  selectedId: string;
  scopeId: string;
}
