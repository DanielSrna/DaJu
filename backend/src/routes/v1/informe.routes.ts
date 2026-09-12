import { Router, NextFunction, Request, Response } from "express";
import { body, param } from "express-validator";
import { informeController } from "../../controllers/informe.controller";
import {
  authMiddleware,
  requireEmailVerificado,
  requireRol,
} from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import type { FamiliaInforme } from "../../services/informe.service";

/**
 * @swagger
 * /proyectos/{id}/informe:
 *   get:
 *     summary: Resumen del informe técnico (cliente) o completo (admin)
 *     description: |
 *       El cliente recibe vistas, funciones, costos, impacto y los promedios
 *       de rendimiento/seguridad y tests. El admin recibe además el detalle.
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Informe del entorno }
 *       403: { description: No es tu entorno }
 * /espacios/{id}/informe:
 *   get:
 *     summary: Resumen del informe técnico del espacio (cliente o admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Informe del entorno }
 */

/**
 * @swagger
 * /proyectos/{id}/informe/pdf:
 *   get:
 *     summary: Descargar el informe técnico en PDF
 *     description: Incluye el detalle de pruebas de rendimiento, seguridad y tests.
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: PDF del informe
 *         content: { application/pdf: { schema: { type: string, format: binary } } }
 * /espacios/{id}/informe/pdf:
 *   get:
 *     summary: Descargar el informe del espacio en PDF
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: PDF del informe }
 */

/**
 * @swagger
 * /proyectos/{id}/informe/pruebas:
 *   post:
 *     summary: Agregar una prueba o test al informe (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo, titulo]
 *             properties:
 *               tipo: { type: string, enum: [rendimiento, seguridad, test] }
 *               titulo: { type: string, example: "Prueba de carga" }
 *               descripcion: { type: string }
 *               calificacion: { type: number, minimum: 0, maximum: 100 }
 *               exitoso: { type: boolean }
 *     responses:
 *       201: { description: Pruebas del informe }
 * /espacios/{id}/informe/pruebas:
 *   post:
 *     summary: Agregar una prueba o test al informe del espacio (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       201: { description: Pruebas del informe }
 */

/**
 * @swagger
 * /proyectos/{id}/informe/pruebas/{pruebaId}:
 *   put:
 *     summary: Editar una prueba o test (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: pruebaId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *               calificacion: { type: number, minimum: 0, maximum: 100, nullable: true }
 *               exitoso: { type: boolean }
 *     responses:
 *       200: { description: Pruebas del informe }
 *   delete:
 *     summary: Eliminar una prueba o test (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: pruebaId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Pruebas del informe }
 * /espacios/{id}/informe/pruebas/{pruebaId}:
 *   put:
 *     summary: Editar una prueba o test del espacio (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Pruebas del informe }
 *   delete:
 *     summary: Eliminar una prueba o test del espacio (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Pruebas del informe }
 */

/**
 * @swagger
 * /proyectos/{id}/informe/impacto:
 *   put:
 *     summary: Guardar el impacto calculado por el equipo (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               porcentaje: { type: number, minimum: 0, maximum: 100, nullable: true }
 *               descripcion: { type: string }
 *     responses:
 *       200: { description: Impacto actualizado }
 * /espacios/{id}/informe/impacto:
 *   put:
 *     summary: Guardar el impacto calculado del espacio (admin)
 *     tags: [Informe]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Impacto actualizado }
 */
export function montarRutasInforme(
  router: Router,
  base: "proyectos" | "espacios",
  familia: FamiliaInforme,
): void {
  const manejar =
    (accion: keyof typeof informeController) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const fn = informeController[accion] as (
        familia: FamiliaInforme,
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Promise<void>;
      void fn.call(informeController, familia, req, res, next);
    };

  router.get(
    `/${base}/:id/informe`,
    authMiddleware,
    requireEmailVerificado,
    param("id").isMongoId(),
    validate,
    manejar("obtener"),
  );

  router.get(
    `/${base}/:id/informe/pdf`,
    authMiddleware,
    requireEmailVerificado,
    param("id").isMongoId(),
    validate,
    manejar("descargarPdf"),
  );

  router.post(
    `/${base}/:id/informe/pruebas`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    body("tipo").isIn(["rendimiento", "seguridad", "test"]),
    body("titulo").isString().isLength({ min: 2, max: 120 }).trim(),
    body("descripcion").optional().isString().isLength({ max: 1000 }).trim(),
    body("calificacion").optional().isInt({ min: 0, max: 100 }),
    body("exitoso").optional().isBoolean(),
    validate,
    manejar("agregarPrueba"),
  );

  router.put(
    `/${base}/:id/informe/pruebas/:pruebaId`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("pruebaId").isMongoId(),
    body("titulo").optional().isString().isLength({ min: 2, max: 120 }).trim(),
    body("descripcion").optional().isString().isLength({ max: 1000 }).trim(),
    body("calificacion")
      .optional({ values: "null" })
      .isInt({ min: 0, max: 100 }),
    body("exitoso").optional().isBoolean(),
    validate,
    manejar("actualizarPrueba"),
  );

  router.delete(
    `/${base}/:id/informe/pruebas/:pruebaId`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("pruebaId").isMongoId(),
    validate,
    manejar("eliminarPrueba"),
  );

  router.put(
    `/${base}/:id/informe/impacto`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    body("porcentaje")
      .optional({ values: "null" })
      .isInt({ min: 0, max: 100 })
      .withMessage("El impacto debe estar entre 0 y 100"),
    body("descripcion").optional().isString().isLength({ max: 500 }).trim(),
    validate,
    manejar("actualizarImpacto"),
  );
}
