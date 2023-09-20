import { Lens, equals, identity, lens, lensProp, set, view } from "ramda"
import { FormError } from "./options"
import { useFormState } from "./state"

/**
 * The root interface for accessing and changing form data. All fields and the root form are a descendant of this type.
 * The read and write types are separate in order to allow functions to accept more types of data than they will set.
 * @typeParam R The readable type.
 * @typeParam W The writable type.
 */
export interface FormField<R, W = R> {

    /**
     * This field or form's value.
     */
    readonly value: R

    /**
     * Set this field or form's value.
     * @param value The value.
     */
    setValue: (value: W) => void

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
     * A list of errors associated with this field or form and its children.
     */
    readonly errors: readonly FormError[]

    /**
     * A list of errors associated with this field or form.
     */
    readonly selfErrors: readonly FormError[]

    /**
     * Does this field or form have errors?
     */
    readonly hasErrors: boolean

    /**
     * Does this field or form have errors?
     */
    readonly hasSelfErrors: boolean

}

/**
 * A form field with accessor methods to generate subfield objects. Note that you can create subfields off of the root form, or off of another field using the same methods.
 * @typeParam T The value type.
 */
export interface FormGroup<T> extends FormField<T, T> {

    /**
     * Create a new field using a custom lens.
     * @typeParam N The subfield's type.
     * @param key Key
     * @param path The path used for errors.
     */
    lens<N>(key: Lens<T, N>, path?: readonly (string | number)[]): FormGroup<N>

    /**
     * Create a new field using a property of this field as it's value.
     * @typeParam K The subfield's key.
     * @param key Key
     */
    prop<K extends string & (keyof T)>(key: K): FormGroup<T[K]>

}

export function rootFormGroup<T>(state: ReturnType<typeof useFormState<T>>): FormGroup<T> {
    return formGroup(
        {
            value: state.value.value,
            errors: state.value.errors,
            selfErrors: state.value.errors.filter(_ => _.path.length === 0),
            hasErrors: state.value.errors.length > 0,
            hasSelfErrors: state.value.errors.filter(_ => _.path.length === 0).length > 0,
            //TODO do we need to reset lastValidateCompleted?
            setValue: (value: T) => state.patch({ value, lastChanged: new Date(), isValid: undefined, lastValidateCompleted: undefined }),
            blur: () => state.patch({ lastBlurred: new Date() }),
            commit: () => state.patch({ lastCommitted: new Date() }),
            focus: () => state.patch({ lastFocused: new Date() })
        },
        lens(identity, identity),
        []
    )
}

export function formGroup<T, V>(parent: FormField<T, T>, field: Lens<T, V>, path: readonly (string | number)[]): FormGroup<V> {

    const errors = parent.errors.filter(_ => equals(_.path.slice(0, path.length), path))
    const selfErrors = errors.filter(_ => _.path.length === 0)

    const data = {
        value: view(field, parent.value),
        setValue: (value: V) => parent.setValue(set(field, value, parent.value)),
        blur: parent.blur,
        commit: parent.commit,
        focus: parent.focus,
        errors,
        selfErrors: selfErrors,
        hasErrors: errors.length > 0,
        hasSelfErrors: selfErrors.length > 0,
    }

    const lens = <N,>(lens: Lens<V, N>, path: readonly (string | number)[]) => {
        return formGroup(data, lens, path ?? [])
    }

    return {
        ...data,
        lens,
        prop: prop => lens(lensProp(prop), [prop]),
    }

}

