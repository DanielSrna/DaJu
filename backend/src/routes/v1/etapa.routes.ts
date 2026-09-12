import { Router, NextFunction, Request, Response } from "express";
import { body, param } from "express-validator";
import { etapaController } from "../../controllers/etapa.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import type { FamiliaEntorno } from "../../services/etapa.service";

/**
 * @swagger
 * /proyectos/{id}/etapas:
 *   post:
 *     summary: Agregar una etapa al plan (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               monto: { type: number, minimum: 0 }
 *               requierePago: { type: boolean }
 *     responses:
 *       201: { description: Etapa creada }
 * /espacios/{id}/etapas:
 *   post:
 *     summary: Agregar una etapa al plan del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Etapa creada }
 */

/**
 * @swagger
 * /proyectos/{id}/etapas/orden:
 *   put:
 *     summary: Reordenar las etapas (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orden]
 *             properties:
 *               orden:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Etapas reordenadas }
 * /espacios/{id}/etapas/orden:
 *   put:
 *     summary: Reordenar las etapas del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Etapas reordenadas }
 */

/**
 * @swagger
 * /proyectos/{id}/etapas/{etapaId}:
 *   put:
 *     summary: Editar una etapa (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: etapaId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               monto: { type: number, minimum: 0 }
 *               requierePago: { type: boolean }
 *     responses:
 *       200: { description: Etapa actualizada }
 *       409: { description: La etapa tiene pago en curso o pagado }
 *   delete:
 *     summary: Eliminar una etapa impaga (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: etapaId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Etapa eliminada }
 * /espacios/{id}/etapas/{etapaId}:
 *   put:
 *     summary: Editar una etapa del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Etapa actualizada }
 *   delete:
 *     summary: Eliminar una etapa del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Etapa eliminada }
 */

/**
 * @swagger
 * /proyectos/{id}/etapas/{etapaId}/estado:
 *   post:
 *     summary: Completar o desbloquear una etapa (admin)
 *     description: |
 *       `completada` exige el pago confirmado; `en_curso` permite el
 *       desbloqueo manual (override) que queda registrado en bitácora.
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: etapaId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [en_curso, completada] }
 *     responses:
 *       200: { description: Etapa actualizada }
 *       400: { description: Falta confirmar el pago }
 * /espacios/{id}/etapas/{etapaId}/estado:
 *   post:
 *     summary: Completar o desbloquear una etapa del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Etapa actualizada }
 */

/**
 * @swagger
 * /proyectos/{id}/etapas/{etapaId}/solicitar-pago:
 *   post:
 *     summary: Habilitar el cobro de una etapa (admin)
 *     description: Crea el pago con código único y avisa al cliente.
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: etapaId, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Pago habilitado }
 *       409: { description: Ya tiene pago en curso o está pagada }
 * /espacios/{id}/etapas/{etapaId}/solicitar-pago:
 *   post:
 *     summary: Habilitar el cobro de una etapa del espacio (admin)
 *     tags: [Etapas]
 *     security: [cookieAuth: []]
 *     responses:
 *       201: { description: Pago habilitado }
 */

/**
 * Registra las rutas de etapas para un entorno (proyecto o espacio).
 * La lógica es la misma; solo cambia la base de la URL.
 */
export function montarRutasEtapas(
  router: Router,
  base: "proyectos" | "espacios",
  familia: FamiliaEntorno,
): void {
  const manejar =
    (accion: keyof typeof etapaController) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const fn = etapaController[accion] as (
        familia: FamiliaEntorno,
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Promise<void>;
      void fn.call(etapaController, familia, req, res, next);
    };

  router.post(
    `/${base}/:id/etapas`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    body("nombre").isString().isLength({ min: 2, max: 80 }).trim(),
    body("descripcion").optional().isString().isLength({ max: 300 }).trim(),
    body("monto").optional().isFloat({ min: 0 }),
    body("requierePago").optional().isBoolean(),
    validate,
    manejar("agregar"),
  );

  router.put(
    `/${base}/:id/etapas/orden`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    body("orden").isArray({ min: 1 }),
    body("orden.*").isMongoId(),
    validate,
    manejar("reordenar"),
  );

  router.put(
    `/${base}/:id/etapas/:etapaId`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("etapaId").isMongoId(),
    body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
    body("descripcion").optional().isString().isLength({ max: 300 }).trim(),
    body("monto").optional().isFloat({ min: 0 }),
    body("requierePago").optional().isBoolean(),
    validate,
    manejar("actualizar"),
  );

  router.delete(
    `/${base}/:id/etapas/:etapaId`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("etapaId").isMongoId(),
    validate,
    manejar("eliminar"),
  );

  router.post(
    `/${base}/:id/etapas/:etapaId/estado`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("etapaId").isMongoId(),
    body("estado").isIn(["en_curso", "completada"]),
    validate,
    manejar("cambiarEstado"),
  );

  router.post(
    `/${base}/:id/etapas/:etapaId/solicitar-pago`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("etapaId").isMongoId(),
    validate,
    manejar("solicitarPago"),
  );
}
