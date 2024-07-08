
import { Lens, defaultTo, identity, lens, lensIndex, lensProp, pick, set, view } from "ramda"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FieldControl } from "./control"
import { FormError, descendErrors } from "./errors"
import { FieldInput } from "./internal"

export interface FormField<T> extends FieldControl<T> {

    /**
     * Create a field that works off of this field with a transformed value.
     */
    pipe<R>(operator: FormField.OperatorWithPath<T, R> | FormField.Operator<T, R>): FormField<R>

    /**
     * Create a field from a prop of this field.
     */
    prop<K extends string & (keyof T)>(key: K): FormField<T[K]>

    /**
     * Create a field from a prop of this field.
     */
    props<K extends (keyof T)>(key: readonly K[]): FormField<Pick<T, K>>

    transform<R>(to: (value: T) => R, back: (value: R) => T): FormField<R>

    /**
     * Narrow down the type of the field.
     */
    narrow<R extends T>(to: (value: T) => R): FormField<R>

    /**
     * Provide a default if empty.
     */
    or(value: NonNullable<T>): FormField<NonNullable<T>>

}

export class FormFieldImpl<T> implements FormField<T> {

    readonly path
    readonly disabled
    readonly value
    readonly setValue
    readonly setValueAndCommit
    readonly blur
    readonly commit
    readonly focus
    readonly toggle
    readonly errors
    readonly selfErrors
    readonly hasErrors
    readonly hasSelfErrors
    readonly setErrors
    readonly pipe
    readonly prop
    readonly transform
    readonly narrow
    readonly or
    readonly props

    static from<T>(input: FieldInput<T>) {
        return new FormFieldImpl(input)
    }

    private constructor(readonly from: FieldInput<T, T>) {
        this.path = from.path
        this.disabled = from.disabled
        this.value = from.value
        this.setValue = from.setValue
        this.blur = from.blur
        this.commit = from.commit
        this.focus = from.focus
        this.toggle = (status: "focused" | "blurred") => {
            if (status === "focused") {
                from.focus()
            }
            else {
                from.blur()
            }
        }
        this.setValueAndCommit = (value: T) => {
            from.setValue(value)
            from.commit()
        }
        this.errors = from.errors
        this.selfErrors = from.errors?.filter(_ => (_.path ?? []).length === 0)
        this.hasErrors = (from.errors?.length ?? 0) > 0
        this.hasSelfErrors = (this.selfErrors?.length ?? 0) > 0
        this.setErrors = from.setErrors
        this.pipe = this.doPipe.bind(this)
        this.prop = this.doProp.bind(this)
        this.transform = this.doTransform.bind(this)
        this.narrow = this.doNarrow.bind(this)
        this.or = this.doOr.bind(this)
        this.props = this.doProps.bind(this)
    }

    /*
    index(index: number): FormField<IndexOf<T>> {
        throw new Error("Method not implemented.")
    }

    private doIndex<N>(index: N) {
        if (Array.isArray(this.value)) {
            return this.doPipe(FormField.index<T, N>(index))
        }
        else {
            throw new Error("This is not an array field.")
        }
    }*/

    private doTransform<N>(to: (value: T) => N, back: (value: N) => T) {
        return this.doPipe(FormField.transform(to, back))
    }
    private doOr(defaultValue: NonNullable<T>) {
        return this.doNarrow(value => value ?? defaultValue)
    }
    private doNarrow<N extends T>(to: (value: T) => N) {
        return this.doPipe(FormField.narrow(to))
    }
    /*
    private doAt<K extends IndexOf<T>>(key: K) {
        return this.doPipe(FormField.at(key))
    }
    */
    private doProp<K extends string & (keyof T)>(key: K) {
        return this.doPipe(FormField.prop(key))
    }
    private doProps<K extends (keyof T)>(keys: readonly K[]) {
        return this.doPipe(FormField.props(keys))
    }
    private doPipe<N>(operator: FormField.OperatorWithPath<T, N> | FormField.Operator<T, N>): FormField<N> {
        if (typeof operator === "function") {
            return this.doPipe({ operator })
        }
        const newValue = view(operator.operator, this.value)
        const newSetValue = (newValue: ValueOrFactory<N, [N]>) => {
            this.setValue(prev => {
                const newPrev = view(operator.operator, prev)
                //TODO change callOrGet to a functional style
                return set(operator.operator, callOrGet(newValue, newPrev), prev)
            })
        }
        const errors = descendErrors(this.errors ?? [], operator.path ?? [])
        const setErrors = (errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>) => {
            this.setErrors(prevErrors => {
                const newErrors = callOrGet(errors, descendErrors(prevErrors, operator.path ?? []))
                return newErrors.map(error => {
                    return {
                        ...error,
                        path: [...operator.path ?? [], ...error.path ?? []]
                    }
                })
            })
        }
        return FormFieldImpl.from({
            path: [...this.path, ...this.path !== undefined ? this.path : []],
            value: newValue,
            setValue: newSetValue,
            blur: this.blur,
            commit: this.commit,
            focus: this.focus,
            disabled: this.disabled,
            errors,
            setErrors,
        })
    }

}

const undefinedIndex: <A extends readonly unknown[]>(n: number) => Lens<A, A[number] | undefined> = lensIndex

export namespace FormField {

    export function prop<T, K extends (keyof T) & string>(key: K): OperatorWithPath<T, T[K]> {
        return {
            operator: lensProp<T, K>(key),
            path: [key],
        }
    }
    export function props<T, K extends (keyof T)>(keys: readonly K[]): OperatorWithPath<T, Pick<T, K>> {
        return {
            operator: lens(object => pick(keys, object), (sub, object) => ({ ...object, ...sub })),
            path: [],
        }
    }

    export function at<A extends readonly unknown[]>(index: number): OperatorWithPath<A, A[number] | undefined> {
        return {
            operator: undefinedIndex<A>(index),
            path: [index],
        }
    }
    export function transform<I, O>(to: (value: I) => O, back: (value: O) => I): Operator<I, O> {
        return lens<I, O>(to, back)
    }
    export function narrow<I, O extends I>(func: (input: I) => O): Operator<I, O> {
        return transform<I, O>(func, identity)
    }
    export function or<V, T extends V>(def: T): Operator<V | undefined, V> {
        return narrow<V | undefined, V>(defaultTo(def))
    }

    export type Operator<I, O> = Lens<I, O>

    export interface OperatorWithPath<I, O> {

        readonly operator: Operator<I, O>
        readonly path?: readonly (string | number)[] | undefined

    }

}
