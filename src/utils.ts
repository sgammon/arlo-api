export function stringsEqualInsensitive(one: string, two: string) {
  return one.toLowerCase() === two.toLowerCase();
}

export function assertDefined(obj: any, prop: string) {
  if (!obj) {
    throw new Error(`${prop} is not defined`);
  }
}
