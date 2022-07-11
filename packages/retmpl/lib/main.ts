import {
  createElement,
  FC,
  Fragment,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

export type ComponentProps<T, P> = Omit<P, "children"> & {
  children?: Template<T>;
};

export type ValueOf<T, N extends keyof T> = T[N] extends FC<infer P>
  ?
      | ComponentProps<T, P>
      | [
          number,
          ComponentProps<T, P> | ((index: number) => ComponentProps<T, P>)
        ]
      | ComponentProps<T, P>[]
  : number;

export type Template<T> = {
  [key in keyof T]?: ValueOf<T, key>;
};

export type TemplateBuilder<T> = {
  <N extends keyof T>(name: N, value: ValueOf<T, N>): ReactElement;
  (
    render: (loaded: boolean, onLoad: VoidFunction) => Template<T>,
    deps?: any[]
  ): ReactElement;
  (template: Template<T>): ReactElement;
};

const createComponentsFromTemplate = (
  wrapper: any,
  props: any,
  definitions: any,
  template: any
) => {
  const children: any[] = [];
  Object.entries(template).forEach(([key, value]) => {
    const definition = definitions[key];
    const itemWrapper = definitions[key + "Wrapper"];

    // custom component
    if (typeof definition === "function") {
      // number of components
      if (typeof value === "number") {
        const node = createElement(definition);
        const childNodes = new Array(value).fill(node);
        if (itemWrapper) {
          children.push(createElement(itemWrapper, {}, ...childNodes));
        } else {
          children.push(...childNodes);
        }
      }
      // component props
      else if (value) {
        const multipleProps = Array.isArray(value);
        const propsList: any[] = [];

        if (multipleProps && typeof value[0] === "number") {
          const itemCount = value[0];
          if (typeof value[1] === "function") {
            const propFactory = value[1];
            propsList.push(
              ...new Array(itemCount)
                .fill(null)
                .map((_, index) => propFactory(index))
            );
          } else {
            propsList.push(...new Array(itemCount).fill(value[1]));
          }
        } else if (multipleProps) {
          propsList.push(...value);
        } else {
          propsList.push(value);
        }

        const childNodes = propsList.map((props) => {
          const { children: childTemplate, ...childProps } = props as any;
          if (childTemplate) {
            return createComponentsFromTemplate(
              definition,
              childProps,
              definitions,
              childTemplate
            );
          }

          return createElement(definition, childProps);
        });
        if (multipleProps && itemWrapper) {
          children.push(createElement(itemWrapper, {}, ...childNodes));
        } else {
          children.push(...childNodes);
        }
      }
    } else if (value && typeof value === "number") {
      if (itemWrapper) {
        children.push(
          createElement(itemWrapper, {}, ...new Array(value).fill(definition))
        );
      } else {
        children.push(...new Array(value).fill(definition));
      }
    }
  });
  return createElement(wrapper, props, ...children);
};

const AsyncTemplate = (props: { deps: any[]; render: Function }) => {
  const data = (useMemo as any)(() => ({ loaded: false }), props.deps);
  const rerender = useState<any>()[1];
  const onLoad = useCallback(() => {
    if (data.loaded) return;
    data.loaded = true;
    rerender({});
  }, [data, rerender]);
  return props.render(data.loaded, onLoad);
};

/**
 * create a template builder from specified template definitions. A template definitions is following below structure:
 * ```js
 * const templateDefinition = {
 *  line: <div style={{ height: 10, backgroundColor: 'silver' }}/>, // react node
 *  circle: (props) => <div style={{ height: props.radius, width: props.radius, borderRadius: 100 }}/> // a functional component
 * }
 * ```
 * @param definitions
 * @returns
 */
export const createTemplateBuilder = <T>(
  definitions: T
): TemplateBuilder<T> => {
  const rootWrapper = (definitions as any).wrapper ?? Fragment;
  return (...args: any[]) => {
    if (typeof args[0] === "function") {
      const [render, deps = []] = args;
      return createElement(AsyncTemplate, {
        render(loaded: boolean, onLoad: VoidFunction) {
          return createComponentsFromTemplate(
            rootWrapper,
            {},
            definitions,
            render(loaded, onLoad)
          );
        },
        deps,
      });
    }

    if (typeof args[0] === "string") {
      args[0] = { [args[0]]: args[1] };
    }

    const [template] = args;

    return createComponentsFromTemplate(rootWrapper, {}, definitions, template);
  };
};

export type ShapeProps = {
  className?: string;
  /**
   * left
   */
  l?: number | string;
  /**
   * top
   */
  t?: number | string;
  /**
   * right
   */
  r?: number | string;
  /**
   * bottom
   */
  b?: number | string;
  /**
   * width
   */
  w?: number | string;
  /**
   * height
   */
  h?: number | string;
  gap?: number | string;
  /**
   * backgroundColor
   */
  color?: string;
  absolute?: boolean;
  /**
   * row = true, reverse = true => flexDirection: row-reverse
   * col = true, reverse = true => flexDirection: col-reverse
   */
  reverse?: boolean;
  /**
   * borderRadius. rouned = true => full border radius (9999px)
   */
  rounded?: boolean | number | string;
  /**
   * flexDirection: row
   */
  row?: boolean;
  /**
   * flexDirection: column
   */
  col?: boolean;
  flex?: string | number;
  /**
   * justifyContent
   */
  justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
  justifyItems?: "start" | "end" | "center" | "stretch";
  justifySelf?: "start" | "end" | "center" | "stretch";
  /**
   * alignItems
   */
  items?: "start" | "end" | "center" | "baseline" | "stretch";
  /**
   * alignContent
   */
  content?: "start" | "end" | "center" | "between" | "around" | "evenly";
  /**
   * alignSelf
   */
  self?: "start" | "end" | "center" | "between" | "around" | "evenly";
};

export const createShapeTemplate = (
  defaultProps?: Partial<ShapeProps>,
  type: any = "div"
) => {
  return Object.assign(
    (props: PropsWithChildren<ShapeProps>) => {
      const elementProps = {
        children: props.children,
        style: {
          flex: props.flex,
          display: props.flex || props.row || props.col ? "flex" : undefined,
          width: props.w,
          height: props.h,
          flexDirection: props.row
            ? props.reverse
              ? "row-reverse"
              : "row"
            : props.col
            ? props.reverse
              ? "column-reverse"
              : "column"
            : undefined,
          gap: props.gap,
          backgroundColor: props.color,
          position: props.absolute ? "absolute" : "relative",
          left: props.absolute ? props.l : undefined,
          marginLeft: !props.absolute ? props.l : undefined,
          top: props.absolute ? props.t : undefined,
          marginTop: !props.absolute ? props.t : undefined,
          right: props.absolute ? props.r : undefined,
          marginRight: !props.absolute ? props.r : undefined,
          bottom: props.absolute ? props.b : undefined,
          marginBottom: !props.absolute ? props.b : undefined,
          justifyContent: props.justify,
          justifyItems: props.justifyItems,
          justifySelf: props.justifySelf,
          alignContent: props.content,
          alignSelf: props.self,
          alignItems: props.items,
          borderRadius:
            typeof props.rounded === "boolean"
              ? props.rounded
                ? 9999
                : undefined
              : props.rounded,
        },
      };
      if (props.className) {
        Object.assign(elementProps, { className: props.className });
      }
      return createElement(type, elementProps);
    },
    { defaultProps }
  );
};
