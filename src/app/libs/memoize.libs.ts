import memoize from 'lodash-es/memoize';

export function Memoize() {
  return function (
    target: any,
    functionName: string,
    descriptor: PropertyDescriptor,
  ) {
    if (descriptor.get) {
      descriptor.get = memoize(descriptor.get, function <T>(this: T): T {
        return this;
      });
    } else {
      descriptor.value = memoize(descriptor.value);
    }
  };
}
