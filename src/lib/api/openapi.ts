import { z } from "zod";
import { createDocument } from "zod-openapi";
import { profileResponseSchema, updateProfileSchema } from "@/validators/profile.validator";

function successEnvelope<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
  });
}

const errorEnvelope = z.object({
  success: z.literal(false),
  error: z.string().meta({ example: "Unauthorized" }),
});

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "Starter Stack API",
    version: "1.0.0",
  },
  paths: {
    "/api/profile": {
      get: {
        summary: "Get the authenticated user's profile",
        responses: {
          "200": {
            description: "Profile retrieved successfully.",
            content: {
              "application/json": { schema: successEnvelope(profileResponseSchema) },
            },
          },
          "401": {
            description: "Unauthorized.",
            content: {
              "application/json": { schema: errorEnvelope },
            },
          },
          "404": {
            description: "Profile not found.",
            content: {
              "application/json": { schema: errorEnvelope },
            },
          },
        },
      },
      patch: {
        summary: "Update the authenticated user's profile",
        requestBody: {
          content: {
            "application/json": { schema: updateProfileSchema },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully.",
            content: {
              "application/json": { schema: successEnvelope(profileResponseSchema) },
            },
          },
          "401": {
            description: "Unauthorized.",
            content: {
              "application/json": { schema: errorEnvelope },
            },
          },
          "404": {
            description: "Profile not found.",
            content: {
              "application/json": { schema: errorEnvelope },
            },
          },
          "422": {
            description: "Validation error.",
            content: {
              "application/json": { schema: errorEnvelope },
            },
          },
        },
      },
    },
  },
});
