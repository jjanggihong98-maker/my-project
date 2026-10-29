import { describe, expect, test } from "vitest";

import fixture from "@/docs/specs/ui-spec-builder-mvp/fixtures/notification-card.json";
import { parseDraft } from "@/features/draft";
import {
  buildSpecMarkdown,
  exportFileNames,
  nodeNumbers,
  planAnnotation,
} from "@/features/export";
import {
  FIELDS_BY_KIND,
  flatten,
  setNodeValue,
  type SpecNode,
} from "@/features/spec-model";

function filledFixture(): SpecNode {
  const parsed = parseDraft(JSON.stringify(fixture));
  if (!parsed.ok) throw new Error("fixture must parse");
  let root = parsed.root;
  for (const node of flatten(root)) {
    for (const field of FIELDS_BY_KIND[node.kind]) {
      root = setNodeValue(root, node.id, field.key, `${field.key}-${node.id}`);
    }
  }
  return root;
}

const project = { stack: "React + Tailwind" };
const imageFileName = "notification-card-annotated.png";

describe("스펙 .md", () => {
  test("같은 폴더의 주석 이미지를 상대 경로로 참조하고, 이미지가 참고용이라고 안내한다", () => {
    const md = buildSpecMarkdown({ root: filledFixture(), project, imageFileName });

    expect(md).toContain(`![주석 이미지](./${imageFileName})`);
    expect(md).toContain("이미지는 참고용");
    expect(md).toContain("이 문서의 텍스트 스펙");
  });

  test("계층 트리의 노드 번호가 주석 이미지의 번호와 같다", () => {
    const root = filledFixture();
    const md = buildSpecMarkdown({ root, project, imageFileName });
    const numbers = nodeNumbers(root);
    const plan = planAnnotation({ imageWidth: 361, imageHeight: 188, root });

    expect(md).toContain("- [1] screen (Frame)");
    expect(md).toContain("  - [2] notification_card (Frame)");
    for (const box of plan.boxes) {
      expect(numbers.get(box.id)).toBe(box.number);
    }
    expect(numbers.get("description_text")).toBe(
      flatten(root).findIndex((n) => n.id === "description_text") + 1
    );
  });

  test("입력한 토큰 이름과 프로젝트 정보가 노드별로 들어간다", () => {
    const root = setNodeValue(filledFixture(), "header_row", "layout", "space-2");
    const md = buildSpecMarkdown({ root, project, imageFileName });

    expect(md).toContain("`space-2`");
    expect(md).toContain("React + Tailwind");
  });

  test("입력하지 않은 필드와 프로젝트 정보는 .md에 만들지 않는다", () => {
    const parsed = parseDraft(JSON.stringify(fixture));
    if (!parsed.ok) throw new Error("fixture must parse");
    const root = setNodeValue(parsed.root, "header_row", "layout", "space-2");
    const md = buildSpecMarkdown({ root, project: {}, imageFileName });

    expect(md.match(/^- 레이아웃 layout:/gm)).toHaveLength(1);
    expect(md).not.toMatch(/^- 색상 colors:/m);
    expect(md).not.toMatch(/^- 타이포 typography:/m);
    expect(md).not.toContain("대상 스택");
    expect(md).toContain("임의로 정하지");
  });

  test("hex 색상 값이나 픽셀 값 없이 토큰 이름만 쓰고, 근사치인 크기 비율은 쓰지 않는다", () => {
    const md = buildSpecMarkdown({ root: filledFixture(), project, imageFileName });

    expect(md).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(md).not.toMatch(/\d\s*px\b/);
    expect(md).not.toContain("크기 비율");
    expect(md).not.toMatch(/폭 \d/);
  });

  test("문구의 {{...}} 자리 표시자를 동적 바인딩 목록으로 모은다", () => {
    const md = buildSpecMarkdown({ root: filledFixture(), project, imageFileName });
    const section = md.split("## 동적 바인딩")[1].split("\n## ")[0];

    expect(section).toContain("{{NN}}%");
    expect(section).toContain("progress_percent_text");
    expect(section).not.toContain("N/N");
  });

  test("구현 지시문은 토큰을 변수로 참조하고 값을 하드코딩하지 않게 한다", () => {
    const md = buildSpecMarkdown({ root: filledFixture(), project, imageFileName });
    const section = md.split("## 구현 지시문")[1];

    expect(section).toContain("CSS 변수");
    expect(section).toContain("하드코딩");
  });
});

describe("내보내기 파일 이름", () => {
  test("입력한 이름 하나로 .md와 이미지 이름을 같게 만들고, 공백은 '-'로 바꾼다", () => {
    expect(exportFileNames("my screen")).toEqual({
      base: "my-screen",
      markdown: "my-screen.md",
      image: "my-screen.png",
    });
  });

  test("이미 붙인 .md나 .png 확장자는 떼고 다시 붙인다", () => {
    expect(exportFileNames("card.md").base).toBe("card");
    expect(exportFileNames("card.PNG").base).toBe("card");
  });

  test("파일 이름에 쓸 수 없는 문자는 '-'로 바꾸고 앞의 점은 지운다", () => {
    expect(exportFileNames('a/b:c*?"<>|d').base).toBe("a-b-c------d");
    expect(exportFileNames(".hidden").base).toBe("hidden");
  });

  test("비어 있으면 기본 이름을 쓴다", () => {
    expect(exportFileNames("   ").base).toBe("screen");
    expect(exportFileNames("", "card").base).toBe("card");
  });
});

describe("주석 이미지 계획", () => {
  test("작은 이미지는 긴 변이 1500～2000이 되도록 키우고 비율은 유지한다", () => {
    const plan = planAnnotation({ imageWidth: 361, imageHeight: 188, root: filledFixture() });

    expect(Math.max(plan.width, plan.height)).toBeGreaterThanOrEqual(1500);
    expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(2000);
    expect(plan.width / plan.height).toBeCloseTo(361 / 188, 1);
  });

  test("큰 이미지는 긴 변이 2000 이하가 되도록 줄인다", () => {
    const plan = planAnnotation({ imageWidth: 1200, imageHeight: 4000, root: filledFixture() });

    expect(Math.max(plan.width, plan.height)).toBeLessThanOrEqual(2000);
    expect(Math.max(plan.width, plan.height)).toBeGreaterThanOrEqual(1500);
  });

  test("모든 노드가 번호가 붙은 박스로 그려지고 박스는 비율을 화면 크기로 환산한 값이다", () => {
    const root = filledFixture();
    const plan = planAnnotation({ imageWidth: 361, imageHeight: 188, root });
    const card = plan.boxes.find((b) => b.id === "notification_card")!;

    expect(plan.boxes).toHaveLength(24);
    expect(card.x).toBeCloseTo(0.0275 * plan.width);
    expect(card.height).toBeCloseTo(0.8919 * plan.height);
  });
});
