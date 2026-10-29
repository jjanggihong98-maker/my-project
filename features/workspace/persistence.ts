import type { WorkspaceState } from "./reducer";

const DB_NAME = "ui-spec-builder";
const STORE = "workspace";
const KEY = "current";

// 이미지(data URL)가 localStorage 한도를 넘을 수 있어 IndexedDB를 쓴다. 서버로는 보내지 않는다.
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadWorkspace(): Promise<WorkspaceState | null> {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as WorkspaceState) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 유지 없이 계속 동작한다.
  }
}
