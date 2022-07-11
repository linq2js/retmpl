import React, { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import { createTemplateBuilder } from "./main";

const builder = createTemplateBuilder({
  container: (props: PropsWithChildren<{}>) => (
    <div data-testid="container">{props.children}</div>
  ),
  node: <div data-testid="node" />,
});

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
