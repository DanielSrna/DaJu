import { Router } from "express";
import { body, param } from "express-validator";
import { citaController } from "../../controllers/cita.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /citas/{id}/confirmar:
 *   post:
 *     summary: Admin confirma una cita (elige una franja propuesta)
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [franja]
 *             properties:
 *               franja: { type: string, format: date-time }
 *               linkVideollamada: { type: string }
 *     responses:
 *       200:
 *         description: Cita confirmada
 *       400:
 *         description: La franja no es de las propuestas
 */
router.post(
  "/citas/:id/confirmar",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("franja").isISO8601(),
  body("linkVideollamada").optional().isString().isLength({ max: 500 }).trim(),
  validate,
  citaController.confirmar.bind(citaController),
);

/**
 * @swagger
 * /citas/{id}/realizar:
 *   post:
 *     summary: Admin marca la cita realizada (consume una sesión)
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cita realizada
 *       400:
 *         description: No está confirmada o no quedan sesiones
 */
router.post(
  "/citas/:id/realizar",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  citaController.realizar.bind(citaController),
);

/**
 * @swagger
 * /citas/{id}/cancelar:
 *   post:
 *     summary: Cancelar cita (no consume sesión)
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cita cancelada
 */
router.post(
  "/citas/:id/cancelar",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  citaController.cancelar.bind(citaController),
);

export default router;
