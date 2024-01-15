import { ValueOrFactory } from "value-or-factory"
import { FieldInput } from "./internal"
import { FormError } from "./options"

export interface FieldControl<G, S = G> extends FieldInput<G, S> {

    /**
     * Mark this field or form as blurred or focused.
     */
    toggle(status: "focused" | "blurred"): void

    /**
     * Set a value and immediately mark the change as committed.
     */
    setValueAndCommit(value: ValueOrFactory<S, [G]>): void

    /**
     * A list of errors associated with this field or form.
     */
    readonly selfErrors?: readonly FormError[] | undefined

    /**
     * Does this field or form have errors?
     */
    readonly hasErrors: boolean

    /**
     * Does this field or form have errors?
     */
    readonly hasSelfErrors: boolean

}
