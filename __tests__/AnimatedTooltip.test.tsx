import { render, screen, fireEvent } from "@testing-library/react";
import { AnimatedTooltip } from "../components/ui/animated-tooltip";

describe("AnimatedTooltip", () => {
  const items = [
    { id: 1, name: "Alice", designation: "Dev", color: "#ff0000" },
    { id: 2, name: "Bob", designation: "Manager", color: "#00ff00" },
  ];

  it("renders avatars for all items", () => {
    render(<AnimatedTooltip items={items} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows tooltip on hover", () => {
    render(<AnimatedTooltip items={items} />);

    const aliceAvatar = screen.getByText("A");
    fireEvent.mouseEnter(aliceAvatar);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
  });
});
