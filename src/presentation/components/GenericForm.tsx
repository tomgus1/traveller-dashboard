import { Button } from "./Button";
import FormField from "./FormField";
import {
  useFormValidation,
  type ValidationRule,
} from "../hooks/useFormValidation";

export interface FormFieldConfig<T> {
  name: keyof T;
  label: string;
  type?: "text" | "email" | "password" | "textarea";
  placeholder?: string;
  required?: boolean;
}

export interface GenericFormProps<T extends Record<string, unknown>> {
  title?: string;
  fields: FormFieldConfig<T>[];
  validationRules?: ValidationRule<T>[];
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  className?: string;
}

/**
 * Generic form component that handles common form patterns
 */
export function GenericForm<T extends Record<string, unknown>>({
  title,
  fields,
  validationRules = [],
  initialValues,
  onSubmit,
  submitLabel = "Submit",
  loading: externalLoading = false,
  error: externalError = null,
  success = null,
  className = "",
}: GenericFormProps<T>) {
  const { errors, isValid, isSubmitting, handleSubmit, getFieldProps } =
    useFormValidation(initialValues, validationRules);

  const isLoading = externalLoading || isSubmitting;
  const displayError = externalError || Object.values(errors)[0];

  return (
    <div className={className}>
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit);
        }}
        className="space-y-4"
      >
        {fields.map((field) => {
          const fieldProps = getFieldProps(field.name);
          const fieldType = field.type || "text";

          if (fieldType === "textarea") {
            return (
              <FormField
                key={String(field.name)}
                label={field.label}
                type="textarea"
                placeholder={field.placeholder}
                required={field.required}
                value={String(fieldProps.value || "")}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  fieldProps.onChange(e.target.value as T[keyof T])
                }
                onBlur={fieldProps.onBlur}
                error={fieldProps.error}
              />
            );
          }

          return (
            <FormField
              key={String(field.name)}
              label={field.label}
              type={fieldType as "text" | "email" | "password"}
              placeholder={field.placeholder}
              required={field.required}
              value={String(fieldProps.value || "")}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                fieldProps.onChange(e.target.value as T[keyof T])
              }
              onBlur={fieldProps.onBlur}
              error={fieldProps.error}
            />
          );
        })}

        {displayError && (
          <div className="text-red-500 text-sm">{displayError}</div>
        )}

        {success && <div className="text-green-500 text-sm">{success}</div>}

        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full"
        >
          {isLoading ? "Loading..." : submitLabel}
        </Button>
      </form>
    </div>
  );
}

// Specialized forms for common use cases
interface AuthFormData {
  email: string;
  password: string;
}

export function LoginForm({
  onSubmit,
  loading,
  error,
  className,
}: {
  onSubmit: (data: AuthFormData) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}) {
  return (
    <GenericForm
      title="Sign In"
      fields={[
        { name: "email", label: "Email", type: "email", required: true },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
      ]}
      validationRules={[
        {
          field: "email",
          message: "Email is required",
          validate: (value) => !!value,
        },
        {
          field: "password",
          message: "Password is required",
          validate: (value) => !!value,
        },
      ]}
      initialValues={{ email: "", password: "" }}
      onSubmit={onSubmit}
      submitLabel="Sign In"
      loading={loading}
      error={error}
      className={className}
    />
  );
}

export function SignUpForm({
  onSubmit,
  loading,
  error,
  success,
  className,
}: {
  onSubmit: (data: AuthFormData) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  className?: string;
}) {
  return (
    <GenericForm
      title="Sign Up"
      fields={[
        { name: "email", label: "Email", type: "email", required: true },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
        },
      ]}
      validationRules={[
        {
          field: "email",
          message: "Email is required",
          validate: (value) => !!value,
        },
        {
          field: "password",
          message: "Password must be at least 6 characters",
          validate: (value) => typeof value === "string" && value.length >= 6,
        },
      ]}
      initialValues={{ email: "", password: "" }}
      onSubmit={onSubmit}
      submitLabel="Sign Up"
      loading={loading}
      error={error}
      success={success}
      className={className}
    />
  );
}
