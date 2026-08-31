import { Router } from "express";
import { body, param, query } from "express-validator";
import { proyectoController } from "../../controllers/proyecto.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /proyectos:
 *   get:
 *     summary: Proyectos del cliente autenticado
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de proyectos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 proyectos: { type: array, items: { $ref: '#/components/schemas/Proyecto' } }
 *       401:
 *         description: No autenticado
 */
router.get(
  "/proyectos",
  authMiddleware,
  proyectoController.listarMios.bind(proyectoController),
);

/**
 * @swagger
 * /proyectos/admin:
 *   get:
 *     summary: Centro de proyectos (admin) con filtros y paginación
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [recibido, diseno, desarrollo, entregado]
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           description: Búsqueda parcial por email del cliente
 *       - in: query
 *         name: pagoEstado
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Proyectos con paginación
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/proyectos/admin",
  authMiddleware,
  requireRol("admin"),
  query("estado")
    .optional()
    .isIn(["recibido", "diseno", "desarrollo", "entregado"]),
  query("pagoEstado")
    .optional()
    .isIn(["pending", "paid", "failed", "refunded"]),
  query("pagina").optional().isInt({ min: 1 }),
  query("limite").optional().isInt({ min: 1, max: 100 }),
  validate,
  proyectoController.listarTodos.bind(proyectoController),
);

/**
 * @swagger
 * /proyectos/{id}:
 *   get:
 *     summary: Detalle de un proyecto
 *     description: El admin ve cualquiera; el cliente solo los suyos.
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proyecto encontrado
 *       403:
 *         description: Proyecto de otro cliente
 *       404:
 *         description: No encontrado
 */
router.get(
  "/proyectos/:id",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  proyectoController.obtener.bind(proyectoController),
);

/**
 * @swagger
 * /proyectos/{id}/estado:
 *   put:
 *     summary: Cambiar estado del proyecto (monitor)
 *     description: |
 *       Transiciones secuenciales obligatorias: recibido -> diseno -> desarrollo -> entregado.
 *       Al marcar "entregado" se fija fechaEntregado (inicia la garantía).
 *       Solo admin puede cambiar estados.
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [diseno, desarrollo, entregado], example: diseno }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: Transición inválida
 *       403:
 *         description: Solo admin
 */
router.put(
  "/proyectos/:id/estado",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("estado").isIn(["diseno", "desarrollo", "entregado"]),
  validate,
  proyectoController.cambiarEstado.bind(proyectoController),
);

/**
 * @swagger
 * /proyectos/{id}/garantia:
 *   get:
 *     summary: Estado de la garantía de soporte
 *     description: |
 *       Ventana de soporte que inicia al entregar el proyecto.
 *       Devuelve la fecha exacta de expiración y los días restantes.
 *       El cliente solo consulta sus proyectos; el admin cualquiera.
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Garantía calculada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 garantia:
 *                   type: object
 *                   properties:
 *                     activa: { type: boolean }
 *                     soporteMeses: { type: integer }
 *                     fechaInicio: { type: string, format: date-time }
 *                     fechaExpiracion: { type: string, format: date-time }
 *                     diasRestantes: { type: integer }
 *       400:
 *         description: El proyecto aún no fue entregado
 *       403:
 *         description: Proyecto ajeno
 *       404:
 *         description: No encontrado
 */
router.get(
  "/proyectos/:id/garantia",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  proyectoController.obtenerGarantia.bind(proyectoController),
);

/**
 * @swagger
 * /capacidad:
 *   get:
 *     summary: Configuración del gestor de capacidad
 *     description: Ajustes de días hábiles por tipo de paquete. Solo admin.
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Ajustes actuales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ajustes:
 *                   type: object
 *                   properties:
 *                     validor: { type: integer, example: 0 }
 *                     corporativo: { type: integer, example: 0 }
 *                     operativo: { type: integer, example: 0 }
 */
router.get(
  "/capacidad",
  authMiddleware,
  requireRol("admin"),
  proyectoController.obtenerCapacidad.bind(proyectoController),
);

/**
 * @swagger
 * /capacidad:
 *   put:
 *     summary: Actualizar gestor de capacidad
 *     description: |
 *       Suma/resta días hábiles por tipo de paquete (rango -15 a +30) y
 *       recalcula las fechas de entrega de los proyectos pendientes.
 *     tags: [Proyectos]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               validor: { type: integer, example: 2 }
 *               corporativo: { type: integer, example: -3 }
 *               operativo: { type: integer, example: 0 }
 *     responses:
 *       200:
 *         description: Ajustes aplicados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ajustes: { type: object }
 *                 proyectosRecalculados: { type: integer }
 *       400:
 *         description: Ajuste fuera de rango
 */
router.put(
  "/capacidad",
  authMiddleware,
  requireRol("admin"),
  body("validor").optional().isInt({ min: -15, max: 30 }),
  body("corporativo").optional().isInt({ min: -15, max: 30 }),
  body("operativo").optional().isInt({ min: -15, max: 30 }),
  validate,
  proyectoController.actualizarCapacidad.bind(proyectoController),
);

export default router;
