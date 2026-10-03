// Shared by the two independent memo input boundaries; never repairs input.
export function exactObject(value, keys, required, fail, label) {
  if (value === null || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label} must be a plain object.`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) fail(`${label} contains an unsupported field.`);
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) fail(`${label}.${key} must be a data property.`);
  }
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`${label} is missing ${key}.`);
  return value;
}

export function denseArray(value, fail, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(`${label} must be a plain dense array.`);
  if (Reflect.ownKeys(value).length !== value.length + 1) fail(`${label} must have only dense array indices.`);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail(`${label} must have only data entries.`);
  }
  return value;
}
