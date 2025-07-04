import { useState } from "react"
import { FormErrors } from "./errors"
import { FormOptions } from "./options"

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
    readonly lastFocused?: Date | undefined
    readonly lastTouched?: Date | undefined
    readonly lastChanged?: Date | undefined
    readonly lastChangedByApi?: Date | undefined
    readonly lastChangedByUserAction?: Date | undefined
    readonly lastCommitted?: Date | undefined

    /**
     * Validation history.
     */
    readonly lastValidateRequested?: Date | undefined
    readonly lastValidated?: Date | undefined
    readonly lastValidationResult?: boolean | undefined
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

}

/**
 * Build the initial form state.
 * @param initialValue The form's value.
 * @returns An initial form state.
 */
export function initialFormState<T>(initialValue: T, initialErrors?: FormErrors | undefined) {
    return {
        lastInitialized: new Date(),
        initializedValue: initialValue,
        value: initialValue,
        valueSource: "api" as const,
        errors: initialErrors,
        submitCount: 0,
    }
}

export function useFormState<T>(options: FormOptions<T>) {

    const [state, setState] = useState<FormInternalState<T>>(initialFormState(options.initial?.value ?? options.initialValue!, options.initialErrors))

    const isValidating = (state.lastValidateRequested?.getTime() ?? 0) > (state.lastValidated?.getTime() ?? 0)
    const isSubmitting = (state.lastSubmitRequested?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)

    const canSubmit = !(state.errors ?? []).some(_ => _.temporary !== true)

    // const isDirty = useMemo(() => (state.lastChanged?.getTime() ?? 0) > state.lastInitialized.getTime() && !equals(state.value, state.initializedValue), [state.value, state.initializedValue])
    //  const isDirtySinceSubmitted = useMemo(() => (state.lastChanged?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0) && !equals(state.value, state.lastSubmitValue ?? state.initializedValue), [state.value, state.lastSubmitValue ?? state.initializedValue])

    const hasBeenSubmitted = state.submitCount > 0

    const value = {
        ...state,
        isValidating,
        isSubmitting,
        canSubmit,
        hasBeenSubmitted,
        //    isDirty,
        //   isDirtySinceSubmitted,
    }

    return [value, setState] as const

}

export type FormState<T> = Readonly<ReturnType<typeof useFormState<T>>[0]>
