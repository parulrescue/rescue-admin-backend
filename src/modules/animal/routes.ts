import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listAnimals, createAnimal, updateAnimal, deleteAnimal } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requirePermission } from "../../plugins/permission.plugin";

const SearchQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const CreateAnimalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const UpdateAnimalSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

const handler = (fn: (req: FastifyRequest) => Promise<any>) => async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await fn(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const animalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requirePermission("animal_view"), validate(SearchQuerySchema, "query")] }, handler(listAnimals));
  app.post("/", { preHandler: [authenticate, requirePermission("animal_create"), validate(CreateAnimalSchema)] }, handler(createAnimal));
  app.put("/:id", { preHandler: [authenticate, requirePermission("animal_update"), validate(IdParamSchema, "params"), validate(UpdateAnimalSchema)] }, handler(updateAnimal));
  app.delete("/:id", { preHandler: [authenticate, requirePermission("animal_delete"), validate(IdParamSchema, "params")] }, handler(deleteAnimal));
};
