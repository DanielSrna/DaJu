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

export default router;
