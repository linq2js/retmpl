import React, { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import { createTemplateBuilder } from "./main";

const builder = createTemplateBuilder(
  {
    container: (props: PropsWithChildren<{}>) => (
      <div data-testid="container">{props.children}</div>
    ),
    item: (props: { id: string }) => <div data-testid={props.id} />,
    node: <div data-testid="node" />,
  },
  {
    rowProps: { extraProps: { "data-testid": "row" } },
    colProps: { extraProps: { "data-testid": "col" } },
  }
);

test("simple template", () => {
  const { getAllByTestId } = render(<>{builder({ node: 2 })}</>);
  expect(getAllByTestId("node").length).toBe(2);
});

test("container template", () => {
  const { getByTestId, getAllByTestId } = render(
    <>
      {builder({
        container: {
          children: { node: 2 },
        },
      })}
    </>
  );
  getByTestId("container");
  expect(getAllByTestId("node").length).toBe(2);
});

test("extra template", () => {
  const { getAllByTestId } = render(
    builder({ item: [2, { id: "heading" }, { item: [2, { id: "item" }] }] })
  );
  const headings = getAllByTestId("heading");
  const items = getAllByTestId("item");
  expect(headings.length).toBe(2);
  expect(items.length).toBe(4);
  expect(items[0].previousSibling).toBe(headings[0]);
  expect(items[2].previousSibling).toBe(headings[1]);
});

test("pre-defined row template", () => {
  const { getByTestId } = render(
    builder({ row: { children: { item: { id: "item" } } } })
  );
  const container = getByTestId("row");
  const item = getByTestId("item");
  expect(item.parentNode).toBe(container);
});

test("pre-defined col template", () => {
  const { getByTestId } = render(
    builder({ col: { children: { item: { id: "item" } } } })
  );
  const container = getByTestId("col");
  const item = getByTestId("item");
  expect(item.parentNode).toBe(container);
});

test("wrapper", () => {
  const { getByTestId } = render(
    builder({
      wrapper: { extraProps: { "data-testid": "root" } },
      item: { id: "item" },
    })
  );

  const root = getByTestId("root");
  const item = getByTestId("item");
  expect(item.parentNode).toBe(root);
});
