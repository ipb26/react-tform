import { equals } from "ramda"
import { useMemo, useState } from "react"
import { FormErrors } from "./errors"
import { FormOptions } from "./options"

/*
export interface FormSubmitResult<T> {

    readonly date: Date
    readonly result: boolean
    readonly value: T

}
*/

/**
 * A form's internal state.
 */
export interface FormInternalState<T> {

    /**
     * The last exception to occur within submission or validation.
     */
    readonly exception?: unknown

    /**
     * The current value of the form.
     */
    readonly value: T

    /**
     * The initialized value of the form.
     */
    readonly initializedValue: T

    /**
     * The form's errors.
     */
    readonly errors?: FormErrors | undefined

    readonly lastInitializeRequested?: Date | undefined
    readonly lastInitialized: Date

    readonly lastBlurred?: Date | undefined
    readonly lastChanged?: Date | undefined
    readonly lastCommitted?: Date | undefined
    readonly lastFocused?: Date | undefined

    /**
     * Validation history.
     */
    readonly lastValidateRequested?: Date | undefined
    readonly lastValidated?: Date | undefined
    //readonly lastValidateSuccess?: Date | undefined
    //readonly lastValidateFailure?: Date | undefined
    readonly isValid?: boolean | undefined
    readonly isInvalid?: boolean | undefined

    /**
     * The most recently submitted value.
     */
    readonly lastSubmitRequested?: Date | undefined
    readonly lastSubmitted?: Date | undefined
    readonly lastSubmitValue?: T | undefined
    readonly lastSubmitResult?: boolean | undefined
    readonly submitCount: number
    //readonly lastSubmitSuccess?: Date | undefined
    //readonly lastSubmitFailure?: Date | undefined

}

/**
 * Build the initial form state.
 * @param initialValue The form's value.
 * @returns An initial form state.
 */
export function initialFormState<T>(initialValue: T) {
    return {
        lastInitialized: new Date(),
        initializedValue: initialValue,
        value: initialValue,
        submitCount: 0,
    }
}

export function useFormState<T>(options: FormOptions<T>) {

    const [state, setState] = useState<FormInternalState<T>>(initialFormState(options.initialValue))

    const isValidating = (state.lastValidateRequested?.getTime() ?? 0) > (state.lastValidated?.getTime() ?? 0)
    const isSubmitting = (state.lastSubmitRequested?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)

    const canSubmit = !(state.errors ?? []).some(_ => _.temporary !== true)

    const isDirty = useMemo(() => (state.lastChanged?.getTime() ?? 0) > state.lastInitialized.getTime() && !equals(state.value, state.initializedValue), [state.value, state.initializedValue])
    const isDirtySinceSubmitted = useMemo(() => (state.lastChanged?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0) && !equals(state.value, state.lastSubmitValue ?? state.initializedValue), [state.value, state.lastSubmitValue ?? state.initializedValue])

    //    const isFocused = (state.lastFocused?.getTime() ?? 0) > (state.lastBlurred?.getTime() ?? 0)

    const hasBeenSubmitted = state.submitCount > 0

    //TODO rename to clarify dif between initial vs initialized value?

    const value = {
        ...state,
        isValidating,
        isSubmitting,
        canSubmit,
        hasBeenSubmitted,
        isDirty,
        isDirtySinceSubmitted,
        //  isFocused,
    }

    return [value, setState] as const

}

export type FormState<T> = Readonly<ReturnType<typeof useFormState<T>>[0]>
