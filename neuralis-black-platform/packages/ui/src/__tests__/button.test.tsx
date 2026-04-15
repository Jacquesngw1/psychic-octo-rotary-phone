import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "../button";

describe("Button component", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("renders as a button element", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  describe("variant styles", () => {
    it("applies primary variant classes by default", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-blue-600");
      expect(button.className).toContain("text-white");
    });

    it("applies secondary variant classes", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-gray-200");
      expect(button.className).toContain("text-gray-900");
    });

    it("applies ghost variant classes", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("hover:bg-gray-100");
    });
  });

  describe("size styles", () => {
    it("applies medium size classes by default", () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("h-10");
      expect(button.className).toContain("px-4");
    });

    it("applies small size classes", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("h-8");
      expect(button.className).toContain("px-3");
    });

    it("applies large size classes", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("h-12");
      expect(button.className).toContain("px-6");
    });
  });

  describe("base styles", () => {
    it("applies base classes for layout and transitions", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("inline-flex");
      expect(button.className).toContain("rounded-md");
      expect(button.className).toContain("font-medium");
    });

    it("includes disabled styling classes", () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("disabled:pointer-events-none");
    });
  });

  describe("props forwarding", () => {
    it("passes additional HTML attributes to the button", () => {
      render(
        <Button data-testid="custom-btn" aria-label="Custom label">
          Props
        </Button>
      );
      const button = screen.getByTestId("custom-btn");
      expect(button).toHaveAttribute("aria-label", "Custom label");
    });

    it("supports disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("supports type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    it("appends custom className to existing classes", () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
      // Still has base classes
      expect(button.className).toContain("inline-flex");
    });
  });

  describe("variant and size combinations", () => {
    it("applies both secondary variant and small size", () => {
      render(
        <Button variant="secondary" size="sm">
          Combo
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-gray-200");
      expect(button.className).toContain("h-8");
    });

    it("applies both ghost variant and large size", () => {
      render(
        <Button variant="ghost" size="lg">
          Combo
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button.className).toContain("hover:bg-gray-100");
      expect(button.className).toContain("h-12");
    });
  });
});
