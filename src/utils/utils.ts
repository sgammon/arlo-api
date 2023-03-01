export function stringsEqualInsensitive(one: string, two: string): boolean {
  return one.toLowerCase() === two.toLowerCase();
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
