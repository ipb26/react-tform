import { isNotNil } from "ramda"
import { createContext } from "react"
import { FormContext } from "./form"
import { execAction } from "./internal"
import { FormActions } from "./options"
import { FormAction } from "./types"
import { useDeepCompareEffect } from "./util"

export const FORM_HOOKS = {

    blur: <T>(context: FormContext<T>) => context.lastBlurred,
    change: <T>(context: FormContext<T>) => context.lastChanged,
    commit: <T>(context: FormContext<T>) => context.lastCommitted,
    focus: <T>(context: FormContext<T>) => context.lastFocused,
    init: <T>(context: FormContext<T>) => context.lastInitialized,
    submit: <T>(context: FormContext<T>) => context.lastSubmitted,
    validate: <T>(context: FormContext<T>) => context.lastValidated,

} as const

export const FORM_HOOK_KEYS = Object.keys(FORM_HOOKS) as FormHook[]

/**
 * An event type for the form.
 */
export type FormHook = keyof typeof FORM_HOOKS

/**
 * Attach a callback to a form hook.
 * @param form The form.
 * @param hooks Which hook to trigger on.
 * @param callback The callback to run.
 */
export function useFormHook<T>(form: FormContext<T>, hooks: FormHook | readonly FormHook[], action: FormAction<T>) {
    const value = [hooks].flat().map(hook => FORM_HOOKS[hook](form)).filter(isNotNil)
    useDeepCompareEffect(() => {
        if (value.length > 0) {
            execAction(form, action)
        }
    }, [
        hooks,
        value
    ])
}
