import { either, equals, isEmpty, isNil, mapObjIndexed, reject } from "ramda"
import { DependencyList, EffectCallback, useEffect, useRef } from "react"
import { FormComparer } from "./options"

/**
 * Deep compare two values.
 * @param value1 Value 1.
 * @param value2 Value 2.
 * @returns Whether the values are equal.
 */
export function defaultCompare(value1: unknown, value2: unknown) {
    return equals(cleanEmpty(value1), cleanEmpty(value2))
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

export function useIsFirstMount() {
    const isFirst = useRef(true)
    if (isFirst.current) {
        isFirst.current = false
        return true
    }
    return isFirst.current
}

export function useCustomCompareEffect<TDeps extends DependencyList>(effect: EffectCallback, deps: TDeps, depsEqual: (prevDeps: TDeps, nextDeps: TDeps) => boolean = (a, b) => equals(a, b)) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !depsEqual(deps, ref.current)) {
        ref.current = deps
    }
    return useEffect(effect, ref.current)
}

/**
 * Compare two values using a specific comparison type.
 * @param value1 Value 1.
 * @param value2 Value 2.
 * @param comparer The comparison type.
 * @returns Whether or not the values are equal.
 */
export function compare<T>(value1: T, value2: T, comparer?: FormComparer<T>) {
    if (comparer === undefined || comparer === "deep") {
        return equals(value1, value2)
    }
    else if (comparer === "shallow") {
        return value1 === value2
    }
    else {
        return comparer(value1, value2)
    }
}

/**
 * Return a value, or a default if the value is a boolean true.
 * @param value The value.
 * @param defaultValue A default value. 
 * @returns The value, or a default if the value is a boolean true.
 */
export function booleanOr<T>(value: boolean | T | undefined, defaultValue: T) {
    return value === true ? defaultValue : (typeof value !== "boolean" ? value : undefined)
}
