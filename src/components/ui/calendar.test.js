import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { Calendar } from "./calendar";
import { DatePicker, DateRangePicker } from "./date-picker";

describe("Calendar Component", () => {
  it("renders correctly with Uzbek locale and month grid", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(Calendar, {
        mode: "single",
        selected: new Date(2026, 8, 25),
        month: new Date(2026, 8, 1),
      })
    );

    // Month caption in Uzbek: Sentabr 2026
    expect(html).toContain("Sentabr 2026");
    // Weekday abbreviations in Uzbek (Du, Se, Cho, Pa, Ju, Sha, Ya)
    expect(html).toContain("Du");
    expect(html).toContain("Ju");
    // Selected day button 25
    expect(html).toContain("25");
    // Contains modern styling classes
    expect(html).toContain("w-full");
  });

  it("renders with footer and quick actions when enabled", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(Calendar, {
        mode: "single",
        selected: new Date(2026, 8, 25),
        showFooter: true,
        showQuickActions: true,
      })
    );

    expect(html).toContain("Bugun");
    expect(html).toContain("25-Sentabr, 2026");
  });
});

describe("DatePicker Component", () => {
  it("renders trigger button with formatted date", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(DatePicker, {
        value: "2026-09-25",
        testId: "sample-picker",
      })
    );

    expect(html).toContain("25-Sentabr, 2026");
    expect(html).toContain("data-testid=\"sample-picker\"");
  });

  it("renders placeholder when value is empty", () => {
    const html = ReactDOMServer.renderToString(
      React.createElement(DatePicker, {
        value: "",
        placeholder: "Sanani tanlang...",
      })
    );

    expect(html).toContain("Sanani tanlang...");
  });
});
