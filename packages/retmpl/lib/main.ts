import {
  createElement,
  FC,
  Fragment,
  memo,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";

export type Options = {
  rowType?: any;
  colType?: any;
  rowProps?: ShapeProps;
  colProps?: ShapeProps;
};

export type ComponentProps<T, P> = Omit<P, "children"> & {
  children?: Template<T>;
  $next?: Template<T>;
};

export type ValueOf<T, N extends keyof T> = T[N] extends FC<infer P>
  ?
      | ComponentProps<T, P>
      | [
          number,
          ComponentProps<T, P> | ((index: number) => ComponentProps<T, P>),
          ...Template<T>[]
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

const isComponent = (value: any) =>
  typeof value === "function" ||
  (value &&
    typeof value === "object" &&
    value.$$typeof &&
    typeof value.type === "function");

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
    if (isComponent(definition)) {
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
        const moreTemplates: any[] = [];

        if (multipleProps && typeof value[0] === "number") {
          const [itemCount, itemProps] = value;
          if (value.length > 2) {
            moreTemplates.push(...value.slice(2));
          }

          if (typeof itemProps === "function") {
            propsList.push(
              ...new Array(itemCount)
                .fill(null)
                .map((_, index) => itemProps(index))
            );
          } else {
            propsList.push(...new Array(itemCount).fill(itemProps));
          }
        } else if (multipleProps) {
          propsList.push(...value);
        } else {
          propsList.push(value);
        }

        const items: any[] = [];

        propsList.forEach((props) => {
          const { children: childTemplate, ...childProps } = props as any;
          if (childTemplate) {
            items.push(
              createComponentsFromTemplate(
                definition,
                childProps,
                definitions,
                childTemplate
              )
            );
          } else {
            items.push(createElement(definition, childProps));
          }
          moreTemplates.forEach((moreTemplate) => {
            items.push(
              createComponentsFromTemplate(
                Fragment,
                {},
                definitions,
                moreTemplate
              )
            );
          });
        });

        if (multipleProps && itemWrapper) {
          children.push(createElement(itemWrapper, {}, ...items));
        } else {
          children.push(...items);
        }
      }
    }
    // react node
    else {
      if (value && typeof value === "number") {
        if (itemWrapper) {
          children.push(
            createElement(itemWrapper, {}, ...new Array(value).fill(definition))
          );
        } else {
          children.push(...new Array(value).fill(definition));
        }
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

const normalizeDefinitions = <T>(definitions: T) => {
  const normalizedDefinitions: Record<string, any> = {};
  Object.keys(definitions).forEach((key) => {
    const value = (definitions as any)[key];
    if (typeof value === "function") {
      normalizedDefinitions[key] = memo(value);
    } else {
      normalizedDefinitions[key] = value;
    }
  });
  return normalizedDefinitions as T;
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
  definitions: T,
  options?: Options
): TemplateBuilder<{ row: FC<ShapeProps>; col: FC<ShapeProps> } & T> => {
  const normalizedDefinitions = normalizeDefinitions({
    row: createShapeTemplate(
      { ...options?.rowProps, row: true },
      options?.rowType
    ),
    col: createShapeTemplate(
      { ...options?.colProps, col: true },
      options?.colType
    ),
    ...definitions,
  });
  const rootWrapper = (normalizedDefinitions as any).wrapper ?? Fragment;

  return (...args: any[]) => {
    if (typeof args[0] === "function") {
      const [render, deps = []] = args;
      return createElement(AsyncTemplate, {
        render(loaded: boolean, onLoad: VoidFunction) {
          return createComponentsFromTemplate(
            rootWrapper,
            {},
            normalizedDefinitions,
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

    return createComponentsFromTemplate(
      rootWrapper,
      {},
      normalizedDefinitions,
      template
    );
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
  /**
   * flexWrap
   */
  wrap?: boolean | "nowrap" | "wrap" | "wrap-reverse";
  aspectRatio?: number | string;
  extraProps?:
    | Record<string, any>
    | ((props: ShapeProps) => Record<string, any>);
};

export const createShapeTemplate = (
  defaultProps?: Partial<ShapeProps>,
  type: any = "div"
) => {
  return Object.assign(
    (props: PropsWithChildren<ShapeProps>) => {
      const extraProps =
        typeof props.extraProps === "function"
          ? props.extraProps(props)
          : props.extraProps;
      const extraStyle = extraProps?.style;
      const elementProps = {
        ...extraProps,
        children: props.children,
        style: {
          ...extraStyle,
          flex: props.flex,
          display: props.flex || props.row || props.col ? "flex" : undefined,
          width: props.w,
          height: props.h,
          aspectRatio: props.aspectRatio,
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
          flexWrap:
            typeof props.wrap === "boolean"
              ? props.wrap
                ? "wrap"
                : "nowrap"
              : props.wrap,
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
