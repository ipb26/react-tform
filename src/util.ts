import { either, equals, isEmpty, isNil, mapObjIndexed, reject } from "ramda"

/**
 * Deep compare two objects.
 * @param a Object 1.
 * @param b Object 2.
 * @returns Whether the objects are equal.
 */
export function defaultCompare(a: unknown, b: unknown) {
    return equals(cleanEmpty(a), cleanEmpty(b))
}

/**
 * Recursively remove all empty (null, undefined, [], "", 0) values from a value.
 * @param value Value
 * @returns A cleaned value.
 */
export function cleanEmpty(value: unknown): unknown {
    const cleaned = typeof value === "object" && value !== null ? reject(either(isEmpty, isNil), mapObjIndexed(cleanEmpty, value)) : value
    if (!isEmpty(cleaned)) {
        return cleaned
    }
}
