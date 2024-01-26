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

export function useDeepCompareMemo<T, TDeps extends DependencyList>(factory: () => T, deps: TDeps) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !equals(deps, ref.current)) {
        ref.current = deps
    }
    return useMemo(factory, ref.current)
}

export function useDeepCompareConstant<T>(value: T) {
    return useDeepCompareMemo(() => value, [value])
}

export function useDeepCompareEffect<TDeps extends DependencyList>(effect: EffectCallback, deps: TDeps) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !equals(deps, ref.current)) {
        ref.current = deps
    }
    return useEffect(effect, ref.current)
}
