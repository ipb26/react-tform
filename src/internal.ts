import { ValueOrFactory } from "value-or-factory"
import { FormErrorInput, FormErrorPath, FormErrors } from "./errors"

export interface FieldInput<G, S = G> {

    /**
     * Is this field disabled?
     */
    readonly disabled?: boolean | undefined

    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur: () => void

    /**
     * Mark this field or form as committed. Call after changing the value of a radio button or checkbox etc.
     */
    commit: () => void

    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus: () => void

    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    touch: () => void

    /**
     * This field's error path.
     */
    readonly path: FormErrorPath

    /**
     * This field or form's value.
     */
    readonly value: G

    /**
     * Set this field or form's value.
     * @param value The value.
     */
    readonly setValue: (value: ValueOrFactory<S, [G]>, suppressTouch?: boolean | undefined) => void

    /**
     * A list of errors associated with this field or form and its children.
     */
    readonly errors?: FormErrors | undefined

    /**
     * Set this field's errors.
     * @param errors The errors.
     */
    readonly setErrors: (errors: ValueOrFactory<FormErrorInput, [FormErrors]>) => void

}
