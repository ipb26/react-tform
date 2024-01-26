import { useEffect, useState } from "react"
import { FormContext } from "./form"
import { useFormHook } from "./hooks"

/**
 * An autosave trigger. Immediate will fire on change, delayed will fire on blur and commit.
 */
export type AutoSubmitTrigger = "immediate" | "delayed"

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

        [K in AutoSubmitTrigger]?: number | undefined

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
export function useAutoSubmit<T>(options: AutoSubmitOptions<T>): AutoSubmitStatus {
    const active = options.disabled !== true && options.form.disabled !== true
    const [next, setNext] = useState<number>()
    const cancel = () => setNext(undefined)
    const trigger = (delay?: number | undefined) => {
        if (delay === undefined) {
            return
        }
        if (!options.form.canSubmit || !options.form.isDirtySinceSubmitted) {
            return
        }
        setNext(Date.now() + delay)
    }
    useFormHook(options.form, ["change"], () => trigger(options.on?.immediate))
    useFormHook(options.form, ["blur", "commit"], () => trigger(options.on?.delayed))
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
    useEffect(() => {
        if (!active) {
            cancel()
        }
    }, [
        active
    ])
    useFormHook(options.form, "submit", cancel)
    return {
        active,
        next,
        cancel
    }
}
