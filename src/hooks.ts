import { FormContext } from "./form"
import { FormAction } from "./options"
import { useDeepCompareEffect } from "./util"

export const FORM_HOOKS = {
    blur: <T>(context: FormContext<T>) => context.lastBlurred,
    change: <T>(context: FormContext<T>) => context.lastChanged,
    commit: <T>(context: FormContext<T>) => context.lastCommitted,
    focus: <T>(context: FormContext<T>) => context.lastFocused,
    init: <T>(context: FormContext<T>) => context.lastInitialized,
    submit: <T>(context: FormContext<T>) => context.lastSubmitted,
    submitRequested: <T>(context: FormContext<T>) => context.lastSubmitRequested,
    submitAttempted: <T>(context: FormContext<T>) => context.lastSubmitAttempted,
    submitStarted: <T>(context: FormContext<T>) => context.lastSubmitStarted,
    submitCompleted: <T>(context: FormContext<T>) => context.lastSubmitCompleted,
    validateSucceeded: <T>(context: FormContext<T>) => context.lastValidateSucceeded,
    validateFailed: <T>(context: FormContext<T>) => context.lastValidateFailed,
    validateRequested: <T>(context: FormContext<T>) => context.lastValidateRequested,
    validateStarted: <T>(context: FormContext<T>) => context.lastValidateStarted,
    validateCompleted: <T>(context: FormContext<T>) => context.lastValidateCompleted,
}

export const FORM_HOOK_KEYS = Object.keys(FORM_HOOKS) as FormHook[]

/**
 * An event type for the form.
 */
export type FormHook = keyof typeof FORM_HOOKS

/**
 * A map of event types to actions.
 */
export type FormHooks<T> = {

    readonly [K in FormHook]?: FormAction<T> | FormAction<T>[]

}

/**
 * Attach a callback to a form hook.
 * @param form The form.
 * @param hooks Which hook to trigger on.
 * @param callback The callback to run.
 */
export function useFormHook<T>(form: FormContext<T>, hooks: FormHook | FormHook[], callback: Function) {
    const value = [hooks].flat().map(hook => FORM_HOOKS[hook](form))
    useDeepCompareEffect(() => {
        if (!value.some(value => value === undefined)) {
            callback()
        }
    }, [
        hooks,
        value
    ])
}
