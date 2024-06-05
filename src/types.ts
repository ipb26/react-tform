import { FormContext } from "./form";

export type FormAction<T> = "submit" | "validate" | ((actions: FormContext<T>) => void)
