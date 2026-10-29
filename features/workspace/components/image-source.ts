/** 붙여넣기나 끌어놓기로 들어온 데이터에서 이미지 파일 하나를 고른다. */
export function imageFileFrom(data: DataTransfer | null): File | undefined {
  return Array.from(data?.files ?? []).find((f) => f.type.startsWith("image/"));
}
