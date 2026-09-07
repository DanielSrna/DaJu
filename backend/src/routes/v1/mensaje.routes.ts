import { Router } from "express";
import { body, query } from "express-validator";
import { mensajeController } from "../../controllers/mensaje.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /mensajes:
 *   get:
 *     summary: Listar mensajes de un chat (proyecto, espacio o vista)
 *     description: |
 *       El cliente solo accede a chats de cosas COMPRADAS por él; el admin a todo.
 *       Los mensajes vistos se marcan como leídos para el usuario que consulta.
 *     tags: [Chat]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: query
 *         name: contexto
 *         required: true
 *         schema: { type: string, enum: [proyecto, espacio, vista] }
 *       - in: query
 *         name: contextoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de mensajes (orden ascendente)
 *       400:
 *         description: Parámetros inválidos
 *       403:
 *         description: El cliente no compró este entorno
 */
router.get(
  "/mensajes",
  authMiddleware,
  query("contexto").isIn(["proyecto", "espacio", "vista"]),
  query("contextoId").isMongoId(),
  validate,
  mensajeController.listar.bind(mensajeController),
);

/**
 * @swagger
 * /mensajes:
 *   post:
 *     summary: Enviar mensaje de chat
 *     description: El autor es el usuario autenticado (admin o cliente propietario).
 *     tags: [Chat]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contexto, contextoId, cuerpo]
 *             properties:
 *               contexto: { type: string, enum: [proyecto, espacio, vista] }
 *               contextoId: { type: string }
 *               cuerpo: { type: string }
 *     responses:
 *       201:
 *         description: Mensaje creado
 *       400:
 *         description: Validación fallida
 *       403:
 *         description: Sin acceso al chat
 */
router.post(
  "/mensajes",
  authMiddleware,
  body("contexto").isIn(["proyecto", "espacio", "vista"]),
  body("contextoId").isMongoId(),
  body("cuerpo").isString().isLength({ min: 1, max: 4000 }).trim(),
  validate,
  mensajeController.enviar.bind(mensajeController),
);

export default router;
