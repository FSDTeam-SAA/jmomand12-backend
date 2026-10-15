import { z } from "zod";

const userValidationSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: "First name is required",
    }),
    lastName: z.string({
      required_error: "Last name is required",
    }),
    email: z.string({
      required_error: "Email is required",
    }),
    password: z.string({
      required_error: "Password is required",
    }),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the terms and conditions" }),
    }),
  }),
});

export const userValidation = {
  userValidationSchema,
};
