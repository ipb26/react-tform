import { createContext, useContext } from "react"
import { FormErrorInput } from "./errors"
import { FormHook as FormEvent } from "./hooks"

export type FormValidationResult = FormErrorInput | void | PromiseLike<FormErrorInput | void>
export type FormSubmissionResult = FormErrorInput | void | PromiseLike<FormErrorInput | void>
export type FormValidator<T> = (value: T) => FormValidationResult
export type FormSubmitter<T> = (value: T) => FormSubmissionResult

export interface UniversalFormOptions {

    /**
     * Disable the form.
     */
    readonly disabled?: boolean | undefined

    /**
     * When to start running validation.
     */
    readonly validateStart?: "immediate" | "afterFirstSubmission" | undefined

    /**
     * When to trigger validation.
     */
    readonly validateOn?: "blur" | "change" | "commit" | undefined

    /**
     * Specify actions to be executed on form hooks.
     */
    readonly on?: FormActions | undefined

}

/**
 * Form setup options.
 * @typeParam T The value type.
 */
export interface FormOptions<T> extends UniversalFormOptions {

    /**
     * The initial data for the form. Memoize this for performance benefits.
     */
    readonly initialValue: T

    /**
     * Whether or not the form should update if the initialValue property changes.
     * @defaultValue `false`
     */
    //readonly autoReinitialize?: ValueOrFactory<boolean, [FormState<T>]> | undefined

    /**
     * Submission function for the form. If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    readonly submit: FormSubmitter<T>

    /**
     * Validation function for the form. Should return an array of errors (empty if validation is successful). If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    readonly validate?: FormValidator<T> | undefined

}

export type FormAction = "submit" | "validate" | Function

/**
 * A map of event types to actions.
 */
export type FormActions = {

    readonly [K in FormEvent]?: FormAction | readonly FormAction[]

}

export const FormDefaults = createContext<UniversalFormOptions>({})

export function useFormOptions<T>(input: FormOptions<T>) {
    const defaults = useContext(FormDefaults)
    return {
        ...defaults,
        ...input,
        on: {
            ...defaults.on,
            ...input.on,
        }
    }
}
