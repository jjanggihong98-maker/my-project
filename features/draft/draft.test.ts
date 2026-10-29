import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import fixture from "@/docs/specs/ui-spec-builder-mvp/fixtures/notification-card.json";
import { flatten } from "@/features/spec-model";
import { DRAFT_PROMPT, buildFixPrompt, parseDraft } from "@/features/draft";

const fixtureText = JSON.stringify(fixture);

// 시험 입력을 일부러 깨뜨리기 위해 트리를 느슨한 형태로 다룬다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mutate(edit: (tree: any) => void): string {
  const copy = JSON.parse(fixtureText);
  edit(copy);
  return JSON.stringify(copy);
}

describe("영역 초안 붙여넣기", () => {
  test("권장 프롬프트로 받은 실제 응답을 오류 없이 읽고, 부모를 벗어난 설명 텍스트만 경고한다", () => {
    const result = parseDraft(fixtureText);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(flatten(result.root)).toHaveLength(24);
    expect(result.warnings.map((w) => w.path)).toEqual(["description_text"]);
    const description = flatten(result.root).find((n) => n.id === "description_text");
    expect(description?.text).toContain("\n");
    expect(description?.values).toEqual({});
  });

  test("코드 블록으로 감싼 응답도 같은 JSON으로 읽는다", () => {
    const result = parseDraft("```json\n" + fixtureText + "\n```");

    expect(result.ok).toBe(true);
  });

  test("JSON이 아닌 텍스트는 JSON 형식 오류로 막는다", () => {
    const result = parseDraft("죄송하지만 이미지를 볼 수 없습니다.");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].message).toContain("JSON");
  });

  test("bounds 값이 범위를 벗어난 노드는 어느 노드인지 밝혀 막는다", () => {
    const result = parseDraft(
      mutate((t) => {
        t.children[0].bounds[0] = 1.2;
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({
      path: "notification_card",
      message: expect.stringContaining("0～1"),
    });
  });

  test("0.01 이내의 오차는 오류로 보지 않는다", () => {
    const result = parseDraft(
      mutate((t) => {
        t.bounds = [0, 0, 1.005, 1];
      })
    );

    expect(result.ok).toBe(true);
  });

  test("알 수 없는 type은 허용되는 네 가지를 알려 주며 막는다", () => {
    const result = parseDraft(
      mutate((t) => {
        t.children[0].children[4].children[0].type = "button";
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const error = result.errors.find((e) => e.message.includes("button"));
    expect(error?.message).toContain("frame, text, shape, icon");
  });

  test("중복된 id는 막는다", () => {
    const result = parseDraft(
      mutate((t) => {
        t.children[0].children[0].id = "notification_card";
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.message.includes("중복"))).toBe(true);
  });

  test("루트가 둘 이상이면 막는다", () => {
    const result = parseDraft(`[${fixtureText}, ${fixtureText}]`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].message).toContain("루트");
  });

  test("텍스트 노드에 text가 없으면 막는다", () => {
    const result = parseDraft(
      mutate((t) => {
        delete t.children[0].children[0].children[1].text;
      })
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContainEqual({
      path: "app_name",
      message: expect.stringContaining("text"),
    });
  });
});

describe("수정 요청 문구", () => {
  test("틀린 항목을 하나씩 담고 지켜야 할 규칙을 덧붙인다", () => {
    const prompt = buildFixPrompt([
      { path: "title_text", message: "bounds 값 1.2가 0～1 범위를 벗어났습니다" },
    ]);

    expect(prompt).toContain("title_text");
    expect(prompt).toContain("bounds 값 1.2가 0～1 범위를 벗어났습니다");
    expect(prompt).toContain("frame, text, shape, icon");
  });
});

describe("프롬프트", () => {
  test("앱이 보여 주는 프롬프트는 스펙의 권장 문안과 같다", () => {
    const doc = readFileSync(
      "docs/specs/ui-spec-builder-mvp/draft-prompt.md",
      "utf8"
    ).replace(/\r\n/g, "\n");
    const recommended = doc.split("````text\n")[1].split("\n````")[0];

    expect(DRAFT_PROMPT).toBe(recommended);
  });
});
