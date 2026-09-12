import { Router, NextFunction, Request, Response } from "express";
import { body, param } from "express-validator";
import { documentoController } from "../../controllers/documento.controller";
import {
  authMiddleware,
  requireEmailVerificado,
  requireRol,
} from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadArchivoMiddleware } from "../../middlewares/upload.middleware";
import type { FamiliaDocumento } from "../../services/documento.service";

/**
 * @swagger
 * /proyectos/{id}/documentos:
 *   get:
 *     summary: Lista los manuales PDF del entorno (cliente dueño o admin)
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Documentos del entorno }
 *   post:
 *     summary: Sube un manual PDF (admin)
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo, titulo]
 *             properties:
 *               archivo: { type: string, format: binary }
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *     responses:
 *       201: { description: Documento subido }
 *       400: { description: El archivo debe ser PDF }
 * /espacios/{id}/documentos:
 *   get:
 *     summary: Lista los manuales PDF del espacio
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     responses:
 *       200: { description: Documentos del entorno }
 *   post:
 *     summary: Sube un manual PDF al espacio (admin)
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     responses:
 *       201: { description: Documento subido }
 */

/**
 * @swagger
 * /proyectos/{id}/documentos/{documentoId}:
 *   delete:
 *     summary: Elimina un manual (admin)
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: documentoId, required: true, schema: { type: string } }
 *     responses:
 *       204: { description: Documento eliminado }
 *       404: { description: No encontrado }
 * /espacios/{id}/documentos/{documentoId}:
 *   delete:
 *     summary: Elimina un manual del espacio (admin)
 *     tags: [Documentación]
 *     security: [cookieAuth: []]
 *     responses:
 *       204: { description: Documento eliminado }
 */
export function montarRutasDocumentos(
  router: Router,
  base: "proyectos" | "espacios",
  familia: FamiliaDocumento,
): void {
  const manejar =
    (accion: keyof typeof documentoController) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const fn = documentoController[accion] as (
        familia: FamiliaDocumento,
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Promise<void>;
      void fn.call(documentoController, familia, req, res, next);
    };

  router.get(
    `/${base}/:id/documentos`,
    authMiddleware,
    requireEmailVerificado,
    param("id").isMongoId(),
    validate,
    manejar("listar"),
  );

  router.post(
    `/${base}/:id/documentos`,
    authMiddleware,
    requireRol("admin"),
    uploadArchivoMiddleware.single("archivo"),
    param("id").isMongoId(),
    body("titulo").isString().isLength({ min: 2, max: 120 }).trim(),
    body("descripcion").optional().isString().isLength({ max: 500 }).trim(),
    validate,
    manejar("subir"),
  );

  router.delete(
    `/${base}/:id/documentos/:documentoId`,
    authMiddleware,
    requireRol("admin"),
    param("id").isMongoId(),
    param("documentoId").isMongoId(),
    validate,
    manejar("eliminar"),
  );
}
