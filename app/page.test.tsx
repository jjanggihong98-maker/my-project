import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("첫 화면은 제목과 스크린샷 올리기 입력을 보여 준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "UI Spec Builder" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("스크린샷 파일 선택")).toBeInTheDocument();
});
