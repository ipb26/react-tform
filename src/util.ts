import { equals } from "ramda"
import { DependencyList, EffectCallback, useEffect, useMemo, useRef } from "react"

export function useIsFirstMount() {
    const isFirst = useRef(true)
    if (isFirst.current) {
        isFirst.current = false
        return true
    }
    return isFirst.current
}

export function useFormCompareMemo<T, TDeps extends DependencyList>(factory: () => T, deps: TDeps) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !formCompare(deps, ref.current)) {
        ref.current = deps
    }
    return useMemo(factory, ref.current)
}

export function useFormCompareConstant<T>(value: T) {
    return useFormCompareMemo(() => value, [value])
}

export function useFormCompareEffect<TDeps extends DependencyList>(effect: EffectCallback, deps: TDeps) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !formCompare(deps, ref.current)) {
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
export function formCompare(value1: unknown, value2: unknown) {
    return equals(value1, value2)
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

/**
 * Deep compare two values.
 * @param value1 Value 1.
 * @param value2 Value 2.
 * @returns Whether the values are equal.

export function defaultCompare(value1: unknown, value2: unknown) {
    return equals(cleanEmpty(value1), cleanEmpty(value2))
}

 * Recursively remove all empty (null, undefined, [], "", 0) values from a value.
 * @param value Value
 * @returns A cleaned value.
 
exportfunction cleanEmpty(value: unknown): unknown {
    const cleaned = typeof value === "object" && value !== null ? reject(either(isEmpty, isNil), mapObjIndexed(cleanEmpty, value)) : value
    if (!isEmpty(cleaned)) {
        return cleaned
    }
} */
