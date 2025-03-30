import { useCallback, useEffect, useState } from "react"
import { FormContext } from "./form"
import { useFormAction } from "./hooks"

/**
 * An autosave trigger. Immediate will fire on change, delayed will fire on blur and commit.
 */
export type AutoSubmitTrigger = "change" | "commit" | "blur"

/**
 * The autosave options. Note that you, or the autosave will not take effect.
 * @typeParam T The form's value type.
 */
export interface AutoSubmitOptions<T> {

    /**
     * The form context.
     */
    readonly form: FormContext<T>

    /**
     * Set this to true to disable autosaving.
     */
    readonly disabled?: boolean | undefined

    /**
     * The autosave triggers.
     */
    readonly on: {

        readonly [K in AutoSubmitTrigger]?: number | undefined

    }

}

/**
 * The status of a currently activate autosave.
 */
export interface AutoSubmitStatus {

    /**
     * Whether or not this autosave is active. Will be false if the disabled option is passed into useAutoSave.
     */
    readonly active: boolean

    /**
     * When the next autosave will fire, millisecond timestamp.
     */
    readonly next: number | undefined

    /**
     * Whether or not an autosave is pending.
     */
    readonly pending: boolean

    /**
     * The number of autosaves completed.
     */
    // readonly count: number

    /**
     * Cancel any pending autosaves.
     */
    cancel(): void

}

/**
 * Attach autosaving functionality to a form.
 * @typeParam T The form's value type.
 * @param options The configuration object.
 * @returns Autosave status.
 */
export function useAutoSubmit<T>(options: AutoSubmitOptions<T>): AutoSubmitStatus {
    const active = options.disabled !== true && options.form.disabled !== true && options.form.canSubmit && options.form.isDirtySinceSubmitted
    const [next, setNext] = useState<number>()
    const cancel = useCallback(() => setNext(undefined), [])
    const trigger = (delay?: number | undefined) => {
        if (!active) {
            return
        }
        if (delay === undefined) {
            return
        }
        setNext(Date.now() + delay)
    }
    [
        "blur" as const,
        "change" as const,
        "commit" as const,
    ].forEach(action => {
        useFormAction(options.form, action, () => trigger(options.on?.[action]))
    })
    useEffect(() => {
        if (next === undefined) {
            return
        }
        const timeout = setTimeout(options.form.submit, Math.max(next - Date.now(), 0))
        return () => {
            clearTimeout(timeout)
        }
    }, [
        next
    ])
    useFormAction(options.form, "beforeSubmit", cancel)
    useEffect(() => {
        if (!active) {
            cancel()
        }
    }, [
        active
    ])
    return {
        active,
        next,
        pending: next !== undefined,
        cancel
    }
}
