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
  containerType?: any;
  wrapperType?: any;
  rowType?: any;
  colType?: any;
  wrapperProps?: ShapeProps;
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
          (
            | ComponentProps<T, P>
            | ((context: ItemContext) => ComponentProps<T, P>)
          ),
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

export type ItemContext = { index: number; first: boolean; last: boolean };

const convertLength = (value: any, fullValue?: any) => {
  if (!value) return value;
  if (typeof value === "string") {
    if (value === "full") {
      if (fullValue) return fullValue;
      return value;
    }
    if (value.includes("/")) {
      const parts = value.split("/").map((x) => x.trim());
      return (parseFloat(parts[0]) / parseFloat(parts[1])) * 100 + "%";
    }
  }
  return value;
};

const isComponent = (value: any) =>
  typeof value === "function" ||
  (value &&
    typeof value === "object" &&
    typeof value.type === "function" &&
    !value.props);

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
              ...new Array(itemCount).fill(null).map((_, index) =>
                itemProps({
                  index,
                  first: index === 0,
                  last: index === itemCount - 1,
                })
              )
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
): TemplateBuilder<
  { wrapper: FC<ShapeProps>; row: FC<ShapeProps>; col: FC<ShapeProps> } & T
> => {
  let normalizedDefinitions = normalizeDefinitions({
    wrapper: createShapeTemplate(
      { ...options?.wrapperProps },
      options?.wrapperType ?? options?.containerType
    ),
    row: createShapeTemplate(
      { ...options?.rowProps, row: true },
      options?.rowType ?? options?.containerType
    ),
    col: createShapeTemplate(
      { ...options?.colProps, col: true },
      options?.colType ?? options?.containerType
    ),
    ...definitions,
  }) as any;

  return (...args: any[]) => {
    if (typeof args[0] === "function") {
      const [render, deps = []] = args;
      return createElement(AsyncTemplate, {
        render(loaded: boolean, onLoad: VoidFunction) {
          let { wrapper, ...template } = render(loaded, onLoad);
          if (wrapper) {
            template = { wrapper: { ...wrapper, children: template } };
          }
          return createComponentsFromTemplate(
            Fragment,
            {},
            normalizedDefinitions,
            template
          );
        },
        deps,
      });
    }

    if (typeof args[0] === "string") {
      args[0] = { [args[0]]: args[1] };
    }

    const [inputTemplate] = args;
    let { wrapper, ...template } = inputTemplate;
    if (wrapper) {
      template = { wrapper: { ...wrapper, children: template } };
    }

    return createComponentsFromTemplate(
      Fragment,
      {},
      normalizedDefinitions,
      template
    );
  };
};

export type Length = string | number;

export type ShapeProps = {
  className?: string;
  /**
   * left
   */
  l?: Length;
  /**
   * top
   */
  t?: Length;
  /**
   * right
   */
  r?: Length;
  /**
   * bottom
   */
  b?: Length;
  /**
   * width
   */
  w?: Length;
  /**
   * padding
   */
  p?: Length;
  /**
   * paddingLeft and paddingRight
   */
  px?: Length;
  /**
   * paddingTop and paddingBottom
   */
  py?: Length;
  /**
   * paddingLeft
   */
  pl?: Length;
  /**
   * paddingTop
   */
  pt?: Length;
  /**
   * paddingRight
   */
  pr?: Length;
  /**
   * paddingBottom
   */
  pb?: Length;
  /**
   * margin
   */
  m?: Length;
  /**
   * marginLeft and marginRight
   */
  mx?: Length;
  /**
   * marginTop and marginBottom
   */
  my?: Length;
  /**
   * height
   */
  h?: Length;
  gap?: Length;
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
      const l = props.l ?? props.mx ?? props.m;
      const r = props.r ?? props.mx ?? props.m;
      const t = props.t ?? props.my ?? props.m;
      const b = props.b ?? props.my ?? props.m;
      const pl = props.pl ?? props.px ?? props.p;
      const pr = props.pr ?? props.px ?? props.p;
      const pt = props.pt ?? props.py ?? props.p;
      const pb = props.pb ?? props.py ?? props.p;

      const elementProps = {
        ...extraProps,
        children: props.children,
        style: {
          ...extraStyle,
          flex: props.flex,
          display: props.flex || props.row || props.col ? "flex" : undefined,
          width: convertLength(props.w),
          height: convertLength(props.h),
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
          left: convertLength(props.absolute ? l : undefined),
          marginLeft: convertLength(!props.absolute ? l : undefined),
          top: convertLength(props.absolute ? t : undefined),
          marginTop: convertLength(!props.absolute ? t : undefined),
          right: convertLength(props.absolute ? r : undefined),
          marginRight: convertLength(!props.absolute ? r : undefined),
          bottom: convertLength(props.absolute ? b : undefined),
          marginBottom: convertLength(!props.absolute ? b : undefined),
          paddingBottom: convertLength(pb),
          paddingTop: convertLength(pt),
          paddingLeft: convertLength(pl),
          paddingRight: convertLength(pr),
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
