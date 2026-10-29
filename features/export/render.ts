import type { AnnotationPlan } from "./annotation";

const BOX_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

/** 원본 이미지 위에 노드 박스와 번호를 그려 PNG로 만든다. 브라우저에서만 동작한다. */
export function renderAnnotatedImage(
  image: CanvasImageSource,
  plan: AnnotationPlan
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("캔버스를 만들 수 없습니다."));

  ctx.drawImage(image, 0, 0, plan.width, plan.height);
  ctx.lineWidth = 3;
  ctx.font = "bold 22px sans-serif";
  ctx.textBaseline = "top";

  plan.boxes.forEach((box) => {
    const color = BOX_COLORS[box.number % BOX_COLORS.length];
    ctx.strokeStyle = color;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    const label = String(box.number);
    const labelWidth = ctx.measureText(label).width + 10;
    ctx.fillStyle = color;
    ctx.fillRect(box.x, box.y, labelWidth, 28);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, box.x + 5, box.y + 3);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG를 만들 수 없습니다."))),
      "image/png"
    );
  });
}

/** 브라우저의 일반 내려받기로 파일을 저장한다. 서버를 거치지 않는다. */
export function downloadFile(content: Blob | string, fileName: string): void {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: "text/markdown;charset=utf-8" })
      : content;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 브라우저가 내려받기를 시작할 시간을 준 뒤 해제한다.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
