export function stringsEqualInsensitive(one: string, two: string): boolean {
  return one.toLowerCase() === two.toLowerCase();
}

export function isEmptyOrSpaces(str: string) {
  return str === null || str.match(/^ *$/) !== null;
}

export function assertDefined(obj: unknown, prop: string): asserts obj {
  if (!obj) {
    throw new Error(`${prop} is not defined`);
  }
}

export function assert(value: unknown, error: string): asserts value {
  if (value === undefined || value === null || value === false) {
    throw new Error(error);
  }
}

// Pulled from https://gist.github.com/ca0v/73a31f57b397606c9813472f7493a940?permalink_comment_id=3062135#gistcomment-3062135
export const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: any;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor)
    })
}