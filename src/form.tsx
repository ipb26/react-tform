import { Mutex } from "async-mutex"
import { FormEvent, useEffect, useMemo } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormHook } from "./hooks"
import { FormError, FormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"
import { formCompare } from "./util"

/**
 * A full form object, including state and mutation methods.
 * @typeParam T The value type.
 */
export interface FormContext<T> extends FormState<T>, FormField<T> {

    /**
     * Validate this form.
     */
    validate(): PromiseLike<boolean | undefined>

    /**
     * Submit this form. Returns a boolean for success or failure.
     */
    submit(event?: FormEvent<unknown>): PromiseLike<boolean>

    /**
     * Validate this form.
     */
    scheduleValidate(): void

    /**
     * Submit this form.
     */
    scheduleSubmit(): void

    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    initialize(value: T): void

    /**
     * Reinitialize this form using its initialValue option. Clears all state, including errors and submission history.
     */
    reinitialize(): void

    /**
     * Set the form's errors.
     */
    setErrors(errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>): void

    /**
     * Revert this form's data back to the last initialization data.
     */
    //revert(): void

    /**
     * Revert this form's data back to the last submitted data (or the initialization data, if never submitted).
     */
    //revertToSubmitted(): void

    /**
     * Compare using the form's preferred comparison method.
     */
    compare(a: T, b: T): boolean
    //TODO get rid of all this custom comparison stuff and just use deep?

}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(initialOptions: FormOptions<T>): FormContext<T> {

    // Build options and state.

    const options = { ...initialOptions, on: { validateRequested: ["validate"], submitRequested: ["submit"], change: ["validate"], ...initialOptions.on } } satisfies FormOptions<T>
    const state = useFormState<T>(options)
    const mutex = useMemo(() => new Mutex(), [])

    // Initialization function. Can be called manually but generally won't be.

    const initialize = (value: T) => state.set(initialFormState(value))
    const reinitialize = () => initialize(state.value.initialValue)
    const compare = (a: T, b: T) => formCompare(a, b)

    // Validate function.

    //TODO what happens if we change a value while validating? it will cause a conflict - could be marked as valid even though the value wouldnt pass
    const validate = async () => {
        return await mutex.runExclusive(async () => {
            if (options.validate === undefined) {
                return
            }
            state.patch({ lastValidateStarted: new Date() })
            try {
                const errors = await options.validate(state.value.value) ?? []
                state.patch({
                    lastValidateCompleted: new Date(),
                    value: state.value.value,
                    isValid: errors.length === 0,
                    errors: errors
                })
                if (errors.length === 0) {
                    state.patch({
                        lastValidateSucceeded: new Date(),
                    })
                }
                else {
                    state.patch({
                        lastValidateFailed: new Date(),
                    })
                }
                return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                //state.patch({ lastValidateAttemptCompleted: new Date() })
            }
        })
    }

    // Submit function.

    const submit = async (event?: FormEvent<unknown>) => {
        event?.preventDefault()
        return await mutex.runExclusive(async () => {
            state.patch({ lastSubmitStarted: new Date() })
            try {
                const errors = await (async () => {
                    const validate = options.submitValidate ?? options.validate
                    if (validate !== undefined) {
                        const errors = await validate(state.value.value) ?? []
                        if (errors.length > 0) {
                            return errors
                        }
                    }
                    return await options.submit(state.value.value) ?? []
                })()
                state.patch({
                    errors,
                    isValid: errors.length === 0
                })
                if (errors.length === 0) {
                    const date = new Date()
                    state.patch(state => {
                        return {
                            lastSubmitted: date,
                            submitCount: state.submitCount + 1,
                            submittedValue: state.value,
                        }
                    })
                }
                return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                state.patch({ lastSubmitCompleted: new Date() })
            }
        })
    }

    // Automatic reinitalization if initialValue prop changes.

    useEffect(() => {
        if (callOrGet(options.autoReinitialize, state.value)) {
            reinitialize()
        }
    }, [
        state.value.initialValue
    ])

    // Revert to the initial data.

    const scheduleSubmit = () => state.patch({ lastSubmitRequested: new Date() })
    const scheduleValidate = () => state.patch({ lastValidateRequested: new Date() })
    const setErrors = (errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>) => {
        state.set(state => {
            return {
                ...state,
                errors: callOrGet(errors, state.errors)
            }
        })
    }
    //const revert = () => initialize(options.initialValue)
    // const revertToSubmitted = () => initialize(state.value.submittedValue ?? options.initialValue)

    // The root form group.

    const group = FormFieldImpl.from({
        value: state.value.value,
        errors: state.value.errors,
        //TODO do we need to reset lastValidateCompleted?
        setValue: (value: ValueOrFactory<T, [T]>) => state.set(state => {
            return {
                ...state,
                value: callOrGet(value, state.value),
                lastChanged: new Date(),
                isValid: undefined,
                lastValidateCompleted: undefined
            }
        }),
        blur: () => state.patch({ lastBlurred: new Date() }),
        commit: () => state.patch({ lastCommitted: new Date() }),
        focus: () => state.patch({ lastFocused: new Date() }),
    })

    const context = {
        ...state.value,
        ...group,
        compare,
        initialize,
        reinitialize,
        submit,
        validate,
        scheduleSubmit,
        scheduleValidate,
        setErrors,
        //revert,
        // revertToSubmitted,
    }

    FORM_HOOK_KEYS.forEach(item => {
        useFormHook(context, item, () => {
            const actions = [options.on?.[item]].flat()
            actions.flat().forEach(action => {
                if (typeof action === "string") {
                    context[action]()
                }
                else {
                    action?.(context)
                }
            })
        })
    })

    if (state.value.exception !== undefined) {
        throw state.value.exception
    }

    return context

}
