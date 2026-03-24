import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { listLedgerEntries, getLedgerSummary, createLedgerEntry, updateLedgerEntry, deleteLedgerEntry } from "./service";
import { validate } from "../../shared/http/validate";
import { HttpStatus } from "../../shared/http/status";
import { serverError } from "../../shared/http/response";
import { authenticate } from "../../plugins/auth.plugin";
import { requireAdmin } from "../../plugins/permission.plugin";

const ListQuerySchema = z.object({
  page: z.string().default("1").transform(Number),
  limit: z.string().default("20").transform(Number),
  type: z.enum(["credit", "debit"]).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

const CreateLedgerSchema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: z.number().positive("Amount must be positive"),
  category: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  reference_id: z.string().max(100).optional().nullable(),
});

const UpdateLedgerSchema = z.object({
  type: z.enum(["credit", "debit"]).optional(),
  amount: z.number().positive().optional(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  reference_id: z.string().max(100).optional().nullable(),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

const listLedgerEntriesHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await listLedgerEntries(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const getLedgerSummaryHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await getLedgerSummary(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const createLedgerEntryHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await createLedgerEntry(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const updateLedgerEntryHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await updateLedgerEntry(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

const deleteLedgerEntryHandler = async (req: FastifyRequest, res: FastifyReply) => {
  try {
    const result = await deleteLedgerEntry(req);
    res.status(result?.success?.code || result?.error?.code || HttpStatus.OK).send(result);
  } catch (error) {
    console.log("Error:- ", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(serverError(error));
  }
};

export const ledgerRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: [authenticate, requireAdmin, validate(ListQuerySchema, "query")] }, listLedgerEntriesHandler);
  app.get("/summary", { preHandler: [authenticate, requireAdmin] }, getLedgerSummaryHandler);
  app.post("/", { preHandler: [authenticate, requireAdmin, validate(CreateLedgerSchema)] }, createLedgerEntryHandler);
  app.put("/:id", { preHandler: [authenticate, requireAdmin, validate(IdParamSchema, "params"), validate(UpdateLedgerSchema)] }, updateLedgerEntryHandler);
  app.delete("/:id", { preHandler: [authenticate, requireAdmin, validate(IdParamSchema, "params")] }, deleteLedgerEntryHandler);
};
