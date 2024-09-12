import { ValueOrFactory } from "value-or-factory"
import { FormError, FormErrorInput } from "./errors"
import { FieldBehaviors, FieldManagement } from "./internal"

export interface FieldControl<G, S = G> extends FieldManagement<G, S>, FieldBehaviors {

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

    /**
     * Add an error to a form.
     */
    readonly attachErrors: (errors: FormErrorInput) => void

}
