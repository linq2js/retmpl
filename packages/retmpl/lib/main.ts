import {
  createElement,
  FC,
  Fragment,
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
      | [number, ComponentProps<T, P> | (() => ComponentProps<T, P>)]
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
            propsList.push(...new Array(itemCount).fill(null).map(propFactory));
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
 * createTemplateBuilder({
 *  line: <div style={{ height: 10, backgroundColor: 'silver' }}/>,
 *  circle: <div style={{ height: 100, width: 100, borderRadius: 100 }}/>
 * })
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
