import { ValueOrFactory } from "value-or-factory"
import { FormErrors } from "./errors"
import { FormContext } from "./form"
import { FormAction } from "./types"

export interface FieldInput<G, S = G> {

    /**
     * Is this field disabled?
     */
    readonly disabled?: boolean | undefined

    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur(): void

    /**
     * Mark this field or form as committed. Call after changing the value of a radio button or checkbox etc.
     */
    commit(): void

    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus(): void

    /**
     * This field or form's value.
     */
    readonly value: G

    /**
     * Set this field or form's value.
     * @param value The value.
     */
    readonly setValue: (value: ValueOrFactory<S, [G]>) => void

    /**
     * A list of errors associated with this field or form and its children.
     */
    readonly errors?: FormErrors | undefined

    /**
     * Set this field's errors.
     * @param errors The errors.
     */
    readonly setErrors: (errors: ValueOrFactory<FormErrors, [FormErrors]>) => void

    readonly path: readonly (string | number)[]

}

//TODO Move?

export function execAction<T>(form: FormContext<T>, action: FormAction<T>) {
    if (typeof action === "string") {
        form[action]()
    }
    else {
        action?.(form)
    }
}
