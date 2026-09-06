import { Router } from "express";
import { body, param } from "express-validator";
import { cmsController } from "../../controllers/cms.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadArchivoMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

/**
 * @swagger
 * /cms:
 *   get:
 *     summary: Configuración pública del CMS (logo, colores, marquesina, carrusel)
 *     description: Lo consume la vitrina. Solo expone elementos ACTIVOS.
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Configuración pública
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logo: { type: object, nullable: true }
 *                 colores: { type: object }
 *                 marquesina: { type: object, properties: { texto: { type: string }, activo: { type: boolean } } }
 *                 carrusel: { type: array }
 */
router.get("/cms", cmsController.obtenerPublico.bind(cmsController));

/**
 * @swagger
 * /cms/identidad:
 *   put:
 *     summary: Actualizar identidad visual (logo + colores)
 *     description: |
 *       Multipart/form-data con el logo (campo "logo", JPG/PNG/WebP, máx 5 MB)
 *       y/o JSON con colores. El logo se valida por contenido y se optimiza.
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo: { type: string, format: binary }
 *               colores: { type: string, description: 'JSON string, ej. {"primario":"#111111","secundario":"#ffffff","acento":"#ffcc00"}' }
 *     responses:
 *       200:
 *         description: Identidad actualizada
 *       400:
 *         description: Logo inválido
 */
router.put(
  "/cms/identidad",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("logo"),
  validate,
  cmsController.actualizarIdentidad.bind(cmsController),
);

/**
 * @swagger
 * /cms/marquesina:
 *   put:
 *     summary: Editar marquesina (franja superior)
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [texto, activo]
 *             properties:
 *               texto: { type: string, example: "¡Oferta! 20% en paquetes esta semana" }
 *               activo: { type: boolean, example: true }
 *     responses:
 *       200:
 *         description: Marquesina actualizada
 */
router.put(
  "/cms/marquesina",
  authMiddleware,
  requireRol("admin"),
  body("texto").isString().isLength({ max: 200 }).trim(),
  body("activo").isBoolean(),
  validate,
  cmsController.actualizarMarquesina.bind(cmsController),
);

/**
 * @swagger
 * /cms/carrusel:
 *   post:
 *     summary: Crear imagen del carrusel
 *     description: Multipart/form-data, campo "imagen" (JPG/PNG/WebP, máx 5 MB).
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [imagen]
 *             properties:
 *               imagen: { type: string, format: binary }
 *               link: { type: string }
 *               titulo: { type: string }
 *               activo: { type: boolean }
 *               orden: { type: integer }
 *     responses:
 *       201:
 *         description: Imagen añadida al carrusel
 *       400:
 *         description: Imagen inválida
 */
router.post(
  "/cms/carrusel",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  validate,
  cmsController.crearCarruselItem.bind(cmsController),
);

/**
 * @swagger
 * /cms/carrusel/{id}:
 *   delete:
 *     summary: Eliminar imagen del carrusel
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Imagen eliminada
 *       404:
 *         description: No encontrada
 */
router.delete(
  "/cms/carrusel/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  cmsController.eliminarCarruselItem.bind(cmsController),
);

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

/**
 * @swagger
 * /cms/editor:
 *   get:
 *     summary: Configuración del editor (admin) — publicado + borrador
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Configuración publicada y borrador pendiente
 */
router.get(
  "/cms/editor",
  authMiddleware,
  requireRol("admin"),
  cmsController.obtenerEditor.bind(cmsController),
);

/**
 * @swagger
 * /cms/editor:
 *   patch:
 *     summary: Guardar cambios en el borrador (no afecta a la vitrina)
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               colores:
 *                 type: object
 *                 properties:
 *                   primario:
 *                     type: string
 *                     pattern: '^#([0-9a-fA-F]{6})$'
 *                   secundario:
 *                     type: string
 *                     pattern: '^#([0-9a-fA-F]{6})$'
 *                   acento:
 *                     type: string
 *                     pattern: '^#([0-9a-fA-F]{6})$'
 *               marquesina:
 *                 type: object
 *                 properties:
 *                   texto:
 *                     type: string
 *                     maxLength: 300
 *                   activo:
 *                     type: boolean
 *               textos:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                   maxLength: 5000
 *               descuento:
 *                 type: object
 *                 properties:
 *                   activo:
 *                     type: boolean
 *                   porcentaje:
 *                     type: number
 *                     enum: [20, 40, 70]
 *                   mensaje:
 *                     type: string
 *                     maxLength: 200
 *                   hasta:
 *                     type: string
 *                     nullable: true
 *               diasExtra:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Borrador actualizado
 *       400:
 *         description: Validación fallida
 */
router.patch(
  "/cms/editor",
  authMiddleware,
  requireRol("admin"),
  body("colores").optional().isObject(),
  body("colores.primario").optional().matches(HEX_COLOR),
  body("colores.secundario").optional().matches(HEX_COLOR),
  body("colores.acento").optional().matches(HEX_COLOR),
  body("marquesina").optional().isObject(),
  body("marquesina.texto").optional().isString().trim().isLength({ max: 300 }),
  body("marquesina.activo").optional().isBoolean(),
  body("textos").optional().isObject(),
  body("textos.*").optional().isString().trim().isLength({ max: 5000 }),
  body("descuento").optional().isObject(),
  body("descuento.activo").optional().isBoolean(),
  body("descuento.porcentaje").optional().isIn([20, 40, 70]),
  body("descuento.mensaje").optional().isString().trim().isLength({ max: 200 }),
  body("descuento.hasta")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("La fecha de vigencia debe ser ISO válida"),
  body("diasExtra")
    .optional()
    .isInt({ min: 0 })
    .withMessage("No puede ser negativo"),
  validate,
  cmsController.actualizarEditor.bind(cmsController),
);

/**
 * @swagger
 * /cms/publicar:
 *   post:
 *     summary: Aplicar el borrador a la vitrina pública
 *     tags: [CMS]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cambios publicados
 */
router.post(
  "/cms/publicar",
  authMiddleware,
  requireRol("admin"),
  cmsController.publicarEditor.bind(cmsController),
);

export default router;
