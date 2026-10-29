# 화면 캔버스의 isInside가 containsPoint와 같은 일을 한다

**Symptom**: `features/workspace/components/screen-canvas.tsx`의 `isInside`가 `features/spec-model/tree.ts`의 `containsPoint`와 같은 판정을 따로 구현한다.

**Observed evidence**: 코드 리뷰(low)에서 두 함수가 같은 경계 포함 규칙(`>=`, `<=`)을 쓰는 것을 확인했다. 동작 차이는 아직 없다.

**Suspected cause**: `containsPoint`가 `spec-model`의 공개 API(`index.ts`)로 내보내져 있지 않아 캔버스가 직접 만들었다.

**What was tried**: 없음. 동작에 영향이 없어 고치지 않았다.

**Proposed next step**: `containsPoint`를 `spec-model/index.ts`에서 내보내고 `isInside`를 지운 뒤 캔버스가 그것을 쓰게 한다.
