import { render, screen } from "@testing-library/react";
import Cursor from "../components/Cursor";

describe("Cursor", () => {
  it("renders with correct color and name", () => {
    render(<Cursor x={100} y={200} color="#ff0000" name="Test User" />);

    const nameElement = screen.getByText("Test User");
    expect(nameElement).toBeInTheDocument();
    expect(nameElement).toHaveStyle({ backgroundColor: "#ff0000" });
  });

  it("positions correctly", () => {
    const { container } = render(
      <Cursor x={100} y={200} color="#ff0000" name="Test User" />
    );
    // Note: Tailwind classes handle some styling, but inline styles handle position.
    // We check if the container div has the transform style
    const cursorDiv = container.firstChild as HTMLDivElement;
    expect(cursorDiv).toHaveStyle({
      transform: "translateX(100px) translateY(200px)",
    });
  });
});
