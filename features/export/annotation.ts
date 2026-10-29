import { flatten, type SpecNode } from "@/features/spec-model";

/** 주석 이미지의 긴 변 목표 길이(1500～2000 안) */
const LONG_SIDE = 1800;

export interface AnnotationBox {
  /** 이미지에 그리는 번호. 스펙 .md 계층 트리의 번호와 같다. */
  number: number;
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationPlan {
  width: number;
  height: number;
  boxes: AnnotationBox[];
}

/** 깊이 우선 순서로 1부터 매긴 노드 번호 */
export function nodeNumbers(root: SpecNode): Map<string, number> {
  return new Map(flatten(root).map((node, index) => [node.id, index + 1]));
}

export function planAnnotation(input: {
  imageWidth: number;
  imageHeight: number;
  root: SpecNode;
}): AnnotationPlan {
  const scale = LONG_SIDE / Math.max(input.imageWidth, input.imageHeight);
  const width = Math.round(input.imageWidth * scale);
  const height = Math.round(input.imageHeight * scale);
  const numbers = nodeNumbers(input.root);

  const boxes = flatten(input.root).map((node) => ({
    number: numbers.get(node.id)!,
    id: node.id,
    x: node.bounds[0] * width,
    y: node.bounds[1] * height,
    width: node.bounds[2] * width,
    height: node.bounds[3] * height,
  }));
  return { width, height, boxes };
}
