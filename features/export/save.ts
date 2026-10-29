export interface ExportFile {
  name: string;
  content: Blob | string;
}

// 파일 시스템 접근 API(Chromium 계열)의 필요한 부분만 적는다.
interface WritableHandle {
  write(data: Blob | string): Promise<void>;
  close(): Promise<void>;
}
export interface FolderHandle {
  getFileHandle(
    name: string,
    options: { create: boolean }
  ): Promise<{ createWritable(): Promise<WritableHandle> }>;
}
type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<FolderHandle>;
};

/** 저장 위치를 고르는 창을 쓸 수 있는 브라우저인지 */
export function canPickSaveFolder(): boolean {
  return typeof (window as PickerWindow).showDirectoryPicker === "function";
}

/**
 * 폴더 선택 창을 연다. 클릭 직후(사용자 동작이 유효한 동안)에 불러야 하므로 파일을 만들기 전에 먼저 호출한다.
 * 선택을 취소하거나 쓰기 권한을 거부하면 브라우저가 같은 AbortError를 주므로 둘 다 null로 돌려준다.
 */
export async function pickSaveFolder(): Promise<FolderHandle | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("이 브라우저는 저장 위치 선택을 지원하지 않습니다.");
  try {
    return await picker.call(window, { mode: "readwrite" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/** 고른 폴더에 파일들을 저장한다. 같은 이름이 있으면 덮어쓴다. */
export async function writeToFolder(folder: FolderHandle, files: ExportFile[]): Promise<void> {
  for (const file of files) {
    const handle = await folder.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file.content);
    await writable.close();
  }
}
