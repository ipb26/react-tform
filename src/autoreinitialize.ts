import { FormContext } from "./form"
import { useDeepCompareEffect, useIsFirstMount } from "./util"

export interface AutoReinitializeOptions<T> {

    /**
     * The form context.
     */
    readonly form: FormContext<T>

    /**
     * The initial value.
     */
    readonly initialValue: T

}

export function useAutoReinitialize<T>(options: AutoReinitializeOptions<T>) {
    const isFirstMount = useIsFirstMount()
    useDeepCompareEffect(() => {
        if (isFirstMount) {
            return
        }
        options.form.initialize(options.initialValue)
    }, [
        options.initialValue
    ])
}
