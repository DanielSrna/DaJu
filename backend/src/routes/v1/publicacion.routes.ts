import { Router } from "express";
import { body, param, query } from "express-validator";
import { publicacionController } from "../../controllers/publicacion.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /publicaciones:
 *   get:
 *     summary: Blog público (noticias y conceptos publicados)
 *     description: |
 *       Solo publicaciones publicadas. Filtros opcionales por tipo
 *       (concepto|noticia) y por sección de la vitrina (faq, postventa...).
 *     tags: [Blog]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [concepto, noticia] }
 *       - in: query
 *         name: seccion
 *         schema: { type: string, enum: [inicio, productos, faq, postventa] }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Lista de publicaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicaciones: { type: array, items: { $ref: '#/components/schemas/Publicacion' } }
 *                 total: { type: integer }
 */
router.get(
  "/publicaciones",
  query("tipo").optional().isIn(["concepto", "noticia"]),
  query("seccion").optional().isIn(["inicio", "productos", "faq", "postventa"]),
  query("pagina").optional().isInt({ min: 1 }),
  query("limite").optional().isInt({ min: 1, max: 50 }),
  validate,
  publicacionController.listarPublicas.bind(publicacionController),
);

/**
 * @swagger
 * /publicaciones/admin:
 *   get:
 *     summary: Todas las publicaciones (incluye borradores). Solo admin.
 *     tags: [Blog]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista completa
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/publicaciones/admin",
  authMiddleware,
  requireRol("admin"),
  publicacionController.listarTodas.bind(publicacionController),
);

/**
 * @swagger
 * /publicaciones/{slug}:
 *   get:
 *     summary: Detalle de una publicación pública
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Publicación encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicacion: { $ref: '#/components/schemas/Publicacion' }
 *       404:
 *         description: No encontrada o en borrador
 */
router.get(
  "/publicaciones/:slug",
  param("slug").isString().notEmpty(),
  validate,
  publicacionController.obtenerPorSlug.bind(publicacionController),
);

/**
 * @swagger
 * /publicaciones:
 *   post:
 *     summary: Crear publicación (concepto o noticia). Solo admin.
 *     tags: [Blog]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PublicacionInput' }
 *     responses:
 *       201:
 *         description: Creada
 *       409:
 *         description: Slug duplicado
 */
router.post(
  "/publicaciones",
  authMiddleware,
  requireRol("admin"),
  body("titulo").isString().isLength({ min: 3, max: 120 }).trim(),
  body("slug")
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug inválido"),
  body("tipo").isIn(["concepto", "noticia"]),
  body("resumen").isString().isLength({ min: 10, max: 300 }).trim(),
  body("contenido").isString().isLength({ min: 20, max: 20000 }).trim(),
  body("secciones").optional().isArray(),
  body("secciones.*")
    .optional()
    .isIn(["inicio", "productos", "faq", "postventa"]),
  body("publicado").optional().isBoolean(),
  validate,
  publicacionController.crear.bind(publicacionController),
);

/**
 * @swagger
 * /publicaciones/{id}:
 *   put:
 *     summary: Actualizar publicación (incluye publicar/despublicar). Solo admin.
 *     tags: [Blog]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PublicacionInput' }
 *     responses:
 *       200:
 *         description: Actualizada
 *       404:
 *         description: No encontrada
 */
router.put(
  "/publicaciones/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("titulo").optional().isString().isLength({ min: 3, max: 120 }).trim(),
  body("tipo").optional().isIn(["concepto", "noticia"]),
  body("resumen").optional().isString().isLength({ min: 10, max: 300 }).trim(),
  body("contenido")
    .optional()
    .isString()
    .isLength({ min: 20, max: 20000 })
    .trim(),
  body("secciones").optional().isArray(),
  body("secciones.*")
    .optional()
    .isIn(["inicio", "productos", "faq", "postventa"]),
  body("publicado").optional().isBoolean(),
  validate,
  publicacionController.actualizar.bind(publicacionController),
);

/**
 * @swagger
 * /publicaciones/{id}:
 *   delete:
 *     summary: Eliminar publicación. Solo admin.
 *     tags: [Blog]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Eliminada
 *       404:
 *         description: No encontrada
 */
router.delete(
  "/publicaciones/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  publicacionController.eliminar.bind(publicacionController),
);

export default router;
