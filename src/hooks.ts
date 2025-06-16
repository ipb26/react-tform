import { isNotNil } from "ramda"
import { FormContext } from "./form"
import { FormAction } from "./options"
import { FormState } from "./state"
import { useDeepCompareEffect } from "./util"

export const FORM_HOOKS = {

    change: <T>(context: FormState<T>) => context.lastChanged,
    touch: <T>(context: FormState<T>) => context.lastTouched,
    commit: <T>(context: FormState<T>) => context.lastCommitted,
    blur: <T>(context: FormState<T>) => context.lastBlurred,
    focus: <T>(context: FormState<T>) => context.lastFocused,
    init: <T>(context: FormState<T>) => context.lastInitialized,
    beforeSubmit: <T>(context: FormState<T>) => context.lastSubmitRequested,
    afterSubmit: <T>(context: FormState<T>) => context.lastSubmitted,
    beforeValidate: <T>(context: FormState<T>) => context.lastValidateRequested,
    afterValidate: <T>(context: FormState<T>) => context.lastValidated,

} as const

export const FORM_HOOK_KEYS = Object.keys(FORM_HOOKS) as readonly FormHook[]

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
export function useFormAction<T>(form: FormContext<T>, hooks: FormHook | undefined | readonly FormHook[], action: FormAction<T>) {
    const value = [hooks].flat().filter(isNotNil).map(hook => FORM_HOOKS[hook](form)).filter(isNotNil)
    useDeepCompareEffect(() => {
        if (value.length > 0) {
            typeof action === "string" ? form[action]() : action(form)
        }
    }, [
        hooks,
        value
    ])
}
