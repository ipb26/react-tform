import { useEffect, useState } from "react"
import { FormContext } from "./form"
import { FORM_HOOK_KEYS, FormHook, useFormHook } from "./hooks"
import { booleanOr } from "./util"

/**
 * The autosave options. Note that you MUST set either the onChange or onBlur option (or both), or the autosave will not take effect.
 * @typeParam T The form's value type.
 */
export type AutoSubmitOptions<T> = {

    /**
     * The form context.
     */
    readonly form: FormContext<T>

    /**
     * Set this to true to disable autosaving.
     */
    readonly disabled?: boolean

    /**
     * Specify which events to save on. A boolean or a number for a delay.
     */
    readonly on?: {
        readonly [K in FormHook]?: boolean | number | undefined
    }

}

/**
 * The status of a currently activate autosave.
 */
export type AutoSubmitStatus = {

    /**
     * Whether or not this autosave is active. Will be false if the disabled option is passed into useAutoSave.
     */
    readonly active: boolean

    /**
     * When the next autosave will fire, millisecond timestamp.
     */
    readonly next: number | undefined

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
export function useAutoSubmit<T>(initialOptions: AutoSubmitOptions<T>): AutoSubmitStatus {
    const options = {
        ...initialOptions,
        on: {
            blur: true,
            ...initialOptions.on
        }
    }
    const active = options.disabled !== true && options.form.disabled !== true
    const [next, setNext] = useState<number>()
    FORM_HOOK_KEYS.forEach(hook => {
        const delay = booleanOr(options.on[hook], 0)
        useFormHook(options.form, hook, () => {
            if (!active) {
                return
            }
            if (delay !== undefined && options.form.canSubmit) {
                setNext(Date.now() + delay)
            }
        })
    })
    const cancel = () => setNext(undefined)
    useEffect(() => {
        if (next === undefined || !active) {
            return
        }
        const timeout = setTimeout(options.form.submit, Math.max(next - Date.now(), 0))
        return () => {
            clearTimeout(timeout)
        }
    }, [
        active,
        next
    ])
    useFormHook(options.form, "submit", cancel)
    return {
        active,
        next,
        cancel
    }
}
