import { describe, expect, test } from "vitest";

import { imageFileFrom } from "./image-source";

function transfer(files: File[]): DataTransfer {
  return { files } as unknown as DataTransfer;
}

describe("붙여넣기와 끌어놓기에서 이미지 고르기", () => {
  test("이미지 파일이 있으면 그 파일을 돌려준다", () => {
    const png = new File(["x"], "image.png", { type: "image/png" });

    expect(imageFileFrom(transfer([png]))).toBe(png);
  });

  test("이미지가 아닌 파일은 무시한다", () => {
    const txt = new File(["x"], "a.txt", { type: "text/plain" });

    expect(imageFileFrom(transfer([txt]))).toBeUndefined();
  });

  test("텍스트만 붙여넣으면(파일이 없으면) 아무것도 고르지 않는다", () => {
    expect(imageFileFrom(transfer([]))).toBeUndefined();
    expect(imageFileFrom(null)).toBeUndefined();
  });
});
