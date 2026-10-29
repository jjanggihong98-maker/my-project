import {
  FIELDS_BY_KIND,
  KIND_LABELS,
  PROJECT_FIELDS,
  flatten,
  isFilled,
  parentOf,
  type SpecNode,
} from "@/features/spec-model";

import { nodeNumbers } from "./annotation";

const PLACEHOLDER = /\{\{[^}]+\}\}/;

function treeLines(
  node: SpecNode,
  numbers: Map<string, number>,
  depth: number
): string[] {
  const indent = "  ".repeat(depth);
  const line = `${indent}- [${numbers.get(node.id)}] ${node.id} (${KIND_LABELS[node.kind]})`;
  return [line, ...node.children.flatMap((c) => treeLines(c, numbers, depth + 1))];
}

function nodeSection(
  root: SpecNode,
  node: SpecNode,
  numbers: Map<string, number>
): string {
  const parent = parentOf(root, node.id);
  const lines = [`### [${numbers.get(node.id)}] ${node.id} (${KIND_LABELS[node.kind]})`];

  if (parent) {
    const order = parent.children.findIndex((c) => c.id === node.id) + 1;
    lines.push(`- 부모: [${numbers.get(parent.id)}] ${parent.id}`);
    lines.push(`- 순서: 부모의 ${parent.children.length}개 자식 중 ${order}번째`);
  } else {
    lines.push("- 화면 전체(루트)");
  }
  if (node.kind === "text") {
    lines.push(`- 문구: ${JSON.stringify(node.text ?? "")}`);
  }
  const entered = FIELDS_BY_KIND[node.kind].filter((f) => isFilled(node.values[f.key]));
  for (const field of entered) {
    lines.push(`- ${field.label}: \`${node.values[field.key].trim()}\``);
  }
  if (entered.length === 0) lines.push("- 입력된 토큰 없음");
  return lines.join("\n");
}

export function buildSpecMarkdown(input: {
  root: SpecNode;
  project: Record<string, string>;
  imageFileName: string;
}): string {
  const { root, project, imageFileName } = input;
  const nodes = flatten(root);
  const numbers = nodeNumbers(root);

  const overview = PROJECT_FIELDS.filter((f) => isFilled(project[f.key]))
    .map((f) => `- ${f.label}: ${project[f.key].trim()}`)
    .concat(`- 노드 수: ${nodes.length}`)
    .join("\n");

  const bindings = nodes
    .filter((n) => n.kind === "text" && PLACEHOLDER.test(n.text ?? ""))
    .map(
      (n) =>
        `- \`${(n.text ?? "").replace(/\n/g, " / ")}\` — ${n.id} ([${numbers.get(n.id)}])`
    );

  return `# UI 스펙

## 개요

${overview}

## 주석 이미지

![주석 이미지](./${imageFileName})

이미지는 참고용입니다. 값의 기준은 이 문서의 텍스트 스펙입니다. 이미지가 보이지 않아도 이 문서만으로 구현할 수 있어야 합니다. 이미지를 읽을 수 있다면 채팅에 함께 첨부하고, 이미지의 번호는 아래 계층 트리의 번호와 같습니다.

## 계층 트리

${treeLines(root, numbers, 0).join("\n")}

## 노드별 스펙

값은 모두 디자인 토큰 이름입니다. 적혀 있지 않은 항목은 지정되지 않은 것이니 그 값을 추정해서 채우지 마세요.

${nodes.map((n) => nodeSection(root, n, numbers)).join("\n\n")}

## 동적 바인딩

${bindings.length > 0 ? bindings.join("\n") : "없음"}

## 구현 지시문

- 색, 글꼴, 간격, radius는 위에 적힌 토큰 이름을 CSS 변수나 테마로 참조해 구현합니다.
- 이 문서에 적히지 않은 값은 임의로 정하지 말고, 부모 요소나 디자인 시스템의 기본을 따르거나 질문해 주세요.
- 토큰의 실제 값을 임의로 정하거나 하드코딩하지 않습니다. 토큰 이름을 프로젝트의 디자인 시스템에서 찾을 수 없으면 값을 만들지 말고 알려 주세요.
- 레이아웃(방향, 정렬, 간격)은 Frame에서, 문구와 글꼴 스타일은 Text에서 구현합니다.
- 크기와 위치는 첨부한 이미지를 참고하되, 부모의 레이아웃 안에서 자연스럽게 배치하고 고정 좌표를 쓰지 않습니다.
- 동적 바인딩 목록의 \`{{...}}\` 자리 표시자는 실제 데이터가 들어오는 자리로 구현합니다.
`;
}
