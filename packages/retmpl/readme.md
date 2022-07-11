- [`React Template (retmpl)`](#react-template-retmpl)
  - [Installation](#installation)
  - [Features](#features)
  - [Live demo](#live-demo)
  - [Usages](#usages)
    - [Simple article loading indicator](#simple-article-loading-indicator)
    - [Using shape builder](#using-shape-builder)
  - [API Reference](#api-reference)

# `React Template (retmpl)`

A React library for creating components from specific template easily

## Installation

**with NPM**

```bash
npm i retmpl --save
```

**with YARN**

```bash
yarn add retmpl
```

## Features

1. Highly customizable (Web/Native)
2. Support react-content-loader templates
3. Lightweight: ~1.5KB
4. Support responsive UI
5. Fully Typescript supported

## Live demo

https://codesandbox.io/s/retmpl-demo-xpyr2h

## Usages

### Simple article loading indicator

[createTemplateBuilder](https://linq2js.github.io/retmpl/modules.html#createTemplateBuilder) function retrieves template definition and return a template builder

```js
import { createTemplateBuilder } from "retmpl";

const template = createTemplateBuilder({
  // define line template
  line: (
    <div
      style={{
        height: 10,
        marginBottom: 5,
        backgroundColor: "silver",
        borderRadius: 10,
      }}
    />
  ),
});

// show 5 lines
const ArticleLoading = () => template({ line: 5 });

function App() {
  return (
    <div className="App">
      <ArticleLoading />
    </div>
  );
}
```

### Using shape builder

Retmpl provides shape builder for creating template faster.
[createShapeTemplate](https://linq2js.github.io/retmpl/modules.html#createShapeTemplate) function retrieves [defaultShapeProps](https://linq2js.github.io/retmpl/modules.html#ShapeProps) (optional) of the shape and shape type (optional, div by default).
You can use React Native's View component instead of div

```js
const template = createTemplateBuilder({
  // a simple shape which can contain other shape
  box: createShapeTemplate(),
  // a circle shape
  circle: createShapeTemplate({
    rounded: true,
    w: 80,
    h: 80,
    color: "silver",
  }),
  // a reactangle shape
  rect: createShapeTemplate({
    rounded: 8,
    color: "silver",
  }),
  // a line
  line: createShapeTemplate({
    rounded: true,
    color: "silver",
  }),
});

const ArticleLoading = () =>
  template({
    // create a box contains circle and lines
    box: {
      // flex direction row
      row: true,
      gap: 20,
      // align items
      items: "center",
      children: {
        // create a circle
        circle: {},
        // create a box which contains lines
        box: {
          // flex direction column
          col: true,
          // flex shrink, row = 1
          flex: 1,
          gap: 12,
          children: {
            line: [
              // number of lines
              3,
              // a line props callback, this func will be called when creating a line
              () => ({
                h: 12,
                // random right position
                r: Math.random() * 20 + "%",
              }),
            ],
          },
        },
      },
    },
  });
```

## API Reference

https://linq2js.github.io/retmpl/
