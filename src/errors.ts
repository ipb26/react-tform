import { equals } from "ramda"

/**
 * The path of a form error.
 */
export type FormErrorPath = readonly (string | number)[]

/**
 * A set of form errors.
 */
export type FormErrors = readonly FormError[]

/**
 * Error object for a form field.
 */
export interface FormError {

    /**
     * The error message.
     */
    readonly message: string

    /**
     * A path for an error. Strings represent properties, numbers represent array indexes.
     */
    readonly path: FormErrorPath

    /**
     * Whether the error is temporary. Temporary errors will not block submission.
     */
    readonly temporary?: boolean | undefined

}

export function stringifyErrors(errors: FormErrors | undefined) {
    if (errors === undefined) {
        return
    }
    if (errors.length === 0) {
        return
    }
    return errors.map(_ => _.message).join(", ") + "."
}
export function errorAt(path: FormErrorPath) {
    return (error: FormError) => {
        return equals(path, error.path)
    }
}
export function descendErrors(errors: FormErrors, path: FormErrorPath) {
    return errors.filter(_ => equals(_.path.slice(0, path.length), path ?? [])).map(error => ({ ...error, path: error.path.slice(path.length) }))
}
