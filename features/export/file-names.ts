export interface ExportFileNames {
  base: string;
  markdown: string;
  image: string;
}

/** 사용자가 정한 이름 하나로 .md와 이미지 파일 이름을 같게 만든다. */
export function exportFileNames(input: string, fallback = "screen"): ExportFileNames {
  const base =
    input
      .trim()
      .replace(/\.(md|png)$/i, "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      // 공백은 .md의 이미지 링크를 깨뜨릴 수 있어 '-'로 바꾼다.
      .replace(/\s+/g, "-")
      .replace(/^\.+/, "") || fallback;
  return { base, markdown: `${base}.md`, image: `${base}.png` };
}
