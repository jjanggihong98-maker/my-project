import {
  addNode,
  deleteNode,
  findNode,
  moveNode,
  parentOf,
  resizeNode,
  setNodeText,
  setNodeValue,
  type Bounds,
  type NodeKind,
  type Selection,
  type SpecNode,
} from "@/features/spec-model";

export interface WorkspaceImage {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

export interface WorkspaceState {
  image?: WorkspaceImage;
  root?: SpecNode;
  selection?: Selection;
  /** 프로젝트 단위 입력(대상 스택) */
  project: Record<string, string>;
}

export type WorkspaceAction =
  | { type: "restore"; state: WorkspaceState }
  | { type: "imageLoaded"; image: WorkspaceImage }
  | { type: "draftAccepted"; root: SpecNode }
  | { type: "select"; selection: Selection }
  | { type: "setValue"; id: string; key: string; value: string }
  | { type: "setText"; id: string; text: string }
  | { type: "setProject"; key: string; value: string }
  | { type: "addBox"; kind: NodeKind; bounds: Bounds }
  | { type: "moveBox"; id: string; dx: number; dy: number }
  | { type: "resizeBox"; id: string; bounds: Bounds }
  | { type: "deleteSelected" };

export const initialWorkspace: WorkspaceState = { project: {} };

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "imageLoaded":
      // 새 스크린샷은 이전 작업을 대체한다.
      return { image: action.image, project: {} };
    case "draftAccepted":
      return {
        ...state,
        root: action.root,
        selection: { selectedId: action.root.id, scopeId: action.root.id },
      };
  }

  const root = state.root;
  if (!root) return state;

  switch (action.type) {
    case "select":
      return { ...state, selection: action.selection };
    case "setValue":
      return { ...state, root: setNodeValue(root, action.id, action.key, action.value) };
    case "setText":
      return { ...state, root: setNodeText(root, action.id, action.text) };
    case "setProject":
      return { ...state, project: { ...state.project, [action.key]: action.value } };
    case "addBox": {
      const added = addNode(root, action.kind, action.bounds);
      const parent = parentOf(added.root, added.id);
      return {
        ...state,
        root: added.root,
        selection: { selectedId: added.id, scopeId: parent?.id ?? added.root.id },
      };
    }
    case "moveBox":
      return { ...state, root: moveNode(root, action.id, action.dx, action.dy) };
    case "resizeBox":
      return { ...state, root: resizeNode(root, action.id, action.bounds) };
    case "deleteSelected": {
      const selectedId = state.selection?.selectedId;
      if (!selectedId || selectedId === root.id) return state;
      const parent = parentOf(root, selectedId);
      const nextRoot = deleteNode(root, selectedId);
      const parentId = parent?.id ?? nextRoot.id;
      return {
        ...state,
        root: nextRoot,
        selection: {
          selectedId: parentId,
          scopeId: parentOf(nextRoot, parentId)?.id ?? parentId,
        },
      };
    }
  }
}

/** 초안이 있으면 내보낼 수 있다. 입력하지 않은 필드는 스펙에 쓰지 않는다. */
export function canExport(state: WorkspaceState): boolean {
  return Boolean(state.root);
}

export function selectedNode(state: WorkspaceState): SpecNode | undefined {
  if (!state.root || !state.selection) return undefined;
  return findNode(state.root, state.selection.selectedId);
}
